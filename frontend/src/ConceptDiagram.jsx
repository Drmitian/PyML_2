import React from 'react';

const ConceptDiagram = () => {
  return (
    <div style={{ textAlign: 'center', padding: '10px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
        Adsorption Definitions
      </h3>
      <svg viewBox="0 0 300 220" style={{ width: '100%', height: 'auto', maxWidth: '300px' }}>
        {/* --- Background (The Pore Volume) --- */}
        <defs>
            {/* Pattern for Bulk Gas (Sparse Dots) */}
            <pattern id="bulkGas" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1.5" fill="#9ca3af" />
            </pattern>
            {/* Pattern for Adsorbed Layer (Dense Dots) */}
            <pattern id="adsorbedLayer" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="2.5" fill="#2563eb" />
            </pattern>
        </defs>

        {/* 1. The Container (Pore) */}
        <rect x="50" y="20" width="200" height="180" fill="none" stroke="#333" strokeWidth="2" />
        <text x="260" y="110" fontSize="12" fill="#666" style={{writingMode: 'vertical-rl'}}>Pore Volume</text>

        {/* 2. Bulk Gas Area (Top - Sparse) */}
        <rect x="50" y="20" width="200" height="180" fill="url(#bulkGas)" opacity="0.5" />
        
        {/* 3. Adsorbed Layer (Bottom/Sides - Dense) */}
        {/* We simulate a layer on the bottom surface */}
        <rect x="50" y="140" width="200" height="60" fill="url(#adsorbedLayer)" />
        <line x1="50" y1="140" x2="250" y2="140" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 2" />

        {/* --- Annotations (The Physics) --- */}
        
        {/* Absolute Label */}
        <line x1="10" y1="140" x2="45" y2="140" stroke="#2563eb" markerEnd="url(#arrow)" />
        <line x1="10" y1="200" x2="45" y2="200" stroke="#2563eb" />
        <line x1="10" y1="140" x2="10" y2="200" stroke="#2563eb" strokeWidth="2" />
        <text x="15" y="175" fontSize="10" fill="#2563eb" fontWeight="bold" transform="rotate(-90 15,175)">Absolute</text>
        <text x="35" y="175" fontSize="8" fill="#2563eb" transform="rotate(-90 35,175)">(Surface Only)</text>

        {/* Excess Label */}
        <text x="150" y="130" fontSize="11" fill="#dc2626" fontWeight="bold" textAnchor="middle">Excess Uptake</text>
        <text x="150" y="142" fontSize="9" fill="#555" textAnchor="middle">(Measured)</text>
        <path d="M 100 120 Q 150 150 200 120" stroke="#dc2626" fill="none" markerEnd="url(#arrow)" />

        {/* Total Label */}
        <rect x="60" y="30" width="80" height="20" fill="white" stroke="#16a34a" rx="4" />
        <text x="100" y="44" fontSize="10" fill="#16a34a" fontWeight="bold" textAnchor="middle">Total Capacity</text>
        <text x="170" y="44" fontSize="9" fill="#16a34a">= Adsorbed + Bulk</text>

        {/* Legend for the Diagram */}
        <circle cx="70" cy="210" r="3" fill="#2563eb" />
        <text x="80" y="213" fontSize="9" fill="#333">Adsorbed Molecule</text>
        
        <circle cx="180" cy="210" r="2" fill="#9ca3af" />
        <text x="190" y="213" fontSize="9" fill="#333">Free Gas</text>

      </svg>
      <div style={{ fontSize: '11px', color: '#666', marginTop: '5px', textAlign: 'left', lineHeight: '1.4' }}>
        <strong>Excess:</strong> What you measure (weight change).<br/>
        <strong>Absolute:</strong> The actual dense layer on the surface.<br/>
        <strong>Total:</strong> Everything inside the tank/pore.
      </div>
    </div>
  );
};

export default ConceptDiagram;