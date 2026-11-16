// Flattop Flamingo: boot. Menu, schedule, map and booking work without WebGL or motion.
import { $, $$, reduce, isPhone, initLang, initScroll, initReveals, initParallax, initLightbox, flNow, fmtH, L, getLang, hasGL } from './core.js';

// where the truck is, by weekday (0 Sunday): [open, close]
const STOPS = { 0: [11, 17], 1: null, 2: [17, 21], 3: [17, 22], 4: [11, 14], 5: [18, 23], 6: [12, 22] };

/* ================= Menu tabs ================= */
function initMenu() {
  const tabs = $$('.tab'), panels = $$('.items');
  const show = (name, focus) => {
    tabs.forEach(t => { const on = t.dataset.tab === name; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    panels.forEach(p => { const on = p.id === 'p-' + name; p.hidden = !on; p.classList.toggle('is-on', on); });
    if (!reduce && window.gsap) window.gsap.from($$('#p-' + name + ' .item'), { x: 60, opacity: 0, duration: .6, stagger: .06, ease: 'power3.out', clearProps: 'all' });
    window.ScrollTrigger?.refresh();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t.dataset.tab));
    t.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); show(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true); } });
  });
}

/* ================= Where's the truck ================= */
function initWhere() {
  const days = $$('.day'), frame = $('.where__map iframe'), when = $('.where__when'), place = $('.where__place'), go = $('.where__go');
  const todayTxt = $('.today__txt'), todayBox = $('.today');
  let sel = null;
  const label = d => {
    const b = $(`.day[data-day="${d}"]`), t = STOPS[d], { day } = flNow();
    const isToday = +d === day;
    const name = isToday ? L('Today', 'Hoy') : L(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'])[d];
    return { b, t, isToday, name, spot: $('span', b).textContent };
  };
  const pick = (btn, focus) => {
    sel = btn;
    days.forEach(d => { const on = d === btn; d.classList.toggle('is-on', on); d.setAttribute('aria-selected', on); d.tabIndex = on ? 0 : -1; });
    if (focus) btn.focus();
    const { t, name, spot } = label(btn.dataset.day);
    when.textContent = t ? `${name} · ${fmtH(t[0])} – ${fmtH(t[1])}` : `${name} · ${L('No service', 'Sin servicio')}`;
    place.textContent = t ? spot : L('The truck is resting. Back tomorrow.', 'La camioneta descansa. Volvemos mañana.');
    const q = encodeURIComponent(btn.dataset.q);
    const src = `https://www.google.com/maps?q=${q}&z=${t ? 15 : 11}&output=embed`;
    if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
    go.href = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
    go.hidden = !t;
  };
  days.forEach((d, i) => {
    d.addEventListener('click', () => pick(d));
    d.addEventListener('keydown', e => { const k = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (k) { e.preventDefault(); pick(days[(i + k + days.length) % days.length], true); } });
  });
  const refresh = () => {
    const { day, h } = flNow();
    days.forEach(d => d.classList.toggle('is-today', +d.dataset.day === day));
    pick(sel || $(`.day[data-day="${day}"]`));
    // headline pill: tonight's stop, or the next one
    let d = day, n = 0;
    while ((!STOPS[d] || (n === 0 && h >= STOPS[d][1])) && n < 8) { d = (d + 1) % 7; n++; }
    const { t, spot } = label(d), live = n === 0 && h >= t[0] && h < t[1];
    const when = n === 0 ? (live ? L('Open now', 'Abierto ahora') : L('Today', 'Hoy')) : n === 1 ? L('Tomorrow', 'Mañana') : L(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'])[d];
    todayTxt.textContent = `${when}: ${spot} · ${fmtH(t[0])}–${fmtH(t[1])}`;
    todayBox.classList.toggle('is-live', live);
  };
  refresh(); setInterval(refresh, 60000);
  document.addEventListener('langchange', refresh);
}

/* ================= The smash: pinned steps on desktop ================= */
function initSmash() {
  const beats = $$('.beat'), imgs = $$('.smash__img');
  const set = k => { beats.forEach((b, i) => b.classList.toggle('is-on', i === k)); imgs.forEach((im, i) => im.classList.toggle('is-on', i === k)); };
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST || reduce) { beats.forEach(b => b.classList.add('is-on')); return; }
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    const t = ST.create({ trigger: '.smash', start: 'top top', end: () => '+=' + innerHeight * 1.6, pin: '.smash__pin', scrub: true,
      onUpdate: s => set(Math.min(2, Math.floor(s.progress * 3))) });
    return () => t.kill();
  });
  mm.add('(max-width: 760px)', () => { beats.forEach(b => b.classList.add('is-on')); imgs.forEach((im, i) => im.classList.toggle('is-on', i === 0)); });
}

