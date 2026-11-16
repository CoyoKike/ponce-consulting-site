// Brújula Tax & Insurance: motion, the hero, services tabs, checklist, key dates, hours and the booking form.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = matchMedia('(max-width: 900px)').matches;
if (reduce) document.documentElement.classList.add('reduce');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const t = (en, es) => window.i18n ? window.i18n.t(en, es) : en;
const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!reduce && window.Lenis) {
  lenis = new window.Lenis({ lerp: .085, smoothWheel: true, wheelMultiplier: .9 });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute('href'); const el = id === '#top' ? document.body : $(id); if (!el) return;
  e.preventDefault();
  if (a.dataset.tabLink) selectTab($('#tab-' + a.dataset.tabLink));
  if (lenis) lenis.scrollTo(id === '#top' ? 0 : el, { offset: id === '#top' ? 0 : -20, duration: 1.6 });
  else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  if (id !== '#top') { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
});

/* ---------- nav + progress ---------- */
const nav = $('.nav'), bar = $('.progress span');
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => { bar.style.transform = `scaleX(${s.progress})`; nav.classList.toggle('is-solid', s.scroll() > 40); } });
$$('.nav__links a').forEach(a => {
  const sec = $(a.getAttribute('href')); if (!sec) return;
  ScrollTrigger.create({ trigger: sec, start: 'top 45%', end: 'bottom 45%', onToggle: s => a.classList.toggle('is-active', s.isActive) });
});

/* ---------- hero: 3D scene + scroll ---------- */
let hero = null;
const heroReady = import('./hero3d.js').then(m => m.initHero($('.hero__canvas'), { reduce, isPhone })).then(h => (hero = h)).catch(e => { console.warn('3D hero unavailable', e); $('.hero__canvas').style.background = 'radial-gradient(60% 60% at 70% 45%, #f8f5ee, #e6dfd0)'; });
if (!reduce) {
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: .15 });
  intro.to('.hero__title .line > span', { y: 0, duration: 1.4, stagger: .09 })
    .to('.hero .eyebrow', { opacity: 1, duration: 1 }, .2)
    .to('.hero__lede', { opacity: 1, duration: 1.2 }, .55)
    .to('.hero__actions', { opacity: 1, duration: 1.2 }, .7)
    .fromTo('.hero__card', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.3 }, .85);
  const st = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: s => hero?.setProgress(s.progress) } });
  st.to('.hero__copy', { y: -60, opacity: 0, ease: 'power1.in', duration: .4 }, .3)
    .to('.hero__card', { y: 40, opacity: 0, duration: .3 }, .35)
    .to('.hero__scroll', { opacity: 0, duration: .1 }, 0)
    .fromTo('.hero__caption', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .25 }, .55)
    .to({}, { duration: .2 });
} else {
  heroReady.then(() => hero?.setProgress(0));
}

