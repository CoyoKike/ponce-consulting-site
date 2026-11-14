import { initLang, onLang, t, fmt, getLang } from './i18n.js';
import { hbar, line, dots, short } from './charts.js';
import { CityMap, METRICS } from './map3d.js';
import { CONTACT, PHOTOS } from './config.js';
import { initMotion } from './motion.js';
import { initScenes } from './scenes3d.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const data = await fetch('data/cdmx.json').then(r => r.json());
const A = data.alcaldias;
const city = data.city;

/* ---------------- Hero map: four indicators, one per scroll step ---------------- */
export const HERO_STEPS = ['pop', 'density', 'metro', 'space'];
const heroMap = new CityMap($('.map3d--hero'), $('.map-labels--hero'), data, { metric: 'pop', labels: 3, parallax: true, az: -0.3, el: 0.9, dist: 142, offsetX: 0.12, offsetYPortrait: 0.06, fitAspect: 1.05 });
window.addEventListener('pointermove', e => heroMap.pointer(e), { passive: true });
let heroStep = 0;
function heroCaption() {
  const key = HERO_STEPS[heroStep];
  const m = METRICS[key];
  $('.hero__step-n').textContent = String(heroStep + 1).padStart(2, '0');
  $$('.hero__dot').forEach((d, i) => d.classList.toggle('is-on', i === heroStep));
  $('[data-metric-title]').textContent = t(m.title);
  $('[data-metric-sub]').textContent = t(m.sub);
  $('[data-legend]').innerHTML = heroMap.legendHTML();
  const top = heroMap.ranked[0];
  $('[data-metric-top]').innerHTML = `${t('top')}: ${top.a.name} · <b>${fmt(top.value, m.digits)}</b> ${t(m.unit)}`;
  $('[data-metric-source]').textContent = t('src')[key];
}
export function setHeroStep(i) {
  i = Math.max(0, Math.min(HERO_STEPS.length - 1, i));
  if (i === heroStep && heroMap.metric === HERO_STEPS[i]) return;
  heroStep = i;
  heroMap.setMetric(HERO_STEPS[i]);
  heroCaption();
}
heroCaption();
// step buttons scroll to that part of the pinned hero
$$('.hero__dot').forEach(d => d.addEventListener('click', () => {
  const y = innerHeight * (HERO_STEPS.length - 0.2) * (+d.dataset.step + 0.5) / HERO_STEPS.length;
  if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.2 }); else if (window.ScrollTrigger) scrollTo({ top: y, behavior: 'smooth' }); else setHeroStep(+d.dataset.step);
}));

/* ---------------- KPIs ---------------- */
function kpis() {
  $('[data-kpi="pop"]').textContent = fmt(city.pop);
  $('[data-kpi="area"]').textContent = fmt(city.area_km2, 1);
  $('[data-kpi="density"]').textContent = fmt(Math.round(city.pop / city.area_km2));
  $('[data-kpi="metro"]').textContent = fmt(city.metro_daily);
}

/* ---------------- Charts ---------------- */
let popMode = 'pop';
$$('[data-chart-switch="pop"] button').forEach(b => b.addEventListener('click', () => {
  popMode = b.dataset.v;
  $$('[data-chart-switch="pop"] button').forEach(x => x.classList.toggle('is-on', x === b));
  drawPop(true);
}));
function sorted(get) { return [...A].sort((a, b) => (get(b) ?? -1) - (get(a) ?? -1)); }

function drawPop(animate) {
  const get = popMode === 'pop' ? a => a.pop : a => a.density;
  const rows = sorted(get).map((a, i) => ({ label: a.name, value: get(a), hi: i === 0 }));
  const avg = popMode === 'pop' ? null : Math.round(city.pop / city.area_km2);
  hbar($('[data-chart="pop"]'), rows, {
    axis: popMode === 'pop' ? t('axisPeople') : t('axisDensity'),
    ref: avg ? { value: avg, label: `${t('cityAvg')}: ${fmt(avg)}` } : null,
  });
  if (animate) growBars($('[data-chart="pop"]'));
}