/* ================= Booking (front end only) ================= */
function initBook() {
  const form = $('.form'), err = $('.form__err'), done = $('.form__done');
  const min = new Date(); min.setDate(min.getDate() + 7);
  form.elements.date.min = min.toISOString().slice(0, 10);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = form.elements; let msg = '';
    [f.date, f.name, f.email, f.guests].forEach(i => { i.classList.remove('is-bad'); i.removeAttribute('aria-invalid'); });
    const bad = (el, m) => { msg = m; el.classList.add('is-bad'); el.setAttribute('aria-invalid', 'true'); el.focus(); };
    if (!f.date.value || f.date.value < f.date.min) bad(f.date, L('Pick a date at least a week out.', 'Elige una fecha con al menos una semana.'));
    else if (+f.guests.value < 40) bad(f.guests, L('We cater for 40 guests or more.', 'Atendemos eventos de 40 personas o más.'));
    else if (!f.name.value.trim()) bad(f.name, L('Add your name.', 'Agrega tu nombre.'));
    else if (!/^\S+@\S+\.\S+$/.test(f.email.value.trim())) bad(f.email, L('Add an email so we can reply.', 'Agrega un correo para responderte.'));
    err.textContent = msg;
    if (msg) return;
    const d = new Date(f.date.value + 'T12:00'), lg = getLang();
    const when = d.toLocaleDateString(lg === 'es' ? 'es-US' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    done.innerHTML = `<p class="done__k">${L('Penciled in', 'Apartado')}</p><h3>${when}</h3><p>${L(`Thanks, ${f.name.value.trim().split(' ')[0]}. We are holding the date for ${f.guests.value} guests and will email a menu and quote within one business day.`, `Gracias, ${f.name.value.trim().split(' ')[0]}. Apartamos la fecha para ${f.guests.value} personas y te mandamos menú y precio en un día hábil.`)}</p><button type="button" class="btn btn--cream done__back">${L('Edit the request', 'Editar la solicitud')}</button>`;
    done.hidden = false; done.focus();
    $('.done__back', done).addEventListener('click', () => { done.hidden = true; f.date.focus(); });
  });
}

/* ================= Motion ================= */
function initMotion(getHero) {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  getHero()?.intro();
  if (!gsap || !ST) { initSmash(); return; }
  if (!reduce) {
    gsap.from('.hero__title .line > span', { y: 70, opacity: 0, duration: 1.1, stagger: .1, ease: 'power4.out', delay: .1 });
    gsap.from(['.today', '.hero__lede', '.hero__actions', '.hero__drag'], { y: 24, opacity: 0, duration: .9, stagger: .07, delay: .35, ease: 'power3.out' });
  }
  if (reduce) { initSmash(); initParallax(); return; }
  ST.create({ trigger: '.hero', start: 'top top', end: () => '+=' + innerHeight * (isPhone() ? .9 : 1.3), pin: '.hero__stage', scrub: true, onUpdate: s => getHero()?.setScroll(s.progress) });
  gsap.to('.hero__copy', { opacity: 0, y: -60, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: () => '+=' + innerHeight * .5, scrub: true } });
  gsap.to('.hero__drag', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=200', scrub: true } });
  initSmash();
  // ticker and review rows drift with scroll
  gsap.fromTo('.ticker__row', { xPercent: 0 }, { xPercent: -50, ease: 'none', scrollTrigger: { trigger: '.ticker', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.rv__row', { x: () => innerWidth * .1 }, { x: () => -($('.rv__row').scrollWidth - innerWidth * .9), ease: 'none', scrollTrigger: { trigger: '.reviews', start: 'top 80%', end: 'bottom 20%', scrub: true, invalidateOnRefresh: true } });
  // big headings slide in from the side
  $$('.big').forEach(h => gsap.from(h, { x: -60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 85%' } }));
  gsap.from('.g', { y: 60, opacity: 0, rotate: () => (Math.random() - .5) * 8, duration: .9, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: '.grid', start: 'top 80%' } });
  initParallax();
}

/* ================= Boot ================= */
initLang('flattop-flamingo');
initMenu();
initWhere();
initBook();
initLightbox();
initReveals();
initScroll();

let hero = null;
(async () => {
  if (hasGL) {
    try {
      const { initTruck } = await import('./truck.js');
      hero = await initTruck($('.hero__gl'), { reduce });
      document.documentElement.classList.add('has-gl');
    } catch (e) { console.warn('3D hero unavailable', e); }
  }
  initMotion(() => hero);
})();
