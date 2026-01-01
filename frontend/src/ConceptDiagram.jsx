import React from 'react';

const ConceptDiagram = () => {
  return (
    <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#fff', borderRadius: '8px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '15px', color: '#333' }}>
        Physical Explanation (Pore View)
      </h3>
      <svg viewBox="0 0 300 240" style={{ width: '100%', height: 'auto', maxWidth: '280px' }}>
        
        {/* --- DEFINITIONS (Patterns & Gradients) --- */}
        <defs>
          {/* Gradient for Cylinder Body (3D effect) */}
          <linearGradient id="cylinderBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          
          {/* Gradient for Adsorbed Layer (Dark Blue) */}
          <linearGradient id="adsLayer" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="20%" stopColor="#1e40af" />
            <stop offset="80%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
        </defs>

        {/* --- TOP CYLINDER (Stage A: High P) --- */}
        <text x="150" y="15" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#333">Stage A: Near Peak (Adsorbed Layer)</text>
        
        {/* Cylinder Body (Outer Shell) */}
        <path d="M 50 40 L 250 40 L 250 100 L 50 100 Z" fill="#cbd5e1" stroke="#333" strokeWidth="2" />
        <ellipse cx="50" cy="70" rx="10" ry="30" fill="#94a3b8" stroke="#333" strokeWidth="2" />
        <ellipse cx="250" cy="70" rx="10" ry="30" fill="#cbd5e1" stroke="#333" strokeWidth="2" />

        {/* Adsorbed Layer (Top & Bottom inside) */}
        <rect x="50" y="42" width="200" height="15" fill="#1e3a8a" />
        <rect x="50" y="83" width="200" height="15" fill="#1e3a8a" />
        
        {/* Bulk Gas (Middle - Light Blue) */}
        <rect x="50" y="57" width="200" height="26" fill="#60a5fa" opacity="0.8" />
        <text x="150" y="75" fontSize="11" fill="#fff" fontWeight="bold" textAnchor="middle">Dense Bulk Gas (ρB)</text>
        
        {/* Labels for Top Diagram */}
        <text x="150" y="53" fontSize="10" fill="#fff" textAnchor="middle">ρA (Layer)</text>
        <text x="150" y="95" fontSize="10" fill="#fff" textAnchor="middle">ρA (Layer)</text>
        
        {/* Right Label (Large Excess) */}
        <path d="M 265 50 Q 280 70 265 90" fill="none" stroke="#333" markerEnd="url(#arrow)" />
        <text x="270" y="60" fontSize="10" fontWeight="bold">Large Excess</text>
        <text x="270" y="75" fontSize="9" fontStyle="italic">mE = mA - mB</text>


        {/* --- BOTTOM CYLINDER (Stage B: Very High P) --- */}
        <text x="150" y="130" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#333">Stage B: After Drop (Very High P)</text>

        {/* Cylinder Body */}
        <path d="M 50 140 L 250 140 L 250 200 L 50 200 Z" fill="#1e3a8a" stroke="#333" strokeWidth="2" />
        <ellipse cx="50" cy="170" rx="10" ry="30" fill="#172554" stroke="#333" strokeWidth="2" />
        <ellipse cx="250" cy="170" rx="10" ry="30" fill="#1e3a8a" stroke="#333" strokeWidth="2" />

        {/* Full Density Text */}
        <text x="