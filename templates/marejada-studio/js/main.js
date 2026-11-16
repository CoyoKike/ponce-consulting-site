// Marejada Studio · language, motion, the schedule, hours and the booking form.
import { TYPES, TITLES, COACHES, LEVELS, WEEK, CAPACITY } from './schedule.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = matchMedia('(max-width: 900px)').matches;
if (reduce) root.classList.add('reduce');
const TYPE_COLOR = { strength: '#ff4f2e', reformer: '#e8e2d8', ride: '#3ce0c6', mobility: '#c9b8ff' };

/* =================== language =================== */
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { } } };
const ATTRS = ['alt', 'aria-label', 'content', 'placeholder'];
$$('[data-es]').forEach(el => { el._en = el.innerHTML; });
ATTRS.forEach(a => $$(`[data-es-${a}]`).forEach(el => { (el._enA ||= {})[a] = el.getAttribute(a); }));
let lang = new URLSearchParams(location.search).get('lang') || store.get('marejada-lang') || 'en';
if (!['en', 'es'].includes(lang)) lang = 'en';
const L = (en, es) => lang === 'es' ? es : en;

function setLang(next, save = true) {
  lang = next;
  root.lang = lang;
  $$('[data-es]').forEach(el => { el.innerHTML = lang === 'es' ? el.dataset.es : el._en; });
  ATTRS.forEach(a => $$(`[data-es-${a}]`).forEach(el => el.setAttribute(a, lang === 'es' ? el.getAttribute(`data-es-${a}`) : el._enA[a])));
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  if (save) store.set('marejada-lang', lang);
  renderDays(); renderSlots(); paintNext(); paintHours(); fillSlots();
}
$$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

