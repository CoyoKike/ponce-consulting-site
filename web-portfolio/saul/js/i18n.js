// Spanish is the page's own text (read from the DOM). English lives here.
const EN = {
  'loader': 'Loading 16 boroughs',
  'nav.about': 'Studio', 'nav.exp': 'Projects', 'nav.skills': 'Skills', 'nav.data': 'CDMX data', 'nav.projects': 'Project', 'nav.contact': 'Contact',
  'hero.eyebrow': 'Data, maps and software · Mexico City',
  'hero.lede': 'We build map and data platforms for government and research, with GeoNode, Python and Nuxt.',
  'hero.scroll': 'Scroll to change the indicator',
  'about.eyebrow': 'The studio',
  'about.title': 'Engineering, maps and data <em>for the city.</em>',
  'about.text': 'We are a data studio in Coyoacán. We design and build geographic information platforms, open data portals and dashboards that explain the city with clear charts and maps.',
  'about.f1k': 'We build', 'about.f1v': 'GIS platforms and dashboards',
  'about.f2k': 'Focus', 'about.f2v': 'Big data and visualization',
  'about.f3k': 'Based in', 'about.f4k': 'Languages', 'about.f4v': 'Spanish and English',
  'exp.eyebrow': 'Projects', 'exp.title': 'Recent work',
  'exp.2d': '2023 to 2024', 'exp.3d': '2021 to 2023', 'exp.4d': '2020 to 2021', 'exp.5d': '2023 to 2025',
  'exp.1d': '2026', 'exp.1r': 'Mapping platform',
  'exp.2r': 'Information systems and web portals', 'exp.2o': 'Federal environment and climate institute',
  'exp.3r': 'Functional testing', 'exp.4r': 'Custom websites', 'exp.4o': 'Independent clients',
  'exp.5r': 'Big data analysis and visualization', 'exp.6d': 'Foundation', 'exp.6r': 'Systems engineering',
  'skills.eyebrow': 'Skills', 'skills.title': 'What I do, <em>in plain words</em>',
  'sk.1h': 'Maps and GIS', 'sk.1p': 'Turning data with a location into maps that answer questions: where people live, where something is missing, how the city changes.',
  'sk.1e': 'Where: GeoNode mapping platforms.',
  'sk.2h': 'Python servers and data', 'sk.2p': 'Programs that receive, clean and deliver information so a page or a map can show it.',
  'sk.2e': 'Where: Python and JavaScript backends.',
  'sk.3h': 'Websites and portals', 'sk.3p': 'Fast, clear sites that people use every day, from design to launch.',
  'sk.3e': 'Where: Nuxt frontends and public web portals.',
  'sk.4h': 'Databases', 'sk.4p': 'Keeping information in order so it can be queried quickly and without errors, even with millions of records.',
  'sk.4e': 'Where: government information systems.',
  'sk.5h': 'Quality testing', 'sk.5p': 'Checking every feature before it reaches people, finding bugs and documenting them so they get fixed.',
  'sk.5e': 'Where: functional QA for a global game studio.',
  'sk.6h': 'Networks', 'sk.6p': 'How an organization’s computers are connected and which way information travels between them.',
  'sk.6e': 'Background: Cisco networking with OSPF, BGP and EIGRP routing.',
  'data.eyebrow': 'Mexico City data', 'data.title': 'The city <em>in numbers</em>',
  'data.lede': 'Official open data, by borough. Every chart says where it comes from.',
  'kpi.pop': 'Residents, 2020', 'kpi.area': 'Area in km²', 'kpi.density': 'Residents per km², 2020', 'kpi.metro': 'Metro entries per day, 2019',
  'map.hint': 'Height and color = value. Hover or tap a borough.',
  'm.pop': 'Population', 'm.density': 'Density', 'm.metro': 'Metro', 'm.space': 'Public space', 'm.car': 'Cars',
  'c.pop.t': 'Residents by borough, 2020', 'c.pop.a': 'Residents', 'c.pop.b': 'Per km²',
  'c.metro.t': 'Daily Metro entries by borough, 2019',
  'c.metro.s': 'STC Metro, daily ridership by station 2019 (datos.cdmx.gob.mx) · stations located with INEGI',
  'c.metrot.t': 'Daily Metro entries, January 2019 to August 2023',
  'c.metrot.s': 'STC Metro, daily average of each month, whole network (datos.cdmx.gob.mx)',
  'c.veh.t': 'Households with a car and with a bicycle, 2020', 'c.veh.s': 'INEGI, 2020 Census · % of occupied homes',
  'c.space.t': 'Public space per resident, m²',
  'c.space.s': 'Mexico City Government and CentroGeo, 2020 to 2021, with 2010 population (datos.cdmx.gob.mx)',
  'c.pm.t': 'Annual mean PM2.5 by station, 2024',
  'c.pm.s': 'SEDEMA, SIMAT, 24 h averages (aire.cdmx.gob.mx) · Mexico City stations with valid data on at least half the year',
  'c.pmt.t': 'Monthly mean PM2.5, 2024', 'c.pmt.s': 'SEDEMA, SIMAT, average of Mexico City stations (aire.cdmx.gob.mx)',
  'pr.eyebrow': 'GIS project', 'pr.title': 'Maps that <em>get used</em>',
  'pr.3h': 'Mexico City in 3D',
  'pr.3p': 'The processing behind this site, in Python with no GIS libraries: reading INEGI’s shapefiles, simplifying each boundary to a 60 m tolerance, placing every Metro station in its borough, and drawing it all in Three.js.',
  'ct.eyebrow': 'Contact', 'ct.title': 'A <em>data or mapping</em> project?', 'ct.k1': 'Location', 'ct.k2': 'Languages',
  'foot.credits': 'Sources and credits',
  // v5: fuller Experience, Projects, Contact and the two scroll scenes
  'exp.1o': 'Research center · Geographic information',
  'exp.1t': 'The full mapping platform: GeoNode as the catalog of layers, a JavaScript and Python backend and a Nuxt frontend, delivered in monthly agile cycles.',
  'exp.1c0': 'GIS', 'exp.1c': 'Monthly agile cycles',
  'exp.2t': 'Information systems and web portals that publish the country’s environment and climate data in order.',
  'exp.2c1': 'Information systems', 'exp.2c2': 'Web portals', 'exp.2c3': 'Databases', 'exp.2c4': 'Team leadership',
  'exp.3o': 'Global video game studio',
  'exp.3t': 'Testing features before they reach users: every test case, every bug reproduced step by step and documented so it can be fixed.',
  'exp.3c1': 'Functional testing', 'exp.3c2': 'Bug reporting', 'exp.3c3': 'Test cases',
  'exp.4t': 'Websites end to end: design, code and launch, each one made to fit the client.',
  'exp.4c1': 'Web design', 'exp.4c2': 'Launch',
  'exp.5o': 'Studio focus',
  'exp.5t': 'Large volumes of data explained with clear charts and maps. It is the basis of the Mexico City dashboards on this site.',
  'exp.5c1': 'Visualization',
  'exp.6t': 'The technical base: programming, databases and networks.',
  'exp.6c1': 'Programming', 'exp.6c2': 'Databases', 'exp.6c3': 'Cisco networking: OSPF, BGP, EIGRP',
  'b1.eyebrow': 'From data to map', 'b1.title': '16 boroughs, <em>one city.</em>',
  'b1.k1': 'Residents, 2020', 'b1.k2': 'Area in km²',
  'b1.note': 'Each borough’s height is its population. It grows as you scroll down.',
  'b1.src': 'INEGI, 2020 Population and Housing Census · 2020 Geostatistical Framework',
  'b2.eyebrow': 'How the map was made', 'b2.title': 'Five open sources, <em>one map.</em>',
  'b2.l1': 'Borough boundaries', 'b2.l2': 'Population', 'b2.l2s': 'INEGI, 2020 Census', 'b2.l3': 'Metro entries',
  'b2.l4': 'Public space', 'b2.l4s': 'Mexico City Government and CentroGeo', 'b2.l5': 'Air quality, PM2.5',
  'b2.note': 'Each layer is the city according to one source: grey (low value) to amber (high value); dark grey means no data.',
  'pr.out': 'Outcome',
  'pr.3o': 'A light map that loads fast on a phone, with the 16 official boundaries and the 7 charts on this site.',
  'ct.lede': 'Maps, data platforms and web portals, from idea to launch.',
  'ct.capT': 'A clear route', 'ct.cap': 'Idea → data → map → launch',
  'ct.s1': 'Maps and GIS', 'ct.s1p': 'Geographic layer platforms with GeoNode',
  'ct.s2': 'Data and dashboards', 'ct.s2p': 'From open data to charts that are easy to read',
  'ct.s3': 'Web portals', 'ct.s3p': 'Fast sites in Nuxt and JavaScript',
  'ct.langs': 'Spanish · English', 'ct.k3': 'Time in Mexico City',
};

