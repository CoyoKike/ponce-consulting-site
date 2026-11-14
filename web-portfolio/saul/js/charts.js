// Small SVG chart kit: every chart has a labeled scale and readable values.
import { t, fmt, getLang } from './i18n.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};
const txt = (s, attrs, parent) => { const n = el('text', attrs, parent); n.textContent = s; return n; };

export function niceTicks(max, count = 5) {
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 1e6; v += step) ticks.push(+v.toFixed(6));
  return ticks;
}

export function short(n) {
  const L = getLang();
  if (n >= 1e6) return fmt(n / 1e6, n % 1e6 === 0 ? 0 : 1) + (L === 'es' ? ' M' : 'M');
  if (n >= 1e3) return fmt(n / 1e3, n % 1e3 === 0 ? 0 : 1) + (L === 'es' ? ' mil' : 'k');
  return fmt(n, n % 1 ? 1 : 0);
}

const shortName = n => n.replace(' de Morelos', '').replace('La Magdalena Contreras', 'Magdalena Contreras');

/**
 * Horizontal bars. rows: [{label, value, hi?, note?}] (value null => note shown)
 * opts: {axis, digits, ref: {value, label}, valueFmt}
 */
export function hbar(host, rows, opts = {}) {
  host.innerHTML = '';
  const W = Math.max(320, host.clientWidth || 600);
  const narrow = W < 520;
  const longest = Math.max(...rows.map(r => shortName(r.label).length));
  const labelW = Math.min(narrow ? 150 : 250, Math.max(narrow ? 110 : 140, longest * (narrow ? 6.2 : 6.6) + 14)), rowH = narrow ? 24 : 26, top = 26, bottom = 40, right = 62;
  const H = top + rows.length * rowH + bottom;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.title || '' }, host);
  const max = Math.max(...rows.map(r => r.value || 0), opts.ref ? opts.ref.value : 0);
  const x0 = labelW, x1 = W - right;
  // Use fewer ticks when the labels would not fit side by side.
  const tf = opts.tickFmt || short;
  let ticks;
  for (let c = narrow ? 4 : 5; c >= 1; c--) {
    ticks = niceTicks(max, c);
    const gap = (x1 - x0) / (ticks.length - 1);
    const widest = Math.max(...ticks.map(v => String(tf(v)).length)) * 7 + 10;
    if (gap >= widest) break;
  }
  const sx = v => x0 + (v / ticks[ticks.length - 1]) * (x1 - x0);
  const vf = opts.valueFmt || (v => fmt(v, opts.digits || 0));

  const g = el('g', { class: 'grid' }, svg);
  ticks.forEach(v => {
    el('line', { x1: sx(v), x2: sx(v), y1: top - 6, y2: top + rows.length * rowH }, g);
    txt(tf(v), { x: sx(v), y: top + rows.length * rowH + 16, 'text-anchor': 'middle' }, svg);
  });
  txt(opts.axis || '', { x: x1, y: H - 4, 'text-anchor': 'end', class: 'ax-title' }, svg);

  const bars = [];
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    const row = el('g', { class: 'row' }, svg);
    const title = el('title', {}, row); title.textContent = `${r.label}: ${r.value == null ? r.note : vf(r.value)}`;
    txt(shortName(r.label), { x: labelW - 10, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'lbl' }, row);
    if (r.value == null || r.value === 0) {
      txt(r.note || '0', { x: x0 + 4, y: y + rowH / 2 + 4, class: 'note' }, row);
      return;
    }
    const b = el('rect', { x: x0, y: y + 5, height: rowH - 10, width: sx(r.value) - x0, rx: 2, class: 'bar' + (r.hi ? ' bar--hi' : '') }, row);
    b.dataset.w = sx(r.value) - x0;
    const v = txt(vf(r.value), { x: sx(r.value) + 6, y: y + rowH / 2 + 4, class: 'val' }, row);
    bars.push([b, v]);
  });

  if (opts.ref) {
    const rg = el('g', { class: 'ref' }, svg);
    el('line', { x1: sx(opts.ref.value), x2: sx(opts.ref.value), y1: top - 10, y2: top + rows.length * rowH }, rg);
    txt(opts.ref.label, { x: sx(opts.ref.value) + (opts.ref.anchor === 'end' ? -6 : 6), y: top - 12, 'text-anchor': opts.ref.anchor || 'start' }, rg);
  }
  host._bars = bars;
  return svg;
}

