// Ibis Tire & Wheel: boot. Everything works without motion or WebGL; motion layers on top.
import { initLang } from './lang.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- hours and open-now (Eastern) ---------- */
const HOURS = { 1: [8, 19], 2: [8, 19], 3: [8, 19], 4: [8, 19], 5: [8, 19], 6: [8, 19], 0: [9, 15] };
const DAYS = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] };
function shopNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return { d: DAYS.en.indexOf(p.weekday), h: (+p.hour % 24) + (+p.minute) / 60 };
}
const fmt = h => { const H = Math.floor(h), m = Math.round((h - H) * 60); return `${((H + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${H >= 12 ? 'PM' : 'AM'}`; };
function renderStatus(l) {
  const { d, h } = shopNow(), t = HOURS[d], el = $('.status');
  $$('.hours tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.d === d));
  const open = t && h >= t[0] && h < t[1];
  let txt;
  if (open) txt = l === 'es' ? `Abierto ahora · hasta las ${fmt(t[1])}` : `Open now · until ${fmt(t[1])}`;
  else {
    let nd = d, k = 0, nh;
    if (t && h < t[0]) nh = t[0]; else { do { nd = (nd + 1) % 7; k++; } while (!HOURS[nd]); nh = HOURS[nd][0]; }
    const when = nd === d ? (l === 'es' ? 'hoy' : 'today') : k === 1 ? (l === 'es' ? 'mañana' : 'tomorrow') : DAYS[l][nd];
    txt = l === 'es' ? `Cerrado · abre ${when} a las ${fmt(nh)}` : `Closed · opens ${when} ${fmt(nh)}`;
  }
  el.classList.toggle('is-open', !!open);
  $('.status__txt', el).textContent = txt;
}

let lenis = null;
const lang = initLang('ibis-lang', l => { renderStatus(l); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
setInterval(() => renderStatus(lang.get()), 60000);

/* ---------- nav, menu, anchors ---------- */
const nav = $('#nav'), burger = $('.burger'), menu = $('#menu');
let lastY = 0;
function onScroll(y) {
  nav.classList.toggle('is-solid', y > 30);
  nav.classList.toggle('is-hidden', y > innerHeight * 0.9 && y > lastY && menu.hidden);
  lastY = y;
}
addEventListener('scroll', () => onScroll(scrollY), { passive: true });
function setMenu(open) {
  burger.setAttribute('aria-expanded', open); menu.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  if (lenis) open ? lenis.stop() : lenis.start();
  if (open) $('a', menu).focus();
}
burger.addEventListener('click', () => setMenu(menu.hidden));
addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });
const go = id => {
  const t = $(id); if (!t) return;
  if (lenis) lenis.scrollTo(t, { offset: id === '#top' ? 0 : -60, duration: 1.4 });
  else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
};
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href'); if (id.length < 2 || !$(id)) return;
  e.preventDefault(); if (!menu.hidden) setMenu(false); go(id); history.replaceState(null, '', id);
}));
const links = $$('.nav__links a');
const secIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
['size', 'services', 'why', 'gallery', 'quote'].forEach(id => { const s = document.getElementById(id); s && secIO.observe(s); });

/* ---------- size finder ---------- */
const sw = $('#s-w'), sa = $('#s-a'), sr = $('#s-r');
const opts = (sel, from, to, step, val) => { for (let v = from; v <= to; v += step) sel.add(new Option(v, v, false, v === val)); };
opts(sw, 155, 335, 10, 245); opts(sa, 30, 80, 5, 40); opts(sr, 14, 24, 1, 18);
const size = () => `${sw.value}/${sa.value} R${sr.value}`;
[[sw, '.fw'], [sa, '.fa'], [sr, '.fr']].forEach(([s, c]) => s.addEventListener('change', () => {
  const el = $(c); el.textContent = s.value; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 500);
  document.dispatchEvent(new CustomEvent('tiresize', { detail: size() }));
}));
$('.finder__go').addEventListener('click', () => { $('#q-size').value = size(); });

/* ---------- quote form ---------- */
const form = $('.form');
form.addEventListener('submit', e => {
  e.preventDefault();
  let bad = null;
  $$('[required]', form).forEach(i => { const ok = i.value.trim().length > 1; i.closest('.field').classList.toggle('is-bad', !ok); i.setAttribute('aria-invalid', !ok); if (!ok && !bad) bad = i; });
  const ok = $('.form__ok', form);
  if (bad) { bad.focus(); ok.textContent = lang.get() === 'es' ? 'Falta tu nombre, teléfono y medida.' : 'Please add your name, phone and tire size.'; return; }
  const name = $('#q-name').value.trim().split(' ')[0], s = $('#q-size').value.trim();
  ok.textContent = lang.get() === 'es'
    ? `Gracias, ${name}. Te mandamos tres precios para ${s} en unos 15 minutos.`
    : `Thanks, ${name}. Three prices for ${s} are on their way, usually within 15 minutes.`;
  form.reset(); $('#q-size').value = s;
});

/* ---------- motion ---------- */
function initMotion() {
  if (reduce || !window.gsap || !window.ScrollTrigger || !window.Lenis) { document.documentElement.classList.remove('motion'); return; }
  gsap.registerPlugin(ScrollTrigger);
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  window.__lenis = lenis;
  lenis.on('scroll', e => { ScrollTrigger.update(); onScroll(e.scroll); });
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  tl.from('.hero__title .ln > *', { yPercent: 115, duration: 1.2, stagger: 0.1 }, 0.1)
    .from('.hero .eyebrow, .hero__lede, .hero__actions, .hero__foot', { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.4)
    .from('.hero__gl', { opacity: 0, scale: 0.94, duration: 1.6, ease: 'power3.out' }, 0);
  gsap.to('.hero__inner', { yPercent: -14, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  ScrollTrigger.batch('.rv', { start: 'top 88%', once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1.1, stagger: 0.07, ease: 'power3.out' }) });
  gsap.fromTo('.why__img', { yPercent: -8 }, { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.why', start: 'top bottom', end: 'bottom top', scrub: true } });
  $$('.m img').forEach(im => gsap.fromTo(im, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: im.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  gsap.from('.m', { clipPath: 'inset(100% 0 0 0 round 14px)', duration: 1.3, stagger: 0.1, ease: 'power3.inOut', scrollTrigger: { trigger: '.mosaic', start: 'top 80%' } });
  addEventListener('load', () => ScrollTrigger.refresh());
}
initMotion();
onScroll(scrollY);

/* ---------- 3D wheel ---------- */
const canvas = $('.hero__gl');
const boot3d = () => import('./wheel.js').then(m => { if (!m.initWheel(canvas)) $('.hero').classList.add('no-gl'); }).catch(err => { console.warn(err); $('.hero').classList.add('no-gl'); });
if ('requestIdleCallback' in window) requestIdleCallback(boot3d, { timeout: 600 }); else setTimeout(boot3d, 200);
