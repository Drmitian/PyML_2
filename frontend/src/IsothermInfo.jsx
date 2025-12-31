import React from 'react';
import { X, Info } from 'lucide-react';

const IsothermInfoModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  };

  const modalStyle = {
    backgroundColor: 'white', padding: '25px', borderRadius: '8px',
    maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto',
    position: 'relative', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  const closeBtnStyle = {
    position: 'absolute', top: '15px', right: '15px',
    background: 'none', border: 'none', cursor: 'pointer', color: '#666'
  };

  const sectionTitleStyle = {
    fontSize: '18px', fontWeight: 'bold', marginTop: '20px', marginBottom: '10px',
    borderBottom: '1px solid #eee', paddingBottom: '5px'
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <button style={closeBtnStyle} onClick={onClose}><X size={24} /></button>
        
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '10px' }}>
          <Info size={24} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}/>
          Guide to Isotherms
        </h2>

        <div style={sectionTitleStyle}>1. Understanding the Chart Lines</div>
        
        <div style={{ marginBottom: '15px' }}>
          <p style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#000000' }}>● Experimental Data (Black Dots):</span><br/>
            The raw data points uploaded from your lab measurements. This represents <strong>Excess Adsorption</strong> (gas measured excluding the bulk gas in the pore volume).
          </p>

          <p style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#2563eb' }}>— Excess Fit (Blue Line):</span><br/>
            The mathematical model (Toth/Langmuir/Sips) fitted to your experimental points. It smooths out noise and interpolates the data.
          </p>

          <p style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#9333ea' }}>- - Absolute Calc (Purple Dashed):</span><br/>
            The calculated <strong>true amount</strong> of gas stuck to the material surface. It is higher than "Excess" because it adds back the gas molecules that would naturally occupy the pore space.
          </p>

          <p style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#059669' }}>— Total Capacity (Green Line):</span><br/>
            The practical storage capacity of a tank filled with this material. It is the sum of the Absolute Adsorbed gas + the compressed Bulk Gas in the voids.
          </p>
        </div>

        <div style={sectionTitleStyle}>2. Fitted Parameters</div>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>
            <strong>Pore Volume (v<sub>P</sub>):</strong> The volume of empty space inside the material (cm³/g). Higher means more room for gas.
          </li>
          <li>
            <strong>Density (ρ<sub>A</sub>):</strong> The density of the adsorbed gas layer (g/cm³). This layer is often as dense as liquid.
          </li>
          <li>
            <strong>Affinity (b):</strong> How "sticky" the surface is. A higher number means the material grabs gas strongly at low pressure.
          </li>
          <li>
            <strong>Heterogeneity (c):</strong> How uniform the surface is (0 to 1). 
            <br/><span style={{fontSize: '0.9em', color: '#666'}}>1.0 = Perfectly uniform (Langmuir). <br/> &lt; 1.0 = Varied binding sites (Toth/Sips).</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default IsothermInfoModal;