/** Line chart for monthly series. pts: [{m:'2019-01', v}] */
export function line(host, pts, opts = {}) {
  host.innerHTML = '';
  const W = Math.max(320, host.clientWidth || 600);
  const H = opts.height || (W < 520 ? 240 : 300);
  const L = 58, R = 16, Tp = 16, B = 38;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, host);
  const max = Math.max(...pts.map(p => p.v));
  const ticks = niceTicks(opts.yMax || max, 4);
  const top = ticks[ticks.length - 1];
  const sx = i => L + (i / (pts.length - 1)) * (W - L - R);
  const sy = v => Tp + (1 - v / top) * (H - Tp - B);
  const g = el('g', { class: 'grid' }, svg);
  ticks.forEach(v => {
    el('line', { x1: L, x2: W - R, y1: sy(v), y2: sy(v) }, g);
    txt(opts.tickFmt ? opts.tickFmt(v) : short(v), { x: L - 8, y: sy(v) + 4, 'text-anchor': 'end' }, svg);
  });
  txt(opts.axis || '', { x: L, y: Tp - 4, class: 'ax-title' }, svg);
  const months = t('months');
  // x labels: every January (multi-year) or every month (single year)
  const multi = pts.length > 14;
  pts.forEach((p, i) => {
    const [y, m] = p.m.split('-').map(Number);
    if (multi ? m === 1 : (W > 520 || i % 2 === 0)) {
      el('line', { x1: sx(i), x2: sx(i), y1: H - B, y2: H - B + 4, stroke: 'rgba(236,235,230,.22)' }, svg);
      txt(multi ? String(y) : months[m - 1], { x: sx(i), y: H - B + 18, 'text-anchor': multi ? 'start' : 'middle' }, svg);
    }
  });
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(p.v).toFixed(1)}`).join('');
  el('path', { d: d + `L${sx(pts.length - 1)},${sy(0)}L${sx(0)},${sy(0)}Z`, class: 'area' }, svg);
  const path = el('path', { d, class: 'line' }, svg);
  (opts.marks || []).forEach(mk => {
    const i = pts.findIndex(p => p.m === mk.m);
    if (i < 0) return;
    el('circle', { cx: sx(i), cy: sy(pts[i].v), r: 3.5, class: 'dot' }, svg);
    txt(mk.label, { x: sx(i) + (mk.dx || 8), y: sy(pts[i].v) + (mk.dy || -8), 'text-anchor': mk.anchor || 'start', class: 'val' }, svg);
  });
  // hover readout
  const hl = el('line', { class: 'hover-line', y1: Tp, y2: H - B, x1: -10, x2: -10 }, svg);
  const hd = el('circle', { r: 4, class: 'dot', cx: -10, cy: -10, opacity: 0 }, svg);
  const ht = txt('', { class: 'val', y: Tp + 12 }, svg);
  const move = e => {
    const r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) * (W / r.width);
    const i = Math.max(0, Math.min(pts.length - 1, Math.round((x - L) / (W - L - R) * (pts.length - 1))));
    const p = pts[i]; const [y, m] = p.m.split('-').map(Number);
    hl.setAttribute('x1', sx(i)); hl.setAttribute('x2', sx(i));
    hd.setAttribute('cx', sx(i)); hd.setAttribute('cy', sy(p.v)); hd.setAttribute('opacity', 1);
    ht.textContent = `${months[m - 1]} ${y}: ${opts.valueFmt ? opts.valueFmt(p.v) : fmt(p.v)}`;
    const left = sx(i) > W * .6;
    ht.setAttribute('x', sx(i) + (left ? -8 : 8)); ht.setAttribute('text-anchor', left ? 'end' : 'start');
  };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerleave', () => { hl.setAttribute('x1', -10); hl.setAttribute('x2', -10); hd.setAttribute('opacity', 0); ht.textContent = ''; });
  host._path = path;
  return svg;
}

/** Two values per row on one shared % scale (dot plot). rows: [{label, a, b}] */
export function dots(host, rows, opts = {}) {
  host.innerHTML = '';
  const W = Math.max(320, host.clientWidth || 600);
  const narrow = W < 520;
  const labelW = narrow ? 128 : 170, rowH = 24, top = 10, bottom = 40, right = 20;
  const H = top + rows.length * rowH + bottom;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, host);
  const ticks = [0, 20, 40, 60, 80];
  const sx = v => labelW + (v / 80) * (W - right - labelW);
  const g = el('g', { class: 'grid' }, svg);
  ticks.forEach(v => {
    el('line', { x1: sx(v), x2: sx(v), y1: top, y2: top + rows.length * rowH }, g);
    txt(v + '%', { x: sx(v), y: top + rows.length * rowH + 16, 'text-anchor': 'middle' }, svg);
  });
  txt(opts.axis || '', { x: W - right, y: H - 4, 'text-anchor': 'end', class: 'ax-title' }, svg);
  rows.forEach((r, i) => {
    const y = top + i * rowH + rowH / 2;
    const row = el('g', { class: 'row' }, svg);
    const ti = el('title', {}, row); ti.textContent = `${r.label}: ${t('car2')} ${fmt(r.a, 1)}%, ${t('bike')} ${fmt(r.b, 1)}%`;
    txt(shortName(r.label), { x: labelW - 10, y: y + 4, 'text-anchor': 'end', class: 'lbl' }, row);
    el('line', { x1: sx(Math.min(r.a, r.b)), x2: sx(Math.max(r.a, r.b)), y1: y, y2: y, class: 'link' }, row);
    el('circle', { cx: sx(r.b), cy: y, r: 5, class: 'dot dot--b' }, row);
    el('circle', { cx: sx(r.a), cy: y, r: 5, class: 'dot' }, row);
    // car share is above bike share in every borough, so labels sit outside the pair
    txt(fmt(r.a, 0) + '%', { x: sx(r.a) + 9, y: y + 4, class: 'val' }, row);
    txt(fmt(r.b, 0) + '%', { x: sx(r.b) - 9, y: y + 4, 'text-anchor': 'end', class: 'val' }, row);
  });
  return svg;
}
