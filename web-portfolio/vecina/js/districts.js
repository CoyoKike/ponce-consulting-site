/* Vecina district briefings: public data only (ACS, CDC PLACES, City of Boston, MA Legislature). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => n == null ? '—' : n.toLocaleString('en-US');
  const pct = n => n == null ? '—' : `${n.toFixed(1)}%`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let D = null, list = [], cur = -1, map = null, measure = 'pct65', mapReady = false;

  const MAPM = [
    ['pct65', 'Adults 65+', '#a63f22'], ['poverty', 'Below poverty', '#7a5400'], ['lep', 'Limited English', '#1d5f80'],
    ['DIABETES', 'Diabetes', '#6a3d8f'], ['DEPRESSION', 'Depression', '#1f6b4f'], ['LONELINESS', 'Loneliness', '#8a2b5a'], ['FOODINSECU', 'Food insecurity', '#a63f22']
  ];
  const HEALTH_ORDER = ['DIABETES', 'BPHIGH', 'CHD', 'COPD', 'CASTHMA', 'DEPRESSION', 'LONELINESS', 'DISABILITY', 'FOODINSECU', 'HOUSINSECU', 'LACKTRPT', 'ACCESS2'];
  const statOf = (d, k) => ['pct65', 'poverty', 'lep'].includes(k) ? d.stats[k] : d.stats.health[k];
  const cityOf = k => ['pct65', 'poverty', 'lep'].includes(k) ? D.city[k] : D.city.health[k];
  const cmpWord = (v, c, unit = 'pts') => { if (v == null || c == null) return ''; const d = v - c; if (Math.abs(d) < 0.5) return 'about the same as Boston'; return `${Math.abs(d).toFixed(1)} ${unit} ${d > 0 ? 'above' : 'below'} Boston`; };
  const initials = n => n.split(/\s+/).filter(Boolean).map(w => w[0]).filter(c => /[A-ZÀ-Ý]/.test(c)).slice(0, 2).join('') || '·';

  /* ---------- index ---------- */
  function renderIndex(ch = 'all') {
    const items = list.filter(d => ch === 'all' || d.chamber === ch);
    $('#ixGrid').innerHTML = items.map(d => `
      <li><a class="dcard" href="#d=${d.id}">
        <span class="dcard__top"><span class="tag">${esc(d.chamber)}</span><span class="dcard__dist">${esc(d.district)}</span></span>
        <span class="dcard__name">${esc(d.official || 'Vacant seat')}</span>
        <span class="dcard__stats">
          <span><b>${fmt(d.stats.pop)}</b> residents</span><span><b>${pct(d.stats.pct65)}</b> 65+</span><span><b>${pct(d.stats.lep)}</b> limited English</span>
        </span>
        <span class="dcard__go" aria-hidden="true">Open briefing →</span>
      </a></li>`).join('');
    $('#ixCount').textContent = `${items.length} districts`;
  }
  $$('.dbx__tabs .pill').forEach(b => b.addEventListener('click', () => {
    $$('.dbx__tabs .pill').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    renderIndex(b.dataset.ch);
  }));

  /* ---------- tabs (ARIA tabs with arrow keys) ---------- */
  const tabs = $$('.brief__tabs [role=tab]');
  function selectTab(t, focus) {
    tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !on; });
    if (focus) t.focus();
    if (t.id === 't-map' && map) setTimeout(() => { map.resize(); if (mapReady) updateMap(); }, 30);
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t, false));
    t.addEventListener('keydown', e => {
      const k = e.key; let j = null;
      if (k === 'ArrowRight') j = (i + 1) % tabs.length; else if (k === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length; else if (k === 'Home') j = 0; else if (k === 'End') j = tabs.length - 1;
      if (j != null) { e.preventDefault(); selectTab(tabs[j], true); }
    });
  });

  /* ---------- rows (accessible bar rows: all values are text) ---------- */
  const rows = (items, max) => `<ul class="rows">${items.map(r => `
    <li class="row">
      <span class="row__name">${esc(r.name)}</span>
      <span class="row__bar" aria-hidden="true"><i style="--w:${Math.max(1.5, 100 * r.v / max).toFixed(1)}%;--c:${r.c || 'var(--clay)'}"></i>${r.city != null ? `<b style="--l:${(100 * r.city / max).toFixed(1)}%"></b>` : ''}</span>
      <span class="row__val">${r.label}${r.cityLabel ? `<small>${r.cityLabel}</small>` : ''}</span>
    </li>`).join('')}</ul>`;

  /* ---------- briefing ---------- */
  function show(i) {
    cur = (i + list.length) % list.length; const d = list[cur], s = d.stats, c = D.city;
    $('#index').hidden = true; $('#brief').hidden = false;
    document.title = `${d.official || d.district} · District briefing · Vecina`;
    const seal = $('.seal');
    if (d.photo) { seal.classList.add('has-photo'); seal.innerHTML = `<img src="${d.photo}" alt="Portrait of ${esc(d.official)}" width="168" height="168">`; seal.removeAttribute('aria-hidden'); }
    else { seal.classList.remove('has-photo'); seal.setAttribute('aria-hidden', 'true'); seal.innerHTML = `<span>${initials(d.official || d.district)}</span>`; }
    $('#bParty').textContent = d.party ? (d.party.startsWith('Dem') ? 'Democrat' : d.party.startsWith('Rep') ? 'Republican' : d.party) : d.chamber;
    $('#bTitle').textContent = d.title; $('#bName').textContent = d.official || 'Vacant seat'; $('#bDist').textContent = d.district;
    const u = $('#bUrl'); if (d.url) { u.hidden = false; u.href = d.url; } else u.hidden = true;
    $('#bPos').textContent = `${cur + 1} / ${list.length}`;

    $('#mapHead').textContent = `${d.district}: ${fmt(s.pop)} residents in ${s.tracts} census tracts`;
    $('#mapNote').textContent = `Each column is one census tract in the district; its height and color show the measure chosen above. Values for every measure are in the other tabs.`;

    $('#peopleHead').textContent = `${pct(s.pct65)} of residents are 65 or older, ${cmpWord(s.pct65, c.pct65)}.`;
    $('#kPeople').className = 'hgrid hgrid--3';
    { const V = window.VCharts;
      $('#kPeople').innerHTML = `<li class="hgrid__inc"><span class="hgrid__k">Residents</span><b>${fmt(s.pop)}</b><small>In ${s.tracts} census tracts · Boston ${fmt(c.pop)}</small></li>` +
        `<li class="hgrid__d">${V.donut([{ label: '65+', value: s.pop65, color: '#a63f22' }, { label: 'Under 65', value: s.pop - s.pop65, color: '#e7d7c4' }], pct(s.pct65), '65 and older')}<span>${fmt(s.pop65)} adults 65 and older</span><small>Boston ${pct(c.pct65)}</small></li>` +
        `<li class="hgrid__d">${V.donut([{ label: 'Limited English', value: s.lep, color: '#1d5f80' }, { label: 'Other', value: 100 - s.lep, color: '#d9e6ea' }], pct(s.lep), 'limited English')}<span>Speak English less than very well</span><small>Age 5+ · Boston ${pct(c.lep)}</small></li>`; }

    const langTot = Object.values(s.langs).reduce((a, b) => a + b, 0);
    const langs = Object.entries(s.langs).slice(0, 8);
    const top = langs[0];
    $('#langHead').textContent = top ? `After English, ${top[0]} is spoken most at home, by ${fmt(top[1])} residents.` : 'Languages spoken at home';
    $('#langChart').innerHTML = langs.length ? rows(langs.map(([k, v]) => ({ name: k, v, label: fmt(v), c: 'var(--health)' })), langs[0][1]) +
      `<p class="note">Residents age 5 and older who speak a language other than English at home. ${fmt(langTot)} in total.</p>` : '<p>No data.</p>';

    const hs = HEALTH_ORDER.filter(k => s.health[k] != null);
    const diffs = hs.map(k => [k, s.health[k] - (c.health[k] ?? s.health[k])]).sort((a, b) => b[1] - a[1]);
    const hi = diffs[0];
    $('#healthHead').textContent = hi && hi[1] > 0.5 ? `${D.measures[hi[0]]} is ${hi[1].toFixed(1)} points above the Boston rate.` : 'Health close to the Boston average.';
    const hmax = Math.max(...hs.map(k => Math.max(s.health[k], c.health[k] || 0))) * 1.1;
    $('#healthChart').innerHTML = rows(hs.map(k => ({ name: D.measures[k], v: s.health[k], city: c.health[k], label: pct(s.health[k]), cityLabel: `Boston ${pct(c.health[k])}`, c: s.health[k] > (c.health[k] || 0) + .5 ? 'var(--clay)' : 'var(--community)' })), hmax) +
      `<p class="note"><span class="legend-tick" aria-hidden="true"></span> The thin line marks the Boston rate. Adult estimates from CDC PLACES, weighted by tract population.</p>`;

    $('#homeHead').textContent = `${pct(s.poverty)} of residents live below the poverty line, ${cmpWord(s.poverty, c.poverty)}.`;
    $('#kHome').className = 'hgrid';
    $('#kHome').innerHTML = `<li class="hgrid__inc"><span class="hgrid__k">Median household income</span><b>${s.income_median_tract ? '$' + fmt(s.income_median_tract) : '—'}</b><small>Middle census tract in the district</small></li>` + [
      [s.poverty, c.poverty, 'Below the poverty line', '#7a5400'],
      [s.rentburden, c.rentburden, 'Renters paying 50%+ of income on rent', '#a63f22'],
      [s.health.FOODINSECU, c.health.FOODINSECU, 'Adults facing food insecurity', '#6a3d8f'],
      [s.health.HOUSINSECU, c.health.HOUSINSECU, 'Adults facing housing insecurity', '#1d5f80']
    ].map(([v, cv, l, col]) => `<li class="hgrid__d">${window.VCharts.gauge(v, col, cv)}<span>${l}</span><small>Boston ${pct(cv)}</small></li>`).join('') +
      `<li class="hgrid__note"><span class="legend-tick" aria-hidden="true"></span> The black tick on each ring marks the Boston rate.</li>`;

    updateMap();
    selectTab($('#t-map'), false);
    $('#bName').focus({ preventScroll: true });
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------- map ---------- */
  const PAINT = {
    background: { 'background-color': '#f3eee5' }, park: { 'fill-color': '#dfe8d5' }, landcover_wood: { 'fill-color': '#d9e3cf' },
    water: { 'fill-color': '#bcd6d6' }, landuse_residential: { 'fill-color': '#efe9df' }, building: { 'fill-color': '#e8e0d2', 'fill-outline-color': '#ddd2c0' },
    highway_minor: { 'line-color': '#fbf8f2' }, highway_major_inner: { 'line-color': '#ffffff' }, highway_major_casing: { 'line-color': '#e2d6c3' },
    highway_motorway_inner: { 'line-color': '#f8e2b4' }, highway_motorway_casing: { 'line-color': '#e3c48d' },
    label_other: { 'text-color': '#6f665c', 'text-halo-color': '#f7f3ec' }, label_city: { 'text-color': '#1d1b18', 'text-halo-color': '#f7f3ec' },
    water_name_point_label: { 'text-color': '#3f6f72' }, water_name_line_label: { 'text-color': '#3f6f72' }
  };
  const DROP = /shield|boundary|airport|aeroway|highway-name|tunnel|dashline|railway|ne2|housenumber|poi/;
  async function initMap() {
    const probe = document.createElement('canvas');
    if (!window.maplibregl || !(probe.getContext('webgl2') || probe.getContext('webgl'))) { $('#dmap').classList.add('nomap'); $('#dmap').textContent = 'The 3D map needs WebGL, which this browser has turned off. Every number is in the other tabs.'; return; }
    let style;
    try {
      style = await (await fetch('https://tiles.openfreemap.org/styles/positron')).json();
      style.layers = style.layers.filter(l => !DROP.test(l.id) && l.source !== 'ne2_shaded');
      for (const l of style.layers) if (PAINT[l.id]) l.paint = Object.assign({}, l.paint, PAINT[l.id]);
    } catch (e) { style = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#f3eee5' } }] }; }
    map = new maplibregl.Map({ container: 'dmap', style, center: [-71.08, 42.32], zoom: 11, pitch: reduce ? 0 : 52, bearing: reduce ? 0 : -16, attributionControl: false, cooperativeGestures: false });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.scrollZoom.disable(); map.getContainer().addEventListener('wheel', e => { if (e.ctrlKey || document.activeElement === map.getCanvas()) map.scrollZoom.enable(); }, { passive: true });
    const cv = map.getCanvas(); cv.setAttribute('aria-hidden', 'true'); cv.tabIndex = -1;
    map.on('load', () => {
      map.addSource('tracts', { type: 'geojson', data: D.tracts, promoteId: 'id' });
      map.addSource('dist', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'tr-flat', type: 'fill', source: 'tracts', paint: { 'fill-color': '#e7dfd2', 'fill-opacity': .35, 'fill-outline-color': '#d8cdbb' } });
      map.addLayer({ id: 'tr-3d', type: 'fill-extrusion', source: 'tracts', filter: ['in', ['get', 'id'], ['literal', []]], paint: { 'fill-extrusion-opacity': .92, 'fill-extrusion-base': 0 } });
      map.addLayer({ id: 'dist-glow', type: 'line', source: 'dist', paint: { 'line-color': '#a63f22', 'line-width': 9, 'line-opacity': .14, 'line-blur': 4 } });
      map.addLayer({ id: 'dist-line', type: 'line', source: 'dist', paint: { 'line-color': '#a63f22', 'line-width': 2.2 } });
      mapReady = true; updateMap();
    });
  }
  function updateMap() {
    if (cur < 0) return;
    const d = list[cur], m = MAPM.find(x => x[0] === measure), v = statOf(d, measure), cv = cityOf(measure);
    $('#mStat').innerHTML = `<b style="color:${m[2]}">${pct(v)}</b><span>${m[1]}</span><small>Boston ${pct(cv)}</small>`;
    $('#dmapDesc').textContent = `3D map of ${d.district}. ${m[1]}: ${pct(v)} across the district, Boston ${pct(cv)}.`;
    $$('#mChips button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === measure)));
    if (!mapReady) return;
    const vals = D.tracts.features.filter(f => d.tractIds.includes(f.id)).map(f => f.properties[measure] || 0);
    const max = Math.max(1, ...vals);
    map.getSource('dist').setData({ type: 'Feature', geometry: d.shape, properties: {} });
    map.setFilter('tr-3d', ['in', ['get', 'id'], ['literal', d.tractIds]]);
    map.setPaintProperty('tr-3d', 'fill-extrusion-color', ['interpolate', ['linear'], ['get', measure], 0, '#f4e9dc', max, m[2]]);
    map.setPaintProperty('tr-3d', 'fill-extrusion-height', ['*', ['/', ['get', measure], max], 1800]);
    map.resize();
    const [a, b, c2, e] = d.bbox;
    map.fitBounds([[a, b], [c2, e]], { padding: { top: 70, bottom: 40, left: 40, right: 40 }, pitch: reduce ? 0 : 52, bearing: reduce ? 0 : -16, duration: reduce ? 0 : 1400 });
  }
  $('#mChips').innerHTML = MAPM.map(([k, l, c]) => `<button type="button" class="mchip" data-m="${k}" aria-pressed="${k === measure}"><i style="background:${c}" aria-hidden="true"></i>${l}</button>`).join('');
  $('#mChips').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; measure = b.dataset.m; updateMap(); });

  /* ---------- routing ---------- */
  function route() {
    const m = location.hash.match(/^#d=(.+)$/);
    if (m) { const i = list.findIndex(d => d.id === m[1]); if (i >= 0) { show(i); return; } }
    $('#brief').hidden = true; $('#index').hidden = false; document.title = 'District briefings · Vecina';
  }
  addEventListener('hashchange', route);
  // back goes to the district map, on the same level of government
  $('.brief__back').addEventListener('click', e => { e.preventDefault(); const c = list[cur]; location.href = 'atlas.html' + (c ? '#l=' + encodeURIComponent(c.chamber) : ''); });
  $('#bPrev').addEventListener('click', () => { location.hash = 'd=' + list[(cur - 1 + list.length) % list.length].id; });
  $('#bNext').addEventListener('click', () => { location.hash = 'd=' + list[(cur + 1) % list.length].id; });

  fetch('data/briefings.json').then(r => r.json()).then(data => {
    D = data; list = data.districts; renderIndex(); initMap(); route();
  });
})();
