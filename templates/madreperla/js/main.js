// Madreperla: boot. Menu, reviews, reservations and hours work with no motion or WebGL at all.
import { $, $$, reduce, isPhone, initLang, initScroll, initReveals, initParallax, initFill, initLightbox, initHours, flNow, L, getLang, hasGL } from './core.js';

const IMG = n => `assets/img/${n}-m.webp`;
// weekday (0 Sunday): [open, close]
const HOURS = { 0: [17, 21], 1: null, 2: null, 3: [17.5, 22], 4: [17.5, 22], 5: [17.5, 23], 6: [17.5, 23] };

/* ================= Menu tabs + dish photo ================= */
function initMenu() {
  const tabs = $$('.tab'), panels = $$('.panel');
  const photo = $('.menu__photo img'), capN = $('.menu__capn'), capT = $('.menu__capt');
  let current = null;
  const select = dish => {
    current = dish;
    $$('.dish', dish.closest('.panel')).forEach(d => d.classList.toggle('is-on', d === dish));
    capN.textContent = $('.dish__n', dish).textContent;
    capT.textContent = $('h3', dish).textContent;
    const src = IMG(dish.dataset.img);
    if (!photo.src.endsWith(src)) {
      photo.style.opacity = 0;
      const im = new Image(); im.src = src;
      im.onload = () => { photo.src = src; photo.style.opacity = 1; };
    }
  };
  const show = (name, focus) => {
    tabs.forEach(t => { const on = t.dataset.tab === name; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    panels.forEach(p => { p.hidden = p.id !== 'm-' + name; p.classList.toggle('is-on', !p.hidden); });
    select($('#m-' + name + ' .dish'));
    window.ScrollTrigger?.refresh();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t.dataset.tab));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); show(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true); }
    });
  });
  $$('.dish').forEach(d => {
    d.tabIndex = 0;
    d.addEventListener('mouseenter', () => select(d));
    d.addEventListener('focus', () => select(d));
    d.addEventListener('click', () => select(d));
    const th = document.createElement('img');
    th.className = 'dish__thumb'; th.loading = 'lazy'; th.decoding = 'async'; th.alt = ''; th.src = IMG(d.dataset.img);
    d.prepend(th);
  });
  select($('#m-tasting .dish'));
  document.addEventListener('langchange', () => current && (capT.textContent = $('h3', current).textContent));

  // floating photo that follows the cursor over a dish (desktop only)
  const peek = $('.dish-peek'), pimg = $('img', peek);
  if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let x = 0, y = 0, tx = 0, ty = 0, on = false;
    $$('.dishes').forEach(list => {
      list.addEventListener('mousemove', e => {
        const d = e.target.closest('.dish'); tx = e.clientX; ty = e.clientY;
        if (d) { const s = IMG(d.dataset.img); if (!pimg.src.endsWith(s)) pimg.src = s; if (!on) { on = true; peek.classList.add('is-on'); x = tx; y = ty; } }
      });
      list.addEventListener('mouseleave', () => { on = false; peek.classList.remove('is-on'); });
    });
    addEventListener('scroll', () => { if (on) { on = false; peek.classList.remove('is-on'); } }, { passive: true });
    const tick = () => { x += (tx - x) * 0.14; y += (ty - y) * 0.14; peek.style.transform = `translate3d(${x + 24}px, ${y - 110}px, 0) rotate(${(tx - x) * 0.04}deg)`; requestAnimationFrame(tick); };
    tick();
  }
}

/* ================= Reviews carousel ================= */
function initQuotes() {
  const qs = $$('.quote'), n = $('.quotes__n');
  let i = 0, timer;
  const go = k => {
    i = (k + qs.length) % qs.length;
    qs.forEach((q, j) => { q.classList.toggle('is-on', j === i); q.setAttribute('aria-hidden', j !== i); });
    n.textContent = `${i + 1} / ${qs.length}`;
  };
  $$('.qbtn').forEach(b => b.addEventListener('click', () => { go(i + +b.dataset.q); clearInterval(timer); }));
  go(0);
  if (!reduce) {
    timer = setInterval(() => go(i + 1), 7000);
    $('.quotes').addEventListener('focusin', () => clearInterval(timer));
  }
}