/* =================== time in St. Pete =================== */
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
function stPeteNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { dow: SHORT_EN.indexOf(p.weekday), h: +p.hour + +p.minute / 60, y: +p.year, m: +p.month, d: +p.day };
}
const toH = s => { const [h, m] = s.split(':').map(Number); return h + m / 60; };
const fmt = h => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`; };
const iso = d => (d === 0 ? 7 : d);            // JS Sunday 0 -> schedule day 7

/* =================== schedule =================== */
const now0 = stPeteNow();
let selDay = iso(now0.dow), selType = 'all';
const daysEl = $('.days'), slotsEl = $('.slots');

function weekDates() {
  const base = Date.UTC(now0.y, now0.m - 1, now0.d) - (iso(now0.dow) - 1) * 864e5;
  return [1, 2, 3, 4, 5, 6, 7].map(k => new Date(base + (k - 1) * 864e5).getUTCDate());
}
function renderDays() {
  const dates = weekDates();
  daysEl.innerHTML = [1, 2, 3, 4, 5, 6, 7].map(k => {
    const js = k % 7, on = k === selDay;
    return `<button type="button" class="day${k === iso(now0.dow) ? ' is-today' : ''}" role="tab" id="day-${k}" data-day="${k}" aria-selected="${on}" tabindex="${on ? 0 : -1}" aria-controls="slots"><b>${L(SHORT_EN, SHORT_ES)[js]}</b><small>${dates[k - 1]}${k === iso(now0.dow) ? ' · ' + L('Today', 'Hoy') : ''}</small></button>`;
  }).join('');
  slotsEl.id = 'slots'; slotsEl.setAttribute('aria-labelledby', `day-${selDay}`);
}
function spotsText(n) {
  if (n === 0) return L('Full · waitlist', 'Llena · lista de espera');
  return n === 1 ? L('1 spot left', 'Queda 1 lugar') : L(`${n} spots left`, `Quedan ${n} lugares`);
}
function renderSlots() {
  const list = (WEEK[selDay] || []).filter(r => selType === 'all' || TITLES[r[1]].type === selType);
  const past = selDay === iso(now0.dow) ? now0.h : -1;
  if (!list.length) { slotsEl.innerHTML = `<p class="slots__empty">${L('No classes of this type on this day. Try another day.', 'No hay clases de este tipo este día. Prueba otro día.')}</p>`; return; }
  slotsEl.innerHTML = list.map(([t, key, coach, lvl, min, spots]) => {
    const tt = TITLES[key], h = toH(t), done = h < past;
    const fill = Math.round((1 - spots / CAPACITY) * 100);
    const cls = ['slot', spots === 0 ? 'is-full' : '', spots > 0 && spots <= 2 ? 'is-low' : ''].join(' ');
    const btn = done ? `<span class="btn" aria-disabled="true" style="opacity:.45;pointer-events:none">${L('Done', 'Terminó')}</span>`
      : `<button type="button" class="btn" data-book="${selDay}|${t}|${key}">${spots === 0 ? L('Waitlist', 'En espera') : L('Book', 'Reservar')}</button>`;
    return `<div class="${cls}">
      <p class="slot__time">${fmt(h).replace(/ (am|pm)$/, '<span class="ap">$1</span>')}<small>${min} min</small></p>
      <p class="slot__name"><i style="--t:${TYPE_COLOR[tt.type]}"></i>${tt[lang]}</p>
      <p class="slot__coach">${L('with', 'con')} ${COACHES[coach]}</p>
      <p class="slot__lvl">${LEVELS[lvl][lang]}</p>
      <div class="slot__spots"><span>${spotsText(spots)}</span><span class="slot__bar"><i style="--w:${fill}%"></i></span></div>
      ${btn}
    </div>`;
  }).join('');
  if (window.gsap && !reduce) gsap.from($$('.slot', slotsEl), { y: 16, opacity: 0, duration: .5, stagger: .04, ease: 'power3.out', clearProps: 'all' });
}
daysEl.addEventListener('click', e => { const b = e.target.closest('.day'); if (!b) return; selDay = +b.dataset.day; renderDays(); renderSlots(); $(`#day-${selDay}`).focus(); });
daysEl.addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  selDay = e.key === 'Home' ? 1 : e.key === 'End' ? 7 : ((selDay - 1 + (e.key === 'ArrowRight' ? 1 : 6)) % 7) + 1;
  renderDays(); renderSlots(); $(`#day-${selDay}`).focus();
});
$$('.chip').forEach(c => c.addEventListener('click', () => {
  selType = c.dataset.type;
  $$('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === c)));
  renderSlots();
}));
slotsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-book]'); if (!b) return;
  const [d, t, key] = b.dataset.book.split('|');
  const type = TITLES[key].type;
  $(`.form input[name=type][value=${type}]`).checked = true;
  fillSlots(`${d}|${t}|${key}`);
  goTo('#book');
  setTimeout(() => $('.form input[name=name]').focus({ preventScroll: true }), reduce ? 0 : 1100);
});

/* next class, in the hero card */
function nextClass() {
  const n = stPeteNow();
  for (let k = 0; k < 8; k++) {
    const day = ((iso(n.dow) - 1 + k) % 7) + 1;
    const hit = (WEEK[day] || []).find(r => k > 0 || toH(r[0]) > n.h + .1);
    if (hit) return { day, k, row: hit };
  }
  return null;
}
function paintNext() {
  const nx = nextClass(); if (!nx) return;
  const [t, key, coach, , , spots] = nx.row;
  const when = nx.k === 0 ? L('Today', 'Hoy') : nx.k === 1 ? L('Tomorrow', 'Mañana') : L(DAYS_EN, DAYS_ES)[nx.day % 7];
  $('[data-next-title]').textContent = TITLES[key][lang];
  $('[data-next-meta]').textContent = `${when} · ${fmt(toH(t))} · ${COACHES[coach]}`;
  $('[data-next-spots]').textContent = spotsText(spots);
  $('.next').setAttribute('aria-label', `${L('Next class', 'Próxima clase')}: ${TITLES[key][lang]}, ${when} ${fmt(toH(t))}, ${spotsText(spots)}`);
}