// Strings built in JS (charts, map, hero captions)
export const T = {
  es: {
    pop: 'Población', popSub: 'Habitantes por alcaldía, 2020', popUnit: 'habitantes',
    density: 'Densidad', densitySub: 'Habitantes por km², 2020', densityUnit: 'hab/km²',
    metro: 'Metro', metroSub: 'Entradas diarias promedio, 2019', metroUnit: 'entradas al día',
    space: 'Espacio público', spaceSub: 'm² de espacio público por habitante', spaceUnit: 'm² por habitante',
    car: 'Autos', carSub: '% de hogares con auto, 2020', carUnit: '% de hogares',
    top: 'Más alto', noData: 'sin Metro', noStation: 'Sin estación',
    mapTitle: { pop: 'Población por alcaldía, 2020', density: 'Habitantes por km², 2020', metro: 'Entradas diarias al Metro, 2019', space: 'Espacio público por habitante (m²)', car: 'Hogares con auto, 2020' },
    axisPeople: 'Habitantes', axisDensity: 'Habitantes por km²', axisEntries: 'Entradas por día', axisPct: '% de hogares', axisM2: 'm² por habitante', axisPm: 'µg/m³',
    car2: 'Auto', bike: 'Bicicleta', cityAvg: 'Promedio CDMX', who: 'Guía OMS anual: 5', million: 'M', thousand: 'mil',
    months: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    noMetroNote: 'Sin estaciones de Metro: Cuajimalpa, Magdalena Contreras, Milpa Alta, Tlalpan y Xochimilco',
    edomex: 'Estaciones en el Estado de México (no incluidas):',
    credits: 'Fotografías', dataSources: 'Datos', perDay: 'al día',
    prBuildCap: 'Shapefiles de INEGI → Python → 16 límites oficiales y 7 gráficas',
    coyCap: 'habitantes, 2020 · INEGI',
    src: { pop: 'INEGI, Censo de Población y Vivienda 2020', density: 'INEGI, Censo 2020 · Marco Geoestadístico 2020', metro: 'STC Metro 2019 (datos.cdmx.gob.mx) · estaciones ubicadas con INEGI', space: 'Gobierno de la CDMX y CentroGeo, 2020 a 2021 (datos.cdmx.gob.mx)', car: 'INEGI, Censo de Población y Vivienda 2020' },
  },
  en: {
    pop: 'Population', popSub: 'Residents per borough, 2020', popUnit: 'residents',
    density: 'Density', densitySub: 'Residents per km², 2020', densityUnit: 'per km²',
    metro: 'Metro', metroSub: 'Average daily entries, 2019', metroUnit: 'entries per day',
    space: 'Public space', spaceSub: 'm² of public space per resident', spaceUnit: 'm² per resident',
    car: 'Cars', carSub: '% of households with a car, 2020', carUnit: '% of households',
    top: 'Highest', noData: 'no Metro', noStation: 'No station',
    mapTitle: { pop: 'Population by borough, 2020', density: 'Residents per km², 2020', metro: 'Daily Metro entries, 2019', space: 'Public space per resident (m²)', car: 'Households with a car, 2020' },
    axisPeople: 'Residents', axisDensity: 'Residents per km²', axisEntries: 'Entries per day', axisPct: '% of households', axisM2: 'm² per resident', axisPm: 'µg/m³',
    car2: 'Car', bike: 'Bicycle', cityAvg: 'Mexico City average', who: 'WHO annual guideline: 5', million: 'M', thousand: 'k',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    noMetroNote: 'No Metro stations: Cuajimalpa, Magdalena Contreras, Milpa Alta, Tlalpan and Xochimilco',
    edomex: 'Stations in the State of Mexico (not included):',
    credits: 'Photographs', dataSources: 'Data', perDay: 'per day',
    prBuildCap: 'INEGI shapefiles → Python → 16 official boundaries and 7 charts',
    coyCap: 'residents, 2020 · INEGI',
    src: { pop: 'INEGI, 2020 Population and Housing Census', density: 'INEGI, 2020 Census · 2020 Geostatistical Framework', metro: 'STC Metro 2019 (datos.cdmx.gob.mx) · stations located with INEGI', space: 'Mexico City Government and CentroGeo, 2020 to 2021 (datos.cdmx.gob.mx)', car: 'INEGI, 2020 Population and Housing Census' },
  },
};

let lang = 'es';
const ES = new Map();
const listeners = [];

export function getLang() { return lang; }
export function t(key) { return T[lang][key]; }
export function onLang(fn) { listeners.push(fn); }

export function fmt(n, digits = 0) {
  return new Intl.NumberFormat(lang === 'es' ? 'es-MX' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
}

export function setLang(next) {
  if (next === lang) return;
  lang = next;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    if (!ES.has(el)) ES.set(el, el.innerHTML);
    el.innerHTML = lang === 'en' ? (EN[k] ?? ES.get(el)) : ES.get(el);
  });
  document.querySelectorAll('.lang__btn').forEach(b => {
    const on = b.dataset.lang === lang;
    b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on);
  });
  try { localStorage.setItem('lang', lang); } catch (e) {}
  listeners.forEach(fn => fn(lang));
}

export function initLang() {
  document.querySelectorAll('.lang__btn').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  let saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) {}
  if (saved === 'en') setLang('en');
}