/* ================= Reservation (front end only) ================= */
const DAY = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] };
const MON = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] };
const slotsFor = day => { const t = HOURS[day]; if (!t) return []; const out = []; for (let h = t[0]; h <= t[1] - 2; h += 0.5) out.push(h); return out; };
const fmtSlot = h => { const hh = Math.floor(h), m = h % 1 ? '30' : '00'; return getLang() === 'es' ? `${hh}:${m}` : `${hh % 12 || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`; };
function initReserve() {
  const form = $('.form'), dates = $('.dates'), times = $('.times'), out = $('.stepper__v'), err = $('.form__err'), done = $('.form__done');
  const st = { date: null, time: null, party: 2 };
  const base = new Date(); base.setHours(12, 0, 0, 0);
  const radio = (wrap, btn) => $$('.chip', wrap).forEach(c => { const on = c === btn; c.classList.toggle('is-on', on); c.setAttribute('aria-checked', on); c.tabIndex = on ? 0 : -1; });
  const arrows = wrap => wrap.addEventListener('keydown', e => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    const list = $$('.chip:not(:disabled)', wrap), k = list.indexOf(document.activeElement);
    if (k < 0) return; e.preventDefault();
    const nx = list[(k + d + list.length) % list.length]; nx.focus(); nx.click();
  });
  arrows(dates); arrows(times);
  const drawDates = () => {
    dates.innerHTML = '';
    for (let i = 0; i < 30; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i);
      const b = document.createElement('button'); const lg = getLang();
      b.type = 'button'; b.className = 'chip chip--date'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.tabIndex = -1;
      b.innerHTML = `<small>${i === 0 ? L('Today', 'Hoy') : DAY[lg][d.getDay()]}</small><strong>${d.getDate()}</strong><small>${MON[lg][d.getMonth()]}</small>`;
      b.setAttribute('aria-label', d.toLocaleDateString(lg === 'es' ? 'es-US' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
      b.disabled = !HOURS[d.getDay()]; b._d = d;
      b.addEventListener('click', () => pickDate(b));
      dates.append(b);
      if (st.date && d.toDateString() === st.date.toDateString()) radio(dates, b);
    }
  };
  function pickDate(b) {
    radio(dates, b); st.date = b._d; drawTimes(); err.textContent = '';
  }
  function drawTimes() {
    times.innerHTML = '';
    const today = st.date.toDateString() === new Date().toDateString(), now = flNow().h;
    slotsFor(st.date.getDay()).forEach(h => {
      const t = document.createElement('button');
      t.type = 'button'; t.className = 'chip'; t.setAttribute('role', 'radio'); t.setAttribute('aria-checked', 'false'); t.tabIndex = -1;
      t.textContent = fmtSlot(h); t.disabled = today && h <= now + 1; t._h = h;
      t.addEventListener('click', () => { radio(times, t); st.time = h; err.textContent = ''; });
      times.append(t);
      if (st.time === h && !t.disabled) radio(times, t);
    });
    if (!$$('.chip.is-on', times).length) { const first = $('.chip:not(:disabled)', times); st.time = null; if (first) { radio(times, first); st.time = first._h; } }
  }
  drawDates();
  const first = $$('.chip', dates).find(c => !c.disabled && slotsFor(c._d.getDay()).some(h => c._d.toDateString() !== new Date().toDateString() || h > flNow().h + 1));
  pickDate(first);
  document.addEventListener('langchange', () => { drawDates(); drawTimes(); if (!done.hidden) confirm(); });
  const setParty = n => { st.party = Math.max(1, Math.min(12, n)); out.textContent = st.party; };
  $$('.stepper__btn').forEach(b => b.addEventListener('click', () => setParty(st.party + +b.dataset.step)));
  const confirm = () => {
    const d = st.date, lg = getLang(), nm = form.elements.name.value.trim().split(' ')[0];
    const when = d.toLocaleDateString(lg === 'es' ? 'es-US' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    $('.form__doneh').textContent = L(`See you ${when}.`, `Te esperamos el ${when}.`);
    $('.form__donep').textContent = L(
      `A table for ${st.party} at ${fmtSlot(st.time)}, under ${nm}. We will confirm by email within the hour and hold the table for 15 minutes.`,
      `Mesa para ${st.party} a las ${fmtSlot(st.time)}, a nombre de ${nm}. Confirmamos por correo en menos de una hora y guardamos la mesa 15 minutos.`);
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = form.elements.name, email = form.elements.email;
    [name, email].forEach(i => { i.classList.remove('is-bad'); i.removeAttribute('aria-invalid'); });
    let msg = '';
    if (!st.date) msg = L('Pick a date.', 'Elige una fecha.');
    else if (st.time == null) msg = L('Pick a time.', 'Elige una hora.');
    else if (!name.value.trim()) { msg = L('Add a name for the booking.', 'Agrega un nombre para la reservación.'); name.classList.add('is-bad'); name.setAttribute('aria-invalid', 'true'); name.focus(); }
    else if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) { msg = L('Add an email so we can confirm.', 'Agrega un correo para confirmar.'); email.classList.add('is-bad'); email.setAttribute('aria-invalid', 'true'); email.focus(); }
    err.textContent = msg;
    if (msg) return;
    confirm(); done.hidden = false; done.focus();
  });
  $('.form__again').addEventListener('click', () => { done.hidden = true; $('.chip.is-on', dates)?.focus(); });
}

