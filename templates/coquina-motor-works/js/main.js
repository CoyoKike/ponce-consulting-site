// Coquina Motor Works: boot. Every feature works without motion or WebGL; motion layers on top.
import { initLang } from './lang.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isPhone = () => matchMedia('(max-width: 760px)').matches;

/* ---------- hours and open-now, in shop time (Eastern) ---------- */
const HOURS = { 1: [7.5, 18], 2: [7.5, 18], 3: [7.5, 18], 4: [7.5, 18], 5: [7.5, 18], 6: [8, 14], 0: null };
const DAYS = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] };
function shopNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  const d = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { d, h: (+p.hour % 24) + (+p.minute) / 60 };
}
const fmt = (h, l) => { const H = Math.floor(h), m = Math.round((h - H) * 60), ap = H >= 12 ? 'PM' : 'AM', h12 = ((H + 11) % 12) + 1; return `${h12}:${String(m).padStart(2, '0')} ${ap}`; };
function renderStatus(l) {
  const { d, h } = shopNow(), today = HOURS[d], el = $('.status');
  $$('.hours tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.d === d));
  if (!el) return;
  const open = today && h >= today[0] && h < today[1];
  let txt;
  if (open) txt = l === 'es' ? `Abierto ahora · hasta las ${fmt(today[1])}` : `Open now · until ${fmt(today[1])}`;
  else {
    let k = 0, nd = d, nh = null;
    if (today && h < today[0]) nh = today[0];
    else { do { nd = (nd + 1) % 7; k++; } while (!HOURS[nd] && k < 8); nh = HOURS[nd][0]; }
    const when = nd === d ? (l === 'es' ? 'hoy' : 'today') : k === 1 ? (l === 'es' ? 'mañana' : 'tomorrow') : DAYS[l][nd];
    txt = l === 'es' ? `Cerrado · abre ${when} a las ${fmt(nh)}` : `Closed · opens ${when} ${fmt(nh)}`;
  }
  el.classList.toggle('is-open', !!open);
  $('.status__txt', el).textContent = txt;
}

/* ---------- language ---------- */
let lenis = null;
const lang = initLang('coquina-lang', l => { renderStatus(l); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
setInterval(() => renderStatus(lang.get()), 60000);

/* ---------- nav, menu, anchors ---------- */
const nav = $('#nav'), burger = $('.burger'), menu = $('#menu');
let lastY = 0;
function onScroll(y) {
  nav.classList.toggle('is-solid', y > 30);
  const hide = y > innerHeight * 0.9 && y > lastY && menu.hidden;
  nav.classList.toggle('is-hidden', hide);
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
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href'); const t = id.length > 1 && $(id);
  if (!t) return;
  e.preventDefault();
  if (!menu.hidden) setMenu(false);
  if (lenis) lenis.scrollTo(t, { offset: id === '#top' ? 0 : -60, duration: 1.4 });
  else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  history.replaceState(null, '', id);
}));

/* ---------- active nav link ---------- */
const links = $$('.nav__links a');
const secIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
['services', 'process', 'shop', 'reviews', 'book'].forEach(id => { const s = document.getElementById(id); s && secIO.observe(s); });

/* ---------- booking form ---------- */
const form = $('.form');
if (form) {
  const day = $('#f-day', form);
  day.min = new Date().toISOString().slice(0, 10);
  form.addEventListener('submit', e => {
    e.preventDefault();
    let bad = null;
    $$('[required]', form).forEach(i => { const ok = i.value.trim().length > 1; i.closest('.field').classList.toggle('is-bad', !ok); i.setAttribute('aria-invalid', !ok); if (!ok && !bad) bad = i; });
    const ok = $('.form__ok', form);
    if (bad) { bad.focus(); ok.textContent = lang.get() === 'es' ? 'Falta tu nombre, teléfono y vehículo.' : 'Please add your name, phone and vehicle.'; return; }
    const name = $('#f-name', form).value.trim().split(' ')[0];
    ok.textContent = lang.get() === 'es'
      ? `Listo, ${name}. Te escribimos por texto en menos de una hora hábil para confirmar el horario.`
      : `Got it, ${name}. We’ll text you within one business hour to confirm a time.`;
    form.reset();
  });
}

/* ---------- service hover photo (desktop) ---------- */
function initPeek() {
  const peek = $('.peek'); if (!peek || !fine) return;
  const img = $('img', peek);
  const xTo = window.gsap ? gsap.quickTo(peek, 'x', { duration: 0.5, ease: 'power3' }) : v => (peek.style.left = v + 'px');
  const yTo = window.gsap ? gsap.quickTo(peek, 'y', { duration: 0.5, ease: 'power3' }) : v => (peek.style.top = v + 'px');
  const list = $('.svc');
  list.addEventListener('mousemove', e => {
    const row = e.target.closest('.svc__row');
    if (!row) return peek.classList.remove('is-on');
    const src = `assets/img/${row.dataset.img}-800.webp`;
    if (!img.src.endsWith(src)) img.src = src;
    xTo(e.clientX + 170); yTo(e.clientY);
    peek.classList.add('is-on');
  });
  list.addEventListener('mouseleave', () => peek.classList.remove('is-on'));
  addEventListener('scroll', () => peek.classList.remove('is-on'), { passive: true });
}

/* ---------- process: sticky photo follows the active step ---------- */
function initSteps() {
  const steps = $$('.step'), imgs = $$('.process__frame img'), n = $('.process__n');
  const set = i => { steps.forEach((s, k) => s.classList.toggle('is-on', k === i)); imgs.forEach((im, k) => im.classList.toggle('is-on', k === i)); if (n) n.textContent = String(i + 1).padStart(2, '0'); };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) set(+e.target.dataset.step); }), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));
  set(0);
}