/* =================== hours: open now =================== */
const HOURS = { 1: [5.5, 20.5], 2: [5.5, 20.5], 3: [5.5, 20.5], 4: [5.5, 20.5], 5: [5.5, 19], 6: [7, 13], 0: [8, 12] };
function paintHours() {
  const { dow, h } = stPeteNow();
  $$('.hours tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.day === dow));
  const el = $('[data-open]'), today = HOURS[dow];
  if (h >= today[0] && h < today[1]) { el.textContent = L(`Open now · until ${fmt(today[1])}`, `Abierto ahora · hasta las ${fmt(today[1])}`); el.classList.add('is-open'); return; }
  el.classList.remove('is-open');
  if (h < today[0]) { el.textContent = L(`Opens today at ${fmt(today[0])}`, `Abre hoy a las ${fmt(today[0])}`); return; }
  const d = (dow + 1) % 7;
  el.textContent = L(`Closed · opens ${DAYS_EN[d]} at ${fmt(HOURS[d][0])}`, `Cerrado · abre el ${DAYS_ES[d].toLowerCase()} a las ${fmt(HOURS[d][0])}`);
}
setInterval(() => { paintHours(); paintNext(); }, 60000);

/* =================== booking form =================== */
const form = $('.form'), msg = $('.form__msg', form), slotSel = form.elements.slot;
function fillSlots(pick) {
  const type = form.querySelector('input[name=type]:checked').value;
  const keep = pick || slotSel.value;
  const opts = [];
  for (let k = 0; k < 7; k++) {
    const day = ((iso(now0.dow) - 1 + k) % 7) + 1;
    (WEEK[day] || []).forEach(([t, key, coach, , , spots]) => {
      if (TITLES[key].type !== type || (k === 0 && toH(t) <= now0.h)) return;
      const v = `${day}|${t}|${key}`;
      const dn = k === 0 ? L('Today', 'Hoy') : L(SHORT_EN, SHORT_ES)[day % 7];
      opts.push(`<option value="${v}">${dn} ${fmt(toH(t))} · ${TITLES[key][lang]} · ${COACHES[coach]}${spots === 0 ? ' · ' + L('waitlist', 'en espera') : ''}</option>`);
    });
  }
  slotSel.innerHTML = `<option value="">${L('Choose a class', 'Elige una clase')}</option>` + opts.join('');
  if (keep && [...slotSel.options].some(o => o.value === keep)) slotSel.value = keep;
}
form.addEventListener('change', e => { if (e.target.name === 'type') fillSlots(); });
form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('is-bad'));
form.addEventListener('submit', e => {
  e.preventDefault();
  const bad = [];
  $$('.field [required]', form).forEach(i => {
    let ok = i.value.trim() !== '';
    if (ok && i.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value);
    if (ok && i.type === 'tel') ok = i.value.replace(/\D/g, '').length >= 10;
    i.setAttribute('aria-invalid', String(!ok));
    if (!ok) { i.closest('.field').classList.add('is-bad'); bad.push(i); }
  });
  if (bad.length) {
    const names = { name: L('your name', 'tu nombre'), phone: L('a 10-digit phone', 'un teléfono de 10 dígitos'), email: L('a valid email', 'un correo válido'), slot: L('a class', 'una clase') };
    msg.textContent = L('Please add ', 'Por favor agrega ') + bad.map(i => names[i.name]).join(', ') + '.';
    bad[0].focus();
    if (window.gsap && !reduce) gsap.fromTo(form, { x: 0 }, { keyframes: { x: [-8, 7, -5, 3, 0] }, duration: .45, ease: 'power2.out' });
    return;
  }
  msg.textContent = '';
  const done = $('.form__done', form);
  $('.form__who', done).textContent = form.elements.name.value.trim().split(/\s+/)[0];
  $('.form__what', done).textContent = slotSel.options[slotSel.selectedIndex].textContent;
  done.hidden = false; done.focus();
  if (window.gsap) gsap.from(done, { clipPath: 'inset(100% 0 0 0 round 26px)', duration: reduce ? 0 : .8, ease: 'expo.inOut' });
});
$('.form__again').addEventListener('click', () => { form.reset(); fillSlots(); $('.form__done').hidden = true; form.elements.name.focus(); });

