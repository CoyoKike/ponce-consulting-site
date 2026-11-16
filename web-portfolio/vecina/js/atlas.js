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
    if (!d) {
      $('#aCard').hidden = true;
      if (ready) {
        ['d-sel', 'd-sel-fill', 'd-sel-glow', 'd-sel-casing'].forEach(l => map.setFilter(l, ['==', ['get', 'id'], '']));
        map.setFilter('t-sel-3d', ['in', ['get', 'id'], ['literal', []]]); map.setFilter('t-sel-flat', ['in', ['get', 'id'], ['literal', []]]);
        map.setPaintProperty('mask', 'fill-opacity', 0); map.setPaintProperty('d-line', 'line-opacity', .75);
        map.setLayoutProperty('d-label', 'visibility', 'visible');
        if (!threeD) map.easeTo({ pitch: 0, bearing: 0, duration: reduce ? 0 : 900 });
      }
      return;
    }
    renderCard(d);
    $('#aCard').hidden = false;
    if (ready) {
      ['d-sel', 'd-sel-fill', 'd-sel-glow', 'd-sel-casing'].forEach(l => map.setFilter(l, ['==', ['get', 'id'], id]));
      map.setFilter('t-sel-3d', ['in', ['get', 'id'], ['literal', d.tractIds]]); map.setFilter('t-sel-flat', ['in', ['get', 'id'], ['literal', d.tractIds]]);
      // fade the rest of the city: a cream layer over everything except this district
      const holes = (d.shape.type === 'Polygon' ? [d.shape.coordinates] : d.shape.coordinates).map(poly => poly[0].slice().reverse());
      map.getSource('mask').setData({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-75, 40], [-67, 40], [-67, 45], [-75, 45], [-75, 40]], ...holes] } });
      map.setPaintProperty('mask', 'fill-opacity', .9); map.setPaintProperty('d-line', 'line-opacity', .18);
      map.setLayoutProperty('d-label', 'visibility', 'none');
      const [a, b, c2, e] = d.bbox;
      map.fitBounds([[a, b], [c2, e]], { padding: { top: 110, bottom: 80, left: innerWidth > 900 ? 400 : 30, right: innerWidth > 900 ? 480 : 30 }, duration: reduce ? 0 : 1300, pitch: reduce ? 0 : 50, bearing: reduce ? 0 : -18 });
    }
  }
  /* ---------- the card: photo + chart carousel ---------- */
  const HL = { DIABETES: 'Diabetes', BPHIGH: 'High blood pressure', CHD: 'Heart disease', COPD: 'COPD', CASTHMA: 'Asthma', DEPRESSION: 'Depression', LONELINESS: 'Loneliness', DISABILITY: 'Any disability' };
  let slide = 0, nSlides = 0;
  function renderCard(d) {
    const V = window.VCharts, s = d.stats, c = D.city;
    const ph = $('#acPhoto');
    if (d.photo) { ph.src = d.photo; ph.alt = `Portrait of ${d.official}`; ph.hidden = false; } else { ph.hidden = true; }
    $('#acLvl').textContent = d.party ? `${d.title} · ${d.party.startsWith('Dem') ? 'Democrat' : d.party}` : d.title;
    $('#acName').textContent = d.official || 'Vacant seat'; $('#acDist').textContent = d.district;
    const langs = Object.entries(s.langs).filter(([k]) => k !== 'Other').concat(s.langs.Other ? [['Other', s.langs.Other]] : []).sort((x, y) => (x[0] === 'Other') - (y[0] === 'Other') || y[1] - x[1]).filter(([k]) => k !== 'Other').concat([]); const otherSrc = s.langs.Other || 0; const top = langs.slice(0, 5).map(([k, v]) => ({ label: k.replace(/ \(.*\)/, ''), value: v }));
    const rest = langs.slice(5).reduce((a, [, v]) => a + v, 0) + otherSrc; if (rest) top.push({ label: 'Other languages', value: rest, color: '#b8ada0' });
    const hs = Object.keys(HL).filter(k => s.health[k] != null).map(k => ({ k, d: s.health[k] - c.health[k] })).sort((a, b) => b.d - a.d).slice(0, 6);
    const hmax = Math.max(...hs.map(h => Math.max(s.health[h.k], c.health[h.k]))) * 1.08;
    const slides = [
      ['At a glance', `<ul class="aglance">
        <li><b>${fmt(s.pop)}</b><span>residents</span></li>
        <li><b>${pct(s.pct65)}</b><span>65 and older</span><small>Boston ${pct(c.pct65)}</small></li>
        <li><b>${pct(s.poverty)}</b><span>below poverty</span><small>Boston ${pct(c.poverty)}</small></li>
        <li><b>${pct(s.lep)}</b><span>limited English</span><small>Boston ${pct(c.lep)}</small></li></ul>`],
      ['Who lives here', `<div class="atwo">
        <figure>${V.donut([{ label: '65+', value: s.pop65, color: '#a63f22' }, { label: 'Under 65', value: s.pop - s.pop65, color: '#e7d7c4' }], pct(s.pct65), '65+')}<figcaption>${fmt(s.pop65)} adults 65+<small>Boston ${pct(c.pct65)}</small></figcaption></figure>
        <figure>${V.donut([{ label: 'Limited English', value: s.lep, color: '#1d5f80' }, { label: 'Other', value: 100 - s.lep, color: '#d9e6ea' }], pct(s.lep), 'limited Eng.')}<figcaption>Speak English less than very well<small>Boston ${pct(c.lep)}</small></figcaption></figure></div>`],
      ['Languages at home', top.length ? `<div class="alang">${V.donut(top, fmt(top.reduce((a, p) => a + p.value, 0)), 'speakers')}${V.legend(top, fmt)}</div>` : '<p>No data.</p>'],
      ['Health, compared with Boston', V.compare(hs.map(h => ({ name: HL[h.k], v: s.health[h.k], city: c.health[h.k], color: h.d > .5 ? '#a63f22' : '#1f6b4f' })), hmax) + '<p class="acar__note">The black tick is the Boston rate.</p>'],
      ['Housing and money', `<div class="agauges">${[['Below poverty', s.poverty, c.poverty, '#7a5400'], ['Rent is 50%+ of income', s.rentburden, c.rentburden, '#a63f22'], ['Food insecurity', s.health.FOODINSECU, c.health.FOODINSECU, '#6a3d8f'], ['Housing insecurity', s.health.HOUSINSECU, c.health.HOUSINSECU, '#1d5f80']]
        .map(([l, v, cv, col]) => `<figure>${V.gauge(v, col, cv)}<figcaption>${l}<small>Boston ${pct(cv)}</small></figcaption></figure>`).join('')}</div><p class="acar__note">The black tick is the Boston rate.</p>`]
    ];
    nSlides = slides.length;
    $('#acSlides').innerHTML = slides.map(([t, body], i) => `<section class="acar__slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}: ${t}" ${i ? 'hidden' : ''}><h3>${t}</h3>${body}</section>`).join('');
    $('#acDots').innerHTML = slides.map(([t], i) => `<button type="button" class="acar__dot" aria-label="Slide ${i + 1}: ${t}" ${i ? '' : 'aria-current="true"'} data-i="${i}"></button>`).join('');
    go(0, false);
  }
  function go(i, say) {
    slide = (i + nSlides) % nSlides;
    $$('#acSlides .acar__slide').forEach((el, k) => { const on = k === slide; el.hidden = !on; if (on) { el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); } });
    $$('#acDots .acar__dot').forEach((b, k) => b.toggleAttribute('aria-current', k === slide));
    if (say) $('#acLive').textContent = $$('#acSlides .acar__slide')[slide].getAttribute('aria-label');
  }
  $('#acPrev').addEventListener('click', () => go(slide - 1, true));
  $('#acNext').addEventListener('click', () => go(slide + 1, true));
  $('#acDots').addEventListener('click', e => { const b = e.target.closest('.acar__dot'); if (b) go(+b.dataset.i, true); });
  // swipe on touch screens
  let sx = null;
  $('#acSlides').addEventListener('pointerdown', e => { sx = e.clientX; });
  $('#acSlides').addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) go(slide + (dx < 0 ? 1 : -1), true); });
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
    map.setPaintProperty('t-sel-3d', 'fill-extrusion-color', color);
    map.setPaintProperty('t-sel-flat', 'fill-color', color);
    map.setPaintProperty('t-sel-3d', 'fill-extrusion-height', ['+', 120, ['*', ['/', ['get', measure], stops[3]], 900]]);
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
      map.addSource('mask', { type: 'geojson', data: fc([]) });
      map.addLayer({ id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': '#f3eee5', 'fill-opacity': 0, 'fill-opacity-transition': { duration: reduce ? 0 : 600 } } });
      map.addLayer({ id: 't-sel-flat', type: 'fill', source: 'tracts', filter: ['in', ['get', 'id'], ['literal', []]], paint: { 'fill-opacity': .95, 'fill-outline-color': 'rgba(255,253,249,.7)' } });
      map.addLayer({ id: 't-sel-3d', type: 'fill-extrusion', source: 'tracts', filter: ['in', ['get', 'id'], ['literal', []]], paint: { 'fill-extrusion-opacity': .96, 'fill-extrusion-vertical-gradient': true } });
      map.addLayer({ id: 'd-sel-fill', type: 'fill', source: 'dists', filter: ['==', ['get', 'id'], ''], paint: { 'fill-color': '#a63f22', 'fill-opacity': .06 } });
      map.addLayer({ id: 'd-sel-glow', type: 'line', source: 'dists', filter: ['==', ['get', 'id'], ''], paint: { 'line-color': '#a63f22', 'line-width': 22, 'line-opacity': .25, 'line-blur': 10 } });
      map.addLayer({ id: 'd-sel-casing', type: 'line', source: 'dists', filter: ['==', ['get', 'id'], ''], paint: { 'line-color': '#fffdf9', 'line-width': 10 } });
      map.addLayer({ id: 'd-line', type: 'line', source: 'dists', paint: { 'line-color': '#14322a', 'line-width': 1.4, 'line-opacity': .75 } });
      map.addLayer({ id: 'd-sel', type: 'line', source: 'dists', filter: ['==', ['get', 'id'], ''], paint: { 'line-color': '#14322a', 'line-width': 5 } });
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
