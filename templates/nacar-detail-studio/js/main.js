// Nácar Detail Studio: boot. Everything works without motion or WebGL; motion layers on top.
import { initLang } from './lang.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- hours (Eastern) ---------- */
const HOURS = { 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18], 6: [9, 15], 0: null };
const DAYS = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] };
function shopNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return { d: DAYS.en.indexOf(p.weekday), h: (+p.hour % 24) + (+p.minute) / 60 };
}
const fmt = h => { const H = Math.floor(h), m = Math.round((h - H) * 60); return `${((H + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${H >= 12 ? 'PM' : 'AM'}`; };
function renderStatus(l) {
  const { d, h } = shopNow(), t = HOURS[d], el = $('.status');
  $$('.hours tr').forEach(tr => { const k = +tr.dataset.d; tr.classList.toggle('is-today', k === 1 ? d >= 1 && d <= 5 : k === d); });
  const open = t && h >= t[0] && h < t[1];
  let txt;
  if (open) txt = l === 'es' ? `Abierto hoy · hasta las ${fmt(t[1])}` : `Open today · until ${fmt(t[1])}`;
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
const lang = initLang('nacar-lang', l => { renderStatus(l); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
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
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href'), t = id.length > 1 && $(id); if (!t) return;
  e.preventDefault(); if (!menu.hidden) setMenu(false);
  if (lenis) lenis.scrollTo(t, { offset: id === '#top' ? 0 : -50, duration: 1.5 }); else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  history.replaceState(null, '', id);
}));
const links = $$('.nav__links a');
const secIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
['services', 'process', 'work', 'studio'].forEach(id => { const s = document.getElementById(id); s && secIO.observe(s); });

/* ---------- service tabs ---------- */
const tabs = $$('.tab');
const showTab = (t, focus) => {
  tabs.forEach(x => { const on = x === t; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
  $$('.panel').forEach(p => { const on = p.id === t.getAttribute('aria-controls'); p.hidden = !on; p.classList.toggle('is-on', on); });
  if (focus) t.focus();
  if (window.ScrollTrigger) ScrollTrigger.refresh();
};
tabs.forEach((t, i) => {
  t.addEventListener('click', () => showTab(t));
  t.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) showTab(tabs[(i + d + tabs.length) % tabs.length], true); });
});

/* ---------- reviews carousel ---------- */
const slides = $$('.slide'), count = $('.carousel__count b');
let cur = 0, auto;
const goSlide = i => { cur = (i + slides.length) % slides.length; slides.forEach((s, k) => { s.classList.toggle('is-on', k === cur); s.setAttribute('aria-hidden', k !== cur); }); count.textContent = cur + 1; };
$('.cbtn--prev').addEventListener('click', () => { goSlide(cur - 1); clearInterval(auto); });
$('.cbtn--next').addEventListener('click', () => { goSlide(cur + 1); clearInterval(auto); });
goSlide(0);
if (!reduce) auto = setInterval(() => goSlide(cur + 1), 7000);

/* ---------- quote form ---------- */
const form = $('.form');
form.addEventListener('submit', e => {
  e.preventDefault();
  let bad = null;
  $$('[required]', form).forEach(i => { const ok = i.value.trim().length > 1; i.closest('.field').classList.toggle('is-bad', !ok); i.setAttribute('aria-invalid', !ok); if (!ok && !bad) bad = i; });
  const ok = $('.form__ok', form);
  if (bad) { bad.focus(); ok.textContent = lang.get() === 'es' ? 'Falta tu nombre, contacto y auto.' : 'Please add your name, contact and car.'; return; }
  const name = $('#n-name').value.trim().split(' ')[0];
  ok.textContent = lang.get() === 'es' ? `Gracias, ${name}. Te contestamos hoy con un rango de precio y la próxima fecha libre.` : `Thank you, ${name}. You’ll hear from us today with a price range and the next open date.`;
  form.reset();
});

/* ---------- motion ---------- */
function initMotion() {
  if (reduce || !window.gsap || !window.ScrollTrigger || !window.Lenis) { document.documentElement.classList.remove('motion'); return; }
  gsap.registerPlugin(ScrollTrigger);
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
  window.__lenis = lenis;
  lenis.on('scroll', e => { ScrollTrigger.update(); onScroll(e.scroll); });
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  tl.from('.hero__gl', { opacity: 0, duration: 2.2, ease: 'power2.out' }, 0)
    .from('.hero__title .ln > *', { yPercent: 110, duration: 1.4, stagger: 0.12 }, 0.3)
    .from('.hero .eyebrow, .hero__lede, .hero__actions, .hero__tools', { y: 20, opacity: 0, duration: 1.1, stagger: 0.08 }, 0.6);
  gsap.to('.hero__inner', { yPercent: -16, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  ScrollTrigger.batch('.rv', { start: 'top 88%', once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1.2, stagger: 0.08, ease: 'power3.out' }) });

  ScrollTrigger.matchMedia({
    '(min-width: 861px)': () => {
      const cards = $$('.scard');
      cards.forEach((c, i) => {
        if (i === cards.length - 1) return;
        gsap.to(c, { scale: 0.92, opacity: 0.35, ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 20%', scrub: true } });
      });
    }
  });
  $$('.w img, .scard__img img, .studio__img img').forEach(im => gsap.fromTo(im, { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: im.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  gsap.from('.w', { clipPath: 'inset(100% 0 0 0 round 18px)', duration: 1.4, stagger: 0.08, ease: 'power3.inOut', scrollTrigger: { trigger: '.work__grid', start: 'top 80%' } });
  addEventListener('load', () => ScrollTrigger.refresh());
}
initMotion();
onScroll(scrollY);

/* ---------- 3D paint ---------- */
const canvas = $('.hero__gl');
const boot3d = () => import('./paint.js').then(m => { if (!m.initPaint(canvas)) $('.hero').classList.add('no-gl'); }).catch(err => { console.warn(err); $('.hero').classList.add('no-gl'); });
if ('requestIdleCallback' in window) requestIdleCallback(boot3d, { timeout: 600 }); else setTimeout(boot3d, 200);
