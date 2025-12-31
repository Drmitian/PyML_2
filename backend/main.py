from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from scipy.optimize import curve_fit
import CoolProp.CoolProp as CP
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Models ---

class DataPoint(BaseModel):
    pressure: float
    excessUptake: float

class IsothermRequest(BaseModel):
    temperature: float
    gasType: str
    model: str = "toth"  # Added model field (defaults to toth)
    data: List[DataPoint]

# --- Physics / Thermodynamics ---

def calculate_bulk_density(P_MPa, T_K, gas):
    """Calculates gas bulk density (g/cm3) using CoolProp."""
    try:
        # CoolProp input: Pressure in Pa, Temp in K
        rho_kg_m3 = CP.PropsSI('D', 'T', T_K, 'P', P_MPa * 1e6, gas)
        return rho_kg_m3 / 1000.0  # Convert to g/cm3
    except:
        return 0.0

# --- Isotherm Models (Theta Calculation) ---

def toth_theta(P, b, c):
    """Toth Isotherm: (bP) / [1 + (bP)^c]^(1/c)"""
    # Protect against overflow/negative bases
    try:
        val = (b * P) ** c
        return (b * P) / ((1 + val) ** (1/c))
    except:
        return 0.0

def langmuir_theta(P, b, c=1):
    """Langmuir Isotherm: (bP) / (1 + bP)"""
    # Note: 'c' is ignored or effectively 1.0
    return (b * P) / (1 + b * P)

def sips_theta(P, b, c):
    """Sips (Langmuir-Freundlich): (bP)^c / [1 + (bP)^c]"""
    try:
        term = (b * P) ** c
        return term / (1 + term)
    except:
        return 0.0

def get_theta(P, b, c, model_name):
    """Switch to the correct model equation."""
    m = model_name.lower()
    if m == 'langmuir':
        return langmuir_theta(P, b)
    elif m == 'sips':
        return sips_theta(P, b, c)
    else:
        # Default to Toth
        return toth_theta(P, b, c)

# --- Fitting Wrapper ---

def fit_function_wrapper(P_array, v_P, rho_A, b, c, T, gas_name, model_name):
    """
    The function that curve_fit will optimize.
    Calculates Excess Adsorption based on Absolute Adsorption - Bulk Gas.
    """
    rho_B_array = np.array([calculate_bulk_density(p, T, gas_name) for p in P_array])
    
    # Calculate fractional coverage (theta) using the selected model
    theta = get_theta(P_array, b, c, model_name)
    
    # Excess Uptake Equation: m_exc = (rho_A - rho_gas) * PoreVolume * theta
    # Multiplied by 100 to match wt% units if input is wt%
    m_E = (rho_A - rho_B_array) * 100 * v_P * theta
    return m_E

# --- API Endpoint ---

@app.post("/calculate")
async def calculate_isotherm(request: IsothermRequest):
    pressures = np.array([d.pressure for d in request.data])
    uptakes = np.array([d.excessUptake for d in request.data])
    temp = request.temperature
    
    # Map friendly names to CoolProp syntax
    gas_map = {"Hydrogen": "H2", "Methane": "Methane", "CO2": "CO2"}
    gas_name = gas_map.get(request.gasType, "H2")
    
    model_name = request.model.lower()

    # Define Lambda for curve_fit to freeze T, gas_name, and model
    def func_to_fit(P, v_P, rho_A, b, c):
        return fit_function_wrapper(P, v_P, rho_A, b, c, temp, gas_name, model_name)

    # Initial Guesses (p0) and Bounds
    # v_P (Pore Vol), rho_A (Ads Density), b (Affinity), c (Heterogeneity)
    
    if model_name == 'langmuir':
        # For Langmuir, we lock 'c' to 1.0 using tight bounds
        p0 = [0.5, 0.1, 1.0, 1.0]
        bounds_lower = [0, 0, 0, 0.9999] 
        bounds_upper = [5, 2, np.inf, 1.0001]
    else:
        # Toth and Sips: 'c' varies between 0 and 1 (usually)
        p0 = [0.5, 0.1, 1.0, 0.5]
        bounds_lower = [0, 0, 0, 0]
        bounds_upper = [5, 2, np.inf, 1]

    try:
        popt, _ = curve_fit(
            func_to_fit, 
            pressures, 
            uptakes, 
            p0=p0, 
            bounds=(bounds_lower, bounds_upper), 
            maxfev=10000
        )
        v_P, rho_A, b, c = popt
    except Exception as e:
        print(f"Fitting failed: {e}")
        # Fallback values if fit fails
        v_P, rho_A, b, c = 0.5, 0.1, 1.0, 0.5

    # Generate Result Arrays
    results = []
    for i, p in enumerate(pressures):
        rho_B = calculate_bulk_density(p, temp, gas_name)
        
        # Recalculate theta using the fitted parameters and CORRECT model
        theta = get_theta(p, b, c, model_name)
        
        # Absolute Adsorption (wt%)
        m_A = rho_A * v_P * theta * 100
        
        # Total Capacity in container (Adsorbed + Bulk gas in pore)
        # Note: This is a simplified view of total capacity
        m_P = uptakes[i] + (rho_B * v_P * 100)
        
        # Recalculate fit curve for this point
        fit_val = fit_function_wrapper(np.array([p]), v_P, rho_A, b, c, temp, gas_name, model_name)[0]

        results.append({
            "pressure": p, 
            "excessRaw": uptakes[i],
            "excessFit": fit_val,
            "absolute": m_A, 
            "total": m_P
        })

    return {
        "parameters": {
            "vp": round(v_P, 4), 
            "rhoA": round(rho_A, 4), 
            "b": round(b, 2), 
            "c": round(c, 4), 
            "rmsr": 0.0 # Placeholder for error metric
        }, 
        "chartData": results
    }
if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)