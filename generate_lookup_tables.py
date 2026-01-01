import CoolProp.CoolProp as CP
import numpy as np
import pandas as pd

# ---------------------------------------------------------
# CONFIGURATION: "Mini-REFPROP" Ranges
# ---------------------------------------------------------
GASES = ['Hydrogen', 'Methane', 'CarbonDioxide']
T_RANGE = np.arange(50, 400, 2)      # 50K to 400K (2K steps)
P_RANGE = np.arange(0, 50, 0.1)      # 0 to 50 MPa (0.1 MPa steps)

data = []

print("Generating high-precision EOS tables...")

for gas in GASES:
    # Map to CoolProp names
    cp_name = "H2" if gas == "Hydrogen" else "CH4" if gas == "Methane" else "CO2"
    
    print(f"Processing {gas}...")
    
    for T in T_RANGE:
        for P_MPa in P_RANGE:
            try:
                # CoolProp inputs: P in Pa, T in K. Output: Density in kg/m3
                P_Pa = P_MPa * 1e6
                rho_kg_m3 = CP.PropsSI('D', 'T', T, 'P', P_Pa, cp_name)
                
                # Convert to g/cm3
                rho_g_cm3 = rho_kg_m3 / 1000.0
                
                data.append({
                    "Gas": gas,
                    "T_K": round(T, 1),
                    "P_MPa": round(P_MPa, 2),
                    "Density_g_cm3": round(rho_g_cm3, 6)
                })
            except:
                continue

# Save to CSV in the backend folder
# NOTE: Ensure the 'backend' folder exists relative to where you run this script
df = pd.DataFrame(data)
output_path = 'backend/gas_lookup.csv' 
df.to_csv(output_path, index=False)
print(f"✅ Done! Saved '{output_path}'. Now push this CSV to GitHub.")