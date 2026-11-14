// Tezontle Builders: boot, office hours, the project form.
import { initMotion } from './motion.js';
import { initPress } from './press.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = matchMedia('(max-width: 900px)').matches;
if (reduce) document.documentElement.classList.add('reduce');

let ride = null, mini = null;
const ready = (async () => {
  try {
    const J = await import('./journey.js');
    ride = await J.initJourney(document.querySelector('.site-canvas'), { reduce, isPhone });
    window.__ride = ride;
    J.initMini(document.querySelector('.mini')).then(m => { mini = m; syncMini(); });
    return ride;
  } catch (e) { console.error(e); return null; }
})();

initMotion({ ready, getRide: () => ride, reduce });
initPress();

/* ---------- office hours: open now, in Houston time ---------- */
const HOURS = { 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18], 6: [9, 13] };
function houstonNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { day, h: +p.hour + +p.minute / 60 };
}
const fmt = h => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`; };
function paintHours() {
  const { day, h } = houstonNow();
  document.querySelectorAll('.hours tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.day === day));
  const el = document.querySelector('[data-open]');
  const today = HOURS[day];
  if (today && h >= today[0] && h < today[1]) { el.textContent = `Open now · until ${fmt(today[1])}`; el.classList.add('is-open'); return; }
  el.classList.remove('is-open');
  if (today && h < today[0]) { el.textContent = `Opens today ${fmt(today[0])}`; return; }
  let d = day; do { d = (d + 1) % 7; } while (!HOURS[d]);
  el.textContent = `Closed · opens ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]} ${fmt(HOURS[d][0])}`;
}
paintHours(); setInterval(paintHours, 60000);

/* ---------- the form: the small tower follows the type and levels picked ---------- */
const form = document.querySelector('.form');
const msg = form.querySelector('.form__msg');
const range = form.querySelector('#floors');
const out = form.querySelector('.floors__out');
const mFloors = document.querySelector('.mini__floors'), mType = document.querySelector('.mini__type');
const TYPE = { Residential: 'Residential', Offices: 'Offices', Public: 'Public building', Home: 'A home' };
function syncMini() {
  const t = form.querySelector('input[name=type]:checked').value;
  let lv = +range.value;
  if (t === 'Home' && lv > 3) { lv = 3; range.value = 3; }
  out.textContent = lv; mFloors.textContent = lv; mType.textContent = TYPE[t];
  mini?.set(lv, t);
}
form.addEventListener('input', e => { if (e.target === range || e.target.name === 'type') syncMini(); e.target.closest('.field')?.classList.remove('is-bad'); });
form.addEventListener('change', e => { if (e.target.name === 'type') syncMini(); });
syncMini();

form.addEventListener('submit', e => {
  e.preventDefault();
  const bad = [];
  form.querySelectorAll('.field [required]').forEach(i => {
    let ok = i.value.trim() !== '';
    if (ok && i.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value);
    if (ok && i.type === 'tel') ok = i.value.replace(/\D/g, '').length >= 8;
    if (!ok) { i.closest('.field').classList.add('is-bad'); bad.push(i.closest('.field').querySelector('.label').textContent.toLowerCase()); }
  });
  if (bad.length) {
    msg.textContent = 'Please add your ' + bad.join(', ');
    if (window.gsap && !reduce) window.gsap.fromTo(form, { x: 0 }, { x: 0, keyframes: { x: [-8, 7, -5, 3, 0] }, duration: .45, ease: 'power2.out' });
    return;
  }
  msg.textContent = '';
  const done = form.querySelector('.form__done');
  done.querySelector('.form__who').textContent = form.name.value.trim().split(/\s+/)[0];
  const t = form.querySelector('input[name=type]:checked').value;
  done.querySelector('.form__what').textContent = (t === 'Home' ? 'home' : `${range.value} level ${TYPE[t].toLowerCase()}`);
  done.hidden = false;
  window.gsap?.from(done, { clipPath: 'inset(100% 0 0 0)', duration: reduce ? 0 : .9, ease: 'expo.inOut' });
});
form.querySelector('.form__again').addEventListener('click', () => { form.reset(); form.querySelector('.form__done').hidden = true; syncMini(); });
