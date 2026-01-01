import React from 'react';

const ConceptDiagram = () => {
  // Updated styles with LARGER fonts for better readability
  const titleStyle = { fontSize: '18px', fontWeight: 'bold', fill: '#333' }; // Was 14px
  const bodyStyle = { fontSize: '14px', fill: '#333', lineHeight: 1.5 };    // Was 11px
  const mathStyle = { fontStyle: 'italic', fontWeight: 'bold', fontFamily: 'serif' };
  const labelStyle = { fontSize: '14px', fontWeight: 'bold', fill: '#003366' }; // Was 12px
  const arrowStyle = { fill: 'none', stroke: '#333', strokeWidth: '2', markerEnd: 'url(#arrow)' };
  const braceStyle = { fill: 'none', stroke: '#333', strokeWidth: '2' };

  return (
    // Removed fixed height, let it grow vertically
    <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eee', height: '100%', overflowY: 'auto' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '25px', color: '#333' }}>
        Adsorption Definitions Explained
      </h2>
      
      {/* TALL viewBox for Vertical Stacking (260px wide, 1050px high) */}
      <svg viewBox="0 0 260 1050" style={{ width: '100%', height: 'auto', maxWidth: '300px', margin: '0 auto', display: 'block' }}>
        <defs>
          {/* Patterns (same as before, just slightly scaled up visually) */}
          <pattern id="bulkGasDotsV" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="2" fill="#6699CC" opacity="0.7" />
          </pattern>
          <pattern id="adsLayerDotsV" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="2" fill="#003366" />
          </pattern>
          <pattern id="emptyStripesV" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <line x1="0" y1="12" x2="12" y2="0" stroke="#ccc" strokeWidth="1.5" />
          </pattern>
          {/* Thicker Arrow Marker */}
          <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,8 L12,4 z" fill="#333" />
          </marker>
        </defs>

        {/* ================= PANEL 1: EXCESS ADSORPTION (TOP) ================= */}
        <g transform="translate(30, 10)">
          <text x="100" y="0" textAnchor="middle" style={titleStyle}>1. Excess Adsorption (<tspan style={mathStyle}>m_E</tspan>)</text>
          
          <g transform="translate(0, 30)">
            {/* Pore Walls */}
            <path d="M 10 20 L 10 160 A 80 25 0 0 0 190 160 L 190 20 A 80 25 0 0 0 10 20" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="3"/>
            <ellipse cx="100" cy="20" rx="80" ry="25" fill="none" stroke="#9ca3af" strokeWidth="3"/>
            
            {/* Inner Region Boundary */}
            <path d="M 25 25 L 25 155 A 65 20 0 0 0 175 155 L 175 25 A 65 20 0 0 0 25 25" fill="none" />

            {/* Adsorbed Layer (Dense Dots) */}
            <path d="M 25 25 L 25 155 A 65 20 0 0 0 175 155 L 175 25 A 65 20 0 0 1 25 25" fill="url(#adsLayerDotsV)" opacity="0.9"/>
            
            {/* Bulk Gas (Sparse Dots + Stripes overlay) */}
            <path d="M 45 30 L 45 150 A 45 15 0 0 0 155 150 L 155 30 A 45 15 0 0 1 45 30" fill="url(#bulkGasDotsV)" />
            <path d="M 45 30 L 45 150 A 45 15 0 0 0 155 150 L 155 30 A 45 15 0 0 1 45 30" fill="url(#emptyStripesV)" opacity="0.3"/>
          </g>

          {/* Annotations */}
          <path d="M 90 140 L 125 115" style={arrowStyle} />
          <text x="130" y="120" style={bodyStyle} fontWeight="bold">Bulk Gas (<tspan style={mathStyle}>ρ_B</tspan>)</text>

          {/* Curly Brace label */}
          <path d="M 185 165 C 205 165, 205 185, 185 185" style={braceStyle} transform="rotate(90 185 175)"/>
          <text x="185" y="205" textAnchor="middle" style={labelStyle}>ONLY</text>
          <line x1="185" y1="160" x2="185" y2="145" stroke="#003366" strokeWidth="2"/>

          {/* Description */}
          <text x="100" y="235" textAnchor="middle" style={bodyStyle}>
            <tspan style={mathStyle} fontSize="16px">m_E</tspan>: The "extra" amount due to
          </text>
          <text x="100" y="255" textAnchor="middle" style={bodyStyle}>
            surface forces, above normal bulk density.
          </text>
          <text x="100" y="275" textAnchor="middle" style={bodyStyle} fontWeight="bold" fill="#dc2626">
            (This is what you measure experimentally)
          </text>
        </g>

        {/* Separator Line */}
        <line x1="10" y1="320" x2="250" y2="320" stroke="#eee" strokeWidth="2" />


        {/* ================= PANEL 2: ABSOLUTE ADSORPTION (MIDDLE) ================= */}
        {/* Shifted down by 350 units */}
        <g transform="translate(30, 360)">
          <text x="100" y="0" textAnchor="middle" style={titleStyle}>2. Absolute Adsorption (<tspan style={mathStyle}>m_A</tspan>)</text>
          
          <g transform="translate(0, 30)">
             {/* Pore Walls */}
             <path d="M 10 20 L 10 160 A 80 25 0 0 0 190 160 L 190 20 A 80 25 0 0 0 10 20" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="3"/>
             <ellipse cx="100" cy="20" rx="80" ry="25" fill="none" stroke="#9ca3af" strokeWidth="3"/>

            {/* Solid Adsorbed Layer */}
            <path d="M 25 25 L 25 155 A 65 20 0 0 0 175 155 L 175 25 A 65 20 0 0 1 25 25" fill="#003366" />
            
            {/* Empty Center (Stripes) */}
            <path d="M 45 30 L 45 150 A 45 15 0 0 0 155 150 L 155 30 A 45 15 0 0 1 45 30" fill="url(#emptyStripesV)" stroke="#9ca3af" strokeDasharray="5 3" strokeWidth="1.5"/>
            <ellipse cx="100" cy="30" rx="45" ry="15" fill="none" stroke="#9ca3af" strokeDasharray="5 3" strokeWidth="1.5"/>
          </g>

          {/* Curly Brace for v_A */}
          <path d="M 45 185 C 45 205, 155 205, 155 185" style={braceStyle} />
          <text x="100" y="215" textAnchor="middle" style={mathStyle} fontSize="16px">v_A (Layer Volume)</text>

          {/* Description */}
          <text x="100" y="245" textAnchor="middle" style={bodyStyle}>
            <tspan style={mathStyle} fontSize="16px">m_A</tspan>: The total amount of gas
          </text>
          <text x="100" y="265" textAnchor="middle" style={bodyStyle}>
            residing specifically within the
          </text>
          <text x="100" y="285" textAnchor="middle" style={bodyStyle}>
             adsorbed layer volume (<tspan style={mathStyle}>v_A</tspan>).
          </text>
        </g>

        {/* Separator Line */}
        <line x1="10" y1="680" x2="250" y2="680" stroke="#eee" strokeWidth="2" />


        {/* ================= PANEL 3: TOTAL ADSORPTION (BOTTOM) ================= */}
        {/* Shifted down by 720 units */}
        <g transform="translate(30, 720)">
          <text x="100" y="0" textAnchor="middle" style={titleStyle}>3. Total Adsorption (<tspan style={mathStyle}>m_P</tspan>)</text>
          
          <g transform="translate(0, 30)">
            {/* Pore Walls */}
            <path d="M 10 20 L 10 160 A 80 25 0 0 0 190 160 L 190 20 A 80 25 0 0 0 10 20" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="3"/>
            <ellipse cx="100" cy="20" rx="80" ry="25" fill="none" stroke="#9ca3af" strokeWidth="3"/>

            {/* Solid Adsorbed Layer */}
            <path d="M 25 25 L 25 155 A 65 20 0 0 0 175 155 L 175 25 A 65 20 0 0 1 25 25" fill="#003366" />
            
            {/* Solid Bulk Gas */}
            <path d="M 45 30 L 45 150 A 45 15 0 0 0 155 150 L 155 30 A 45 15 0 0 1 45 30" fill="#6699CC" />
            <ellipse cx="100" cy="30" rx="45" ry="15" fill="none" stroke="#003366" strokeDasharray="5 3" strokeWidth="1.5"/>
          </g>

          {/* Curly Brace for v_P */}
          <path d="M 20 185 C 20 210, 180 210, 180 185" style={braceStyle} />
          <text x="100" y="220" textAnchor="middle" style={mathStyle} fontSize="16px">v_P (Total Pore Volume)</text>

          {/* Description */}
          <text x="100" y="250" textAnchor="middle" style={bodyStyle}>
            <tspan style={mathStyle} fontSize="16px">m_P</tspan>: Every gas molecule inside
          </text>
          <text x="100" y="270" textAnchor="middle" style={bodyStyle}>
            the entire pore.
          </text>
          <g transform="translate(0, 10)">
            <text x="100" y="295" textAnchor="middle" style={bodyStyle} fontSize="15px" fontWeight="bold" fill="#2563eb">
                <tspan style={mathStyle}>m_P = m_A + (ρ_B × v_gas)</tspan>
            </text>
            <text x="100" y="315" textAnchor="middle" style={bodyStyle} fontSize="13px">
                (Adsorbed Layer + Bulk Gas in center)
            </text>
          </g>
        </g>

      </svg>
    </div>
  );
};

export default ConceptDiagram;