/* =================== nav + menu =================== */
const nav = $('.nav'), burger = $('.nav__burger'), menu = $('#menu');
let lenis = null;
function goTo(target) {
  const el = typeof target === 'string' ? $(target) : target; if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 }); else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
}
function setMenu(open) {
  burger.setAttribute('aria-expanded', String(open)); menu.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  open ? lenis?.stop() : lenis?.start();
  if (open) $('a', menu).focus();
}
burger.addEventListener('click', () => setMenu(menu.hidden));
addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute('href'); if (id.length < 2 && id !== '#') return;
  if (id === '#') { e.preventDefault(); return; }
  e.preventDefault();
  if (!menu.hidden) setMenu(false);
  goTo(id === '#top' ? document.body : id);
});
let lastY = 0;
function onScroll(y) {
  nav.classList.toggle('is-scrolled', y > 40);
  nav.classList.toggle('is-hidden', y > lastY && y > innerHeight * 1.2 && menu.hidden);
  lastY = y;
}
const links = $$('.nav__links a');
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
['classes', 'schedule', 'coaches', 'pricing', 'visit'].forEach(id => io.observe(document.getElementById(id)));

/* reveals */
const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
$$('.reveal').forEach(el => rio.observe(el));

/* =================== motion =================== */
let hero = null;
const loader = $('.loader');
const hideLoader = () => {
  if (loader.classList.contains('is-done')) return;
  if (window.gsap && !reduce) gsap.to(loader, { opacity: 0, duration: .6, ease: 'power2.out', onComplete: () => loader.classList.add('is-done') });
  else loader.classList.add('is-done');
  if (window.gsap && !reduce) {
    gsap.from('.hero__title .line > span', { yPercent: 115, duration: 1.3, ease: 'expo.out', stagger: .1, delay: .15 });
    gsap.from(['.hero__copy .eyebrow', '.hero__lede', '.hero__actions', '.next', '.hero__beat'], { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: .08, delay: .45 });
  }
};
setTimeout(hideLoader, 2600);

(async () => {
  try {
    const { initHero } = await import('./hero3d.js');
    hero = initHero($('.hero__canvas'), { reduce, isPhone });
  } catch (err) { console.warn('3D hero unavailable', err); }
  hideLoader();
})();

function initMotion() {
  const G = window.gsap, ST = window.ScrollTrigger;
  if (!G || !ST) return;
  G.registerPlugin(ST);
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: .95 });
    window.__lenis = lenis;
    lenis.on('scroll', e => { ST.update(); onScroll(e.scroll); hero?.setVelocity(e.velocity); });
    G.ticker.add(t => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  } else addEventListener('scroll', () => onScroll(scrollY), { passive: true });

  /* hero: the swell builds as you scroll through it */
  ST.create({ trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: s => {
    hero?.setProgress(s.progress);
    if (reduce) return;
    const p = s.progress, out = Math.max(0, 1 - Math.max(0, p - .12) * 3.2);
    G.set(['.hero__copy', '.next'], { opacity: out, y: -p * 90 });
    const inn = Math.min(1, Math.max(0, (p - .38) * 4)) * Math.min(1, Math.max(0, (1 - p) * 6));
    G.set('.hero__more', { opacity: inn, yPercent: -50 + (1 - Math.min(1, Math.max(0, (p - .38) * 4))) * 18 });
    G.set('.hero__more span, .hero__more em', { x: i => (1 - Math.min(1, Math.max(0, (p - .38 - i * .07) * 5))) * -40 });
  } });
  if (reduce) return;

  const mm = G.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const track = $('.classes__track');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    G.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.classes__rail', start: 'center center', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1 } });
  });
  $$('.par').forEach(img => G.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.closest('.par-wrap') || img, start: 'top bottom', end: 'bottom top', scrub: true } }));
  G.from('.klass', { y: 60, opacity: 0, duration: 1, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.classes__rail', start: 'top 85%' } });
  G.from('.coach', { y: 50, opacity: 0, duration: .9, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.coaches__grid', start: 'top 85%' } });
  G.from('.plan', { y: 50, opacity: 0, duration: .9, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.plans', start: 'top 85%' } });
  G.to('.foot__word', { xPercent: -6, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  addEventListener('load', () => ST.refresh());
}

/* =================== boot =================== */
fillSlots();
setLang(lang, false);
initMotion();
