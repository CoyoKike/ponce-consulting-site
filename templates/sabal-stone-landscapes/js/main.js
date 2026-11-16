// Sabal & Stone: boot. Language first, then the hero yard, scroll motion, menu, before/after and the form.
import { initI18n, onLang, dyn, lang } from './i18n.js';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = matchMedia('(max-width: 760px)').matches;
if (reduce) root.classList.add('reduce');

initI18n();

/* ---------------- hero yard ---------------- */
const canvas = document.querySelector('.hero__canvas');
let hero = null;
const afterLoad = () => new Promise(r => {
  const go = () => setTimeout(r, 60);
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
});
const heroReady = (async () => {
  try {
    const [H] = await Promise.all([import('./hero.js'), afterLoad()]);
    if (!H.webglOK()) throw new Error('no webgl');
    hero = H.initHero(canvas, { reduce, isPhone });
    if (reduce) hero.setProgress(0.62);
    window.__hero = hero;
    requestAnimationFrame(() => root.classList.add('gl-on'));
  } catch (e) {
    root.classList.add('no-gl');
    const poster = document.querySelector('.hero__poster[data-srcset]');
    if (poster) { poster.srcset = poster.dataset.srcset; poster.src = 'assets/img/yard-1920.webp'; }
    hero = null;
  }
  return hero;
})();

/* ---------------- scroll + motion ---------------- */
const gsap = window.gsap, ST = window.ScrollTrigger;
let lenis = null;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nav = $('.nav');
const setBar = () => nav.classList.toggle('is-scrolled', scrollY > 30);
addEventListener('scroll', setBar, { passive: true }); setBar();

if (gsap && ST) {
  gsap.registerPlugin(ST);
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // anchors glide (or jump, for reduced motion)
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : el, { offset: id === '#main' ? 0 : -10, duration: 1.6 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    if (id === '#main' || id === '#estimate') setTimeout(() => (id === '#estimate' ? $('#f-name') : el).focus({ preventScroll: true }), reduce ? 0 : 900);
  }));

  if (!reduce) {
    // hero intro
    gsap.from('.hero__title .line > span', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.12, delay: 0.15 });
    gsap.from(['.hero__copy .eyebrow', '.hero__lede', '.hero__actions', '.hero__rail'], { y: 22, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, delay: 0.4 });

    // the yard: scrolling the tall hero drives the scene and the four passes
    const passes = $$('.pass'), rail = $('.hero__rail-bar i'), steps = $$('.hero__rail-steps b');
    const copy = $('.hero__copy');
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const MID = [0.17, 0.4, 0.62, 0.86];
    ST.create({
      trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate(self) {
        const p = self.progress;
        hero?.setProgress(p);
        copy.style.opacity = 1 - clamp((p - 0.02) / 0.07);
        copy.style.transform = `translateY(${-clamp(p / 0.09) * 40}px)`;
        copy.style.visibility = p > 0.1 ? 'hidden' : '';
        passes.forEach((el, i) => {
          const o = clamp(1 - Math.abs(p - MID[i]) / 0.1);
          el.style.opacity = o;
          el.style.transform = `translateY(${(p - MID[i]) * -140}px)`;
          el.classList.toggle('is-on', o > 0.5);
        });
        rail.style.transform = `scaleX(${p})`;
        steps.forEach((s, i) => s.classList.toggle('is-on', p > MID[i] - 0.1));
      },
    });

    // reveals
    $$('.sec-head, .svc__row, .step, .tile, .ba, .quote, .area__copy, .map, .estimate__copy, .form, .foot__grid > *').forEach(el => {
      gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    $$('.tile img, .process__photo img').forEach(img => {
      gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.from('.steps', { '--line': 0, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 80%', end: 'bottom 60%', scrub: true } });
    gsap.from('.map__pins g', { scale: 0, transformOrigin: 'center', opacity: 0, duration: 0.8, ease: 'back.out(2)', stagger: 0.06, scrollTrigger: { trigger: '.map', start: 'top 75%', once: true } });
    gsap.from('.map__road', { strokeDashoffset: 900, duration: 2.2, ease: 'power2.inOut', scrollTrigger: { trigger: '.map', start: 'top 75%', once: true } });
    gsap.from('.foot__big', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 85%', once: true } });
  }
  heroReady.then(() => ST.refresh());
}

/* ---------------- mobile menu ---------------- */
const burger = $('.nav__burger'), menu = $('#menu');
function closeMenu() {
  if (!nav.classList.contains('is-open')) return;
  nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', dyn('open'));
  lenis?.start(); root.classList.remove('menu-open');
}
burger.addEventListener('click', () => {
  const open = !nav.classList.contains('is-open');
  if (!open) { closeMenu(); burger.focus(); return; }
  nav.classList.add('is-open'); burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', dyn('close'));
  lenis?.stop(); root.classList.add('menu-open');
  menu.querySelector('a')?.focus();
});
addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); burger.focus(); } });
onLang(() => burger.setAttribute('aria-label', dyn(nav.classList.contains('is-open') ? 'close' : 'open')));

/* ---------------- service row preview image (desktop pointer only) ---------------- */
const peek = $('.peek'), peekImg = peek.querySelector('img');
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce && gsap) {
  const xTo = gsap.quickTo(peek, 'x', { duration: 0.6, ease: 'power3' }), yTo = gsap.quickTo(peek, 'y', { duration: 0.6, ease: 'power3' });
  $$('.svc__row').forEach(row => {
    row.addEventListener('pointerenter', () => {
      const src = `assets/img/${row.dataset.img}-1080.webp`;
      if (!peekImg.src.endsWith(src)) peekImg.src = src;
      peek.classList.add('is-on');
    });
    row.addEventListener('pointerleave', () => peek.classList.remove('is-on'));
  });
  addEventListener('pointermove', e => { xTo(e.clientX + 28); yTo(e.clientY - 120); }, { passive: true });
}