/* ---------- reveals + parallax ---------- */
if (!reduce) {
  $$('.reveal').forEach(el => gsap.to(el, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
  gsap.fromTo('.statement__img img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'bottom top', scrub: true } });
  $$('.panel__photo img').forEach(img => gsap.fromTo(img, { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.services', start: 'top bottom', end: 'bottom top', scrub: true } }));
  gsap.from('.svc__row', { opacity: 0, y: 24, duration: 1, stagger: .07, ease: 'expo.out', scrollTrigger: { trigger: '.svc', start: 'top 80%' } });
  gsap.from('.timeline li', { opacity: 0, y: 30, duration: 1, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '.timeline', start: 'top 80%' } });
}

/* ---------- services tabs ---------- */
const tabs = $$('.tab'), tabBar = $('.tabs__bar');
function placeBar() { const on = $('.tab.is-on'); tabBar.style.width = on.offsetWidth + 'px'; tabBar.style.transform = `translateX(${on.offsetLeft}px)`; }
function selectTab(tab, focus) {
  tabs.forEach(b => { const on = b === tab; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; $('#' + b.getAttribute('aria-controls')).hidden = !on; });
  placeBar(); if (focus) tab.focus();
  const panel = $('#' + tab.getAttribute('aria-controls'));
  if (!reduce) gsap.fromTo(panel.querySelectorAll('.svc__row, .panel__photo'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .8, stagger: .05, ease: 'expo.out' });
  ScrollTrigger.refresh();
}
tabs.forEach((b, i) => {
  b.addEventListener('click', () => selectTab(b));
  b.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); selectTab(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true); } });
});
placeBar(); addEventListener('resize', placeBar); document.fonts?.ready.then(placeBar);

/* ---------- what to bring: ticks remembered on this device ---------- */
const boxes = $$('.checklist input'), countEl = $('[data-count]');
$('[data-total]').textContent = boxes.length;
let saved = []; try { saved = JSON.parse(localStorage.getItem('brujula-bring') || '[]'); } catch (e) {}
boxes.forEach((b, i) => { b.checked = saved.includes(i); });
const count = () => { countEl.textContent = boxes.filter(b => b.checked).length; };
count();
boxes.forEach(b => b.addEventListener('change', () => { count(); try { localStorage.setItem('brujula-bring', JSON.stringify(boxes.map((x, i) => x.checked ? i : -1).filter(i => i >= 0))); } catch (e) {} }));

/* ---------- time in Kissimmee ---------- */
function nowET() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { iso: `${p.year}-${p.month}-${p.day}`, m: +p.month, d: +p.day, day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), h: +p.hour + +p.minute / 60 };
}

/* ---------- key dates: past ones dim, the next one is marked ---------- */
function paintDates(animate = true) {
  const today = nowET().iso, items = $$('[data-timeline] li');
  let next = -1;
  items.forEach((li, i) => { const past = li.dataset.date < today; li.classList.toggle('is-past', past); li.classList.remove('is-next'); if (!past && next < 0) next = i; });
  if (next >= 0) { const li = items[next]; li.classList.add('is-next'); li.querySelector('h3').dataset.next = t('Next up', 'Lo próximo'); }
  const frac = next < 0 ? 1 : (next + .5) / items.length;
  const tl = $('[data-timeline]');
  if (reduce || !animate) tl.style.setProperty("--tl", frac);
  else gsap.fromTo(tl, { '--tl': 0 }, { '--tl': frac, duration: 2, ease: 'expo.inOut', scrollTrigger: { trigger: tl, start: 'top 75%' } });
}
paintDates();

