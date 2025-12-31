import React, { useState } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Upload, FileText, Settings, Activity, Info } from 'lucide-react';
import IsothermInfoModal from './IsothermInfo';

const AdsorptionDashboard = () => {
  // --- State Management ---
  const [inputData, setInputData] = useState([]);
  const [config, setConfig] = useState({ 
    gasType: 'Hydrogen', 
    temperature: 77, 
    model: 'toth', 
    eosModel: 'nist_leachman' 
  });
  const [results, setResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // --- Handlers ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const rows = event.target.result.trim().split('\n');
      const parsedData = rows.map(row => {
        const [p, u] = row.split(/,|;|\t/);
        return { pressure: parseFloat(p), excessUptake: parseFloat(u) };
      }).filter(d => !isNaN(d.pressure) && !isNaN(d.excessUptake));
      setInputData(parsedData);
    };
    reader.readAsText(file);
  };

  const handleCalculate = async () => {
    setIsProcessing(true);
    try {
      const response = await axios.post('https://adsorption-backend.onrender.com/calculate', {
        temperature: config.temperature, 
        gasType: config.gasType, 
        model: config.model,
        data: inputData
      });
      setResults(response.data);
    } catch (error) {
      alert("Error: Is backend running? Or model not supported?");
    }
    setIsProcessing(false);
  };

  // --- Styles ---
  const containerStyle = { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' };
  const cardStyle = { border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginBottom: '20px', backgroundColor: 'white' };
  const buttonStyle = { width: '100%', padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' };
  const inputStyle = { width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' };

  return (
    <div style={containerStyle}>
      {/* Help Modal */}
      <IsothermInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

      {/* Header */}
      <header style={{ borderBottom: '1px solid #eee', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Total Gas Adsorption Evaluator</h1>
        <button 
          onClick={() => setShowInfo(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid #ccc', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
        >
          <Info size={18} /> Help & Definitions
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>

        {/* Left Column: Input & Controls */}
        <div>
          <div style={cardStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
              <Upload size={20} style={{ marginRight: '10px' }} /> Data Input
            </h2>
            <div style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
              <input type="file" onChange={handleFileUpload} accept=".csv,.txt" />
              <p style={{ marginTop: '10px', color: '#666' }}>Upload CSV (Pressure, Uptake)</p>
            </div>
            {inputData.length > 0 && <div style={{ marginTop: '10px', color: 'green' }}>Loaded {inputData.length} points</div>}
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
              <Settings size={20} style={{ marginRight: '10px' }} /> Parameters
            </h2>
            
            <label style={{ display: 'block', marginBottom: '5px' }}>Gas Type:</label>
            <select style={inputStyle} value={config.gasType} onChange={(e) => setConfig({ ...config, gasType: e.target.value })}>
              <option value="Hydrogen">Hydrogen (H₂)</option>
              <option value="Methane">Methane (CH₄)</option>
              <option value="CO2">Carbon Dioxide (CO₂)</option>
            </select>

            <label style={{ display: 'block', marginBottom: '5px' }}>Model:</label>
            <select style={inputStyle} value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })}>
              <option value="toth">Toth</option>
              <option value="langmuir">Langmuir</option>
              <option value="sips">Sips</option>
            </select>

            <label style={{ display: 'block', marginBottom: '5px' }}>Temperature (K):</label>
            <input type="number" style={inputStyle} value={config.temperature} onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })} />

            <button style={buttonStyle} onClick={handleCalculate} disabled={isProcessing}>
              {isProcessing ? 'Calculated...' : 'Generate Isotherms'}
            </button>
          </div>
        </div>

        {/* Right Column: Chart & Results */}
        <div>
          <div style={{ ...cardStyle, height: '500px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>Adsorption Isotherms</h2>
            {results ? (
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={results.chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="pressure" label={{ value: 'Pressure (MPa)', position: 'insideBottom', offset: -10 }} type="number" />
                  <YAxis label={{ value: 'Uptake (wt%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip contentStyle={{ border: '1px solid #ccc' }} />
                  
                  <Legend 
                    verticalAlign="top" 
                    height={36}
                    payload={[
                      { value: 'Absolute (Calc)', type: 'plain', id: 'abs', color: '#9333ea', payload: { strokeDasharray: '5 5' } },
                      { value: 'Excess (Fit)', type: 'plain', id: 'exc', color: '#2563eb' },
                      { value: 'Experimental Data', type: 'circle', id: 'exp', color: '#000000' }, 
                      { value: 'Total Capacity', type: 'plain', id: 'tot', color: '#059669' }
                    ]}
                  />

                  {/* Absolute: Dashed Purple */}
                  <Line type="monotone" dataKey="absolute" stroke="#9333ea" strokeWidth={2} name="Absolute (Calc)" dot={false} strokeDasharray="5 5" />
                  
                  {/* Excess Fit: Solid Blue */}
                  <Line type="monotone" dataKey="excessFit" stroke="#2563eb" strokeWidth={2} name="Excess (Fit)" dot={false} />
                  
                  {/* Total: Solid Green */}
                  <Line type="monotone" dataKey="total" stroke="#059669" strokeWidth={2} name="Total Capacity" dot={false} />
                  
                  {/* Experimental: Black Dots */}
                  <Line 
                    type="monotone" 
                    dataKey="excessRaw" 
                    stroke="none" 
                    name="Experimental Data" 
                    dot={{ r: 4, fill: '#000000', stroke: 'none' }} 
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  /> 
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                Upload data to visualize
              </div>
            )}
          </div>

          {results && (
            <div style={cardStyle}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>Fitted Parameters</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>Pore Volume (vP): <b>{results.parameters.vp} cm³/g</b></div>
                <div>Density (ρA): <b>{results.parameters.rhoA} g/cm³</b></div>
                <div>Affinity (b): <b>{results.parameters.b}</b></div>
                <div>Heterogeneity (c): <b>{results.parameters.c}</b></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdsorptionDashboard;