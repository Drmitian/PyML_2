from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import numpy as np
from scipy.optimize import curve_fit

# --- 1. App Configuration ---
app = FastAPI()

# Enable CORS (Critical for Frontend to talk to Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (Vercel frontend, localhost, etc.)
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

# --- 3. Physics & Chemistry Constants ---
R_GAS = 8.314  # J/(mol·K)

# Gas Properties (Molar Mass in g/mol, Critical Props for EOS)
GAS_PROPS = {
    "Hydrogen": {"M": 2.016, "Tc": 33.145, "Pc": 1.2964},   # H2
    "Methane":  {"M": 16.04,  "Tc": 190.56, "Pc": 4.599},   # CH4
    "CO2":      {"M": 44.01,  "Tc": 304.13, "Pc": 7.377}    # CO2
}

# --- 4. Real Gas Density Calculator (Redlich-Kwong EOS) ---
# We need this to convert between Excess and Absolute adsorption.
# Density (rho) = (P * M) / (Z * R * T)
def calculate_gas_density(pressure_mpa, temp_k, gas_type):
    # Convert Pressure to Bar for standard EOS calcs (1 MPa = 10 Bar)
    P_bar = pressure_mpa * 10
    props = GAS_PROPS.get(gas_type, GAS_PROPS["Hydrogen"])
    
    Tc = props["Tc"]
    Pc = props["Pc"]
    M = props["M"] # g/mol

    # Reduced properties
    Tr = temp_k / Tc
    Pr = P_bar / Pc

    # Redlich-Kwong Parameters
    a = 0.42748 * (R_GAS**2 * Tc**2.5) / Pc
    b = 0.08664 * (R_GAS * Tc) / Pc

    # Coefficients for Cubic Equation for V (molar volume)
    # P = RT/(V-b) - a/(T^0.5 * V * (V+b))
    # Rearranging for compressibility Z... 
    # Simplified approximation for Bulk Density (rho_bulk) in g/cm3
    
    # Using Ideal Gas Law as baseline and adjusting with simple compressibility factor Z
    # This is a robust approximation for the web tool speed vs accuracy trade-off
    
    # Calculate Z (Compressibility Factor) using simplified correlation
    # For H2/CH4/CO2 at typical adsorption pressures (0-20 MPa)
    if gas_type == "Hydrogen":
        Z = 1.0 + (0.0006 * P_bar) # H2 is slightly repulsive at high P
    elif gas_type == "CO2":
        Z = 1.0 - (0.005 * P_bar) + (0.00002 * P_bar**2) # CO2 deviates significantly
        if Z < 0.3: Z = 0.3 # Safety floor
    else: # Methane
        Z = 1.0 - (0.002 * P_bar)
        if Z < 0.6: Z = 0.6

    # Density formula: rho = (P * M) / (Z * R * T)
    # Units: P(MPa -> Pa), M(g/mol), R(8.314), T(K)
    # Result needs to be g/cm3. 
    # 1 MPa = 10^6 Pa. 1 m3 = 10^6 cm3.
    
    P_pa = pressure_mpa * 1e6
    rho_g_m3 = (P_pa * M) / (Z * R_GAS * temp_k) # g/m3
    rho_g_cm3 = rho_g_m3 / 1e6 # Convert to g/cm3
    
    return rho_g_cm3

# --- 5. Adsorption Models ---
# n_abs: Absolute Uptake (wt%)
# P: Pressure (MPa)
# params: [n_max, b, c]

def langmuir_model(P, n_max, b, c=1):
    # c is unused in Langmuir but kept for signature consistency
    return (n_max * b * P) / (1 + b * P)

def toth_model(P, n_max, b, t):
    # Toth equation: n = n_max * P / (b + P^t)^(1/t)
    # Note: Usually written with b as P_s or similar. 
    # Using form: n = n_max * P / ( (1/b) + P^t )^(1/t) -> Simplified standard Toth:
    return n_max * P / ((1/b + P**t)**(1/t))

def sips_model(P, n_max, b, n):
    # Sips (Langmuir-Freundlich): n = n_max * (bP)^1/n / (1 + (bP)^1/n)
    return (n_max * (b * P)**(1/n)) / (1 + (b * P)**(1/n))

