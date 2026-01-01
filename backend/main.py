from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import numpy as np
from scipy.optimize import curve_fit

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

# --- 3. Physics & Constants ---
R_GAS = 8.314  # J/(mol·K)

# Gas Properties: M (g/mol), Critical Props
GAS_PROPS = {
    "Hydrogen": {"M": 2.016, "Tc": 33.145, "Pc": 1.2964},
    "Methane":  {"M": 16.04,  "Tc": 190.56, "Pc": 4.599},
    "CO2":      {"M": 44.01,  "Tc": 304.13, "Pc": 7.377}
}

# --- 4. Density Calculator (Redlich-Kwong EOS) ---
# Returns bulk density (rho_B) in g/cm³
def calculate_bulk_density(pressure_mpa, temp_k, gas_type):
    P_bar = pressure_mpa * 10
    props = GAS_PROPS.get(gas_type, GAS_PROPS["Hydrogen"])
    
    Tc = props["Tc"]
    Pc = props["Pc"]
    M = props["M"]

    # Simple Compressibility (Z)
    if gas_type == "Hydrogen":
        Z = 1.0 + (0.0006 * P_bar)
    elif gas_type == "CO2":
        Z = 1.0 - (0.005 * P_bar) + (0.00002 * P_bar**2)
        if Z < 0.3: Z = 0.3
    else: # Methane
        Z = 1.0 - (0.002 * P_bar)
        if Z < 0.6: Z = 0.6

    P_pa = pressure_mpa * 1e6
    rho_g_m3 = (P_pa * M) / (Z * R_GAS * temp_k) 
    rho_g_cm3 = rho_g_m3 / 1e6 
    
    return rho_g_cm3

# --- 5. Theta (Fractional Filling) Models ---
# Returns value between 0 and 1
def theta_langmuir(P, b):
    return (b * P) / (1 + b * P)

def theta_toth(P, b, t):
    # Using form from Paper Table 1: bP / (1 + (bP)^t)^(1/t)
    # Note: b in paper is usually affinity. 
    return (b * P) / ((1 + (b * P)**t)**(1/t))

def theta_sips(P, b, n):
    # Using form from Paper Table 1
    return ((b * P)**(1/n)) / (1 + (b * P)**(1/n))

# --- 6. The "Improved Model" (Eq 12 from Sharpe et al. 2013) ---
# m_E = (rho_A - rho_B) * v_P * theta * 100
# We fit for: rho_A, v_P, b, c
def excess_model_wrapper(P, rho_A, vp, b, c, gas_type, temp, model_name):
    rho_B = np.array([calculate_bulk_density(p, temp, gas_type) for p in P])
    
    if model_name == 'langmuir':
        theta = theta_langmuir(P, b)
    elif model_name == 'sips':
        theta = theta_sips(P, b, c)
    else: # toth
        theta = theta_toth(P, b, c)
        
    # Equation 12: m_E = (rho_A - rho_B) * vp * theta * 100
    # The 100 converts g/g to wt%
    return (rho_A - rho_B) * vp * theta * 100

# --- 7. Main Calculation Endpoint ---
@app.post("/calculate")
async def calculate_isotherms(req: CalculateRequest):
    try:
        # A. Prepare Data
        pressures = np.array([d.pressure for d in req.data])
        excess_raw = np.array([d.excessUptake for d in req.data])
        
        # B. Initial Guesses [rho_A, vp, b, c]
        # rho_A: ~0.1 g/cm3 for H2 (from paper), higher for others
        # vp: ~0.5 cm3/g
        guess_rho = 0.1 if req.gasType == "Hydrogen" else 0.5
        p0 = [guess_rho, 0.5, 0.5, 1.0] 
        
        # Bounds: rho_A(0-2), vp(0-5), b(>0), c(0-10)
        bounds = ((0, 0, 0, 0), (2.0, 5.0, np.inf, 10))

        # C. Curve Fitting
        def fit_wrapper(p_arr, r_a, v_p, bb, cc):
            return excess_model_wrapper(p_arr, r_a, v_p, bb, cc, req.gasType, req.temperature, req.model)

        popt, pcov = curve_fit(fit_wrapper, pressures, excess_raw, p0=p0, bounds=bounds, maxfev=10000)
        rho_A_fit, vp_fit, b_fit, c_fit = popt

        # D. Generate Curves
        smooth_pressures = np.linspace(0, max(pressures) * 1.1, 50)
        chart_data = []

        for p in smooth_pressures:
            rho_B = calculate_bulk_density(p, req.temperature, req.gasType)
            
            # Calculate Theta
            if req.model == 'langmuir':
                theta = theta_langmuir(p, b_fit)
            elif req.model == 'sips':
                theta = theta_sips(p, b_fit, c_fit)
            else: # toth
                theta = theta_toth(p, b_fit, c_fit)
            
            # 1. Excess (Fit) - Eq 12
            exc_val = (rho_A_fit - rho_B) * vp_fit * theta * 100
            
            # 2. Absolute (m_A) - Eq 5 & 11 from paper
            # m_A = rho_A * v_A = rho_A * v_P * theta
            abs_val = rho_A_fit * vp_fit * theta * 100
            
            # 3. Total (m_P) - Eq 9 from paper
            # m_P = m_E + rho_B * v_P
            tot_val = exc_val + (rho_B * vp_fit * 100)
            
            # Safety for plotting negative excess at very high P
            if abs_val < 0: abs_val = 0

            chart_data.append({
                "pressure": round(p, 4),
                "excessFit": round(exc_val, 4),
                "absolute": round(abs_val, 4),
                "total": round(tot_val, 4),
                "excessRaw": None
            })

        # E. Map Raw Data
        for i, raw_p in enumerate(pressures):
            idx = (np.abs(smooth_pressures - raw_p)).argmin()
            chart_data[idx]["excessRaw"] = excess_raw[i]

        return {
            "parameters": {
                "vp": round(vp_fit, 4),
                "rhoA": round(rho_A_fit, 4), # Now a Fitted Parameter!
                "b": round(b_fit, 4),
                "c": round(c_fit, 4),
                "n_max": round(rho_A_fit * vp_fit * 100, 2) # Derived Capacity
            },
            "chartData": chart_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))