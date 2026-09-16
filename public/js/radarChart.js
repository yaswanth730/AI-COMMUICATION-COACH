/**
 * RadarChart — Pure SVG 8-Dimension Communication Skill Polygon
 * Visualizes Clarity, Storytelling, Wit, Engagement, Phrasing, Delivery, etc.
 */
class RadarChart {
  static render(containerElement, scores = {}, comparisonScores = null) {
    if (!containerElement) return;

    const dimensions = [
      { key: 'clarity_score', label: 'Clarity' },
      { key: 'storytelling_score', label: 'Storytelling' },
      { key: 'wit_score', label: 'Natural Wit' },
      { key: 'audience_engagement_score', label: 'Engagement' },
      { key: 'grammar_score', label: 'Phrasing' },
      { key: 'delivery_score', label: 'Delivery' },
      { key: 'public_speaking_score', label: 'Public Speaking' },
      { key: 'response_quality_score', label: 'Response' }
    ];

    const size = 320;
    const center = size / 2;
    const radius = size * 0.36;
    const total = dimensions.length;

    // Helper to calculate coordinates for angle and value (0-100)
    const getCoordinates = (index, value) => {
      const angle = (Math.PI * 2 / total) * index - Math.PI / 2;
      const r = (value / 100) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle)
      };
    };

    // Concentric Web Rings (25, 50, 75, 100)
    const rings = [25, 50, 75, 100].map(level => {
      const points = dimensions.map((_, i) => {
        const pt = getCoordinates(i, level);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      }).join(' ');

      return `<polygon points="${points}" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />`;
    }).join('');

    // Axis Lines from Center
    const axes = dimensions.map((_, i) => {
      const pt = getCoordinates(i, 100);
      return `<line x1="${center}" y1="${center}" x2="${pt.x.toFixed(1)}" y2="${pt.y.toFixed(1)}" stroke="rgba(255, 255, 255, 0.12)" stroke-dasharray="2,3" />`;
    }).join('');

    // Labels
    const labels = dimensions.map((d, i) => {
      const pt = getCoordinates(i, 118);
      const val = scores[d.key] || 70;
      let anchor = 'middle';
      if (pt.x < center - 15) anchor = 'end';
      else if (pt.x > center + 15) anchor = 'start';

      return `
        <text x="${pt.x.toFixed(1)}" y="${pt.y.toFixed(1)}" fill="#94a3b8" font-size="10" font-weight="600" text-anchor="${anchor}" dominant-baseline="central">
          ${d.label} <tspan fill="#00f2fe" font-weight="700">(${val})</tspan>
        </text>
      `;
    }).join('');

    // Data Polygon (Primary)
    const dataPoints = dimensions.map((d, i) => {
      const val = Math.max(15, Math.min(100, scores[d.key] || 70));
      const pt = getCoordinates(i, val);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');

    // Vertex Dots
    const dots = dimensions.map((d, i) => {
      const val = Math.max(15, Math.min(100, scores[d.key] || 70));
      const pt = getCoordinates(i, val);
      return `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="3.5" fill="#00f2fe" stroke="#080c14" stroke-width="1.5" />`;
    }).join('');

    // Optional Comparison Polygon (e.g. Attempt 1)
    let comparisonSvg = '';
    if (comparisonScores) {
      const compPoints = dimensions.map((d, i) => {
        const val = Math.max(15, Math.min(100, comparisonScores[d.key] || 60));
        const pt = getCoordinates(i, val);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      }).join(' ');

      comparisonSvg = `
        <polygon points="${compPoints}" fill="rgba(139, 92, 246, 0.15)" stroke="rgba(139, 92, 246, 0.6)" stroke-width="1.5" stroke-dasharray="3,3" />
      `;
    }

    containerElement.innerHTML = `
      <svg viewBox="0 0 ${size} ${size}" class="radar-chart-svg" style="width:100%; max-width:${size}px; height:auto; display:block; margin:0 auto;">
        <defs>
          <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(0, 242, 254, 0.38)" />
            <stop offset="100%" stop-color="rgba(139, 92, 246, 0.18)" />
          </radialGradient>
        </defs>
        ${rings}
        ${axes}
        ${comparisonSvg}
        <polygon points="${dataPoints}" fill="url(#radarFillGrad)" stroke="#00f2fe" stroke-width="2.2" filter="drop-shadow(0 0 8px rgba(0, 242, 254, 0.4))" />
        ${dots}
        ${labels}
      </svg>
    `;
  }
}

window.RadarChart = RadarChart;
