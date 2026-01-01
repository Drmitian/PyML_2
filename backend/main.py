from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import numpy as np
import pandas as pd
from scipy.optimize import least_squares
from scipy.interpolate import RegularGridInterpolator
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 1. LOAD "MINI-REFPROP" TABLES
# ---------------------------------------------------------
interpolators = {}

def load_lookup_tables():
    csv_path = "gas_lookup.csv"
    if not os.path.exists(csv_path):
        print(f"⚠️ Warning: '{csv_path}' not found. Using approximate EOS.")
        return

    try:
        df = pd.read_csv(csv_path)
        for gas in df['Gas'].unique():
            sub = df[df['Gas'] == gas]
            pivot = sub.pivot(index='T_K', columns='P_MPa', values='Density_g_cm3')
            interpolators[gas] = RegularGridInterpolator(
                (pivot.index.values.astype(float), pivot.columns.values.astype(float)), 
                pivot.values.astype(float), bounds_error=False, fill_value=None
            )
        print("✅ Loaded high-precision EOS tables.")
    except Exception as e:
        print(f"❌ Error loading lookup tables: {e}")

load_lookup_tables()

# ---------------------------------------------------------
# 2. PHYSICS ENGINE
# ---------------------------------------------------------
GAS_PROPS = { "Hydrogen": {"M_kg": 2.016e-3}, "Methane": {"M_kg": 16.04e-3}, "CO2": {"M_kg": 44.01e-3} }
R_GAS = 8.314

def get_density(P_MPa, T_K, gas_type):
    if gas_type in interpolators:
        if np.isscalar(P_MPa):
            val = interpolators[gas_type]([[T_K, P_MPa]])[0]
            if not np.isnan(val): return float(val)
        else:
            pts = np.column_stack((np.full_like(P_MPa, T_K), P_MPa))
            vals = interpolators[gas_type](pts)
            if not np.any(np.isnan(vals)): return vals

    # Fallback EOS
    P_bar = P_MPa * 10
    M_kg = GAS_PROPS.get(gas_type, {}).get("M_kg", 2e-3)
    if gas_type == "Hydrogen": Z = 1.0 + (0.0006 * P_bar)
    elif gas_type == "CO2": Z = np.maximum(0.3, 1.0 - (0.005 * P_bar) + (0.00002 * P_bar**2))
    else: Z = np.maximum(0.6, 1.0 - (0.002 * P_bar))
    return ((P_MPa * 1e6 * M_kg) / (Z * R_GAS * T_K)) / 1000.0

# --- Isotherm Models ---
def H_langmuir(P, b): return (b * P) / (1.0 + b * P)
def H_toth(P, b, c): x = b * P; return x / (1.0 + np.power(x, c)) ** (1.0 / c)
def H_sips(P, b, n): x = np.power(b * P, 1.0/n); return x / (1.0 + x)

# ---------------------------------------------------------
# 3. UPDATED GLOBAL SOLVER (Supports Fixed vP)
# ---------------------------------------------------------
class DataPoint(BaseModel):
    pressure: float
    excessUptake: float

class IsothermDataset(BaseModel):
    temperature: float
    data: List[DataPoint]

class GlobalFitRequest(BaseModel):
    gasType: str
    model: str
    datasets: List[IsothermDataset]
    # NEW PARAMETERS
    poreVolumeMode: str = "fitted" # 'fitted' or 'fixed'
    fixedPoreVolume: float = 0.0

