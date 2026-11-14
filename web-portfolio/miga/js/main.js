// Miga: boot. Structure features (menu, hours, gallery, reservation) work without motion or 3D.
import { initMotion } from './motion.js';
import { initPress } from './press.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const bus = new EventTarget();

/* ================= Counter: filter the photo grid ================= */
const NOTES = {
  all: 'Everything baked that morning · prices in USD',
  bread: 'Sourdough and slow breads · whole loaves, sliced on request · prices in USD',
  pastry: 'Laminated by hand with cultured butter · from 7 AM (8 AM on Sunday) until they run out · prices in USD',
  cakes: "Slices at the counter · whole cakes with one day's notice · prices in USD",
};
const SCENE = { all: 'tasting', bread: 'tasting', pastry: 'fire', cakes: 'agave' };
function initMenu() {
  const filters = $$('.filter'), items = $$('.item'), note = $('.menu__note');
  let cur = 'all';
  const show = (f, focus) => {
    if (f === cur) return;
    cur = f;
    filters.forEach(b => { const on = b.dataset.f === f; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    note.textContent = NOTES[f];
    const keep = items.filter(i => f === 'all' || i.dataset.cat === f);
    // motion.js animates the swap when it is running; otherwise the grid filters at once
    if (window.__filterAnim) window.__filterAnim(items, keep);
    else items.forEach(i => (i.hidden = !keep.includes(i)));
    bus.dispatchEvent(new CustomEvent('tab', { detail: { tab: SCENE[f] } }));
  };
  filters.forEach((b, i) => {
    b.tabIndex = i ? -1 : 0;
    b.addEventListener('click', () => show(b.dataset.f));
    b.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) show(filters[(i + d + filters.length) % filters.length].dataset.f, true);
    });
  });
  items.forEach(it => {
    it.tabIndex = 0;
    const pick = () => {
      items.forEach(x => x.classList.toggle('is-on', x === it));
      bus.dispatchEvent(new CustomEvent('tab', { detail: { tab: SCENE[it.dataset.cat] } }));
      bus.dispatchEvent(new CustomEvent('dish', { detail: {} }));
    };
    it.addEventListener('click', pick);
    it.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });
}

/* ================= Hours: open now, in Austin time ================= */
// [open, close] in hours, by weekday (0 Sunday). Close past midnight is written as 24.
const HOURS = { 0: [8, 15], 1: null, 2: [7, 19], 3: [7, 19], 4: [7, 19], 5: [7, 19], 6: [7, 19] };
export function localNow() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, h: +get('hour') + +get('minute') / 60 };
}
const fmtH = h => { const hh = h % 24, s = hh >= 12 ? 'PM' : 'AM', v = hh % 12 || 12; return h === 24 ? '12 AM' : `${v} ${s}`; };
function initHours() {
  const now = $('.hours__now'), state = $('.hours__state'), navOpen = $('.nav__open'), navState = $('.nav__state');
  const tick = () => {
    const { day, h } = localNow();
    $$('.week li').forEach(li => li.classList.toggle('is-today', li.dataset.day === String(day)));
    const t = HOURS[day];
    let txt, open = false;
    if (t && h >= t[0] && h < t[1]) { open = true; txt = `Open now, until ${fmtH(t[1])}`; }
    else if (t && h < t[0]) txt = `Opens today at ${fmtH(t[0])}`;
    else {
      let d = (day + 1) % 7, n = 1;
      while (!HOURS[d]) { d = (d + 1) % 7; n++; }
      const name = n === 1 ? 'tomorrow' : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d];
      txt = `Closed now, opens ${name} at ${fmtH(HOURS[d][0])}`;
    }
    state.textContent = txt; now.classList.toggle('is-open', open);
    navState.textContent = open ? `Open until ${fmtH(t[1])}` : 'Closed now'; navOpen.classList.toggle('is-open', open);
  };
  tick(); setInterval(tick, 60000);
}

/* ================= Gallery lightbox ================= */
function initGallery() {
  const box = $('.lightbox'), img = box.querySelector('img'), cap = box.querySelector('.lightbox__cap'), close = box.querySelector('.lightbox__close');
  let last = null;
  const open = gi => {
    last = gi;
    img.src = gi.querySelector('img').src; img.alt = gi.querySelector('img').alt;
    const full = `assets/img/${gi.dataset.full}.webp`;
    const hi = new Image(); hi.src = full; hi.onload = () => { if (!box.hidden) img.src = full; };
    cap.textContent = gi.querySelector('.label').textContent;
    box.hidden = false; window.__lenis?.stop(); close.focus();
    bus.dispatchEvent(new CustomEvent('lightbox', { detail: { open: true, from: gi } }));
  };
  const shut = () => { box.hidden = true; window.__lenis?.start(); last?.focus(); bus.dispatchEvent(new CustomEvent('lightbox', { detail: { open: false } })); };
  $$('.gi').forEach(gi => gi.addEventListener('click', () => open(gi)));
  close.addEventListener('click', shut);
  box.addEventListener('click', e => { if (e.target === box) shut(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) shut(); });
}

