// Ceniza: boot. Structure features (menu, hours, gallery, reservation) work without motion or 3D.
import { initMotion } from './motion.js';
import { initPress } from './press.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const IMG = n => `assets/img/${n}-1280.webp`;
const isPhone = () => matchMedia('(max-width: 760px)').matches;
export const bus = new EventTarget();

/* ================= Menu tabs and dishes ================= */
function initMenu() {
  const tabs = $$('.tab'), panels = $$('.panel');
  const photo = $('.menu__photo img'), capN = $('.menu__capn'), capT = $('.menu__capt');
  const select = (dish, silent) => {
    const panel = dish.closest('.panel');
    $$('.dish', panel).forEach(d => d.classList.toggle('is-on', d === dish));
    capN.textContent = dish.querySelector('.dish__n').textContent;
    capT.textContent = dish.querySelector('h3').textContent;
    const src = IMG(dish.dataset.img);
    if (!photo.src.endsWith(src)) {
      photo.style.opacity = 0;
      const im = new Image(); im.src = src;
      im.onload = () => { photo.src = src; photo.style.opacity = 1; };
    }
    if (!silent) bus.dispatchEvent(new CustomEvent('dish', { detail: { tab: panel.id.slice(2), index: $$('.dish', panel).indexOf(dish) } }));
  };
  const show = (name, focus) => {
    tabs.forEach(t => { const on = t.dataset.tab === name; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    panels.forEach(p => { p.hidden = p.id !== 'm-' + name; p.classList.toggle('is-on', !p.hidden); });
    const first = $('#m-' + name + ' .dish');
    select(first, true);
    bus.dispatchEvent(new CustomEvent('tab', { detail: { tab: name, panel: $('#m-' + name) } }));
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t.dataset.tab));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) show(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true);
    });
  });
  $$('.dish').forEach(d => {
    d.tabIndex = 0;
    d.addEventListener('mouseenter', () => select(d));
    d.addEventListener('click', () => select(d));
    d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(d); } });
    // phones: a small photo on each row, since there is no side panel
    const th = document.createElement('img');
    th.className = 'dish__thumb'; th.loading = 'lazy'; th.alt = ''; th.src = IMG(d.dataset.img);
    d.prepend(th);
  });
  const syncThumbs = () => $$('.dish__thumb').forEach(t => (t.hidden = !isPhone()));
  syncThumbs(); addEventListener('resize', syncThumbs);
  select($('#m-tasting .dish'), true);

  // floating photo that follows the cursor over a dish (desktop)
  const peek = $('.dish-peek'), peekImg = peek.querySelector('img');
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    // the photo only shows while the pointer is really over a dish. Scrolling moves the menu
    // without moving the mouse (no mouseleave), so every scroll re-checks what is under the cursor.
    let on = false, mx = -1, my = -1;
    const hide = () => { if (!on) return; on = false; peek.classList.remove('is-on'); bus.dispatchEvent(new CustomEvent('peek', { detail: { on: false } })); };
    const show = (d, x, y) => {
      const src = IMG(d.dataset.img);
      if (!peekImg.src.endsWith(src)) peekImg.src = src;
      bus.dispatchEvent(new CustomEvent('peek', { detail: { x, y, on: true } }));
      if (!on) { on = true; peek.classList.add('is-on'); }
    };
    const dishAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('.dishes .dish'); };
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    $$('.dishes').forEach(list => {
      list.addEventListener('mousemove', e => {
        const d = e.target.closest('.dish');
        if (d) show(d, e.clientX, e.clientY); else hide();
      });
      list.addEventListener('mouseleave', hide);
    });
    addEventListener('scroll', () => {
      if (!on) return;
      const d = mx < 0 ? null : dishAt(mx, my);
      if (d) show(d, mx, my); else hide();
    }, { passive: true });
    document.addEventListener('mouseleave', hide);
  }
}

/* ================= Hours: open now, in Mexico City time ================= */
// [open, close] in hours, by weekday (0 Sunday). Close past midnight is written as 24.
const HOURS = { 0: [13, 18], 1: null, 2: [18, 23], 3: [18, 23], 4: [18, 23], 5: [18, 24], 6: [18, 24] };
export function cdmxNow() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, h: +get('hour') + +get('minute') / 60 };
}
const fmtH = h => { const hh = h % 24, s = hh >= 12 ? 'PM' : 'AM', v = hh % 12 || 12; return h === 24 ? '12 AM' : `${v} ${s}`; };
function initHours() {
  const now = $('.hours__now'), state = $('.hours__state');
  const tick = () => {
    const { day, h } = cdmxNow();
    $$('.hours__table tr').forEach(tr => tr.classList.toggle('is-today', tr.dataset.days.split(',').includes(String(day))));
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

/* ================= Reservation form (no backend) ================= */
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function slotsFor(day) {
  const t = HOURS[day]; if (!t) return [];
  const out = [], last = t[1] - 1.5; // last seating 90 minutes before close
  for (let h = t[0]; h <= last; h += .5) out.push(h);
  return out;
}
const fmtSlot = h => { const m = h % 1 ? '30' : '00', hh = Math.floor(h), v = hh % 12 || 12; return `${v}:${m} ${hh >= 12 ? 'PM' : 'AM'}`; };
function initReserve() {
  const form = $('.form'), dates = $('.dates'), times = $('.times'), out = $('.stepper__v'), err = $('.form__err'), done = $('.form__done');
  const state = { date: null, time: null, party: 2 };
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
    const { h: nowH } = cdmxNow();
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
  pickDate($$('.chip', dates).find(c => !c.disabled && slotsFor(c._date.getDay()).some(h => c._date.toDateString() !== new Date().toDateString() || h > cdmxNow().h + 1)) || $$('.chip', dates).find(c => !c.disabled));
  const setParty = n => {
    state.party = Math.max(1, Math.min(8, n)); out.textContent = state.party;
    $('.party__label').textContent = state.party === 1 ? '1 guest' : `${state.party} guests`;
    bus.dispatchEvent(new CustomEvent('party', { detail: state.party }));
  };
  $$('.stepper__btn').forEach(b => b.addEventListener('click', () => setParty(state.party + +b.dataset.step)));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = form.elements.name, email = form.elements.email;
    [name, email].forEach(i => i.classList.remove('is-bad'));
    let msg = '';
    if (!state.date) msg = 'Pick a date.';
    else if (state.time == null) msg = 'Pick a time.';
    else if (!name.value.trim()) { msg = 'Add the name for the booking.'; name.classList.add('is-bad'); name.focus(); }
    else if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) { msg = 'Add an email so we can confirm.'; email.classList.add('is-bad'); email.focus(); }
    err.textContent = msg;
    if (msg) { bus.dispatchEvent(new Event('formerror')); return; }
    const d = state.date;
    $('.done__when').textContent = `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
    $('.form__donep').textContent = `A table for ${state.party} at ${fmtSlot(state.time)}, under ${name.value.trim().split(' ')[0]}. We hold it for 15 minutes and confirm by email within the hour.`;
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
