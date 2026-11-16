// Keelson Roofworks: language, menu, the scroll-built roof, reveals, before/after, the estimate form.
import { initI18n, onLang, dyn, apply as applyLang } from './i18n.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
if (reduce) root.classList.add('reduce');

initI18n();

/* ---------- nav: solid bar after the first scroll, phone menu ---------- */
const nav = $('.nav'), burger = $('.nav__burger');
const setBar = () => nav.classList.toggle('is-scrolled', scrollY > 30);
addEventListener('scroll', setBar, { passive: true }); setBar();
function menu(open) {
  root.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? dyn().menuClose : dyn().menuOpen);
  if (open) lenis?.stop(); else lenis?.start();
}
burger.addEventListener('click', () => menu(!root.classList.contains('menu-open')));
addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('menu-open')) { menu(false); burger.focus(); } });
$$('.nav__links a').forEach(a => a.addEventListener('click', () => menu(false)));
onLang(() => burger.setAttribute('aria-label', root.classList.contains('menu-open') ? dyn().menuClose : dyn().menuOpen));

/* ---------- smooth scroll ---------- */
const gsap = window.gsap, ST = window.ScrollTrigger;
let lenis = null;
if (gsap && ST) {
  gsap.registerPlugin(ST);
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: .085, smoothWheel: true, wheelMultiplier: .9 });
    window.__lenis = lenis;
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
}
const build = $('.build');
const STAGES = [[.10, .24], [.24, .38], [.38, .52], [.52, .68], [.68, .80], [.80, .95]];
const pToY = p => build.offsetTop + (build.offsetHeight - innerHeight) * p;
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href');
  let y = null, focusEl = null;
  if (id === '#main' || id === '#top') { y = 0; focusEl = $('#main'); }
  else if (id === '#how') { y = reduce ? $('#how').getBoundingClientRect().top + scrollY - 80 : pToY(STAGES[0][0] + .1); }
  else if ($(id)) { y = $(id).getBoundingClientRect().top + scrollY - (innerWidth < 760 ? 64 : 72); focusEl = $(id); }
  if (y === null) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(y, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) }); else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  if (focusEl) { focusEl.setAttribute('tabindex', focusEl.getAttribute('tabindex') || '-1'); focusEl.focus({ preventScroll: true }); }
}));

/* ---------- the 3D roof ---------- */
const canvas = $('.view__canvas');
let hero = null;
(async () => {
  try {
    const H = await import('./hero.js');
    if (!H.webglOK()) throw new Error('no webgl2');
    hero = H.initHero(canvas, { still: reduce });
    root.classList.add('has-3d');
    if (reduce) hero.jump(1); else hero.jump(curP);
    new IntersectionObserver(es => es.forEach(e => hero.visible(e.isIntersecting))).observe(build);
    if (!reduce) addEventListener('pointermove', e => hero.pointer(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1), { passive: true });
  } catch (err) {
    root.classList.add('no-3d');   // the poster photo stands in
  }
})();