/* ---------- motion ---------- */
function initMotion() {
  if (reduce || !window.gsap || !window.ScrollTrigger || !window.Lenis) { document.documentElement.classList.remove('motion'); return; }
  gsap.registerPlugin(ScrollTrigger);
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  window.__lenis = lenis;
  lenis.on('scroll', e => { ScrollTrigger.update(); onScroll(e.scroll); });
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // hero entrance
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  tl.from('.hero__title .ln > *', { yPercent: 110, duration: 1.3, stagger: 0.12 }, 0.15)
    .from('.hero__eyebrow, .hero__lede, .hero__actions', { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, 0.45)
    .from('.hero__bar > *', { y: 14, opacity: 0, duration: 0.8, stagger: 0.06 }, 0.8)
    .from('.hero__gl', { opacity: 0, duration: 1.8, ease: 'power2.out' }, 0.1);
  gsap.to('.hero__inner', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // reveals
  ScrollTrigger.batch('.rv', { start: 'top 88%', once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'power3.out' }) });

  // gallery: pinned horizontal rail on wide screens
  ScrollTrigger.matchMedia({
    '(min-width: 761px)': () => {
      const track = $('.rail__track');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tw = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.shop', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true } });
      $$('.tile img').forEach(im => gsap.fromTo(im, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: im.parentElement, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } }));
    }
  });
  // ticker speeds up with scroll velocity
  const tick = $('.ticker__track');
  if (tick) { let skew = 0; lenis.on('scroll', e => { skew = gsap.utils.clamp(-8, 8, e.velocity * 0.4); gsap.to(tick, { skewX: -skew, duration: 0.4, overwrite: true }); }); }
  addEventListener('load', () => ScrollTrigger.refresh());
}

initMotion();
initPeek();
initSteps();
onScroll(scrollY);

/* ---------- 3D hero, loaded after first paint ---------- */
const canvas = $('.hero__gl');
const boot3d = () => import('./engine.js').then(m => { if (!m.initEngine(canvas)) $('.hero').classList.add('no-gl'); }).catch(() => $('.hero').classList.add('no-gl'));
if ('requestIdleCallback' in window) requestIdleCallback(boot3d, { timeout: 600 }); else setTimeout(boot3d, 200);