@app.post("/calculate")
async def calculate_global(req: GlobalFitRequest):
    try:
        # --- A. Data Prep ---
        all_P, all_mE, all_T, dataset_indices = [], [], [], []
        cursor = 0
        for ds in req.datasets:
            p = np.array([d.pressure for d in ds.data], dtype=float)
            all_P.append(p)
            all_mE.append(np.array([d.excessUptake for d in ds.data], dtype=float))
            all_T.append(np.full(len(p), ds.temperature))
            dataset_indices.append((cursor, cursor + len(p)))
            cursor += len(p)

        P_flat = np.concatenate(all_P)
        mE_flat = np.concatenate(all_mE)
        T_flat = np.concatenate(all_T)
        num_datasets = len(req.datasets)
        
        is_fixed_vp = (req.poreVolumeMode == "fixed")

        # --- B. Define Residuals ---
        # If Fixed vP: x = [rhoA, c, b1...bN] (vP is constant)
        # If Fitted vP: x = [vP, rhoA, c, b1...bN]
        
        def residuals(x):
            # 1. Unpack Parameters based on mode
            if is_fixed_vp:
                vP = req.fixedPoreVolume
                rhoA, c = x[0], x[1]
                b_params = x[2:]
            else:
                vP = x[0]
                rhoA, c = x[1], x[2]
                b_params = x[3:]
            
            resids = []
            for i, (start, end) in enumerate(dataset_indices):
                P_loc = P_flat[start:end]
                rhoB = get_density(P_loc, T_flat[start:end][0], req.gasType)
                
                # Theta Calculation
                if req.model == 'langmuir': theta = H_langmuir(P_loc, b_params[i])
                elif req.model == 'sips': theta = H_sips(P_loc, b_params[i], c)
                else: theta = H_toth(P_loc, b_params[i], c)
                
                # Sharpe Eq 12: mE = (rhoA - rhoB) * vP * theta * 100
                mE_pred = (rhoA - rhoB) * 100.0 * vP * theta
                resids.append(mE_pred - mE_flat[start:end])
                
            return np.concatenate(resids)

        # --- C. Run Optimization ---
        rho_guess = 0.08 if req.gasType == "Hydrogen" else 0.4
        
        if is_fixed_vp:
            # x0 = [rhoA, c, b...]
            x0 = [rho_guess, 0.5] + [1.0] * num_datasets
            lower = [0.01, 0.1] + [1e-5] * num_datasets
            upper = [3.00, 10.0] + [np.inf] * num_datasets
        else:
            # x0 = [vP, rhoA, c, b...]
            x0 = [0.5, rho_guess, 0.5] + [1.0] * num_datasets
            lower = [0.01, 0.01, 0.1] + [1e-5] * num_datasets
            upper = [5.00, 3.00, 10.0] + [np.inf] * num_datasets
        
        opt = least_squares(residuals, x0, bounds=(lower, upper), method='trf')
        
        # Unpack Results
        if is_fixed_vp:
            vP_fit = req.fixedPoreVolume
            rhoA_fit, c_fit = opt.x[0], opt.x[1]
            b_fits = opt.x[2:]
        else:
            vP_fit = opt.x[0]
            rhoA_fit, c_fit = opt.x[1], opt.x[2]
            b_fits = opt.x[3:]

        # --- D. Generate Response ---
        results = []
        warnings = []
        max_rhoB = 0
        
        for i, ds in enumerate(req.datasets):
            # Smooth Curves
            raw_P = np.array([d.pressure for d in ds.data])
            smooth_P = np.linspace(0, max(raw_P) * 1.2, 60)
            rhoB = get_density(smooth_P, ds.temperature, req.gasType)
            max_rhoB = max(max_rhoB, np.max(rhoB))
            
            if req.model == 'langmuir': theta = H_langmuir(smooth_P, b_fits[i])
            elif req.model == 'sips': theta = H_sips(smooth_P, b_fits[i], c_fit)
            else: theta = H_toth(smooth_P, b_fits[i], c_fit)
            
            mE = (rhoA_fit - rhoB) * 100.0 * vP_fit * theta
            mA = rhoA_fit * 100.0 * vP_fit * theta
            mP = mE + (rhoB * 100.0 * vP_fit)
            
            chart_data = []
            for j, p in enumerate(smooth_P):
                chart_data.append({
                    "pressure": round(p, 4),
                    "excessFit": round(mE[j], 4),
                    "absolute": round(max(0, mA[j]), 4),
                    "total": round(mP[j], 4),
                    "excessRaw": None
                })
            
            # Map Raw Data
            raw_mE = np.array([d.excessUptake for d in ds.data])
            for k, rp in enumerate(raw_P):
                idx = (np.abs(smooth_P - rp)).argmin()
                chart_data[idx]["excessRaw"] = raw_mE[k]

            results.append({ "temperature": ds.temperature, "b": round(b_fits[i], 4), "chartData": chart_data })

        if rhoA_fit < max_rhoB: warnings.append(f"⚠️ Physics Warning: Fitted Adsorbate Density ({rhoA_fit:.3f}) < Bulk Density.")
        if vP_fit > 5.0: warnings.append("⚠️ Data Warning: Pore Volume is extremely high.")

        return {
            "globalParameters": { "vp": round(vP_fit, 4), "rhoA": round(rhoA_fit, 4), "c": round(c_fit, 4) },
            "datasets": results,
            "warnings": warnings
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)