/* ---------------- before / after ---------------- */
const frame = $('.ba__frame'), handle = $('.ba__handle');
let pos = 50;
function setPos(v) {
  pos = Math.max(0, Math.min(100, v));
  frame.style.setProperty('--pos', pos + '%');
  handle.setAttribute('aria-valuenow', String(Math.round(pos)));
  handle.setAttribute('aria-valuetext', Math.round(pos) + dyn('before'));
}
const fromEvent = e => { const r = frame.getBoundingClientRect(); setPos(((e.clientX - r.left) / r.width) * 100); };
let dragging = false;
frame.addEventListener('pointerdown', e => { dragging = true; frame.setPointerCapture(e.pointerId); fromEvent(e); frame.classList.add('is-drag'); });
frame.addEventListener('pointermove', e => dragging && fromEvent(e));
['pointerup', 'pointercancel'].forEach(t => frame.addEventListener(t, () => { dragging = false; frame.classList.remove('is-drag'); }));
handle.addEventListener('keydown', e => {
  const step = e.shiftKey ? 10 : 2;
  const map = { ArrowLeft: pos - step, ArrowDown: pos - step, ArrowRight: pos + step, ArrowUp: pos + step, Home: 0, End: 100, PageDown: pos - 10, PageUp: pos + 10 };
  if (e.key in map) { e.preventDefault(); setPos(map[e.key]); }
});
onLang(() => setPos(pos));
setPos(50);

/* ---------------- service area: list and map light each other up ---------------- */
$$('.cities li').forEach(li => {
  const pin = $(`.map__pins [data-city="${li.dataset.city}"]`);
  const on = v => { li.classList.toggle('is-hot', v); pin?.classList.toggle('is-hot', v); };
  li.addEventListener('pointerenter', () => on(true));
  li.addEventListener('pointerleave', () => on(false));
});

/* ---------------- estimate form (front end only) ---------------- */
const form = $('.form'), msg = form.querySelector('.form__msg'), done = form.querySelector('.form__done');
form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('is-bad'));
form.addEventListener('submit', e => {
  e.preventDefault();
  const bad = [];
  const need = (el, key, ok) => { const good = ok(el.value.trim()); el.closest('.field').classList.toggle('is-bad', !good); el.setAttribute('aria-invalid', String(!good)); if (!good) bad.push([el, dyn(key)]); };
  need(form.name, 'name', v => v.length > 1);
  need(form.phone, 'phone', v => v.replace(/\D/g, '').length >= 10);
  need(form.city, 'city', v => v !== '');
  if (form.email.value.trim()) need(form.email, 'email', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  if (bad.length) {
    const words = bad.map(b => b[1]);
    msg.textContent = dyn('missing') + (words.length > 1 ? words.slice(0, -1).join(', ') + dyn('and') + words.at(-1) : words[0]) + '.';
    bad[0][0].focus();
    if (gsap && !reduce) gsap.fromTo(form, { x: 0 }, { keyframes: { x: [-7, 6, -4, 2, 0] }, duration: 0.45, ease: 'power2.out' });
    return;
  }
  msg.textContent = '';
  done.querySelector('.form__who').textContent = form.name.value.trim().split(/\s+/)[0];
  done.hidden = false;
  form.classList.add('is-done');
  done.focus();
  if (gsap && !reduce) gsap.from(done, { clipPath: 'inset(100% 0 0 0)', duration: 0.9, ease: 'expo.inOut' });
});
form.querySelector('.form__again').addEventListener('click', () => {
  form.reset(); done.hidden = true; form.classList.remove('is-done'); form.name.focus();
});
onLang(() => { if (msg.textContent) msg.textContent = ''; });
void lang;