/* ================= Motion ================= */
function initMotion(ready, getHero) {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  const loader = $('.loader');
  const intro = () => {
    getHero()?.intro();
    if (!gsap || reduce) return;
    gsap.from('.hero__title .line > span', { yPercent: 110, duration: 1.5, stagger: 0.1, ease: 'expo.out' });
    gsap.from(['.hero__copy .eyebrow', '.hero__lede', '.hero__actions', '.hero__meta', '.hero__cue'], { y: 24, opacity: 0, duration: 1.3, stagger: 0.07, delay: 0.25, ease: 'expo.out' });
    gsap.from('.nav', { y: -20, opacity: 0, duration: 1.1, delay: 0.3, ease: 'expo.out', clearProps: 'transform,opacity' });
  };
  if (!gsap || !ST || reduce) { loader?.remove(); initFill(); initParallax(); ready.then(() => getHero()?.intro()); return; }
  Promise.race([ready, new Promise(r => setTimeout(r, 4000))]).then(() => {
    gsap.timeline()
      .to('.loader__mark', { scale: 0.6, opacity: 0, duration: 0.6, ease: 'power2.in' })
      .to('.loader__word', { y: -20, opacity: 0, duration: 0.5, ease: 'power2.in' }, '<')
      .to(loader, { clipPath: 'circle(0% at 50% 50%)', duration: 1.1, ease: 'expo.inOut' }, '-=.15')
      .add(intro, '-=.6')
      .set(loader, { display: 'none' });
  });

  // hero: pinned while the shell opens and the camera dives toward the pearl
  const len = () => innerHeight * (isPhone() ? 1.1 : 1.6);
  ST.create({ trigger: '.hero', start: 'top top', end: () => '+=' + len(), pin: '.hero__stage', scrub: true, onUpdate: s => getHero()?.setScroll(s.progress) });
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: () => '+=' + len(), scrub: 0.5 } })
    .to('.hero__copy', { y: () => -innerHeight * 0.18, opacity: 0, ease: 'power1.in', duration: 0.4 }, 0)
    .to(['.hero__meta', '.hero__cue'], { opacity: 0, duration: 0.15 }, 0)
    .fromTo('.hero__land', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.25 }, 0.5)
    .to('.hero__land', { opacity: 0, duration: 0.15 }, 0.85)
    .to('.hero__gl', { opacity: 0, duration: 0.2 }, 0.8);

  // story: the four steps slide sideways (desktop); stacked on phones
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    const track = $('.journey__track'), steps = $$('.step'), nEl = $('.journey__n');
    const dist = () => track.scrollWidth - innerWidth + parseFloat(getComputedStyle(track).paddingLeft);
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.journey', start: 'top top', end: () => '+=' + dist(), pin: '.journey__stage', scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: s => { nEl.textContent = '0' + Math.min(steps.length, 1 + Math.floor(s.progress * steps.length * 0.999)); } },
    });
  });
  initFill();
  initParallax();
  // room photo zooms out of the dark
  gsap.fromTo('.room__media', { clipPath: 'inset(12% 8% 12% 8%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: '.room', start: 'top 90%', end: 'top 20%', scrub: true } });
  ST.refresh();
}

/* ================= Boot ================= */
initLang('madreperla');
initMenu();
initQuotes();
initReserve();
initHours(HOURS);
initLightbox();
initReveals();
initScroll();

let hero = null;
const ready = (async () => {
  if (!hasGL) return;
  try {
    const { initPearl } = await import('./pearl.js');
    hero = initPearl($('.hero__gl'), { reduce });
    document.documentElement.classList.add('has-gl');
  } catch (e) { console.warn('3D hero unavailable', e); }
})();
initMotion(ready, () => hero);
