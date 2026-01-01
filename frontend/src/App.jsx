import React, { useState, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Upload, Settings, Info, Download, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import IsothermInfoModal from './IsothermInfo';
import ConceptDiagram from './ConceptDiagram';

const AdsorptionDashboard = () => {
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
  
  const chartRef = useRef(null);

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

  const containerStyle = { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1600px', margin: '0 auto' };
  const cardStyle = { border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginBottom: '20px', backgroundColor: 'white' };
  const buttonStyle = { width: '100%', padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
  const secondaryBtnStyle = { ...buttonStyle, backgroundColor: '#ffffff', color: '#333', border: '1px solid #ccc' };
  const inputStyle = { width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' };

  return (
    <div style={containerStyle}>
      <IsothermInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

      <header style={{ borderBottom: '1px solid #eee', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Total Gas Adsorption Evaluator</h1>
        <button onClick={() => setShowInfo(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid #ccc', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
          <Info size={18} /> Help & Definitions
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        <div>
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

          <div style={cardStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
              <Settings size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} /> Parameters
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ ...cardStyle, height: 'auto', padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(450px, 3fr) minmax(250px, 1fr)', gap: '20px', alignItems: 'start' }}>
              
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
                          wrapperStyle={{ fontSize: '12px' }}
                          payload={[
                            { value: 'Experimental Data', type: 'circle', id: 'exp', color: '#000000', fill: '#000000' }, 
                            { value: 'Excess (Fit)', type: 'plain', id: 'exc', color: '#dc2626' },
                            { value: 'Absolute (Calc)', type: 'plain', id: 'abs', color: '#2563eb', payload: { strokeDasharray: '5 5' } },
                            { value: 'Total Capacity', type: 'plain', id: 'tot', color: '#16a34a' }
                          ]}
                        />

                        {/* 1. Total (Green Glow) - Bottom Layer, Thick & Transparent */}
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#16a34a" 
                          strokeWidth={6} 
                          strokeOpacity={0.4} 
                          name="Total Capacity" 
                          dot={false} 
                        />
                        
                        {/* 2. Absolute (Blue) - Middle Layer, Sharp & Dashed */}
                        <Line 
                          type="monotone" 
                          dataKey="absolute" 
                          stroke="#2563eb" 
                          strokeWidth={2} 
                          name="Absolute (Calc)" 
                          dot={false} 
                          strokeDasharray="5 5" 
                        />
                        
                        {/* 3. Excess (Red) - Top Layer */}
                        <Line 
                          type="monotone" 
                          dataKey="excessFit" 
                          stroke="#dc2626" 
                          strokeWidth={2} 
                          name="Excess (Fit)" 
                          dot={false} 
                        />
                        
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
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      Upload data to visualize isotherms
                    </div>
                  )}
                </div>
              </div>

              <div style={{ width: '100%', height: '580px' }}>
                 <ConceptDiagram />
              </div>
            </div>
          </div>

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
    </div>
  );
};

export default AdsorptionDashboard;