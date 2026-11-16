// Shared site core: language toggle (EN/ES, remembered), smooth scroll, reveals, nav, lightbox, open-now hours.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isPhone = () => matchMedia('(max-width: 760px)').matches;

/* ================= Language ================= */
const ATTRS = ['alt', 'aria-label', 'placeholder', 'title', 'content'];
let lang = 'en', KEY = 'site-lang';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
export const getLang = () => lang;
export const L = (en, es) => (lang === 'es' ? es : en);

function apply() {
  document.documentElement.lang = lang;
  $$('[data-es]').forEach(el => {
    if (el._en === undefined) el._en = el.innerHTML;
    el.innerHTML = lang === 'es' ? el.dataset.es : el._en;
  });
  ATTRS.forEach(a => {
    const k = 'data-es-' + a;
    $$('[' + k + ']').forEach(el => {
      const store = '_en_' + a;
      if (el[store] === undefined) el[store] = el.getAttribute(a) ?? '';
      el.setAttribute(a, lang === 'es' ? el.getAttribute(k) : el[store]);
    });
  });
  const t = document.querySelector('title');
  if (t?.dataset.esTitle) { if (t._en === undefined) t._en = t.textContent; t.textContent = lang === 'es' ? t.dataset.esTitle : t._en; }
  $$('.lang').forEach(b => {
    b.setAttribute('aria-label', lang === 'es' ? 'Switch to English' : 'Cambiar a español');
    $$('[data-l]', b).forEach(s => s.classList.toggle('is-on', s.dataset.l === lang));
  });
  document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}
export function initLang(site) {
  KEY = site + '-lang';
  const saved = store.get(KEY);
  lang = saved === 'es' || saved === 'en' ? saved : 'en';
  apply();
  $$('.lang').forEach(b => b.addEventListener('click', () => {
    lang = lang === 'en' ? 'es' : 'en';
    store.set(KEY, lang);
    apply();
    window.ScrollTrigger?.refresh();
  }));
}

/* ================= Smooth scroll + nav ================= */
export function initScroll() {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (gsap && ST) gsap.registerPlugin(ST);
  let lenis = null;
  if (!reduce && window.Lenis && gsap && ST) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 && id !== '#') return;
    const target = id === '#' || id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { duration: 1.4, offset: target === 0 ? 0 : -8 });
    else if (target === 0) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    if (target !== 0) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  }));
  const nav = $('.nav');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY;
    nav?.classList.toggle('is-scrolled', y > 30);
    nav?.classList.toggle('is-hidden', y > 600 && y > lastY + 4 && !document.body.classList.contains('menu-open'));
    if (y < lastY - 4 || y < 600) nav?.classList.remove('is-hidden');
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  // phone menu
  const burger = $('.nav__burger');
  burger?.addEventListener('click', () => {
    const open = !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    open ? lenis?.stop() : lenis?.start();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  function closeMenu() {
    if (!document.body.classList.contains('menu-open')) return;
    document.body.classList.remove('menu-open'); burger?.setAttribute('aria-expanded', 'false'); lenis?.start();
  }
  return lenis;
}

/* ================= Reveals (IntersectionObserver + CSS, works with or without GSAP) ================= */
export function initReveals() {
  const els = $$('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver(ents => ents.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
  els.forEach(e => io.observe(e));
}

/* ================= Parallax on [data-speed] ================= */
export function initParallax() {
  const gsap = window.gsap;
  if (reduce || !gsap) return;
  $$('[data-speed]').forEach(el => {
    const k = parseFloat(el.dataset.speed);
    gsap.fromTo(el, { yPercent: -k * 50 }, { yPercent: k * 50, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* ================= Text that fills in as you scroll ([data-fill]) ================= */
export function initFill() {
  const gsap = window.gsap;
  $$('[data-fill]').forEach(el => {
    if (reduce || !gsap) { el.style.setProperty('--fill', '100%'); return; }
    gsap.fromTo(el, { '--fill': '0%' }, { '--fill': '100%', ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } });
  });
}

/* ================= Lightbox for [data-full] buttons ================= */
export function initLightbox() {
  const box = $('.lightbox'); if (!box) return;
  const img = $('img', box), cap = $('.lightbox__cap', box), close = $('.lightbox__close', box);
  const prev = $('.lightbox__prev', box), next = $('.lightbox__next', box);
  const items = $$('[data-full]');
  let i = 0, last = null;
  const show = n => {
    i = (n + items.length) % items.length;
    const it = items[i], im = $('img', it);
    img.src = it.dataset.full; img.alt = im.alt;
    cap.textContent = $('.cap', it)?.textContent || '';
  };
  const open = n => { last = document.activeElement; show(n); box.hidden = false; document.body.classList.add('lb-open'); window.__lenis?.stop(); close.focus(); };
  const shut = () => { box.hidden = true; document.body.classList.remove('lb-open'); window.__lenis?.start(); last?.focus(); };
  items.forEach((it, n) => it.addEventListener('click', () => open(n)));
  close.addEventListener('click', shut);
  prev?.addEventListener('click', () => show(i - 1));
  next?.addEventListener('click', () => show(i + 1));
  box.addEventListener('click', e => { if (e.target === box) shut(); });
  addEventListener('keydown', e => {
    if (box.hidden) return;
    if (e.key === 'Escape') shut();
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
    if (e.key === 'Tab') { // keep focus inside
      const f = $$('button', box); const a = f.indexOf(document.activeElement);
      e.preventDefault(); f[(a + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
}

/* ================= Open now (Florida time) ================= */
// hours: { weekday(0=Sun): [open, close] in decimal hours, or null }
export function flNow() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), h: +get('hour') + +get('minute') / 60 };
}
export const fmtH = h => {
  const hh = Math.floor(h) % 24, m = Math.round((h % 1) * 60), v = hh % 12 || 12;
  return lang === 'es' ? `${hh}:${String(m).padStart(2, '0')}` : `${v}${m ? ':' + String(m).padStart(2, '0') : ''} ${hh >= 12 ? 'PM' : 'AM'}`;
};
const DAYS = { en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] };
export function initHours(HOURS) {
  const state = $('.hours__state'), box = $('.hours__now');
  if (!state) return;
  const tick = () => {
    const { day, h } = flNow();
    $$('[data-days]').forEach(tr => tr.classList.toggle('is-today', tr.dataset.days.split(',').includes(String(day))));
    const t = HOURS[day];
    let txt, open = false;
    if (t && h >= t[0] && h < t[1]) { open = true; txt = L(`Open now · until ${fmtH(t[1])}`, `Abierto ahora · hasta las ${fmtH(t[1])}`); }
    else if (t && h < t[0]) txt = L(`Opens today at ${fmtH(t[0])}`, `Abre hoy a las ${fmtH(t[0])}`);
    else {
      let d = (day + 1) % 7, n = 1;
      while (!HOURS[d] && n < 8) { d = (d + 1) % 7; n++; }
      const name = n === 1 ? L('tomorrow', 'mañana') : DAYS[lang][d];
      txt = L(`Closed now · opens ${name} at ${fmtH(HOURS[d][0])}`, `Cerrado ahora · abre ${name} a las ${fmtH(HOURS[d][0])}`);
    }
    state.textContent = txt; box.classList.toggle('is-open', open);
  };
  tick(); setInterval(tick, 60000);
  document.addEventListener('langchange', tick);
}

/* ================= WebGL check ================= */
export const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
