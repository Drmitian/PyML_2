from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import numpy as np
from scipy.optimize import curve_fit

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Models ---
class DataPoint(BaseModel):
    pressure: float
    excessUptake: float

class CalculateRequest(BaseModel):
    temperature: float
    gasType: str
    model: str
    data: List[DataPoint]

# --- Physics Constants ---
R_GAS = 8.314  # J/(mol·K)

# Gas Properties (Critical Temp/Pressure for Density Calculation)
GAS_PROPS = {
    "Hydrogen": {"M": 2.016, "Tc": 33.145, "Pc": 1.2964},
    "Methane":  {"M": 16.04,  "Tc": 190.56, "Pc": 4.599},
    "CO2":      {"M": 44.01,  "Tc": 304.13, "Pc": 7.377}
}

# --- Bulk Density Calculator (Redlich-Kwong EOS) ---
# Returns rho_bulk in g/cm³
def calculate_bulk_density(pressure_mpa, temp_k, gas_type):
    P_bar = pressure_mpa * 10
    props = GAS_PROPS.get(gas_type, GAS_PROPS["Hydrogen"])
    
    Tc = props["Tc"]
    Pc = props["Pc"]
    M = props["M"]

    # Compressibility Factor (Z) Approximation
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

# --- Isotherm Models (Theta: 0 to 1) ---
# Using forms from Table 1 of Sharpe et al. 2013

def theta_langmuir(P, b):
    # Eq 2: bP / (1 + bP)
    return (b * P) / (1 + b * P)

def theta_toth(P, b, t):
    # Eq 13: bP / (1 + (bP)^t)^(1/t)
    # Note: Using b as affinity parameter (inverse pressure)
    return (b * P) / ((1 + (b * P)**t)**(1/t))

def theta_sips(P, b, n):
    # Eq 16: (bP)^(1/n) / (1 + (bP)^(1/n))
    return ((b * P)**(1/n)) / (1 + (b * P)**(1/n))

# --- Fitting Function: Equation 12 (Sharpe 2013) ---
# m_E = (rho_A - rho_B) * v_P * Theta * 100
def excess_model_wrapper(P, rho_A, vp, b, c, gas_type, temp, model_name):
    rho_B = np.array([calculate_bulk_density(p, temp, gas_type) for p in P])
    
    if model_name == 'langmuir':
        theta = theta_langmuir(P, b)
    elif model_name == 'sips':
        theta = theta_sips(P, b, c)
    else: # toth
        theta = theta_toth(P, b, c)
        
    # Eq 12: Excess = (AdsorbateDensity - BulkDensity) * PoreVolume * FillingFraction * 100
    return (rho_A - rho_B) * vp * theta * 100

@app.post("/calculate")
async def calculate_isotherms(req: CalculateRequest):
    try:
        # 1. Extract Data
        pressures = np.array([d.pressure for d in req.data])
        excess_raw = np.array([d.excessUptake for d in req.data])
        
        # 2. Fit Parameters [rho_A, vp, b, c]
        # Initial guesses are critical for physically meaningful results
        # rho_A guess: ~0.07 g/cm3 for H2, higher for others
        rho_guess = 0.1
        if req.gasType == "Methane": rho_guess = 0.3
        if req.gasType == "CO2": rho_guess = 0.8

        p0 = [rho_guess, 0.5, 0.5, 1.0]
        
        # Bounds: rho_A(0-2), vp(0.1-5), b(>0), c(0.1-10)
        bounds = ((0, 0.05, 0, 0.1), (2.0, 5.0, np.inf, 10))

        def fit_wrapper(p_arr, r_a, v_p, bb, cc):
            return excess_model_wrapper(p_arr, r_a, v_p, bb, cc, req.gasType, req.temperature, req.model)

        # Perform Curve Fit
        popt, pcov = curve_fit(fit_wrapper, pressures, excess_raw, p0=p0, bounds=bounds, maxfev=15000)
        rho_A_fit, vp_fit, b_fit, c_fit = popt

        # 3. Generate Isotherms
        smooth_pressures = np.linspace(0, max(pressures) * 1.2, 60)
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
            
            # --- CALCULATE CURVES BASED ON PAPER ---
            
            # 1. Excess Adsorption (Fit) - Eq 12
            # m_E = (rho_A - rho_B) * v_P * theta
            exc_val = (rho_A_fit - rho_B) * vp_fit * theta * 100
            
            # 2. Absolute Adsorption (m_A) - Eq 5 & 11
            # m_A = rho_A * v_A = rho_A * (v_P * theta)
            # This represents ONLY the mass in the dense adsorbed layer.
            abs_val = rho_A_fit * vp_fit * theta * 100
            
            # 3. Total Adsorption (m_P) - Eq 9
            # m_P = m_E + (rho_B * v_P)
            # This represents ALL gas in the pore (adsorbed layer + bulk gas center).
            tot_val = exc_val + (rho_B * vp_fit * 100)

            # Safety: Absolute should not be negative
            if abs_val < 0: abs_val = 0

            chart_data.append({
                "pressure": round(p, 4),
                "excessFit": round(exc_val, 4),
                "absolute": round(abs_val, 4),
                "total": round(tot_val, 4),
                "excessRaw": None
            })

        # Map Raw Data
        for i, raw_p in enumerate(pressures):
            idx = (np.abs(smooth_pressures - raw_p)).argmin()
            chart_data[idx]["excessRaw"] = excess_raw[i]

        return {
            "parameters": {
                "vp": round(vp_fit, 4),
                "rhoA": round(rho_A_fit, 4),
                "b": round(b_fit, 4),
                "c": round(c_fit, 4)
            },
            "chartData": chart_data
        }

    except Exception as e:
        # Fallback for fitting errors
        print(f"Fitting error: {e}")
        raise HTTPException(status_code=500, detail=str(e))