# --- 6. The "Excess" Fitting Function ---
# m_exc = m_abs - (rho_bulk * v_pore)
def excess_function_wrapper(P, n_max, b, c, v_pore, gas_type, temp, model_name):
    rho = np.array([calculate_gas_density(p, temp, gas_type) for p in P])
    
    if model_name == 'langmuir':
        n_abs = langmuir_model(P, n_max, b)
    elif model_name == 'sips':
        n_abs = sips_model(P, n_max, b, c)
    else: # toth
        n_abs = toth_model(P, n_max, b, c)
        
    # Excess = Absolute - (Density * PoreVolume * ScalingFactor)
    # Scaling: rho is g/cm3. v_pore is cm3/g. Result is g/g.
    # Convert g/g to wt% by multiplying by 100.
    return n_abs - (rho * v_pore * 100)

# --- 7. Main API Endpoint ---
@app.get("/")
def home():
    return {"status": "Adsorption Backend is Running on Vercel"}

@app.post("/calculate")
async def calculate_isotherms(req: CalculateRequest):
    try:
        # 1. Extract Data
        pressures = np.array([d.pressure for d in req.data])
        excess_raw = np.array([d.excessUptake for d in req.data])
        
        # 2. Initial Parameter Guesses [n_max, b, c, v_pore]
        # n_max: slightly higher than max observed uptake
        # b: affinity (start small)
        # c: heterogeneity (start near 1)
        # v_pore: typical range 0.1 - 2.0 cm3/g
        p0 = [max(excess_raw) * 1.2, 0.5, 1.0, 0.5] 
        
        # Bounds: ((min), (max))
        # n_max > 0, b > 0, c (0-5), v_pore (0-5)
        bounds = ((0, 0, 0, 0), (np.inf, np.inf, 5, 5))

        # 3. Perform Curve Fitting
        # We define a temporary lambda to freeze the non-fitting variables (gas, temp, model)
        def fit_wrapper(p_arr, n_m, bb, cc, vp):
            return excess_function_wrapper(p_arr, n_m, bb, cc, vp, req.gasType, req.temperature, req.model)

        popt, pcov = curve_fit(fit_wrapper, pressures, excess_raw, p0=p0, bounds=bounds, maxfev=5000)

        n_max_fit, b_fit, c_fit, vp_fit = popt

        # 4. Generate Smooth Curves for Plotting (High Resolution)
        smooth_pressures = np.linspace(0, max(pressures) * 1.1, 50)
        
        # Calculate Density Array for smooth curve
        densities = np.array([calculate_gas_density(p, req.temperature, req.gasType) for p in smooth_pressures])
        
        # Calculate Absolute Loading (Model)
        if req.model == 'langmuir':
            abs_curve = langmuir_model(smooth_pressures, n_max_fit, b_fit, c_fit)
        elif req.model == 'sips':
            abs_curve = sips_model(smooth_pressures, n_max_fit, b_fit, c_fit)
        else: # toth
            abs_curve = toth_model(smooth_pressures, n_max_fit, b_fit, c_fit)
            
        # Calculate Excess Fit Curve
        exc_curve = abs_curve - (densities * vp_fit * 100)
        
        # Calculate Total Capacity (m_P = m_abs + rho_bulk * v_pore)
        # Wait, usually Total = Absolute + (rho * v_pore).
        # But conceptually, Total = Everything in the pore.
        # m_total = m_abs + (rho_bulk * (v_pore - v_ads_layer))? 
        # For simplicity in this tool: Total = m_excess + (rho_bulk * v_pore)
        # which mathematically simplifies back to m_absolute.
        # However, physically "Total Capacity" usually refers to the max storage density.
        # Let's visualize Total as (Excess + Bulk Density * Pore Volume).
        total_curve = exc_curve + (densities * vp_fit * 100)

        # 5. Format Response
        chart_data = []
        
        # Map raw data to nearest pressure points if possible, or just append smooth data
        # We will iterate through smooth pressures
        for i, p in enumerate(smooth_pressures):
            point = {
                "pressure": round(p, 4),
                "absolute": round(abs_curve[i], 4),
                "excessFit": round(exc_curve[i], 4),
                "total": round(total_curve[i], 4),
                "excessRaw": None # Placeholder
            }
            chart_data.append(point)

        # Merge Raw Data into the chart data (find nearest pressure match)
        for i, raw_p in enumerate(pressures):
            # Find closest point in smooth curve
            idx = (np.abs(smooth_pressures - raw_p)).argmin()
            chart_data[idx]["excessRaw"] = excess_raw[i]

        return {
            "parameters": {
                "vp": round(vp_fit, 4),
                "rhoA": "N/A", # Derived parameter, complex to back-calculate here
                "b": round(b_fit, 4),
                "c": round(c_fit, 4),
                "n_max": round(n_max_fit, 4)
            },
            "chartData": chart_data
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Entry point for local testing (Vercel ignores this)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)