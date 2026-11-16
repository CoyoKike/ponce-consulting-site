/* Vecina district map: every Boston district on one light map, public data only. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => n == null ? '—' : n.toLocaleString('en-US'), pct = n => n == null ? '—' : `${n.toFixed(1)}%`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const M = [
    ['pct65', 'Adults 65+', ['#f6eee3', '#e9c9a8', '#c97a4e', '#8c3a1b']],
    ['poverty', 'Below poverty', ['#f6efe0', '#e6d29a', '#b98f2c', '#6e4c00']],
    ['lep', 'Limited English', ['#eef3f4', '#b6d3dc', '#5b97ad', '#1d5f80']],
    ['DIABETES', 'Diabetes', ['#f2edf5', '#cdb8dc', '#8e65b0', '#55307a']],
    ['DEPRESSION', 'Depression', ['#eaf2ed', '#b3d4c1', '#5a9a77', '#1f6b4f']],
    ['LONELINESS', 'Loneliness', ['#f5ecf0', '#e0b7c8', '#b25c83', '#7a234c']]
  ];
  let D, level = 'City Council', measure = 'pct65', sel = null, map, ready = false, threeD = false;
  const valOf = (d, k) => ['pct65', 'poverty', 'lep'].includes(k) ? d.stats[k] : d.stats.health[k];

  /* ---------- list ---------- */
  function renderList() {
    const q = $('#aq').value.trim().toLowerCase();
    const items = D.districts.filter(d => d.chamber === level && (!q || `${d.official} ${d.district}`.toLowerCase().includes(q)));
    $('#officials').innerHTML = items.map(d => `<li><button type="button" class="aoff" data-id="${d.id}" aria-pressed="${sel === d.id}">
      <span class="aoff__dot" aria-hidden="true"></span><span class="aoff__name">${esc(d.official || 'Vacant seat')}</span><span class="aoff__dist">${esc(d.district)}</span></button></li>`).join('') ||
      `<li class="aoff__none">No match.</li>`;
    $('#aCount').textContent = `${items.length} ${level} districts`;
  }
  $$('.apanel__levels .pill').forEach(b => b.addEventListener('click', () => {
    level = b.dataset.ch; $$('.apanel__levels .pill').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    select(null); renderList(); drawLevel();
  }));
  $('#aq').addEventListener('input', renderList);
  $('#officials').addEventListener('click', e => { const b = e.target.closest('.aoff'); if (b) select(b.dataset.id, true); });

  /* ---------- selection card ---------- */
  function select(id, fly) {
    sel = id; $$('.aoff').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    const d = D.districts.find(x => x.id === id);
    if (!d) { $('#aCard').hidden = true; if (ready) map.setFilter('d-sel', ['==', ['get', 'id'], '']); return; }
    const c = D.city, s = d.stats;
    $('#acLvl').textContent = d.title; $('#acName').textContent = d.official || 'Vacant seat'; $('#acDist').textContent = d.district;
    $('#acStats').innerHTML = [[fmt(s.pop), 'residents'], [pct(s.pct65), `65+ · Boston ${pct(c.pct65)}`], [pct(s.poverty), `below poverty · Boston ${pct(c.poverty)}`], [pct(s.lep), `limited English · Boston ${pct(c.lep)}`]]
      .map(([n, l]) => `<li><b>${n}</b><span>${l}</span></li>`).join('');
    $('#acOpen').href = `districts.html#d=${d.id}`;
    $('#aCard').hidden = false;
    if (ready) {
      map.setFilter('d-sel', ['==', ['get', 'id'], id]); map.setFilter('d-sel-fill', ['==', ['get', 'id'], id]);
      if (fly) { const [a, b, c2, e] = d.bbox; map.fitBounds([[a, b], [c2, e]], { padding: { top: 90, bottom: 60, left: innerWidth > 900 ? 400 : 30, right: innerWidth > 900 ? 380 : 30 }, duration: reduce ? 0 : 1200, pitch: threeD ? 50 : 0, bearing: threeD ? -18 : 0 }); }
    }
  }
  $('#acClose').addEventListener('click', () => { const id = sel; select(null); const b = $(`.aoff[data-id="${id}"]`); if (b) b.focus(); });

  /* ---------- map ---------- */
  const PAINT = {
    background: { 'background-color': '#f3eee5' }, park: { 'fill-color': '#e2eadb' }, landcover_wood: { 'fill-color': '#dde6d4' },
    water: { 'fill-color': '#c4dcdc' }, landuse_residential: { 'fill-color': '#f0ebe2' }, building: { 'fill-color': '#e9e2d6', 'fill-outline-color': '#e0d7c8' },
    highway_minor: { 'line-color': '#fbf8f2' }, highway_major_inner: { 'line-color': '#ffffff' }, highway_major_casing: { 'line-color': '#e2d6c3' },
    highway_motorway_inner: { 'line-color': '#f8e2b4' }, highway_motorway_casing: { 'line-color': '#e3c48d' },
    label_other: { 'text-color': '#7a7066', 'text-halo-color': '#f7f3ec' }, label_city: { 'text-color': '#1d1b18', 'text-halo-color': '#f7f3ec' },
    water_name_point_label: { 'text-color': '#3f6f72' }, water_name_line_label: { 'text-color': '#3f6f72' }
  };
  const DROP = /shield|boundary|airport|aeroway|highway-name|tunnel|dashline|railway|ne2|housenumber|poi/;
  const fc = arr => ({ type: 'FeatureCollection', features: arr });
  function ramp() {
    const m = M.find(x => x[0] === measure), vals = D.tracts.features.map(f => f.properties[measure] || 0).filter(v => v > 0).sort((a, b) => a - b);
    const q = p => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))];
    return { m, stops: [q(.05), q(.35), q(.7), q(.97)] };
  }
  function drawMeasure() {
    const { m, stops } = ramp();
    $$('#aMeasures button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === measure)));
    $('#aLegend').innerHTML = `<b>${m[1]}</b><span class="alegend__bar" style="background:linear-gradient(90deg,${m[2].join(',')})"></span><span class="alegend__ends"><span>${stops[0].toFixed(0)}%</span><span>${stops[3].toFixed(0)}%</span></span><small>by census tract</small>`;
    if (!ready) return;
    const color = ['interpolate', ['linear'], ['get', measure], stops[0], m[2][0], stops[1], m[2][1], stops[2], m[2][2], stops[3], m[2][3]];
    map.setPaintProperty('t-fill', 'fill-color', color);
    map.setPaintProperty('t-3d', 'fill-extrusion-color', color);
    map.setPaintProperty('t-3d', 'fill-extrusion-height', ['*', ['/', ['get', measure], stops[3]], 650]);
  }
  function drawLevel() {
    if (!ready) return;
    const feats = D.districts.filter(d => d.chamber === level).map(d => ({ type: 'Feature', geometry: d.shape, properties: { id: d.id, label: d.chamber === 'City Council' ? d.district.replace('District ', 'D') : d.district.replace(/ (Suffolk|Middlesex|Norfolk).*$/, (m) => m) } }));
    map.getSource('dists').setData(fc(feats));
  }
  function set3D(on) {
    threeD = on; $('#a3d').setAttribute('aria-pressed', String(on));
    if (!ready) return;
    map.setLayoutProperty('t-3d', 'visibility', on ? 'visible' : 'none');
    map.setLayoutProperty('t-fill', 'visibility', on ? 'none' : 'visible');
    map.easeTo({ pitch: on ? 52 : 0, bearing: on ? -18 : 0, duration: reduce ? 0 : 1100 });
  }
  $('#a3d').addEventListener('click', () => set3D(!threeD));
  $('#aMeasures').innerHTML = M.map(([k, l, c]) => `<button type="button" data-m="${k}" aria-pressed="${k === measure}"><i style="background:${c[3]}" aria-hidden="true"></i>${l}</button>`).join('');
  $('#aMeasures').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { measure = b.dataset.m; drawMeasure(); } });

  async function initMap() {
    const probe = document.createElement('canvas');
    if (!window.maplibregl || !(probe.getContext('webgl2') || probe.getContext('webgl'))) { $('#amap').classList.add('nomap'); $('#amap').textContent = 'The map needs WebGL. The list of officials and each briefing still work.'; return; }
    let style;
    try {
      style = await (await fetch('https://tiles.openfreemap.org/styles/positron')).json();
      style.layers = style.layers.filter(l => !DROP.test(l.id) && l.source !== 'ne2_shaded');
      for (const l of style.layers) if (PAINT[l.id]) l.paint = Object.assign({}, l.paint, PAINT[l.id]);
    } catch (e) { style = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#f3eee5' } }] }; }
    map = new maplibregl.Map({ container: 'amap', style, center: [-71.07, 42.315], zoom: 11.2, attributionControl: false, maxZoom: 16, minZoom: 9 });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    const cv = map.getCanvas(); cv.setAttribute('aria-hidden', 'true'); cv.tabIndex = -1;
    map.on('load', () => {
      const firstLabel = map.getStyle().layers.find(l => l.type === 'symbol')?.id;
      map.addSource('tracts', { type: 'geojson', data: D.tracts });
      map.addSource('dists', { type: 'geojson', data: fc([]) });
      map.addLayer({ id: 't-fill', type: 'fill', source: 'tracts', paint: { 'fill-opacity': .78, 'fill-outline-color': 'rgba(255,253,249,.6)' } }, firstLabel);
      map.addLayer({ id: 't-3d', type: 'fill-extrusion', source: 'tracts', layout: { visibility: 'none' }, paint: { 'fill-extrusion-opacity': .9 } });
      map.addLayer({ id: 'd-sel-fill', type: 'fill', source: 'dists', filter: ['==', ['get', 'id'], ''], paint: { 'fill-color': '#1d1b18', 'fill-opacity': .08 } });
      map.addLayer({ id: 'd-line', type: 'line', source: 'dists', paint: { 'line-color': '#14322a', 'line-width': 1.4, 'line-opacity': .75 } });
      map.addLayer({ id: 'd-sel', type: 'line', source: 'dists', filter: ['==', ['get', 'id'], ''], paint: { 'line-color': '#a63f22', 'line-width': 4 } });
      map.addLayer({ id: 'd-label', type: 'symbol', source: 'dists', layout: { 'text-field': ['get', 'label'], 'text-size': 12, 'text-font': ['Noto Sans Bold'], 'text-max-width': 8 }, paint: { 'text-color': '#14322a', 'text-halo-color': '#fffdf9', 'text-halo-width': 2 } });
      map.on('click', 'd-line', () => {});
      map.on('click', e => { const f = map.queryRenderedFeatures(e.point, { layers: ['d-sel-fill', 'd-line'] }); const hit = D.districts.filter(d => d.chamber === level).find(d => pointIn(e.lngLat, d)); if (hit) { select(hit.id, false); const b = $(`.aoff[data-id="${hit.id}"]`); if (b) b.scrollIntoView({ block: 'nearest' }); } });
      ready = true; drawLevel(); drawMeasure(); set3D(threeD);
    });
  }
  // point in district (ray casting on the simplified outline)
  function pointIn(ll, d) {
    const polys = d.shape.type === 'Polygon' ? [d.shape.coordinates] : d.shape.coordinates;
    return polys.some(rings => { let inside = false; const r = rings[0]; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > ll.lat) !== (yj > ll.lat) && ll.lng < (xj - xi) * (ll.lat - yi) / (yj - yi) + xi) inside = !inside; } return inside; });
  }

  fetch('data/briefings.json').then(r => r.json()).then(data => { D = data; renderList(); drawMeasure(); initMap(); });
})();