/* ---------- captions follow the build ---------- */
const stages = $$('.stage'), heroCopy = $('.hero'), hint = $('.hero__scroll'), spec = $('.hero__spec');
const railFill = $('.rail__bar i'), railSteps = $$('.rail__steps li'), rail = $('.rail');
let curP = 0;
function setStages(p) {
  curP = p;
  const h = 1 - ss((p - .015) / .06);
  heroCopy.style.opacity = h; heroCopy.style.transform = `translate3d(0, ${(-(1 - h) * 60).toFixed(1)}px, 0)`;
  heroCopy.style.visibility = h < .01 ? 'hidden' : 'visible';
  hint.style.opacity = 1 - ss(p / .03); spec.style.opacity = h;
  stages.forEach((el, i) => {
    const [a, b] = STAGES[i];
    const inn = ss((p - a - .004) / .03), out = i === stages.length - 1 ? 0 : ss((p - (b - .03)) / .028);
    const o = Math.min(inn, 1 - out);
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translate3d(0, ${((1 - inn) * 40 - out * 40).toFixed(1)}px, 0)`;
    el.classList.toggle('is-on', o > .5);
    el.style.visibility = o < .01 ? 'hidden' : 'visible';
  });
  rail.style.opacity = ss((p - .06) / .04);
  railFill.style.transform = `scaleX(${clamp((p - STAGES[0][0]) / (STAGES[5][1] - STAGES[0][0])).toFixed(4)})`;
  railSteps.forEach((li, i) => { li.classList.toggle('is-on', p >= STAGES[i][0] - .005 && (i === 5 || p < STAGES[i][1] - .005)); li.classList.toggle('is-done', p >= STAGES[i][1] - .005 && i < 5); });
}
if (!reduce && ST) {
  ST.create({ trigger: build, start: 'top top', end: 'bottom bottom', onUpdate: self => { setStages(self.progress); hero?.set(self.progress); } });
  setStages(0);
} else {
  root.classList.add('static-how');
}

/* ---------- reveals ---------- */
if (gsap && ST && !reduce) {
  gsap.from('.hero__title .ln > span', { yPercent: 112, duration: 1.4, ease: 'expo.out', stagger: .09, delay: .15 });
  gsap.from(['.hero .eyebrow', '.hero__lede', '.hero__actions'], { y: 22, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .07, delay: .4 });
  gsap.from('.nav', { y: -14, opacity: 0, duration: .9, ease: 'expo.out', delay: .2, clearProps: 'transform,opacity' });
  $$('.rv > span').forEach(s => gsap.from(s, { yPercent: 108, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: s.parentElement, start: 'top 88%' } }));
  const up = (sel, stagger = .08) => $$(sel).forEach((el, i) => gsap.from(el, { y: 48, opacity: 0, duration: 1.1, ease: 'expo.out', delay: (i % 3) * stagger, scrollTrigger: { trigger: el, start: 'top 90%' } }));
  up('.roof'); up('.also__row', .05); up('.storm__list li', .06); up('.quote'); up('.cities li', .03); up('.next li', .05);
  up('.head__lede'); up('.storm__lede'); up('.area__lede'); up('.est__lede'); up('.form', 0); up('.ba__text', 0); up('.ba__view', 0);
  $$('.shot').forEach((el, i) => {
    gsap.from(el, { y: 70, opacity: 0, duration: 1.2, ease: 'expo.out', delay: (i % 2) * .1, scrollTrigger: { trigger: el, start: 'top 92%' } });
    gsap.fromTo(el.querySelector('img'), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.storm__bg img', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.storm', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.foot__big', { xPercent: 6 }, { xPercent: -4, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  ST.create({ trigger: '.map', start: 'top 80%', once: true, onEnter: () => $('.map').classList.add('is-in') });
  addEventListener('load', () => ST.refresh());
} else {
  $('.map').classList.add('is-in');
}

/* ---------- before / after ---------- */
const baView = $('.ba__view'), baRange = $('.ba__range');
function setBA() { const v = +baRange.value; baView.style.setProperty('--pos', v + '%'); baRange.setAttribute('aria-valuetext', dyn().pos(v)); }
baRange.addEventListener('input', setBA); setBA(); onLang(setBA);

/* ---------- estimate form (front end only) ---------- */
const form = $('.form'), msg = $('.form__msg'), fields = $('.form__fields'), done = $('.form__done');
let sent = null;
function paintDone() {
  if (!sent) return;
  $('.form__thanks').textContent = dyn().thanks(sent.name);
  $('.form__next').textContent = dyn().next(sent.tel, sent.city);
}
form.addEventListener('input', e => { e.target.closest('.field')?.classList.remove('is-bad'); });
form.addEventListener('submit', e => {
  e.preventDefault();
  const D = dyn(), bad = [];
  const name = form.elements.name, tel = form.elements.tel, email = form.elements.email;
  [name, tel, email].forEach(i => { i.closest('.field').classList.remove('is-bad'); i.removeAttribute('aria-invalid'); });
  const flag = (i, w) => { i.closest('.field').classList.add('is-bad'); i.setAttribute('aria-invalid', 'true'); bad.push(w); };
  if (!name.value.trim()) flag(name, D.name);
  if (tel.value.replace(/\D/g, '').length < 10) flag(tel, D.tel);
  if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) flag(email, D.email);
  if (bad.length) {
    msg.textContent = `${D.need} ${bad.length > 1 ? bad.slice(0, -1).join(', ') + ' ' + D.and + ' ' + bad.at(-1) : bad[0]}.`;
    form.querySelector('[aria-invalid="true"]')?.focus();
    if (gsap && !reduce) gsap.fromTo(form, { x: 0 }, { keyframes: { x: [-7, 6, -4, 2, 0] }, duration: .45, ease: 'power2.out' });
    return;
  }
  msg.textContent = '';
  const city = form.elements.city.value;
  sent = { name: name.value.trim().split(/\s+/)[0], tel: tel.value.trim(), city: city && city !== 'other' ? city : '' };
  paintDone();
  fields.hidden = true; done.hidden = false; done.focus();
  if (gsap && !reduce) gsap.from(done, { opacity: 0, y: 24, duration: .8, ease: 'expo.out' });
});
onLang(paintDone);
$('.form__again').addEventListener('click', () => { form.reset(); sent = null; done.hidden = true; fields.hidden = false; form.elements.name.focus(); });

window.__setLang = applyLang;
