// Alisio · page behaviour: bubbles hero, smooth scroll, reveals, menu, tabs, estimator, before/after, booking form.
import { initBubbles } from './bubbles.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const I = window.I18N || { t: (k) => k, onChange() {}, lang: 'en' };
const gsap = window.gsap, ST = window.ScrollTrigger;

/* ---------- hero bubbles ---------- */
let hero = null;
try { hero = initBubbles($('.hero__gl'), { reduce }); } catch (e) { hero = null; }
if (!hero) document.documentElement.classList.add('no-webgl');

/* ---------- nav ---------- */
const nav = $('#nav');
let lastY = scrollY;
const onScroll = () => {
  const y = scrollY;
  nav.classList.toggle('is-scrolled', y > 24);
  if (!document.body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > lastY && y > 600);
  lastY = y;
};
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ---------- mobile menu ---------- */
const menu = $('#menu'), menuBtn = $('.menu-btn');
let lenis = null;
function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', I.t(open ? 'menuClose' : 'menuOpen'));
  menu.hidden = !open;
  document.body.classList.toggle('menu-open', open);
  nav.classList.remove('is-hidden');
  if (lenis) open ? lenis.stop() : lenis.start();
  if (open) { $('a', menu).focus(); if (gsap && !reduce) gsap.from($$('nav a', menu), { y: 24, opacity: 0, duration: .7, stagger: .05, ease: 'expo.out' }); }
}
menuBtn.addEventListener('click', () => setMenu(menu.hidden));
$$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
addEventListener('resize', () => { if (innerWidth > 1020 && !menu.hidden) setMenu(false); });
I.onChange(() => menuBtn.setAttribute('aria-label', I.t(menu.hidden ? 'menuOpen' : 'menuClose')));

