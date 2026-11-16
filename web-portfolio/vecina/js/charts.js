/* Small SVG charts for Vecina (donut, gauge, compare bars). Charts are decorative (aria-hidden);
   every value is also printed as text next to them. */
window.VCharts = (() => {
  'use strict';
  const C = 2 * Math.PI * 46;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PAL = ['#a63f22', '#1d5f80', '#6a3d8f', '#1f6b4f', '#7a5400', '#8a2b5a', '#55504a'];

  // donut from [{label, value}], center text
  function donut(parts, center, sub) {
    const total = parts.reduce((a, p) => a + p.value, 0) || 1;
    let off = 0;
    const arcs = parts.map((p, i) => {
      const len = C * p.value / total, gap = parts.length > 1 ? 1.5 : 0;
      const a = `<circle class="vc-arc" cx="60" cy="60" r="46" fill="none" stroke="${p.color || PAL[i % PAL.length]}" stroke-width="10"
        stroke-dasharray="${Math.max(0, len - gap).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" style="--d:${i * 0.12}s"/>`;
      off += len; return a;
    }).join('');
    return `<svg class="vc-donut" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="60" r="46" fill="none" stroke="#ede6da" stroke-width="10"/>
      <g transform="rotate(-90 60 60)">${arcs}</g>
      <text x="60" y="61" text-anchor="middle" class="vc-c1">${esc(center)}</text><text x="60" y="76" text-anchor="middle" class="vc-c2" textLength="${Math.min(66, (sub || '').length * 5)}" lengthAdjust="spacingAndGlyphs">${esc(sub || '')}</text></svg>`;
  }
  // single-value ring gauge (0-100)
  function gauge(value, color, cityValue) {
    const v = Math.max(0, Math.min(100, value || 0)), len = C * v / 100;
    const cityAng = cityValue != null ? (cityValue / 100) * 360 - 90 : null;
    const tick = cityAng != null ? (() => { const r1 = 38, r2 = 54, a = cityAng * Math.PI / 180; return `<line x1="${60 + r1 * Math.cos(a)}" y1="${60 + r1 * Math.sin(a)}" x2="${60 + r2 * Math.cos(a)}" y2="${60 + r2 * Math.sin(a)}" stroke="#1d1b18" stroke-width="2.5"/>`; })() : '';
    return `<svg class="vc-gauge" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="60" r="46" fill="none" stroke="#ede6da" stroke-width="12"/>
      <circle class="vc-arc" cx="60" cy="60" r="46" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 60 60)"/>
      ${tick}<text x="60" y="66" text-anchor="middle" class="vc-g1">${v.toFixed(1)}%</text></svg>`;
  }
  // legend rows for a donut
  function legend(parts, fmt) {
    const total = parts.reduce((a, p) => a + p.value, 0) || 1;
    return `<ul class="vc-legend">${parts.map((p, i) => `<li><i style="background:${p.color || PAL[i % PAL.length]}" aria-hidden="true"></i><span>${esc(p.label)}</span><b>${fmt ? fmt(p.value) : p.value}</b><small>${(100 * p.value / total).toFixed(0)}%</small></li>`).join('')}</ul>`;
  }
  // district vs Boston bars
  function compare(rows, max) {
    return `<ul class="vc-cmp">${rows.map(r => `<li><span class="vc-cmp__n">${esc(r.name)}</span>
      <span class="vc-cmp__bar" aria-hidden="true"><i style="--w:${(100 * r.v / max).toFixed(1)}%;--c:${r.color}"></i><b style="--l:${(100 * r.city / max).toFixed(1)}%"></b></span>
      <span class="vc-cmp__v">${r.v.toFixed(1)}%<small>Boston ${r.city.toFixed(1)}%</small></span></li>`).join('')}</ul>`;
  }
  return { donut, gauge, legend, compare, PAL };
})();
