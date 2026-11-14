// Lumen Cardiology: boot, hours, the request form.
import { initMotion } from './motion.js';
import { initPress } from './press.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = matchMedia('(max-width: 900px)').matches;
if (reduce) document.documentElement.classList.add('reduce');

let heart = null, slots = null;
const ready = (async () => {
  try {
    const H = await import('./heart.js');
    const J = await import('./journey.js');
    const data = await H.loadHeart();
    heart = J.initJourney(document.querySelector('.heart-canvas'), data, { reduce, isPhone });
    slots = H.initSlots(document.querySelector('.slot-canvas'), data, { reduce, isPhone });
    window.__heart = heart;
    return heart;
  } catch (e) { console.error(e); return null; }
})();

initMotion({ ready, getHeart: () => heart, reduce });
initPress();

/* ---------- hours: open now, in Santa Fe time ---------- */
const HOURS = { 1: [7.5, 17], 2: [7.5, 17], 3: [7.5, 17], 4: [7.5, 17], 5: [7.5, 15] };
function santaFeNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { day, h: +p.hour + +p.minute / 60 };
}
function fmt(h) { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`; }
function paintHours() {
  const { day, h } = santaFeNow();
  document.querySelectorAll('.hours tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.day === day));
  const el = document.querySelector('[data-open]');
  const today = HOURS[day];
  if (today && h >= today[0] && h < today[1]) { el.textContent = `Open now · until ${fmt(today[1])}`; el.classList.add('is-open'); }
  else {
    let d = day, guard = 0, label;
    do { d = (d + 1) % 7; guard++; } while (!HOURS[d] && guard < 8);
    if (today && h < today[0]) label = `Opens today ${fmt(today[0])}`;
    else label = `Closed · opens ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]} ${fmt(HOURS[d][0])}`;
    el.textContent = label; el.classList.remove('is-open');
  }
}
paintHours(); setInterval(paintHours, 60000);

/* ---------- request form (no backend: it only shows the confirmation) ---------- */
const form = document.querySelector('.form');
const msg = form.querySelector('.form__msg');
const where = document.querySelector('.request__wherev');
const NAMES = { consult: 'consultation', echo: 'echocardiogram', stress: 'stress test', cath: 'cath follow up visit', prevent: 'prevention visit' };
form.addEventListener('change', e => {
  if (e.target.name === 'reason') {
    const label = slots?.setReason(e.target.value);
    if (label) where.textContent = label;
    form.querySelector('.chips').classList.remove('is-bad');
  }
  e.target.closest('.field, .check')?.classList.remove('is-bad');
});
form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('is-bad'));
form.addEventListener('submit', e => {
  e.preventDefault();
  const bad = [];
  if (!form.querySelector('input[name=reason]:checked')) { form.querySelector('.chips').classList.add('is-bad'); bad.push('a reason'); }
  form.querySelectorAll('.field [required]').forEach(i => {
    let ok = i.value.trim() !== '';
    if (ok && i.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value);
    if (ok && i.type === 'tel') ok = i.value.replace(/\D/g, '').length >= 10;
    if (!ok) { i.closest('.field').classList.add('is-bad'); bad.push(i.closest('.field').querySelector('.label').textContent.toLowerCase()); }
  });
  const ok = form.querySelector('input[name=ok]');
  if (!ok.checked) { ok.closest('.check').classList.add('is-bad'); bad.push('your consent'); }
  if (bad.length) {
    msg.textContent = 'Please add ' + bad.slice(0, 3).join(', ') + (bad.length > 3 ? ' and more' : '');
    const g = window.gsap;
    if (g && !reduce) g.fromTo(form, { x: 0 }, { x: 0, keyframes: { x: [-8, 7, -5, 3, 0] }, duration: .45, ease: 'power2.out' });
    return;
  }
  msg.textContent = '';
  const done = form.querySelector('.form__done');
  done.querySelector('.form__who').textContent = form.name.value.trim().split(/\s+/)[0];
  done.querySelector('.form__what').textContent = NAMES[form.querySelector('input[name=reason]:checked').value];
  done.hidden = false;
  window.gsap?.from(done, { clipPath: 'inset(100% 0 0 0)', duration: reduce ? 0 : .9, ease: 'expo.inOut' });
});
form.querySelector('.form__again').addEventListener('click', () => {
  form.reset(); form.querySelector('.form__done').hidden = true; slots?.setReason(null);
  where.textContent = 'Choose a reason to see it on the heart';
});