/* ================= Order ahead form (no backend) ================= */
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function slotsFor(day) {
  const t = HOURS[day]; if (!t) return [];
  const out = [], last = t[1] - 1; // last pickup an hour before close
  for (let h = t[0]; h <= last; h += .5) out.push(h);
  return out;
}
const fmtSlot = h => { const m = h % 1 ? '30' : '00', hh = Math.floor(h), v = hh % 12 || 12; return `${v}:${m} ${hh >= 12 ? 'PM' : 'AM'}`; };
function initReserve() {
  const form = $('.form'), dates = $('.dates'), times = $('.times'), out = $('.stepper__v'), err = $('.form__err'), done = $('.form__done');
  const state = { date: null, time: null, party: 4 };
  const base = new Date(); base.setHours(12, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    const d = new Date(base); d.setDate(base.getDate() + i);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip press'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    b.innerHTML = `<small>${i === 0 ? 'Today' : DAY[d.getDay()]}</small><strong>${d.getDate()}</strong><small>${MON[d.getMonth()]}</small>`;
    b.setAttribute('aria-label', d.toDateString());
    b.disabled = !HOURS[d.getDay()];
    b._date = d;
    b.addEventListener('click', () => pickDate(b));
    dates.append(b);
  }
  function pickDate(b) {
    $$('.chip', dates).forEach(c => { c.classList.toggle('is-on', c === b); c.setAttribute('aria-checked', c === b); });
    state.date = b._date; state.time = null;
    times.innerHTML = '';
    const today = b._date.toDateString() === new Date().toDateString();
    const { h: nowH } = localNow();
    slotsFor(b._date.getDay()).forEach(h => {
      const t = document.createElement('button');
      t.type = 'button'; t.className = 'chip press'; t.setAttribute('role', 'radio'); t.setAttribute('aria-checked', 'false');
      t.textContent = fmtSlot(h); t.disabled = today && h <= nowH + 1;
      t.addEventListener('click', () => { $$('.chip', times).forEach(c => { c.classList.toggle('is-on', c === t); c.setAttribute('aria-checked', c === t); }); state.time = h; err.textContent = ''; });
      times.append(t);
    });
    initPress(times);
    err.textContent = '';
  }
  pickDate($$('.chip', dates).find(c => !c.disabled && slotsFor(c._date.getDay()).some(h => c._date.toDateString() !== new Date().toDateString() || h > localNow().h + 1)) || $$('.chip', dates).find(c => !c.disabled));
  const setParty = n => {
    state.party = Math.max(1, Math.min(12, n)); out.textContent = state.party;
    $('.party__label').textContent = state.party === 1 ? '1 croissant' : `${state.party} croissants`;
    bus.dispatchEvent(new CustomEvent('party', { detail: state.party }));
  };
  $$('.stepper__btn').forEach(b => b.addEventListener('click', () => setParty(state.party + +b.dataset.step)));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = form.elements.name, email = form.elements.email;
    [name, email].forEach(i => i.classList.remove('is-bad'));
    let msg = '';
    if (!state.date) msg = 'Pick a day.';
    else if (state.time == null) msg = 'Pick a time.';
    else if (!name.value.trim()) { msg = 'Add the name for the order.'; name.classList.add('is-bad'); name.focus(); }
    else if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) { msg = 'Add an email so we can confirm.'; email.classList.add('is-bad'); email.focus(); }
    err.textContent = msg;
    if (msg) { bus.dispatchEvent(new Event('formerror')); return; }
    const d = state.date;
    $('.done__when').textContent = `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
    const loaf = form.elements.occasion.value;
    $('.form__donep').textContent = `${state.party === 1 ? 'One croissant' : state.party + ' croissants'}${loaf ? ' and a ' + loaf.toLowerCase().replace(/, bag of six$/, ' bag') : ''}, ready at ${fmtSlot(state.time)} under ${name.value.trim().split(' ')[0]}. We keep it at the counter until closing and confirm by email.`;
    done.hidden = false;
    bus.dispatchEvent(new Event('booked'));
    done.querySelector('.form__again').focus();
  });
  $('.form__again').addEventListener('click', () => { done.hidden = true; });
}

/* ================= Boot ================= */
initMenu();
initHours();
initGallery();
initReserve();
initPress(document);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();

let hero = null, scenes = null;
async function boot3d() {
  // hero: photo + parallax layers (no WebGL needed); wait for the photo so the curtain lifts on it
  try {
    const { initHero } = await import('./herofx.js');
    const im = $('.hero__photo img');
    await Promise.race([im.decode?.().catch(() => {}) ?? Promise.resolve(), new Promise(r => setTimeout(r, 5000))]);
    hero = initHero($('.hero__stage'), { reduce });
  } catch (e) { console.warn('hero fx off', e); }
  if (!hasGL) return;
  try {
    const s = await import('./scenes3d.js');
    document.documentElement.classList.add('has-gl');
    scenes = await s.initScenes($('.scenes'), { reduce, bus });
  } catch (e) { console.warn('3D off', e); }
}
const ready = boot3d();
// module scripts run after the deferred GSAP scripts, so motion can start now
initMotion({ ready, getHero: () => hero, getScenes: () => scenes, bus, reduce });
