from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import numpy as np
from scipy.optimize import least_squares

# --- 1. App Configuration ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. Data Models ---
class DataPoint(BaseModel):
    pressure: float
    excessUptake: float

class CalculateRequest(BaseModel):
    temperature: float
    gasType: str
    model: str
    data: List[DataPoint]

# --- 3. Physics Constants & Gas Properties ---
R_GAS = 8.314462618  # J/(mol*K)

# Molar Masses (kg/mol) and Critical Props for Z-factor calc
GAS_PROPS = {
    "Hydrogen": {"M_kg": 2.01588e-3, "Tc": 33.145, "Pc": 1.2964},
    "Methane":  {"M_kg": 16.04e-3,   "Tc": 190.56, "Pc": 4.599},
    "CO2":      {"M_kg": 44.01e-3,   "Tc": 304.13, "Pc": 7.377}
}

# --- 4. Bulk Density Calculator (rho_B) ---
# Implements Eq 10 from Sharpe et al. (2013)
def get_compressibility_Z(P_MPa, T_K, gas_type):
    """Calculates Z factor using simplified EOS for speed."""
    P_bar = P_MPa * 10
    if gas_type == "Hydrogen":
        return 1.0 + (0.0006 * P_bar)
    elif gas_type == "CO2":
        Z = 1.0 - (0.005 * P_bar) + (0.00002 * P_bar**2)
        return max(Z, 0.3)
    else: # Methane
        Z = 1.0 - (0.002 * P_bar)
        return max(Z, 0.6)

def rho_bulk_g_cm3(P_MPa, T_K, gas_type):
    """
    Bulk density rho_B = (P * M) / (Z * R * T)
    """
    props = GAS_PROPS.get(gas_type, GAS_PROPS["Hydrogen"])
    M_kg = props["M_kg"]
    
    # Vectorized Z calculation
    if np.isscalar(P_MPa):
        Z = get_compressibility_Z(P_MPa, T_K, gas_type)
    else:
        Z = np.array([get_compressibility_Z(p, T_K, gas_type) for p in P_MPa])

    P_Pa = P_MPa * 1e6
    rho_kg_m3 = (P_Pa * M_kg) / (Z * R_GAS * T_K)
    rho_g_cm3 = rho_kg_m3 / 1000.0
    return rho_g_cm3

# --- 5. Theta Models (H_A) ---
def H_langmuir(P_MPa, b):
    # Eq 2: bP / (1 + bP)
    x = b * P_MPa
    return x / (1.0 + x)

def H_toth(P_MPa, b, c):
    # Eq 13: bP / [1 + (bP)^c]^(1/c)
    x = b * P_MPa
    return x / (1.0 + np.power(x, c)) ** (1.0 / c)

def H_sips(P_MPa, b, n):
    # Eq 16: (bP)^(1/n) / [1 + (bP)^(1/n)]
    x = np.power(b * P_MPa, 1.0/n)
    return x / (1.0 + x)

# --- 6. Core Physics Algorithms (Sharpe 2013) ---

def m_excess_wt_percent(P_MPa, T_K, vP, rhoA, H_A, gas_type):
    """
    Excess Uptake (Eq 12): mE = (rhoA - rhoB) * 100 * vP * H_A
    """
    rhoB = rho_bulk_g_cm3(P_MPa, T_K, gas_type)
    return (rhoA - rhoB) * 100.0 * vP * H_A

def m_absolute_wt_percent(vP, rhoA, H_A):
    """
    Absolute Uptake: mA = rhoA * 100 * vP * H_A
    Derived from Eq 5 & 11 (mA = rhoA * vA)
    """
    return rhoA * 100.0 * vP * H_A

def m_total_wt_percent(P_MPa, T_K, vP, mE_wt, gas_type):
    """
    Total Uptake (Eq 9): mP = mE + rhoB * 100 * vP
    """
    rhoB = rho_bulk_g_cm3(P_MPa, T_K, gas_type)
    return mE_wt + (rhoB * 100.0 * vP)


# --- 7. Main API Endpoint ---
@app.post("/calculate")
async def calculate_isotherms(req: CalculateRequest):
    try:
        # A. Prepare Data
        P_exp = np.array([d.pressure for d in req.data], dtype=float)
        mE_exp = np.array([d.excessUptake for d in req.data], dtype=float)
        
        # B. Define Residuals Function
        def residuals(x):
            # Unpack parameters: vP, rhoA, b, c
            vP, rhoA, b, c = x
            
            # Select Model
            if req.model == 'langmuir':
                H = H_langmuir(P_exp, b)
            elif req.model == 'sips':
                H = H_sips(P_exp, b, c) # c is 'n' here
            else: # toth
                H = H_toth(P_exp, b, c)
            
            # Calculate Excess Prediction
            mE_pred = m_excess_wt_percent(P_exp, req.temperature, vP, rhoA, H, req.gasType)
            return mE_pred - mE_exp

        # C. Fit Parameters using Least Squares
        # Initial Guess (x0): [vP, rhoA, b, c]
        # rhoA guess: 0.08 g/cm3 (typical for H2), 0.4 for CH4
        rho_guess = 0.08 if req.gasType == "Hydrogen" else 0.4
        x0 = [0.5, rho_guess, 1.0, 1.0]
        
        # Bounds: vP(0-5), rhoA(0-2), b(>0), c(0-10)
        lower_bounds = [1e-6, 1e-6, 1e-9, 1e-3]
        upper_bounds = [10.0, 3.0, 1e6, 10.0]
        
        res = least_squares(residuals, x0, bounds=(lower_bounds, upper_bounds), method='trf')
        vP_fit, rhoA_fit, b_fit, c_fit = res.x

        # D. Generate Curves for Plotting
        smooth_P = np.linspace(0, max(P_exp) * 1.2, 60)
        chart_data = []

        # Pre-calculate smooth Theta (H_A)
        if req.model == 'langmuir':
            smooth_H = H_langmuir(smooth_P, b_fit)
        elif req.model == 'sips':
            smooth_H = H_sips(smooth_P, b_fit, c_fit)
        else: # toth
            smooth_H = H_toth(smooth_P, b_fit, c_fit)

        # Calculate all 3 curves using the fitted params
        mE_smooth = m_excess_wt_percent(smooth_P, req.temperature, vP_fit, rhoA_fit, smooth_H, req.gasType)
        mA_smooth = m_absolute_wt_percent(vP_fit, rhoA_fit, smooth_H)
        mP_smooth = m_total_wt_percent(smooth_P, req.temperature, vP_fit, mE_smooth, req.gasType)

        # E. Package Response
        for i, p in enumerate(smooth_P):
            chart_data.append({
                "pressure": round(p, 4),
                "excessFit": round(mE_smooth[i], 4),
                "absolute": round(mA_smooth[i], 4),
                "total": round(mP_smooth[i], 4),
                "excessRaw": None
            })

        # Map Raw Data
        for i, raw_p in enumerate(P_exp):
            idx = (np.abs(smooth_P - raw_p)).argmin()
            chart_data[idx]["excessRaw"] = mE_exp[i]

        return {
            "parameters": {
                "vp": round(vP_fit, 4),
                "rhoA": round(rhoA_fit, 4),
                "b": round(b_fit, 4),
                "c": round(c_fit, 4)
            },
            "chartData": chart_data
        }

    except Exception as e:
        # Fallback for errors
        raise HTTPException(status_code=500, detail=str(e))