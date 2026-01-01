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
# Global interpolators dictionary
interpolators = {}

def load_lookup_tables():
    """
    Loads the gas_lookup.csv file generated locally.
    Creates high-speed interpolators for density (T, P) -> rho.
    """
    csv_path = "gas_lookup.csv"
    
    # Check if file exists
    if not os.path.exists(csv_path):
        print(f"⚠️ Warning: '{csv_path}' not found. Backend will use approximate EOS fallback.")
        return

    try:
        df = pd.read_csv(csv_path)
        
        for gas in df['Gas'].unique():
            sub = df[df['Gas'] == gas]
            
            # Pivot to create grid for RegularGridInterpolator
            # Rows = Temperature, Cols = Pressure, Values = Density
            pivot = sub.pivot(index='T_K', columns='P_MPa', values='Density_g_cm3')
            
            T_grid = pivot.index.values.astype(float)
            P_grid = pivot.columns.values.astype(float)
            rho_grid = pivot.values.astype(float)
            
            interpolators[gas] = RegularGridInterpolator(
                (T_grid, P_grid), rho_grid, bounds_error=False, fill_value=None
            )
        print("✅ Loaded high-precision EOS tables from CSV.")
        
    except Exception as e:
        print(f"❌ Error loading lookup tables: {e}")

# Load tables on server startup
load_lookup_tables()

# ---------------------------------------------------------
# 2. PHYSICS ENGINE & DENSITY CALCULATOR
# ---------------------------------------------------------
GAS_PROPS = {
    "Hydrogen": {"M_kg": 2.016e-3},
    "Methane":  {"M_kg": 16.04e-3},
    "CO2":      {"M_kg": 44.01e-3}
}
R_GAS = 8.314

def get_density(P_MPa, T_K, gas_type):
    """
    Returns Gas Density (rho) in g/cm³.
    Priority 1: Lookup Table (NIST Accuracy).
    Priority 2: Approximate EOS Fallback.
    """
    # 1. Try Lookup Table
    if gas_type in interpolators:
        if np.isscalar(P_MPa):
            # Interpolator requires [[T, P]]
            val = interpolators[gas_type]([[T_K, P_MPa]])[0]
            if not np.isnan(val): return float(val)
        else:
            # Vectorized lookup
            pts = np.column_stack((np.full_like(P_MPa, T_K), P_MPa))
            vals = interpolators[gas_type](pts)
            # If any NaNs (out of bounds), fill them using fallback? 
            # For simplicity, if we have NaNs, we let fallback handle those specific points usually, 
            # but here we return table result if valid.
            if not np.any(np.isnan(vals)): return vals

    # 2. Fallback: Approximate EOS (Redlich-Kwong / Ideal-ish)
    P_bar = P_MPa * 10
    M_kg = GAS_PROPS.get(gas_type, {}).get("M_kg", 2.016e-3)
    
    # Simple Compressibility Factors (Z)
    if gas_type == "Hydrogen":
        Z = 1.0 + (0.0006 * P_bar)
    elif gas_type == "CO2":
        Z = np.maximum(0.3, 1.0 - (0.005 * P_bar) + (0.00002 * P_bar**2))
    else: # Methane
        Z = np.maximum(0.6, 1.0 - (0.002 * P_bar))

    P_Pa = P_MPa * 1e6
    rho_kg_m3 = (P_Pa * M_kg) / (Z * R_GAS * T_K)
    return rho_kg_m3 / 1000.0 # Convert to g/cm3

# --- Isotherm Theta Models (0 to 1) ---
def H_langmuir(P, b):
    x = b * P
    return x / (1.0 + x)

def H_toth(P, b, c):
    x = b * P
    return x / (1.0 + np.power(x, c)) ** (1.0 / c)

def H_sips(P, b, n):
    x = np.power(b * P, 1.0/n)
    return x / (1.0 + x)

# ---------------------------------------------------------
# 3. GLOBAL SOLVER (Sharpe-Style)
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