/* ---------- smooth scroll + motion ---------- */
if (gsap && ST) {
  gsap.registerPlugin(ST);
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null || id === '#') return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.4, offset: id === '#top' ? 0 : -10 });
    else target === 0 ? scrollTo(0, 0) : target.scrollIntoView();
    if (target !== 0 && id !== '#main') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  }));

  // active link
  const links = $$('.nav__links a');
  links.forEach((a) => {
    const sec = $(a.getAttribute('href'));
    if (sec) ST.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => a.classList.toggle('is-active', s.isActive) });
  });

  if (!reduce) {
    // hero intro
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from('.hero__title .line > span', { yPercent: 110, duration: 1.5, stagger: .12 }, .1)
      .from(['.hero__kicker', '.hero__lede', '.hero__actions', '.hero__notes'], { y: 22, opacity: 0, duration: 1.2, stagger: .08, clearProps: 'transform,opacity' }, .35)
      .from('.nav', { y: -20, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, .3);

    // hero scroll: bubbles rise and part, copy drifts up
    ST.create({ trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => hero && hero.setScroll(s.progress) });
    gsap.to('.hero__inner', { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // headings: lines rise from a mask
    $$('.h2, .statement, .book__title, .ba__title').forEach((h) => {
      gsap.from(h, { y: 40, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 96%', once: true } });
    });
    $$('.kicker').forEach((k) => gsap.from(k, { opacity: 0, x: -12, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: k, start: 'top 92%', once: true } }));

    // images: soft wipe + settle
    $$('.reveal-img').forEach((f) => {
      const img = $('img', f);
      gsap.fromTo(f, { clipPath: 'inset(12% 8% 12% 8% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 85%', once: true }, clearProps: 'clipPath' });
      gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 85%', once: true } });
    });

    // groups that stagger in
    const stag = (sel, item, opts = {}) => $$(sel).forEach((g) => gsap.from($$(item, g), { y: 36, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .08, ...opts, scrollTrigger: { trigger: g, start: 'top 82%', once: true } }));
    stag('.svc', '.svc__row');
    stag('.addons__list', 'li', { y: 14, stagger: .04 });
    stag('.steps', '.step', { stagger: .12 });
    stag('.quotes', '.quote');
    stag('.cities', 'li', { y: 12, stagger: .03 });
    stag('.facts', 'div');
    stag('.faq__list', 'details', { y: 18 });
    stag('.calc', '.calc__controls, .calc__out', { stagger: .12 });
    stag('.map__pins', '.pin', { y: 0, scale: 0, transformOrigin: '50% 50%', stagger: .06, ease: 'back.out(2)' });

    // process line draws across with scroll
    const bar = $('.steps__bar');
    if (bar) gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 85%', end: 'top 35%', scrub: true } });

    // gallery depth: columns drift at different speeds
    gsap.matchMedia().add('(min-width: 761px)', () => {
      [['.g--1', -40], ['.g--2', 30], ['.g--3', -70], ['.g--4', 20], ['.g--5', -50]].forEach(([s, y]) => gsap.to(s, { y, ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true } }));
      gsap.fromTo('.foot__word', { yPercent: 30 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    });
  }
  addEventListener('load', () => ST.refresh());
}

/* ---------- services: floating photo follows the cursor ---------- */
(() => {
  const float = $('.svc-float'); if (!float || !gsap || reduce) return;
  const img = $('img', float);
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const xTo = gsap.quickTo(float, 'x', { duration: .6, ease: 'power3.out' });
  const yTo = gsap.quickTo(float, 'y', { duration: .6, ease: 'power3.out' });
  const rTo = gsap.quickTo(float, 'rotation', { duration: .8, ease: 'power3.out' });
  let lastX = 0;
  $$('.svc__row').forEach((row) => {
    row.addEventListener('pointerenter', (e) => {
      if (innerWidth <= 760) return;
      img.src = `assets/img/${row.dataset.img}-1080.webp`;
      gsap.set(float, { x: e.clientX + 40, y: e.clientY });
      gsap.to(float, { opacity: 1, scale: 1, duration: .5, ease: 'expo.out' });
    });
    row.addEventListener('pointerleave', () => gsap.to(float, { opacity: 0, scale: .85, duration: .4, ease: 'power2.out' }));
    row.addEventListener('pointermove', (e) => { xTo(e.clientX + 180); yTo(e.clientY); rTo(Math.max(-8, Math.min(8, (e.clientX - lastX) * .6))); lastX = e.clientX; });
  });
})();

/* ---------- checklist tabs ---------- */
(() => {
  const tabs = $$('[role="tab"]');
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    const panel = $('#' + tab.getAttribute('aria-controls'));
    if (gsap && !reduce) gsap.from($$('li', panel), { y: 16, opacity: 0, duration: .7, stagger: .05, ease: 'expo.out' });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      let n = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });
})();

/* ---------- estimator ---------- */
const calc = $('#calc');
const homeField = $('#f-home');
let homeTouched = false;
homeField.addEventListener('input', () => (homeTouched = true));
const MULT = { weekly: .85, biweekly: .9, monthly: 1, deep: 1.7, move: 1.9 };
const SERVICE_MAP = { weekly: 'weekly', biweekly: 'biweekly', monthly: 'monthly', deep: 'deep', move: 'move' };
const numEl = $('.calc__num'), detailEl = $('.calc__detail');
let shown = 185;
function estimate(animate = true) {
  const f = new FormData(calc);
  const beds = +f.get('beds'), baths = +f.get('baths'), freq = f.get('freq');
  const core = (95 + 30 * beds + 25 * baths) * MULT[freq];
  const adds = f.getAll('add').reduce((s, v) => s + +v, 0);
  const price = Math.round(core / 5) * 5 + adds;
  const hrs = Math.max(2, Math.round((core / 75) * 2) / 2);
  const h = Number.isInteger(hrs) ? String(hrs) : (Math.floor(hrs) + '½');
  detailEl.textContent = I.t(freq === 'move' ? 'hoursMove' : 'hours', { h });
  if (gsap && animate && !reduce) {
    const o = { v: shown };
    gsap.to(o, { v: price, duration: .6, ease: 'power3.out', onUpdate: () => (numEl.textContent = Math.round(o.v)) });
  } else numEl.textContent = price;
  shown = price;
  // carry the choice into the booking form
  $('#f-service').value = SERVICE_MAP[freq];
  if (!homeTouched) {
    const b = beds === 1 ? I.t('bed1') : I.t('bedN', { n: beds === 5 ? '5+' : beds });
    const a = baths === 1 ? I.t('bath1') : I.t('bathN', { n: baths === 4 ? '4+' : baths });
    homeField.value = `${b}, ${a}`;
  }
}
calc.addEventListener('change', () => estimate());
calc.addEventListener('submit', (e) => e.preventDefault());
estimate(false);
I.onChange(() => estimate(false));

/* ---------- before / after ---------- */
(() => {
  const frame = $('.ba__frame'), range = $('.ba__range');
  const set = () => {
    frame.style.setProperty('--pos', range.value + '%');
    range.setAttribute('aria-valuetext', I.t('baValue', { n: range.value }));
  };
  range.addEventListener('input', set);
  I.onChange(set);
  set();
  if (gsap && ST && !reduce) {
    const o = { v: 50 };
    ST.create({ trigger: frame, start: 'top 70%', once: true, onEnter: () => gsap.timeline().to(o, { v: 78, duration: 1, ease: 'power2.inOut', onUpdate: () => { range.value = o.v; set(); } }).to(o, { v: 50, duration: 1.1, ease: 'power3.inOut', onUpdate: () => { range.value = o.v; set(); } }) });
  }
})();

/* ---------- booking form (front end only) ---------- */
(() => {
  const form = $('#book-form'), thanks = $('#thanks');
  const fields = { name: $('#f-name'), phone: $('#f-phone'), email: $('#f-email'), zip: $('#f-zip') };
  const err = (k, msg) => {
    const el = fields[k], box = $('#e-' + k);
    box.textContent = msg || '';
    el.closest('.field').classList.toggle('has-err', !!msg);
    msg ? el.setAttribute('aria-invalid', 'true') : el.removeAttribute('aria-invalid');
  };
  const checks = {
    name: (v) => (v.trim().length < 2 ? 'errName' : ''),
    phone: (v) => (v.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '').length !== 10 ? 'errPhone' : ''),
    email: (v) => (v.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'errEmail' : ''),
    zip: (v) => (!/^\d{5}$/.test(v.trim()) ? 'errZip' : ''),
  };
  const errState = {};
  const validate = (k) => { errState[k] = checks[k](fields[k].value); err(k, errState[k] ? I.t(errState[k]) : ''); return !errState[k]; };
  Object.keys(fields).forEach((k) => fields[k].addEventListener('blur', () => fields[k].value && validate(k)));
  I.onChange(() => Object.keys(errState).forEach((k) => errState[k] && err(k, I.t(errState[k]))));
  // phone: format as you type
  fields.phone.addEventListener('input', () => {
    const d = fields.phone.value.replace(/\D/g, '').slice(0, 10);
    if (d.length >= 7) fields.phone.value = `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  });
  let last = null;
  const renderThanks = () => {
    if (!last) return;
    const svc = $('#f-service');
    $('.thanks__title', thanks).textContent = I.t('thanksT', { name: last.name });
    $('.thanks__text', thanks).textContent = I.t('thanksP', { phone: last.phone, service: svc.options[svc.selectedIndex].text.toLowerCase() });
  };
  I.onChange(renderThanks);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = Object.keys(fields).map(validate).every(Boolean);
    if (!ok) { const bad = Object.keys(fields).find((k) => errState[k]); fields[bad].focus(); return; }
    last = { name: fields.name.value.trim().split(/\s+/)[0], phone: fields.phone.value.trim() };
    renderThanks();
    form.hidden = true; thanks.hidden = false; thanks.focus();
    if (gsap && !reduce) gsap.from(thanks.children, { y: 20, opacity: 0, duration: .9, stagger: .08, ease: 'expo.out' });
  });
  $('#again').addEventListener('click', () => { form.reset(); homeTouched = false; estimate(false); thanks.hidden = true; form.hidden = false; fields.name.focus(); });
})();
