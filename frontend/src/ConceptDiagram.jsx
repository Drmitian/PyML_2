import React from 'react';

const ConceptDiagram = () => {
  // Styles for the text to keep the SVG clean
  const titleStyle = { fontSize: '14px', fontWeight: 'bold', fill: '#333' };
  const bodyStyle = { fontSize: '11px', fill: '#333' };
  const mathStyle = { fontStyle: 'italic', fontWeight: 'bold' };
  const labelStyle = { fontSize: '12px', fontWeight: 'bold', fill: '#003366' };
  const arrowStyle = { fill: 'none', stroke: '#333', strokeWidth: '1.5', markerEnd: 'url(#arrow)' };
  const braceStyle = { fill: 'none', stroke: '#333', strokeWidth: '1.5' };

  return (
    <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
      <svg viewBox="0 0 620 320" style={{ width: '100%', height: 'auto' }}>
        <defs>
          {/* Pattern for Bulk Gas (Sparse dots) */}
          <pattern id="bulkGasDots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="1.5" fill="#6699CC" opacity="0.7" />
          </pattern>
          {/* Pattern for Adsorbed Layer (Dense dots) */}
          <pattern id="adsLayerDots" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="1.5" fill="#003366" />
          </pattern>
          {/* Pattern for Empty Space (Diagonal stripes) */}
          <pattern id="emptyStripes" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <line x1="0" y1="10" x2="10" y2="0" stroke="#ccc" strokeWidth="1" />
          </pattern>
          {/* Arrow marker */}
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#333" />
          </marker>
        </defs>

        {/* ================= PANEL 1: EXCESS ADSORPTION ================= */}
        <g transform="translate(10, 20)">
          <text x="90" y="0" textAnchor="middle" style={titleStyle}>1. Excess Adsorption (<tspan style={mathStyle}>m_E</tspan>)</text>
          
          {/* Pore Structure */}
          <g transform="translate(0, 20)">
            {/* Gray Pore Walls */}
            <path d="M 10 20 L 10 140 A 70 20 0 0 0 170 140 L 170 20 A 70 20 0 0 0 10 20" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="2"/>
            <ellipse cx="90" cy="20" rx="70" ry="20" fill="none" stroke="#9ca3af" strokeWidth="2"/>
            
            {/* Inner Region (Bulk + Adsorbed) */}
            <path d="M 25 25 L 25 135 A 55 15 0 0 0 155 135 L 155 25 A 55 15 0 0 0 25 25" fill="none" />

            {/* Adsorbed Layer (Dense Dots) - Left & Right */}
            <path d="M 25 25 L 25 135 A 55 15 0 0 0 155 135 L 155 25 A 55 15 0 0 1 25 25" fill="url(#adsLayerDots)" opacity="0.9"/>
            
            {/* Bulk Gas (Sparse Dots) - Center */}
            <path d="M 45 30 L 45 130 A 35 10 0 0 0 135 130 L 135 30 A 35 10 0 0 1 45 30" fill="url(#bulkGasDots)" />
            
            {/* Vertical stripes overlay for bulk gas */}
            <path d="M 45 30 L 45 130 A 35 10 0 0 0 135 130 L 135 30 A 35 10 0 0 1 45 30" fill="url(#emptyStripes)" opacity="0.3"/>
          </g>

          {/* Annotations */}
          <path d="M 80 120 L 110 100" style={arrowStyle} />
          <text x="115" y="105" style={bodyStyle}>Bulk Gas (<tspan style={mathStyle}>ρ_B</tspan>)</text>

          {/* Curly Brace and Label for Adsorbed Layer */}
          <path d="M 160 145 C 175 145, 175 160, 160 160" style={braceStyle} transform="rotate(90 160 152.5)"/>
          <text x="160" y="175" textAnchor="middle" style={labelStyle}>ONLY</text>
          <line x1="160" y1="140" x2="160" y2="130" stroke="#003366" strokeWidth="1.5"/>

          {/* Description Text */}
          <text x="90" y="195" textAnchor="middle" style={bodyStyle}>
            <tspan style={mathStyle} fontSize="12px">m_E</tspan>: Additional amount due to
          </text>
          <text x="90" y="210" textAnchor="middle" style={bodyStyle}>
            surface interactions (like
          </text>
          <text x="90" y="225" textAnchor="middle" style={bodyStyle}>
            sponge holding extra water).
          </text>
        </g>


        {/* ================= PANEL 2: ABSOLUTE ADSORPTION ================= */}
        <g transform="translate(210, 20)">
          <text x="90" y="0" textAnchor="middle" style={titleStyle}>2. Absolute Adsorption (<tspan style={mathStyle}>m_A</tspan>)</text>
          
          <g transform="translate(0, 20)">
             {/* Gray Pore Walls */}
             <path d="M 10 20 L 10 140 A 70 20 0 0 0 170 140 L 170 20 A 70 20 0 0 0 10 20" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="2"/>
             <ellipse cx="90" cy="20" rx="70" ry="20" fill="none" stroke="#9ca3af" strokeWidth="2"/>

            {/* Solid Adsorbed Layer */}
            <path d="M 25 25 L 25 135 A 55 15 0 0 0 155 135 L 155 25 A 55 15 0 0 1 25 25" fill="#003366" />
            
            {/* Empty Center (Stripes) */}
            <path d="M 45 30 L 45 130 A 35 10 0 0 0 135 130 L 135 30 A 35 10 0 0 1 45 30" fill="url(#emptyStripes)" stroke="#9ca3af" strokeDasharray="4 2"/>
            <ellipse cx="90" cy="30" rx="35" ry="10" fill="none" stroke="#9ca3af" strokeDasharray="4 2"/>
          </g>

          {/* Curly Brace for v_A */}
          <path d="M 45 160 C 45 175, 135 175, 135 160" style={braceStyle} />
          <text x="90" y="180" textAnchor="middle" style={mathStyle} fontSize="14px">v_A</text>

          {/* Description Text */}
          <text x="90" y="205" textAnchor="middle" style={bodyStyle}>
            <tspan style={mathStyle} fontSize="12px">m_A</tspan>: Total amount within the
          </text>
          <text x="90" y="220" textAnchor="middle" style={bodyStyle}>
            adsorbate volume (<tspan style={mathStyle}>v_A</tspan>)
          </text>
        </g>


        {/* ================= PANEL 3: TOTAL ADSORPTION ================= */}
        <g transform="translate(410, 20)">
          <text x="90" y="0" textAnchor="middle" style={titleStyle}>3. Total Adsorption (<tspan style={mathStyle}>m_P</tspan>)</text>
          
          <g transform="translate(0, 20)">
            {/* Gray Pore Walls */}
            <path d="M 10 20 L 10 140 A 70 20 0 0 0 170 140 L 170 20 A 70 20 0 0 0 10 20" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="2"/>
            <ellipse cx="90" cy="20" rx="70" ry="20" fill="none" stroke="#9ca3af" strokeWidth="2"/>

            {/* Solid Adsorbed Layer */}
            <path d="M 25 25 L 25 135 A 55 15 0 0 0 155 135 L 155 25 A 55 15 0 0 1 25 25" fill="#003366" />
            
            {/* Solid Bulk Gas */}
            <path d="M 45 30 L 45 130 A 35 10 0 0 0 135 130 L 135 30 A 35 10 0 0 1 45 30" fill="#6699CC" />
            <ellipse cx="90" cy="30" rx="35" ry="10" fill="none" stroke="#003366" strokeDasharray="4 2"/>
          </g>

          {/* Curly Brace for v_P */}
          <path d="M 25 160 C 25 180, 155 180, 155 160" style={braceStyle} />
          <text x="90" y="185" textAnchor="middle" style={mathStyle} fontSize="14px">v_P</text>

          {/* Description Text */}
          <text x="90" y="210" textAnchor="middle" style={bodyStyle}>
            <tspan style={mathStyle} fontSize="12px">m_P</tspan>: Total amount in the entire
          </text>
          <text x="90" y="225" textAnchor="middle" style={bodyStyle}>
            pore volume (<tspan style={mathStyle}>v_P</tspan>)
          </text>
          <text x="90" y="245" textAnchor="middle" style={bodyStyle} fontSize="12px">
            <tspan style={mathStyle}>m_P = m_E</tspan> (extra) + <tspan style={mathStyle}>ρ_B v_P</tspan> (normal
          </text>
          <text x="90" y="260" textAnchor="middle" style={bodyStyle} fontSize="12px">
            filling).
          </text>
        </g>
      </svg>
    </div>
  );
};

export default ConceptDiagram;