@app.post("/calculate")
async def calculate_global(req: GlobalFitRequest):
    try:
        # --- A. Data Prep: Flatten all datasets ---
        all_P = []
        all_mE = []
        all_T = []
        dataset_indices = [] # Stores (start_index, end_index) for each dataset
        
        cursor = 0
        for ds in req.datasets:
            p_arr = np.array([d.pressure for d in ds.data], dtype=float)
            m_arr = np.array([d.excessUptake for d in ds.data], dtype=float)
            count = len(p_arr)
            
            all_P.append(p_arr)
            all_mE.append(m_arr)
            all_T.append(np.full(count, ds.temperature))
            
            dataset_indices.append((cursor, cursor + count))
            cursor += count

        P_flat = np.concatenate(all_P)
        mE_flat = np.concatenate(all_mE)
        T_flat = np.concatenate(all_T)
        num_datasets = len(req.datasets)

        # --- B. Define Residuals for Global Fit ---
        # Param Vector x structure:
        # x[0] = vP (Shared Pore Volume)
        # x[1] = rhoA (Shared Adsorbate Density)
        # x[2] = c (Shared Heterogeneity - typical for Sharpe model)
        # x[3:] = b_1, b_2, ... b_N (Affinity for each temperature)
        
        def residuals(x):
            vP, rhoA, c = x[0], x[1], x[2]
            b_params = x[3:]
            
            resids = []
            
            # Loop through each dataset/temperature
            for i, (start, end) in enumerate(dataset_indices):
                P_local = P_flat[start:end]
                mE_local = mE_flat[start:end]
                T_local = T_flat[start:end][0]
                b_local = b_params[i]
                
                # 1. Get Density (Lookup or EOS)
                rhoB = get_density(P_local, T_local, req.gasType)
                
                # 2. Calculate Theta
                if req.model == 'langmuir':
                    theta = H_langmuir(P_local, b_local)
                elif req.model == 'sips':
                    theta = H_sips(P_local, b_local, c)
                else: # toth
                    theta = H_toth(P_local, b_local, c)
                
                # 3. Model Prediction (Sharpe Eq 12)
                # mE = (rhoA - rhoB) * vP * theta * 100
                mE_pred = (rhoA - rhoB) * 100.0 * vP * theta
                
                resids.append(mE_pred - mE_local)
                
            return np.concatenate(resids)

        # --- C. Run Optimization ---
        # Initial Guesses: vP=0.5, rhoA=0.08(H2)/0.4(CH4), c=0.5
        rho_guess = 0.08 if req.gasType == "Hydrogen" else 0.4
        x0 = [0.5, rho_guess, 0.5] + [1.0] * num_datasets
        
        # Bounds: 
        # vP(0.01-5), rhoA(0.01-3), c(0.1-10), b(1e-5 - inf)
        lower_bounds = [0.01, 0.01, 0.1] + [1e-5] * num_datasets
        upper_bounds = [5.00, 3.00, 10.0] + [np.inf] * num_datasets
        
        opt = least_squares(residuals, x0, bounds=(lower_bounds, upper_bounds), method='trf')
        
        vP_fit, rhoA_fit, c_fit = opt.x[0], opt.x[1], opt.x[2]
        b_fits = opt.x[3:]

        # --- D. Generate Response Curves ---
        results = []
        warnings = []
        max_rhoB_seen = 0
        
        for i, ds in enumerate(req.datasets):
            T_local = ds.temperature
            b_local = b_fits[i]
            
            # Smooth Curve Generation
            raw_P = np.array([d.pressure for d in ds.data])
            smooth_P = np.linspace(0, max(raw_P) * 1.2, 60)
            
            rhoB_smooth = get_density(smooth_P, T_local, req.gasType)
            max_rhoB_seen = max(max_rhoB_seen, np.max(rhoB_smooth))
            
            if req.model == 'langmuir':
                theta = H_langmuir(smooth_P, b_local)
            elif req.model == 'sips':
                theta = H_sips(smooth_P, b_local, c_fit)
            else:
                theta = H_toth(smooth_P, b_local, c_fit)
            
            # Calculate Physical Quantities
            # 1. Excess (Fit)
            mE_smooth = (rhoA_fit - rhoB_smooth) * 100.0 * vP_fit * theta
            # 2. Absolute (Adsorbed Phase Only)
            mA_smooth = rhoA_fit * 100.0 * vP_fit * theta
            # 3. Total (Entire Pore)
            mP_smooth = mE_smooth + (rhoB_smooth * 100.0 * vP_fit)
            
            # Format Data
            chart_data = []
            for j, p in enumerate(smooth_P):
                # Safety: Clamp negative absolute at 0 (only happens if physics breaks)
                abs_val = max(0, mA_smooth[j])
                
                chart_data.append({
                    "pressure": round(p, 4),
                    "excessFit": round(mE_smooth[j], 4),
                    "absolute": round(abs_val, 4),
                    "total": round(mP_smooth[j], 4),
                    "excessRaw": None
                })
                
            # Map Raw Data
            raw_mE = np.array([d.excessUptake for d in ds.data])
            for k, raw_p in enumerate(raw_P):
                idx = (np.abs(smooth_P - raw_p)).argmin()
                chart_data[idx]["excessRaw"] = raw_mE[k]

            results.append({
                "temperature": T_local,
                "b": round(b_local, 4),
                "chartData": chart_data
            })

        # --- E. Sanity Checks ---
        if rhoA_fit < max_rhoB_seen:
            warnings.append(f"⚠️ Physics Warning: Fitted Adsorbate Density ({rhoA_fit:.3f} g/cm³) is lower than Bulk Gas Density ({max_rhoB_seen:.3f} g/cm³). This suggests the model is struggling to distinguish adsorbed phase from bulk gas.")
            
        if vP_fit > 2.0:
            warnings.append(f"⚠️ Data Warning: Fitted Pore Volume ({vP_fit:.2f} cm³/g) is physically unlikely (usually < 1.5). Check units.")

        return {
            "globalParameters": {
                "vp": round(vP_fit, 4),
                "rhoA": round(rhoA_fit, 4),
                "c": round(c_fit, 4)
            },
            "datasets": results,
            "warnings": warnings
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Calculation Error: {str(e)}")

# Vercel entry point
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)