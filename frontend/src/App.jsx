import React, { useState, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { Analytics } from '@vercel/analytics/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Upload, Settings, Info, Download, Image as ImageIcon, FileSpreadsheet, Beaker } from 'lucide-react';
import IsothermInfoModal from './IsothermInfo';
import ConceptDiagram from './ConceptDiagram';

// --- DEMO DATA (Pre-loaded from te7_test.csv) ---
const DEMO_INPUT_DATA = [
  { pressure: 0.1, excessUptake: 0.85 }, { pressure: 0.5, excessUptake: 1.62 },
  { pressure: 1.0, excessUptake: 1.95 }, { pressure: 2.0, excessUptake: 2.18 },
  { pressure: 3.0, excessUptake: 2.25 }, { pressure: 4.0, excessUptake: 2.28 },
  { pressure: 5.0, excessUptake: 2.25 }, { pressure: 6.0, excessUptake: 2.2 },
  { pressure: 8.0, excessUptake: 2.1 }, { pressure: 10.0, excessUptake: 1.98 },
  { pressure: 12.0, excessUptake: 1.85 }, { pressure: 14.0, excessUptake: 1.72 }
];

const DEMO_RESULTS = {
  parameters: { vp: 0.3449, rhoA: 0.0976, c: 0.5369, b: 8.409 },
  chartData: [
    { pressure: 0.0, excessFit: 0.0, absolute: 0, total: 0.0, excessRaw: 0.85 },
    { pressure: 0.2847, excessFit: 1.3495, absolute: 1.362, total: 1.3804, excessRaw: null },
    { pressure: 0.5695, excessFit: 1.6951, absolute: 1.7267, total: 1.7567, excessRaw: 1.62 },
    { pressure: 0.8542, excessFit: 1.8806, absolute: 1.9336, total: 1.9729, excessRaw: null },
    { pressure: 1.139, excessFit: 1.9981, absolute: 2.0737, total: 2.1209, excessRaw: 1.95 },
    { pressure: 1.4237, excessFit: 2.0783, absolute: 2.1775, total: 2.2317, excessRaw: null },
    { pressure: 1.7085, excessFit: 2.1355, absolute: 2.2587, total: 2.3191, excessRaw: null },
    { pressure: 1.9932, excessFit: 2.1769, absolute: 2.3246, total: 2.3908, excessRaw: 2.18 },
    { pressure: 2.278, excessFit: 2.2071, absolute: 2.3796, total: 2.4512, excessRaw: null },
    { pressure: 2.5627, excessFit: 2.229, absolute: 2.4265, total: 2.5031, excessRaw: null },
    { pressure: 2.8475, excessFit: 2.2443, absolute: 2.4671, total: 2.5484, excessRaw: null },
    { pressure: 3.1322, excessFit: 2.2546, absolute: 2.5028, total: 2.5885, excessRaw: 2.25 },
    { pressure: 3.4169, excessFit: 2.2607, absolute: 2.5344, total: 2.6244, excessRaw: null },
    { pressure: 3.7017, excessFit: 2.2634, absolute: 2.5627, total: 2.6567, excessRaw: null },
    { pressure: 3.9864, excessFit: 2.2633, absolute: 2.5883, total: 2.6861, excessRaw: 2.28 },
    { pressure: 4.2712, excessFit: 2.2608, absolute: 2.6116, total: 2.7131, excessRaw: null },
    { pressure: 4.5559, excessFit: 2.2563, absolute: 2.6328, total: 2.7379, excessRaw: null },
    { pressure: 4.8407, excessFit: 2.25, absolute: 2.6524, total: 2.7609, excessRaw: null },
    { pressure: 5.1254, excessFit: 2.2421, absolute: 2.6704, total: 2.7822, excessRaw: 2.25 },
    { pressure: 5.4102, excessFit: 2.233, absolute: 2.6872, total: 2.8021, excessRaw: null },
    { pressure: 5.6949, excessFit: 2.2227, absolute: 2.7028, total: 2.8208, excessRaw: null },
    { pressure: 5.9797, excessFit: 2.2114, absolute: 2.7173, total: 2.8383, excessRaw: 2.2 },
    { pressure: 6.2644, excessFit: 2.1991, absolute: 2.7309, total: 2.8549, excessRaw: null },
    { pressure: 6.5492, excessFit: 2.1861, absolute: 2.7437, total: 2.8705, excessRaw: null },
    { pressure: 6.8339, excessFit: 2.1723, absolute: 2.7558, total: 2.8853, excessRaw: null },
    { pressure: 7.1186, excessFit: 2.1579, absolute: 2.7672, total: 2.8993, excessRaw: null },
    { pressure: 7.4034, excessFit: 2.1428, absolute: 2.778, total: 2.9127, excessRaw: null },
    { pressure: 7.6881, excessFit: 2.1273, absolute: 2.7882, total: 2.9255, excessRaw: null },
    { pressure: 7.9729, excessFit: 2.1112, absolute: 2.7979, total: 2.9376, excessRaw: 2.1 },
    { pressure: 8.2576, excessFit: 2.0948, absolute: 2.8071, total: 2.9493, excessRaw: null },
    { pressure: 8.5424, excessFit: 2.0779, absolute: 2.8159, total: 2.9604, excessRaw: null },
    { pressure: 8.8271, excessFit: 2.0607, absolute: 2.8243, total: 2.9711, excessRaw: null },
    { pressure: 9.1119, excessFit: 2.0431, absolute: 2.8323, total: 2.9814, excessRaw: null },
    { pressure: 9.3966, excessFit: 2.0252, absolute: 2.84, total: 2.9913, excessRaw: null },
    { pressure: 9.6814, excessFit: 2.0071, absolute: 2.8474, total: 3.0008, excessRaw: null },
    { pressure: 9.9661, excessFit: 1.9887, absolute: 2.8545, total: 3.01, excessRaw: 1.98 },
    { pressure: 10.2508, excessFit: 1.9701, absolute: 2.8612, total: 3.0189, excessRaw: null },
    { pressure: 10.5356, excessFit: 1.9512, absolute: 2.8678, total: 3.0274, excessRaw: null },
    { pressure: 10.8203, excessFit: 1.9322, absolute: 2.8741, total: 3.0357, excessRaw: null },
    { pressure: 11.1051, excessFit: 1.913, absolute: 2.8801, total: 3.0437, excessRaw: null },
    { pressure: 11.3898, excessFit: 1.8936, absolute: 2.8859, total: 3.0515, excessRaw: null },
    { pressure: 11.6746, excessFit: 1.8741, absolute: 2.8916, total: 3.059, excessRaw: null },
    { pressure: 11.9593, excessFit: 1.8544, absolute: 2.897, total: 3.0663, excessRaw: 1.85 },
    { pressure: 12.2441, excessFit: 1.8346, absolute: 2.9023, total: 3.0734, excessRaw: null },
    { pressure: 12.5288, excessFit: 1.8147, absolute: 2.9074, total: 3.0803, excessRaw: null },
    { pressure: 12.8136, excessFit: 1.7946, absolute: 2.9123, total: 3.0869, excessRaw: null },
    { pressure: 13.0983, excessFit: 1.7745, absolute: 2.9171, total: 3.0935, excessRaw: null },
    { pressure: 13.3831, excessFit: 1.7543, absolute: 2.9217, total: 3.0998, excessRaw: null },
    { pressure: 13.6678, excessFit: 1.734, absolute: 2.9262, total: 3.1059, excessRaw: null },
    { pressure: 13.9525, excessFit: 1.7136, absolute: 2.9306, total: 3.112, excessRaw: 1.72 },
    { pressure: 14.2373, excessFit: 1.6932, absolute: 2.9348, total: 3.1178, excessRaw: null },
    { pressure: 14.522, excessFit: 1.6727, absolute: 2.9389, total: 3.1235, excessRaw: null },
    { pressure: 14.8068, excessFit: 1.6522, absolute: 2.9429, total: 3.1291, excessRaw: null },
    { pressure: 15.0915, excessFit: 1.6316, absolute: 2.9468, total: 3.1345, excessRaw: null },
    { pressure: 15.3763, excessFit: 1.6109, absolute: 2.9506, total: 3.1398, excessRaw: null },
    { pressure: 15.661, excessFit: 1.5902, absolute: 2.9543, total: 3.145, excessRaw: null },
    { pressure: 15.9458, excessFit: 1.5695, absolute: 2.9579, total: 3.1501, excessRaw: null },
    { pressure: 16.2305, excessFit: 1.5487, absolute: 2.9614, total: 3.1551, excessRaw: null },
    { pressure: 16.5153, excessFit: 1.5279, absolute: 2.9648, total: 3.1599, excessRaw: null },
    { pressure: 16.8, excessFit: 1.5071, absolute: 2.9682, total: 3.1647, excessRaw: null }
  ]
};

const AdsorptionDashboard = () => {
  // --- State Management (Initialized with Demo Data) ---
  const [inputData, setInputData] = useState(DEMO_INPUT_DATA); // <--- Demo Data
  const [results, setResults] = useState(DEMO_RESULTS);        // <--- Demo Results
  
  const [config, setConfig] = useState({
    gasType: 'Hydrogen',
    temperature: 77,
    model: 'toth',
    poreVolumeMode: 'fitted', 
    fixedPoreVolume: 0.5
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  const chartRef = useRef(null);

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
      setResults(null); // Clear old demo results when new file is uploaded
    };
    reader.readAsText(file);
  };

  const handleCalculate = async () => {
    if (inputData.length === 0) {
      alert("Please upload a CSV file with data first.");
      return;
    }

    setIsProcessing(true);
    try {
      const backendUrl = '/calculate'; 

      const response = await axios.post(backendUrl, {
        gasType: config.gasType,
        model: config.model,
        poreVolumeMode: config.poreVolumeMode,
        fixedPoreVolume: parseFloat(config.fixedPoreVolume),
        datasets: [
            {
                temperature: config.temperature,
                data: inputData
            }
        ]
      });
      
      const firstSet = response.data.datasets[0];
      const globalParams = response.data.globalParameters;
      const warnings = response.data.warnings || [];

      if(warnings.length > 0) alert(warnings.join('\n'));

      setResults({
        chartData: firstSet.chartData,
        parameters: {
            ...globalParams,
            b: firstSet.b
        }
      });

    } catch (error) {
      console.error("Full Error Details:", error);
      if (error.response) {
        alert(`Server Error (${error.response.status}):\n${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        alert("Network Error: No response received. Check if Backend is running.");
      } else {
        alert(`Error: ${error.message}`);
      }
    }
    setIsProcessing(false);
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Pressure(MPa),ExcessUptake(wt%)\n0.1,0.5\n0.5,1.2\n1.0,2.5\n2.0,3.8\n5.0,4.5";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template_adsorption_data.csv";
    link.click();
  };

  const handleDownloadResultsData = () => {
    if (!results) return;
    let csv = "Pressure(MPa),Excess_Raw,Excess_Fit,Absolute_Calc,Total_Capacity\n";
    results.chartData.forEach(row => {
      csv += `${row.pressure},${row.excessRaw || ''},${row.excessFit},${row.absolute},${row.total}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `results_${config.gasType}_${config.model}.csv`;
    link.click();
  };

  const handleDownloadImage = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.download = `isotherm_chart_${config.gasType}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  // --- Styles ---
  const containerStyle = { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1600px', margin: '0 auto' };
  const cardStyle = { border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginBottom: '20px', backgroundColor: 'white' };
  const buttonStyle = { width: '100%', padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
  const disabledBtnStyle = { ...buttonStyle, backgroundColor: '#9ca3af', cursor: 'not-allowed' };
  const secondaryBtnStyle = { ...buttonStyle, backgroundColor: '#ffffff', color: '#333', border: '1px solid #ccc' };
  const inputStyle = { width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' };
  const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' };

  return (
    <div style={containerStyle}>
      <IsothermInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

      {/* HEADER */}
      <header style={{ borderBottom: '1px solid #eee', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Total Gas Adsorption Evaluator</h1>
        <button onClick={() => setShowInfo(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid #ccc', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
          <Info size={18} /> Help & Definitions
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        
        {/* LEFT COLUMN: Controls */}
        <div>
          {/* 1. Upload Section */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                <Upload size={20} style={{ marginRight: '10px' }} /> Data Input
              </h2>
              <button onClick={handleDownloadTemplate} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Template</button>
            </div>
            <div style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
              <input type="file" onChange={handleFileUpload} accept=".csv,.txt" />
              <p style={{ marginTop: '10px', color: '#666', fontSize: '13px' }}>Upload CSV</p>
            </div>
            {inputData.length > 0 && <div style={{ marginTop: '10px', color: 'green', fontWeight: 'bold' }}>✓ Loaded {inputData.length} points</div>}
          </div>

          {/* 2. Parameters Section */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
              <Settings size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} /> Parameters
            </h2>
            
            <label style={labelStyle}>Gas Type:</label>
            <select style={inputStyle} value={config.gasType} onChange={(e) => setConfig({ ...config, gasType: e.target.value })}>
              <option value="Hydrogen">Hydrogen (H₂)</option>
              <option value="Methane">Methane (CH₄)</option>
              <option value="CO2">Carbon Dioxide (CO₂)</option>
            </select>
            
            <label style={labelStyle}>Model:</label>
            <select style={inputStyle} value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })}>
              <option value="toth">Toth</option>
              <option value="langmuir">Langmuir</option>
              <option value="sips">Sips</option>
            </select>
            
            <label style={labelStyle}>Temperature (K):</label>
            <input type="number" style={inputStyle} value={config.temperature} onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })} />

            {/* Pore Volume Config */}
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #eee' }}>
              <label style={labelStyle}>
                 <Beaker size={16} style={{display:'inline', marginRight:'5px', verticalAlign:'text-bottom'}}/> 
                 Pore Volume (vP):
              </label>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <label style={{ fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="vpMode" 
                    checked={config.poreVolumeMode === 'fitted'} 
                    onChange={() => setConfig({...config, poreVolumeMode: 'fitted'})}
                  /> Auto-Fit
                </label>
                <label style={{ fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="vpMode" 
                    checked={config.poreVolumeMode === 'fixed'} 
                    onChange={() => setConfig({...config, poreVolumeMode: 'fixed'})}
                  /> Fixed
                </label>
              </div>

              {config.poreVolumeMode === 'fixed' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input 
                    type="number" 
                    step="0.01" 
                    style={{ ...inputStyle, marginBottom: 0 }} 
                    value={config.fixedPoreVolume} 
                    onChange={(e) => setConfig({...config, fixedPoreVolume: e.target.value})}
                  />
                  <span style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>cm³/g</span>
                </div>
              )}
            </div>

            <button 
                style={inputData.length === 0 ? disabledBtnStyle : buttonStyle} 
                onClick={handleCalculate} 
                disabled={isProcessing || inputData.length === 0}
            >
              {isProcessing ? 'Calculated...' : 'Generate Isotherms'}
            </button>
          </div>

          {/* 3. Export Section */}
          {results && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
                <Download size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} /> Exports
              </h2>
              <button style={secondaryBtnStyle} onClick={handleDownloadImage}>
                <ImageIcon size={16} /> Save PNG (Chart Only)
              </button>
              <button style={secondaryBtnStyle} onClick={handleDownloadResultsData}>
                <FileSpreadsheet size={16} /> Save CSV
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Visualization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Chart & Diagram */}
          <div style={{ ...cardStyle, height: 'auto', padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(450px, 3fr) minmax(250px, 1fr)', gap: '20px', alignItems: 'start' }}>
              
              {/* Main Chart */}
              <div style={{ width: '100%', padding: '10px', backgroundColor: 'white' }} ref={chartRef}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Adsorption Isotherms</h2>
                <div style={{ height: '550px', width: '100%' }}>
                  {results ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={results.chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="pressure" label={{ value: 'Pressure (MPa)', position: 'insideBottom', offset: -10 }} type="number" />
                        <YAxis label={{ value: 'Uptake (wt%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip contentStyle={{ border: '1px solid #ccc' }} />
                        
                        <Legend 
                          verticalAlign="top" 
                          height={36} 
                          payload={[
                            { value: 'Experimental Data', type: 'circle', color: '#000000', id: 'exp' },
                            { value: 'Excess (Fit)', type: 'line', color: '#dc2626', id: 'excess' },
                            { value: 'Absolute (Calc)', type: 'line', color: '#9333ea', id: 'abs' },
                            { value: 'Total Capacity', type: 'line', color: '#16a34a', id: 'total' }
                          ]}
                        />

                        <Line type="monotone" dataKey="total" stroke="#16a34a" strokeWidth={4} name="Total Capacity" dot={false} />
                        <Line type="monotone" dataKey="absolute" stroke="#9333ea" strokeWidth={2} name="Absolute (Calc)" dot={false} strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="excessFit" stroke="#dc2626" strokeWidth={2} name="Excess (Fit)" dot={false} />
                        <Line type="monotone" dataKey="excessRaw" stroke="none" name="Experimental Data" dot={{ r: 4, fill: '#000000', stroke: 'none' }} activeDot={{ r: 6 }} isAnimationActive={false} /> 
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      Upload data to visualize isotherms
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Diagram */}
              <div style={{ width: '100%', height: '580px' }}>
                 <ConceptDiagram />
              </div>
            </div>
          </div>

          {/* Results Table */}
          {results && (
            <div style={cardStyle}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '15px' }}>Fitted Parameters</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', textAlign: 'center' }}>
                <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Pore Volume (vP)</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>{results.parameters.vp} <span style={{fontSize:'12px'}}>cm³/g</span></div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Density (ρA)</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>{results.parameters.rhoA} <span style={{fontSize:'12px'}}>g/cm³</span></div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Affinity (b)</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>{results.parameters.b}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Heterogeneity (c)</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>{results.parameters.c}</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* FOOTER - OWNERSHIP & CREDITS */}
      <footer style={{ marginTop: '40px', textAlign: 'center', color: '#666', fontSize: '14px', borderTop: '1px solid #eee', padding: '20px' }}>
        <p>
          <strong>Total Gas Adsorption Evaluator</strong> &copy; 2025 Created by <strong>Mi Tian</strong>
        </p>
      </footer>
      
      {/* VERCEL ANALYTICS */}
      <Analytics />

    </div>
  );
};

export default AdsorptionDashboard;