function drawAll() {
  drawPop();
  hbar($('[data-chart="metro"]'), sorted(a => a.metro_daily).map((a, i) => ({ label: a.name, value: a.metro_daily || null, note: t('noData'), hi: i === 0 })), { axis: t('axisEntries') });
  line($('[data-chart="metroTrend"]'), data.metro.monthly.map(p => ({ m: p.m, v: p.daily })), {
    axis: t('axisEntries'),
    marks: (() => {
      const low = data.metro.monthly.reduce((a, b) => (b.daily < a.daily ? b : a));
      return [{ m: low.m, label: `${short(low.daily)}`, dy: 16 }];
    })(),
  });
  dots($('[data-chart="vehicles"]'), sorted(a => a.pct_car).map(a => ({ label: a.name, a: a.pct_car, b: a.pct_bike })), { axis: t('axisPct') });
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  legend.innerHTML = `<span><i style="background:var(--accent)"></i>${t('car2')}</span><span><i style="background:var(--paper)"></i>${t('bike')}</span>`;
  $('[data-chart="vehicles"]').prepend(legend);
  hbar($('[data-chart="space"]'), sorted(a => a.public_space_m2_hab).map((a, i) => ({ label: a.name, value: a.public_space_m2_hab, hi: i === 0 })),
    { axis: t('axisM2'), digits: 1, tickFmt: v => fmt(v), ref: { value: city.public_space_m2_hab, label: `${t('cityAvg')}: ${fmt(city.public_space_m2_hab, 1)}`, anchor: 'start' } });
  const st = data.pm25.stations;
  hbar($('[data-chart="pm"]'), st.map((s, i) => ({ label: `${s.name} (${s.id})`, value: s.mean, hi: i === 0 })),
    { axis: t('axisPm'), digits: 1, tickFmt: v => fmt(v), ref: { value: 5, label: t('who') } });
  line($('[data-chart="pmTrend"]'), data.pm25.monthly.map(p => ({ m: p.m, v: p.mean })), {
    axis: t('axisPm'), tickFmt: v => fmt(v), valueFmt: v => fmt(v, 1) + ' µg/m³',
    marks: (() => {
      const hi = data.pm25.monthly.reduce((a, b) => (b.mean > a.mean ? b : a));
      const lo = data.pm25.monthly.reduce((a, b) => (b.mean < a.mean ? b : a));
      return [{ m: hi.m, label: fmt(hi.mean, 1), dy: -10, anchor: 'middle', dx: 0 }, { m: lo.m, label: fmt(lo.mean, 1), dy: 18, anchor: 'middle', dx: 0 }];
    })(),
  });
}

export function growBars(host) {
  if (!window.gsap || !host._bars) return;
  host._bars.forEach(([b, v], i) => {
    gsap.fromTo(b, { attr: { width: 0 } }, { attr: { width: +b.dataset.w }, duration: .9, ease: 'power3.out', delay: i * .03 });
    gsap.fromTo(v, { opacity: 0 }, { opacity: 1, duration: .4, delay: .5 + i * .03 });
  });
}

/* ---------------- Contact (filled only once he confirms which ones to use) ---------------- */
function contact() {
  const host = $('[data-contact]');
  const links = [];
  if (CONTACT.email) links.push(`<a class="btn btn--solid" href="mailto:${CONTACT.email}">${CONTACT.email}</a>`);
  if (CONTACT.phone) links.push(`<a class="btn" href="tel:${CONTACT.phone.replace(/\s/g, '')}">${CONTACT.phone}</a>`);
  if (CONTACT.linkedin) links.push(`<a class="btn" href="${CONTACT.linkedin}" target="_blank" rel="noopener">LinkedIn</a>`);
  if (CONTACT.github) links.push(`<a class="btn" href="${CONTACT.github}" target="_blank" rel="noopener">GitHub</a>`);
  host.innerHTML = links.join('');
}

/* ---------------- Credits ---------------- */
function credits() {
  const s = data.sources;
  $('[data-credits]').innerHTML = `<h4>${t('dataSources')}</h4><p>${Object.values(s).join('<br>')}</p>`
    + `<h4>${t('credits')}</h4><p>${Object.values(PHOTOS).map(p => `<a href="${p.url}" target="_blank" rel="noopener">${p.title}</a>, ${p.artist}, ${p.license}`).join('<br>')}</p>`;
}


/* ---------------- Experience: each card's years on one shared 2020 to 2027 scale ---------------- */
function spans() {
  const Y0 = 2020, Y1 = 2027, W = 160, x = y => 4 + (y - Y0) / (Y1 - Y0) * (W - 8);
  $$('[data-span]').forEach(el => {
    const [a, b] = el.dataset.span.split(',').map(Number);
    const ticks = [2020, 2022, 2024, 2026];
    el.innerHTML = `<svg viewBox="0 0 ${W} 30" aria-hidden="true">`
      + `<line class="sp__track" x1="4" x2="${W - 4}" y1="8" y2="8"/>`
      + ticks.map(t => `<line class="sp__tick" x1="${x(t)}" x2="${x(t)}" y1="5" y2="11"/><text x="${x(t)}" y="26" text-anchor="middle">${t}</text>`).join('')
      + `<rect class="sp__bar" x="${x(a)}" y="5" width="${Math.max(3, x(b) - x(a))}" height="6" rx="1"/></svg>`;
  });
}
spans();

/* ---------------- Scroll scene, project and contact captions ---------------- */
function captions() {
  const ra = $('[data-rise-area]'); if (ra) ra.textContent = fmt(city.area_km2, 1);
  const bc = $('[data-prbuild-cap]'); if (bc) bc.textContent = t('prBuildCap');
}
/* Mexico City local time in the contact section */
function clock() {
  const el = $('[data-clock]'); if (!el) return;
  el.textContent = new Intl.DateTimeFormat(getLang() === 'es' ? 'es-MX' : 'en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' }).format(new Date());
}
clock(); setInterval(clock, 15000);

function renderText() { kpis(); heroCaption(); drawAll(); credits(); captions(); clock(); }

initLang();
onLang(() => renderText());
renderText();
contact();
let rw = innerWidth;
window.addEventListener('resize', () => { if (Math.abs(innerWidth - rw) > 40) { rw = innerWidth; drawAll(); } });

initScenes(data);
initMotion({ heroMap, setHeroStep, steps: HERO_STEPS.length, growBars });
