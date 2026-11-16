/* Vecina concept site. Accessibility notes are inline: the results list is the primary path, the map mirrors it. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PLACES = window.VECINA_PLACES, LIST = window.VECINA_LISTINGS;

  const CATS = {
    food: { c: 'var(--food)', hex: '#a63f22', en: 'Food', es: 'Comida' },
    health: { c: 'var(--health)', hex: '#1d5f80', en: 'Health care', es: 'Salud' },
    housing: { c: 'var(--housing)', hex: '#6a3d8f', en: 'Housing', es: 'Vivienda' },
    community: { c: 'var(--community)', hex: '#1f6b4f', en: 'Community programs', es: 'Programas comunitarios' },
    legal: { c: 'var(--legal)', hex: '#7a5400', en: 'Legal and benefits', es: 'Legal y beneficios' },
    work: { c: 'var(--work)', hex: '#8a2b5a', en: 'Jobs', es: 'Empleo' }
  };
  const ICONS = {
    food: '<path d="M7 3v8a2 2 0 0 0 4 0V3M9 3v18M17 3c-2 1.5-3 4-3 7h3v11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    health: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.5 12h2l1-2 1.5 4 1-2h1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    housing: '<path d="M3 11 12 4l9 7M5.5 9.5V20h13V9.5M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    community: '<circle cx="8" cy="8" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="8" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 19c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5M11 19c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    legal: '<path d="M12 4v16M6 20h12M5 7h14M7 7l-3 6a3 3 0 0 0 6 0L7 7Zm10 0-3 6a3 3 0 0 0 6 0l-3-6Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
    work: '<rect x="3.5" y="7.5" width="17" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 7.5V5.5h6v2M3.5 12.5h17" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
  };
  const ico = (k, sm) => `<span class="ico${sm ? ' ico--sm' : ''}" style="--c:${CATS[k].hex}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${ICONS[k]}</svg></span>`;
  const SUBS = {
    food: { en: 'Pantries, meals, fridges', es: 'Despensas, comidas' }, health: { en: 'Clinics, checkups', es: 'Clínicas, chequeos' },
    housing: { en: 'Rent help, shelter', es: 'Renta, albergue' }, community: { en: 'Classes, centers, youth', es: 'Clases, centros, jóvenes' },
    legal: { en: 'Benefits, tenant rights', es: 'Beneficios, inquilinos' }, work: { en: 'Job search, training', es: 'Empleo, capacitación' }
  };
  const DAYS = {
    wk: { en: 'Monday to Friday', es: 'Lunes a viernes' }, ws: { en: 'Monday to Saturday', es: 'Lunes a sábado' },
    tt: { en: 'Tuesday and Thursday', es: 'Martes y jueves' }, mw: { en: 'Monday, Wednesday and Friday', es: 'Lunes, miércoles y viernes' },
    sa: { en: 'Saturday', es: 'Sábado' }, ev: { en: 'Every day', es: 'Todos los días' }
  };

  const T = {
    en: {
      skipResults: 'Skip to the results list', skipAccess: 'Skip to the accessibility statement', navLabel: 'Main',
      navFind: 'Find help', navAbout: 'About us', navAccess: 'Accessibility', navSuggest: 'Suggest a listing', langLabel: 'Language',
      brandHome: 'Vecina, home', zoomIn: 'Zoom in', zoomOut: 'Zoom out', cluster: n => `${n} resources in this area. Zoom in`, stmtNote: '',
      bandA: 'Every neighborhood.', bandB: 'One search.', statPrograms: 'programs on the map', statHoods: 'Boston neighborhoods', statLangs: 'languages',
      eyebrow: 'Boston community resources', h1a: 'Help is closer', h1b: 'than you think.',
      lede: 'Food, health care, housing, community programs, legal help and jobs near you. Free to use, in six languages.',
      searchLabel: 'Neighborhood or ZIP code', searchGo: 'Search',
      searchHint: 'Type at least 2 letters or numbers. Use the up and down arrow keys to choose a suggestion.',
      finderTitle: 'Resources near you', filterLegend: 'Show', resultsTitle: 'Results list',
      mapLabel: 'Map of the results. Every resource on the map is also in the results list.', mapKey: 'Map key',
      accessEyebrow: 'Accessibility statement', accessTitleA: 'Built to meet',
      accessLede: 'Vecina is designed and tested to meet the Web Content Accessibility Guidelines 2.1, Level AA, the standard named in the ADA Title II web rule and Section 508.',
      howTitle: 'What that means for you', testTitle: 'How we tested it',
      footConcept: 'is a concept site by', footDemo: 'Every listing on this page is made up for the demo. Names, hours and phone numbers (617-555-01xx) are not real services.',
      footMap: 'Map data', footContrib: 'contributors', footPhotos: 'Photos',
      needsTitle: 'What do you need?', stepsLabel: 'How it works', step1: 'Pick what you need', step2: 'Add your neighborhood', step3: 'Call or walk in',
      showAll: 'Show all', prev: 'Previous card', next: 'Next card', carHint: 'Swipe, use the arrow buttons, or scroll the cards with the arrow keys.',
      carCount: (a, n) => `${a} of ${n}`, deckOf: (a, n, h) => `Card ${a} of ${n}: ${h}`, picked: (c, n) => `Showing ${c} only: ${n} ${n === 1 ? 'resource' : 'resources'}.`,
      sugTitle: 'Suggest a listing', sugDesc: 'Know a program that should be on the map? Tell us. Fields marked required must be filled in.',
      sName: 'Program name', sType: 'Type of help', sHood: 'Neighborhood', sEmail: 'Your email', required: '(required)',
      sEmailHint: 'So we can ask a follow-up question. Example: name@example.org', cancel: 'Cancel', send: 'Send suggestion', close: 'Close',
      choose: 'Choose one', errName: 'Enter the program name.', errType: 'Choose the type of help.', errEmail: 'Enter an email address, like name@example.org.',
      errCount: n => `The form has ${n} ${n === 1 ? 'problem' : 'problems'}. The first one has focus.`,
      sent: 'Thank you for the suggestion.',
      count: (n, place) => `${n} ${n === 1 ? 'resource' : 'resources'}` + (place ? `, closest to ${place} first.` : ', A to Z.'),
      none: 'No resources match. Turn on more types of help above.',
      noPlace: q => `No neighborhood or ZIP code matches “${q}”. Try East Boston, Jamaica Plain or 02130.`,
      sugN: n => `${n} ${n === 1 ? 'suggestion' : 'suggestions'}. Use the up and down arrow keys.`,
      mi: d => `${d.toFixed(1)} mi`, miLong: d => `${d.toFixed(1)} miles away`,
      back: 'Back to the results', showMap: 'Show on the map', call: 'Call',
      dCat: 'Type', dHood: 'Neighborhood', dHours: 'Hours', dLang: 'Languages', dWalk: 'Walk-ins', walkYes: 'Welcome, no appointment needed', walkNo: 'Call first',
      english: 'English', demo: 'Demo listing. This program is made up.', here: 'You searched here', pinOf: (n, c) => `${n}, ${c}. Open details`,
      scores: [['0', 'axe-core violations on every page state'], ['100', 'Lighthouse accessibility score'], ['0', 'scripted keyboard checks that failed'], ['6', 'languages, each with its own page language']],
      checks: [
        ['key', 'Keyboard', 'Every control works without a mouse.', '2.1.1 Keyboard'],
        ['ear', 'Screen readers', 'Names, roles and updates are announced.', '4.1.2 Name, role, value'],
        ['contrast', 'Contrast', 'Text at 4.5 to 1 or more, even on photos.', '1.4.3 Contrast'],
        ['zoom', 'Zoom', 'Works at 400% zoom and on small phones.', '1.4.10 Reflow'],
        ['globe', 'Languages', 'Six languages, each marked for screen readers.', '3.1.1 Language of page'],
        ['motion', 'Calm motion', 'Animation stops when you ask it to.', '2.2.2 Pause, stop, hide']
      ],
      tested: [
        'Automated rules: axe-core (WCAG 2.0, 2.1 A and AA rules) and Lighthouse accessibility on the page, the open detail view and the open form, in all six languages.',
        'Scripted keyboard checks with real key presses: tab order, visible focus, the combobox, detail open and close, the dialog (focus moves in, stays in, Escape closes, focus returns) and form errors.',
        'Layout at 320 pixels wide (the same as 400% zoom on a laptop screen) and with increased text spacing: no sideways scrolling.',
        'Contrast checked for every color pair used on the page, including pins, borders and focus rings. Text over photos is measured against the brightest pixel behind it, on desktop and phone.'
      ]
    },
    es: {
      skipResults: 'Ir a la lista de resultados', skipAccess: 'Ir a la declaración de accesibilidad', navLabel: 'Principal',
      navFind: 'Buscar ayuda', navAbout: 'Quiénes somos', navAccess: 'Accesibilidad', navSuggest: 'Sugerir un programa', langLabel: 'Idioma',
      brandHome: 'Vecina, inicio', zoomIn: 'Acercar', zoomOut: 'Alejar', cluster: n => `${n} recursos en esta zona. Acercar el mapa`, stmtNote: '',
      bandA: 'Cada vecindario.', bandB: 'Una búsqueda.', statPrograms: 'programas en el mapa', statHoods: 'vecindarios de Boston', statLangs: 'idiomas',
      eyebrow: 'Recursos comunitarios en Boston', h1a: 'La ayuda está', h1b: 'más cerca de lo que crees.',
      lede: 'Comida, salud, vivienda, programas comunitarios, ayuda legal y empleo cerca de ti. Gratis, en seis idiomas.',
      searchLabel: 'Vecindario o código postal', searchGo: 'Buscar',
      searchHint: 'Escribe al menos 2 letras o números. Usa las flechas arriba y abajo para elegir una sugerencia.',
      finderTitle: 'Recursos cerca de ti', filterLegend: 'Mostrar', resultsTitle: 'Lista de resultados',
      mapLabel: 'Mapa de los resultados. Cada recurso del mapa también está en la lista de resultados.', mapKey: 'Leyenda del mapa',
      accessEyebrow: 'Declaración de accesibilidad', accessTitleA: 'Hecho para cumplir',
      accessLede: 'Vecina está diseñado y probado para cumplir las Pautas de Accesibilidad para el Contenido Web 2.1, nivel AA, la norma que exigen la regla web del Título II de la ADA y la Sección 508.',
      howTitle: 'Qué significa para ti', testTitle: 'Cómo lo probamos',
      footConcept: 'es un sitio de concepto de', footDemo: 'Todos los programas de esta página son inventados para la demostración. Los nombres, horarios y teléfonos (617-555-01xx) no son servicios reales.',
      footMap: 'Datos del mapa', footContrib: 'colaboradores', footPhotos: 'Fotos',
      needsTitle: '¿Qué necesitas?', stepsLabel: 'Cómo funciona', step1: 'Elige lo que necesitas', step2: 'Agrega tu vecindario', step3: 'Llama o visita',
      showAll: 'Mostrar todo', prev: 'Tarjeta anterior', next: 'Tarjeta siguiente', carHint: 'Desliza, usa los botones de flecha o recorre las tarjetas con las flechas del teclado.',
      carCount: (a, n) => `${a} de ${n}`, deckOf: (a, n, h) => `Carta ${a} de ${n}: ${h}`, picked: (c, n) => `Solo ${c}: ${n} ${n === 1 ? 'recurso' : 'recursos'}.`,
      sugTitle: 'Sugerir un programa', sugDesc: '¿Conoces un programa que debería estar en el mapa? Cuéntanos. Los campos marcados como obligatorios se deben llenar.',
      sName: 'Nombre del programa', sType: 'Tipo de ayuda', sHood: 'Vecindario', sEmail: 'Tu correo electrónico', required: '(obligatorio)',
      sEmailHint: 'Para hacerte una pregunta si hace falta. Ejemplo: nombre@ejemplo.org', cancel: 'Cancelar', send: 'Enviar sugerencia', close: 'Cerrar',
      choose: 'Elige una opción', errName: 'Escribe el nombre del programa.', errType: 'Elige el tipo de ayuda.', errEmail: 'Escribe un correo electrónico, como nombre@ejemplo.org.',
      errCount: n => `El formulario tiene ${n} ${n === 1 ? 'problema' : 'problemas'}. El primero tiene el foco.`,
      sent: 'Gracias por la sugerencia.',
      count: (n, place) => `${n} ${n === 1 ? 'recurso' : 'recursos'}` + (place ? `, primero los más cercanos a ${place}.` : ', de la A a la Z.'),
      none: 'Ningún recurso coincide. Activa más tipos de ayuda arriba.',
      noPlace: q => `Ningún vecindario o código postal coincide con “${q}”. Prueba East Boston, Jamaica Plain o 02130.`,
      sugN: n => `${n} ${n === 1 ? 'sugerencia' : 'sugerencias'}. Usa las flechas arriba y abajo.`,
      mi: d => `${d.toFixed(1)} mi`, miLong: d => `a ${d.toFixed(1)} millas`,
      back: 'Volver a los resultados', showMap: 'Ver en el mapa', call: 'Llamar',
      dCat: 'Tipo', dHood: 'Vecindario', dHours: 'Horario', dLang: 'Idiomas', dWalk: 'Sin cita', walkYes: 'Bienvenidos, no hace falta cita', walkNo: 'Llama antes',
      english: 'Inglés', demo: 'Programa de demostración. Es inventado.', here: 'Buscaste aquí', pinOf: (n, c) => `${n}, ${c}. Abrir detalles`,
      scores: [['0', 'fallas de axe-core en cada estado de la página'], ['100', 'puntuación de accesibilidad en Lighthouse'], ['0', 'pruebas de teclado con script que fallaron'], ['6', 'idiomas, cada uno con su idioma de página']],
      checks: [
        ['key', 'Teclado', 'Todo funciona sin ratón.', '2.1.1 Teclado'],
        ['ear', 'Lectores de pantalla', 'Nombres, roles y cambios se anuncian.', '4.1.2 Nombre, función, valor'],
        ['contrast', 'Contraste', 'Texto a 4.5 a 1 o más, también sobre fotos.', '1.4.3 Contraste'],
        ['zoom', 'Zoom', 'Funciona con zoom al 400% y en teléfonos chicos.', '1.4.10 Ajuste de flujo'],
        ['globe', 'Idiomas', 'Seis idiomas, cada uno marcado para lectores de pantalla.', '3.1.1 Idioma de la página'],
        ['motion', 'Movimiento tranquilo', 'La animación se detiene cuando lo pides.', '2.2.2 Poner en pausa, detener, ocultar']
      ],
      tested: [
        'Reglas automáticas: axe-core (reglas WCAG 2.0 y 2.1 A y AA) y accesibilidad de Lighthouse en la página, la vista de detalles abierta y el formulario abierto, en los seis idiomas.',
        'Pruebas de teclado con script y teclas reales: orden de tabulación, foco visible, el combobox, abrir y cerrar detalles, el diálogo (el foco entra, se queda, Escape cierra, el foco regresa) y errores del formulario.',
        'Diseño a 320 píxeles de ancho (lo mismo que zoom al 400% en una laptop) y con más espaciado de texto: sin desplazamiento lateral.',
        'Contraste revisado en cada par de colores de la página, incluidos marcadores, bordes y anillos de foco. El texto sobre fotos se mide contra el píxel más claro detrás de él, en computadora y teléfono.'
      ]
    }
  };

  // extra languages: interface strings, categories, days; the accessibility statement falls back to English (marked lang="en")
  const X = window.VECINA_I18N || {};
  const STMT = ['accessEyebrow', 'accessTitleA', 'accessLede', 'howTitle', 'testTitle', 'scores', 'checks', 'tested'];
  for (const [l, x] of Object.entries(X)) {
    T[l] = Object.assign({}, T.en, x.t);
    for (const k of Object.keys(CATS)) { if (x.cats && x.cats[k]) CATS[k][l] = x.cats[k]; if (x.subs && x.subs[k]) SUBS[k][l] = x.subs[k]; }
    for (const k of Object.keys(DAYS)) if (x.days && x.days[k]) DAYS[k][l] = x.days[k];
  }
  const LANGS = ['en', 'es', ...Object.keys(X)];
  let lang = 'en';
  const t = k => T[lang][k];
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const place = n => PLACES.find(p => p.n === n);
  LIST.forEach(r => { const p = place(r.p); r.lat = p.lat + r.dy; r.lng = p.lng + r.dx; r.zip = p.zip; });

  const state = { origin: null, cats: new Set(Object.keys(CATS)), open: null, opener: null };

  /* ---------- language ---------- */
  function applyLang(l) {
    lang = l;
    document.documentElement.lang = l;
    $$('[data-i18n]').forEach(el => { const v = T[l][el.dataset.i18n]; if (typeof v === 'string') el.textContent = v; });
    $$('[data-i18n-label]').forEach(el => el.setAttribute('aria-label', T[l][el.dataset.i18nLabel]));
    const sel = $('#langSel'); if (sel) sel.value = l;
    $('#legend').setAttribute('aria-label', t('mapKey'));
    $('.brand').setAttribute('aria-label', t('brandHome'));
    // the accessibility statement is written in English and Spanish only: mark it English for the other languages
    const own = l === 'en' || l === 'es';
    $('#access').lang = own ? l : 'en';
    $('#stmtNote').textContent = own ? '' : t('stmtNote'); $('#stmtNote').lang = l;
    try { localStorage.setItem('vecina-lang', l); } catch (e) { /* private mode */ }
    buildFilters(); buildLegend(); buildStatement(); buildTypeSelect(); buildNeeds();
    renderList(false);
    refreshPins();
    if (state.open) renderDetail(state.open, false);
  }
  $('#langSel').addEventListener('change', e => applyLang(e.target.value));

  /* ---------- filters (native checkboxes in a fieldset) ---------- */
  function buildFilters() {
    $('#filters').innerHTML = Object.entries(CATS).map(([k, c]) => `
      <span class="chip" style="--c:${c.c}"><input type="checkbox" id="f-${k}" value="${k}" ${state.cats.has(k) ? 'checked' : ''}><label for="f-${k}"><i aria-hidden="true"></i>${c[lang]}</label></span>`).join('');
  }
  $('#filters').addEventListener('change', e => {
    if (e.target.type !== 'checkbox') return;
    e.target.checked ? state.cats.add(e.target.value) : state.cats.delete(e.target.value);
    if (state.open) closeDetail(false);
    renderList(true); refreshPins();
  });
  function buildLegend() {
    $('#legend').innerHTML = Object.values(CATS).map(c => `<li style="--c:${c.c}"><i aria-hidden="true"></i>${c[lang]}</li>`).join('');
  }

  /* ---------- distance + list ---------- */
  const miles = (a, b) => {
    const R = 3958.8, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const visible = () => {
    const rows = LIST.filter(r => state.cats.has(r.c)).map(r => ({ r, d: state.origin ? miles(state.origin, r) : null }));
    rows.sort((a, b) => state.origin ? a.d - b.d : a.r.name.localeCompare(b.r.name));
    return rows;
  };
  function renderList(announce) {
    const rows = visible();
    $('#cards').innerHTML = rows.length ? rows.map(({ r, d }) => `
      <li><button type="button" class="card${state.open === r.id ? ' is-on' : ''}" data-id="${r.id}" style="--c:${CATS[r.c].c}">
        ${ico(r.c, true)}
        <span class="card__name">${esc(r.name)}</span>
        ${d != null ? `<span class="card__dist"><span aria-hidden="true">${t('mi')(d)}</span><span class="sr-only">, ${t('miLong')(d)}</span></span>` : ''}
        <span class="card__meta">${CATS[r.c][lang]} · ${esc(r.p)}</span>
      </button></li>`).join('') : `<li class="empty">${t('none')}</li>`;
    const msg = t('count')(rows.length, state.origin && state.origin.n);
    if (announce) { $('#count').textContent = ''; setTimeout(() => { $('#count').textContent = msg; }, 60); }
    else $('#count').textContent = msg;
  }
  $('#cards').addEventListener('click', e => {
    const b = e.target.closest('.card'); if (!b) return;
    openDetail(+b.dataset.id, b);
  });

  /* ---------- detail view: focus moves in, Back/Escape returns to the opener ---------- */
  const langName = code => {
    try { return new Intl.DisplayNames([lang], { type: 'language' }).of(code); } catch (e) { return code; }
  };
  function renderDetail(id, focus) {
    const r = LIST.find(x => x.id === id), cat = CATS[r.c];
    const d = state.origin ? miles(state.origin, r) : null;
    const phone = `617-555-01${String(r.id).padStart(2, '0')}`;
    const langs = [t('english'), ...r.l.map(langName)].join(', ');
    const el = $('#detail');
    el.style.setProperty('--c', cat.c);
    el.innerHTML = `
      <div class="mapcard__top">
        <p class="cat">${ico(r.c, true)}${cat[lang]}</p>
        <button type="button" class="iconbtn mapcard__x" id="back" aria-label="${t('back')}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
      </div>
      <h3 id="detailName" tabindex="-1">${esc(r.name)}</h3>
      ${d != null ? `<p>${t('miLong')(d)}</p>` : ''}
      <dl>
        <dt>${t('dHood')}</dt><dd>${esc(r.p)}, MA ${r.zip}</dd>
        <dt>${t('dHours')}</dt><dd>${DAYS[r.d][lang]}, ${r.h}</dd>
        <dt>${t('dLang')}</dt><dd>${esc(langs)}</dd>
        <dt>${t('dWalk')}</dt><dd>${r.walk ? t('walkYes') : t('walkNo')}</dd>
      </dl>
      <div class="detail__actions">
        <a class="btn btn--solid" href="tel:+1${phone.replace(/-/g, '')}">${t('call')} ${phone}</a>
      </div>
`;
    $('#back').addEventListener('click', () => closeDetail(true));
    if (focus) $('#detailName').focus();
  }
  function openDetail(id, opener) {
    state.open = id; state.opener = opener || null;
    const card = $('#detail');
    card.hidden = false; card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in');
    renderDetail(id, true);
    highlight(id, true);
    // Leaflet keeps focus on a pin after its click event; move it to the card once the map has settled
    setTimeout(() => { const h = $('#detailName'); if (h && state.open === id && document.activeElement !== h) h.focus({ preventScroll: true }); $('.mapbox').scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); }, 60);
  }
  function closeDetail(restore) {
    const id = state.open;
    state.open = null;
    $('#detail').hidden = true;
    highlight(null, false);
    if (!restore) return;
    const back = (state.opener && state.opener.classList.contains('pin') && pins.get(id)?.getElement()) || $(`.card[data-id="${id}"]`);
    if (back) { back.focus(); if (back.scrollIntoView) back.scrollIntoView({ block: 'nearest' }); }
  }
  $('#detail').addEventListener('keydown', e => { if (e.key === 'Escape' && state.open) { e.preventDefault(); closeDetail(true); } });

  /* ---------- map ---------- */
  const map = L.map('map', { maxZoom: 18, minZoom: 10, attributionControl: false, zoomControl: true, scrollWheelZoom: false, keyboard: true, zoomAnimation: !reduce, fadeAnimation: !reduce, markerZoomAnimation: !reduce })
    .setView([42.322, -71.09], 12);
  // basemap: OpenFreeMap vector tiles (no key), recolored to the Vecina palette; plain raster tiles if WebGL or the style fails
  const PAINT = {
    background: { 'background-color': '#f3eee5' }, park: { 'fill-color': '#dfe8d5' }, landcover_wood: { 'fill-color': '#d9e3cf' },
    water: { 'fill-color': '#b7d3d3' }, waterway: { 'line-color': '#a9c9c9' }, landuse_residential: { 'fill-color': '#efe9df' },
    building: { 'fill-color': '#e8e0d2', 'fill-outline-color': '#ddd2c0' },
    highway_minor: { 'line-color': '#fbf8f2' }, highway_path: { 'line-color': '#f6f1e8' },
    highway_major_casing: { 'line-color': '#e2d6c3' }, highway_major_inner: { 'line-color': '#ffffff' }, highway_major_subtle: { 'line-color': '#e6dccb' },
    highway_motorway_casing: { 'line-color': '#e3c48d' }, highway_motorway_inner: { 'line-color': '#f8e2b4' }, highway_motorway_subtle: { 'line-color': '#ecd3a3' },
    highway_motorway_bridge_casing: { 'line-color': '#e3c48d' }, highway_motorway_bridge_inner: { 'line-color': '#f8e2b4' },
    railway: { 'line-color': '#d8cfc1' }, railway_transit: { 'line-color': '#d8cfc1' }, railway_service: { 'line-color': '#d8cfc1' },
    water_name_point_label: { 'text-color': '#3f6f72', 'text-halo-color': '#e6f0ef' }, water_name_line_label: { 'text-color': '#3f6f72', 'text-halo-color': '#e6f0ef' },
    'highway-name-minor': { 'text-color': '#8a8177' }, 'highway-name-major': { 'text-color': '#6f665c' },
    label_other: { 'text-color': '#5e574f', 'text-halo-color': '#f7f3ec' }, label_village: { 'text-color': '#3c3631', 'text-halo-color': '#f7f3ec' },
    label_town: { 'text-color': '#3c3631', 'text-halo-color': '#f7f3ec' }, label_city: { 'text-color': '#1d1b18', 'text-halo-color': '#f7f3ec' }
  };
  const DROP = /shield|boundary|airport|aeroway|highway-name-path|tunnel|dashline|ne2/;
  const rasterFallback = () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, maxNativeZoom: 16 }).addTo(map);
  (async () => {
    try {
      const probe = document.createElement('canvas');
      if (!L.maplibreGL || !window.maplibregl || !(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('no webgl');
      const style = await (await fetch('https://tiles.openfreemap.org/styles/positron')).json();
      style.layers = style.layers.filter(l => !DROP.test(l.id) && !(l.source === 'ne2_shaded'));
      for (const l of style.layers) if (PAINT[l.id]) l.paint = Object.assign({}, l.paint, PAINT[l.id]);
      const gl = L.maplibreGL({ style, interactive: false }).addTo(map);
      const c = gl.getMaplibreMap && gl.getMaplibreMap().getCanvas(); if (c) { c.setAttribute('aria-hidden', 'true'); c.removeAttribute('aria-label'); c.removeAttribute('role'); c.tabIndex = -1; }
    } catch (e) { rasterFallback(); }
  })();
  // name the map's own controls in plain words
  const nameControls = () => {
    const zi = $('.leaflet-control-zoom-in'), zo = $('.leaflet-control-zoom-out');
    if (zi) { zi.setAttribute('aria-label', t('zoomIn')); zi.title = t('zoomIn'); }
    if (zo) { zo.setAttribute('aria-label', t('zoomOut')); zo.title = t('zoomOut'); }
  };
  const pins = new Map();
  let here = null;
  // nearby pins are grouped into numbered clusters, so every target on the map is at least 44px and never overlaps
  const cluster = L.markerClusterGroup({
    maxClusterRadius: 80, showCoverageOnHover: false, spiderfyOnMaxZoom: true, animate: !reduce,
    iconCreateFunction: c => L.divIcon({ className: 'cl', html: `<span aria-hidden="true">${c.getChildCount()}</span>`, iconSize: null })
  }).addTo(map);
  const pinLabel = r => t('pinOf')(r.name, CATS[r.c][lang]);
  const clLabel = n => t('cluster')(n);
  // name each cluster when it appears, and make Enter/Space zoom into it, then focus the first pin inside
  map.on('layeradd', e => {
    const l = e.layer;
    if (!(l instanceof L.MarkerCluster)) return;
    const el = l.getElement(); if (!el) return;
    el.setAttribute('role', 'button'); el.setAttribute('aria-label', clLabel(l.getChildCount())); el.removeAttribute('title');
    if (el.dataset.k) return; el.dataset.k = '1';
    el.addEventListener('keydown', ev => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault(); ev.stopPropagation();
      const first = l.getAllChildMarkers()[0];
      cluster.zoomToShowLayer(first, () => setTimeout(() => { const fe = first.getElement() || first.__parent?.getElement?.(); (fe || map.getContainer()).focus({ preventScroll: true }); }, 350));
    });
  });
  function decorate(m, r) {
    const el = m.getElement(); if (!el) return;
    el.style.setProperty('--c', CATS[r.c].hex);
    el.classList.toggle('is-on', state.open === r.id);
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', pinLabel(r));
    el.removeAttribute('title');
    if (el.dataset.k) return; el.dataset.k = '1';
    // pins act like buttons: Enter and Space open the details (handled here, not by Leaflet's keypress)
    el.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); openDetail(r.id, el); } });
  }
  function refreshPins() {
    nameControls();
    cluster.clearLayers(); pins.clear();
    const ms = visible().map(({ r }) => {
      const m = L.marker([r.lat, r.lng], { icon: L.divIcon({ className: 'pin', html: `<span class="pin__in" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${ICONS[r.c]}</svg></span>`, iconSize: null }), keyboard: true, riseOnHover: true });
      m.on('add', () => decorate(m, r));
      m.on('click', () => openDetail(r.id, m.getElement()));
      pins.set(r.id, m);
      return m;
    });
    cluster.addLayers(ms);
    if (here) { here.getElement()?.setAttribute('aria-label', t('here')); }
  }
  function highlight(id, pan) {
    pins.forEach((m, k) => m.getElement()?.classList.toggle('is-on', k === id));
    $$('.card').forEach(c => c.classList.toggle('is-on', +c.dataset.id === id));
    if (id && pan) { const m = pins.get(id); if (m) cluster.zoomToShowLayer(m, () => { m.getElement()?.classList.add('is-on'); const pt = map.latLngToContainerPoint(m.getLatLng()); const wide = map.getSize().x > 700; const target = map.containerPointToLatLng(L.point(pt.x + (wide ? 200 : 0), pt.y + (wide ? 0 : 120))); map.panTo(target, { animate: !reduce }); }); }
  }
  function focusPin(id) {
    const m = pins.get(id); if (!m) return;
    cluster.zoomToShowLayer(m, () => {
      const el = m.getElement(); if (!el) return;
      el.classList.add('is-on');
      el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      state.opener = el;
    });
  }

  /* ---------- combobox (ARIA 1.2 list autocomplete) ---------- */
  const q = $('#q'), box = $('#qList');
  let opts = [], act = -1;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function suggest() {
    const v = norm(q.value.trim());
    opts = v.length < 2 ? [] : PLACES.filter(p => norm(p.n).includes(v) || p.zip.startsWith(v)).slice(0, 8);
    act = -1;
    if (!opts.length) { closeBox(); return; }
    box.innerHTML = opts.map((p, i) => `<li role="option" id="opt-${i}" aria-selected="false" data-i="${i}">${esc(p.n)} <span>${p.zip}</span></li>`).join('');
    box.hidden = false; q.setAttribute('aria-expanded', 'true'); q.removeAttribute('aria-activedescendant');
    $('#count').textContent = t('sugN')(opts.length);
  }
  function closeBox() { box.hidden = true; box.innerHTML = ''; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); act = -1; }
  function move(n) {
    if (box.hidden) { suggest(); if (box.hidden) return; }
    act = (act + n + opts.length) % opts.length;
    $$('li', box).forEach((li, i) => li.setAttribute('aria-selected', String(i === act)));
    q.setAttribute('aria-activedescendant', `opt-${act}`);
    $(`#opt-${act}`).scrollIntoView({ block: 'nearest' });
  }
  function choose(p) {
    q.value = `${p.n} ${p.zip}`; closeBox();
    state.origin = p;
    if (state.open) closeDetail(false);
    if (here) here.remove();
    here = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: 'here', iconSize: null }), keyboard: false, interactive: false }).addTo(map);
    here.getElement().setAttribute('aria-hidden', 'true');
    map.setView([p.lat, p.lng], 13, { animate: !reduce });
    renderList(true); refreshPins();
  }
  q.addEventListener('input', suggest);
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter' && act > -1) { e.preventDefault(); choose(opts[act]); }
    else if (e.key === 'Escape') { if (!box.hidden) { e.preventDefault(); closeBox(); } else { q.value = ''; } }
  });
  q.addEventListener('blur', () => setTimeout(closeBox, 150));
  box.addEventListener('mousedown', e => e.preventDefault()); // keep focus in the input
  box.addEventListener('click', e => { const li = e.target.closest('li'); if (li) choose(opts[+li.dataset.i]); });
  $('#searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = norm(q.value.trim());
    const p = PLACES.find(x => v && (norm(`${x.n} ${x.zip}`) === v || norm(x.n) === v || x.zip === v)) || (opts.length === 1 ? opts[0] : PLACES.find(x => v.length >= 2 && (norm(x.n).startsWith(v) || x.zip.startsWith(v))));
    if (p) { choose(p); $('#results').focus(); }
    else { $('#count').textContent = t('noPlace')(q.value.trim()); q.focus(); }
  });

  /* ---------- dialog: native <dialog> + showModal keeps focus inside; we return focus to the opener ---------- */
  const dlg = $('#suggest');
  let dlgOpener = null;
  function buildTypeSelect() {
    const s = $('#sType'), keep = s.value;
    s.innerHTML = `<option value="">${t('choose')}</option>` + Object.entries(CATS).map(([k, c]) => `<option value="${k}">${c[lang]}</option>`).join('');
    s.value = keep;
  }
  $('#suggestOpen').addEventListener('click', e => {
    dlgOpener = e.currentTarget;
    $('#sugStatus').textContent = '';
    dlg.showModal();
    $('#sName').focus();
  });
  const shut = () => dlg.close();
  $('#suggestClose').addEventListener('click', shut);
  $('#suggestCancel').addEventListener('click', shut);
  dlg.addEventListener('close', () => { clearErrors(); if (dlgOpener) dlgOpener.focus(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) shut(); }); // click on the backdrop
  // keep Tab inside the dialog (native modal dialogs let Tab reach the browser's own toolbar)
  dlg.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = $$('button, input, select, textarea, a[href]', dlg).filter(el => !el.disabled && el.offsetParent !== null);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  function clearErrors() {
    ['sName', 'sType', 'sEmail'].forEach(id => { $('#' + id).removeAttribute('aria-invalid'); const m = $('#' + id + 'Err'); m.hidden = true; m.textContent = ''; });
  }
  $('#suggestForm').addEventListener('submit', e => {
    e.preventDefault();
    clearErrors();
    const bad = [];
    if (!$('#sName').value.trim()) bad.push(['sName', t('errName')]);
    if (!$('#sType').value) bad.push(['sType', t('errType')]);
    const em = $('#sEmail').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) bad.push(['sEmail', t('errEmail')]);
    bad.forEach(([id, msg]) => { $('#' + id).setAttribute('aria-invalid', 'true'); const m = $('#' + id + 'Err'); m.textContent = msg; m.hidden = false; });
    if (bad.length) {
      $('#' + bad[0][0]).focus();
      $('#sugStatus').textContent = t('errCount')(bad.length);
      return;
    }
    $('#suggestForm').reset(); buildTypeSelect();
    $('#sugStatus').textContent = t('sent');
    $('#sName').focus();
  });

  /* ---------- "What do you need?" tiles: one tap filters to that type and moves to the results ---------- */
  function buildNeeds() {
    $('#needs').innerHTML = Object.keys(CATS).map(k => `<li><button type="button" class="need" data-k="${k}">${ico(k)}<span>${CATS[k][lang]}<small>${SUBS[k][lang]}</small></span></button></li>`).join('');
  }
  $('#needs').addEventListener('click', e => {
    const b = e.target.closest('.need'); if (!b) return;
    state.cats = new Set([b.dataset.k]);
    if (state.open) closeDetail(false);
    buildFilters(); renderList(false); refreshPins();
    const n = visible().length;
    $('#count').textContent = '';
    setTimeout(() => { $('#count').textContent = t('picked')(CATS[b.dataset.k][lang], n); }, 60);
    $('#finder').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    $('#results').focus({ preventScroll: true });
  });
  $('#showAll').addEventListener('click', () => {
    state.cats = new Set(Object.keys(CATS));
    if (state.open) closeDetail(false);
    buildFilters(); renderList(true); refreshPins();
  });

  /* ---------- carousel: native horizontal scroll (swipe) plus Previous / Next buttons; nothing moves on its own ---------- */
  const car = $('#carousel'), prevB = $('#carPrev'), nextB = $('#carNext');
  if (car) {
  const cardsIn = () => $$('#checks li');
  const curIdx = () => {
    const cs = cardsIn(), x = car.scrollLeft, o = cs[0].offsetLeft;
    let best = 0;
    cs.forEach((c, i) => { if (Math.abs(c.offsetLeft - o - x) < Math.abs(cs[best].offsetLeft - o - x)) best = i; });
    return best;
  };
  function carState() {
    const cs = cardsIn(); if (!cs.length) return;
    const atStart = car.scrollLeft <= 2, atEnd = car.scrollLeft + car.clientWidth >= car.scrollWidth - 2;
    prevB.setAttribute('aria-disabled', String(atStart)); nextB.setAttribute('aria-disabled', String(atEnd));
    const vis = Math.max(1, Math.floor((car.clientWidth + 16) / (cs[0].offsetWidth + 16)));
    const a = atEnd ? cs.length - vis + 1 : curIdx() + 1, z = Math.min(cs.length, a + vis - 1);
    $('#carCount').textContent = t('carCount')(a === z ? a : `${a}–${z}`, cs.length);
  }
  const step = dir => {
    const cs = cardsIn(); if (!cs.length) return;
    const i = Math.max(0, Math.min(cs.length - 1, curIdx() + dir));
    car.scrollTo({ left: cs[i].offsetLeft - cs[0].offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  };
  prevB.addEventListener('click', () => { if (prevB.getAttribute('aria-disabled') !== 'true') step(-1); });
  nextB.addEventListener('click', () => { if (nextB.getAttribute('aria-disabled') !== 'true') step(1); });
  let carT;
  car.addEventListener('scroll', () => { clearTimeout(carT); carT = setTimeout(carState, 80); }, { passive: true });
  addEventListener('resize', carState);
  }

  /* ---------- accessibility statement ---------- */
  function buildStatement() {
    $('#scores').innerHTML = t('scores').map(([n, s]) => `<div class="ledger__item" role="listitem"><b>${n}</b><span>${s}</span></div>`).join('');
    const FI = {
      key: '<rect x="3" y="7" width="18" height="11" rx="2"/><path d="M7 11h1M11 11h1M15 11h2M8 14h8"/>',
      ear: '<path d="M8 15c-1.5-1-3-3-3-6a7 7 0 0 1 14 0c0 4-4 5-4 8a3 3 0 0 1-5 2"/><path d="M12 9a2 2 0 0 1 2 2"/>',
      contrast: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16a8 8 0 0 0 0-16Z" fill="currentColor"/>',
      zoom: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20M10.5 8v5M8 10.5h5"/>',
      globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.5 3.6 5.3 3.6 8.5S14.4 18 12 20.5M12 3.5C9.6 6 8.4 8.8 8.4 12s1.2 6 3.6 8.5"/>',
      motion: '<path d="M4 12h3l2-5 3 10 2-5h6"/>'
    };
    window.VecinaDeck && window.VecinaDeck.render(t('checks'), t('deckOf'));
    $('#tested').innerHTML = t('tested').map(s => `<li>${s}</li>`).join('');
    if (typeof carState === 'function' && $('#carousel')) setTimeout(carState, 0);
  }

  /* ---------- start ---------- */
  let saved = null; try { saved = localStorage.getItem('vecina-lang'); } catch (e) { /* private mode */ }
  const urlLang = new URLSearchParams(location.search).get('lang');
  const nav = (navigator.language || '').slice(0, 2);
  applyLang(LANGS.includes(urlLang) ? urlLang : LANGS.includes(saved) ? saved : LANGS.includes(nav) ? nav : 'en');
})();