/* ---------- hours + open now ---------- */
const HOURS = {   // [open, close] in 24h, per weekday 0..6
  tax: { 0: [12, 16], 1: [9, 20], 2: [9, 20], 3: [9, 20], 4: [9, 20], 5: [9, 20], 6: [9, 17] },
  reg: { 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [10, 14] },
};
const inSeason = ({ m, d }) => (m === 1 && d >= 15) || m === 2 || m === 3 || (m === 4 && d <= 15);
const DAYS = { en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] };
const fmt = h => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60), mmS = mm ? ':' + String(mm).padStart(2, '0') : ''; return t(`${((hh + 11) % 12) + 1}${mmS} ${hh < 12 ? 'am' : 'pm'}`, `${((hh + 11) % 12) + 1}${mmS} ${hh < 12 ? 'a. m.' : 'p. m.'}`); };
let shownSeason = null;
function paintHours() {
  const n = nowET(), season = inSeason(n) ? 'tax' : 'reg', H = HOURS[season];
  if (!shownSeason) shownSeason = season;
  const today = H[n.day];
  let msg, open = false;
  if (today && n.h >= today[0] && n.h < today[1]) { open = true; msg = t(`Open now · until ${fmt(today[1])}`, `Abierto · hasta las ${fmt(today[1])}`); }
  else if (today && n.h < today[0]) msg = t(`Opens today at ${fmt(today[0])}`, `Abre hoy a las ${fmt(today[0])}`);
  else { let d = n.day, k = 0; do { d = (d + 1) % 7; k++; } while (!H[d] && k < 8); const lang = window.i18n?.lang || 'en'; msg = k === 1 ? t(`Closed · opens tomorrow ${fmt(H[d][0])}`, `Cerrado · abre mañana ${fmt(H[d][0])}`) : t(`Closed · opens ${DAYS.en[d]} ${fmt(H[d][0])}`, `Cerrado · abre el ${DAYS.es[d]} ${fmt(H[d][0])}`); }
  $$('[data-open]').forEach(el => { el.textContent = msg; el.parentElement.classList.toggle('is-open', open); });
  $$('.season button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.season === shownSeason)));
  $$('.hours__table tr').forEach(tr => {
    const td = tr.querySelector('td'), v = td.dataset[shownSeason];
    td.textContent = v === 'closed' ? t('Closed', 'Cerrado') : v;
    tr.classList.toggle('is-today', shownSeason === season && tr.dataset.days.split(',').includes(String(n.day)));
  });
}
$$('.season button').forEach(b => b.addEventListener('click', () => { shownSeason = b.dataset.season; paintHours(); }));
paintHours(); setInterval(paintHours, 60000);

/* ---------- booking form ---------- */
const form = $('.form'), msgEl = $('.form__msg'), dayIn = $('#f-day');
dayIn.min = nowET().iso;
const SERVICE = { taxes: ['taxes', 'impuestos'], insurance: ['insurance', 'seguros'], both: ['taxes and insurance', 'impuestos y seguros'], itin: ['an ITIN application', 'una solicitud de ITIN'], letter: ['an IRS letter', 'una carta del IRS'] };
const TIME = { morning: ['morning', 'en la mañana'], afternoon: ['afternoon', 'en la tarde'], evening: ['evening', 'en la noche'] };
function dayOk(v) {
  if (!v || v < dayIn.min) return false;
  const [y, m, d] = v.split('-').map(Number), wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return !!HOURS[inSeason({ m, d }) ? 'tax' : 'reg'][wd];
}
form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('is-bad'));
form.addEventListener('submit', e => {
  e.preventDefault();
  const checks = [
    [form.name, form.name.value.trim().length > 1],
    [form.phone, form.phone.value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '').length === 10],
    [dayIn, dayOk(dayIn.value)],
  ];
  const bad = checks.filter(([, ok]) => !ok).map(([el]) => el);
  checks.forEach(([el, ok]) => { el.closest('.field').classList.toggle('is-bad', !ok); el.setAttribute('aria-invalid', String(!ok)); });
  if (bad.length) {
    msgEl.textContent = t('Please check the highlighted fields.', 'Revise los campos marcados.');
    bad[0].focus();
    if (!reduce) gsap.fromTo(form, { x: 0 }, { keyframes: { x: [-8, 7, -5, 3, 0] }, duration: .45, ease: 'power2.out' });
    return;
  }
  msgEl.textContent = '';
  const es = window.i18n?.lang === 'es', svc = SERVICE[form.service.value][es ? 1 : 0], tm = TIME[form.time.value][es ? 1 : 0];
  const [y, m, d] = dayIn.value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(es ? 'es-US' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const done = $('.form__done');
  $('.form__who', done).textContent = form.name.value.trim().split(/\s+/)[0];
  $('.form__summary', done).textContent = t(`We have you down for ${svc} on ${date}, ${tm}, in ${form.lang.value === 'es' ? 'Spanish' : 'English'}. We'll text ${form.phone.value.trim()} within the hour to confirm the exact time.`,
    `Le anotamos para ${svc} el ${date}, ${tm}, en ${form.lang.value === 'es' ? 'español' : 'inglés'}. Le enviaremos un texto al ${form.phone.value.trim()} en menos de una hora para confirmar la hora exacta.`);
  done.hidden = false; done.focus();
  if (!reduce) gsap.from(done, { clipPath: 'inset(100% 0 0 0)', duration: .9, ease: 'expo.inOut' });
});
$('.form__again').addEventListener('click', () => { form.reset(); $('.form__done').hidden = true; form.name.focus(); });

/* ---------- language changes re-render the live strings ---------- */
document.addEventListener('langchange', () => { paintHours(); paintDates(false); placeBar(); msgEl.textContent = ''; ScrollTrigger.refresh(); });
addEventListener('load', () => ScrollTrigger.refresh());
