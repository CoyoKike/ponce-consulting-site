/* Language, smooth scroll, motion, open-now, booking and gallery.
   Site settings come from <body data-key data-title-en data-title-es data-week>. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const cfg = document.body.dataset;
  const KEY = cfg.key || 'site-lang';
  let lang = 'en';

  /* ---------- language: English is in the markup, Spanish in data-es ---------- */
  const store = {
    get: () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set: v => { try { localStorage.setItem(KEY, v); } catch (e) {} }
  };
  const L = (en, es) => (lang === 'es' ? es : en);
  function setLang(next) {
    lang = next;
    root.lang = next;
    $$('[data-es]').forEach(el => {
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
      el.innerHTML = next === 'es' ? el.dataset.es : el.dataset.en;
    });
    $$('[data-es-alt]').forEach(el => {
      if (el.dataset.enAlt === undefined) el.dataset.enAlt = el.alt;
      el.alt = next === 'es' ? el.dataset.esAlt : el.dataset.enAlt;
    });
    $$('[data-es-aria]').forEach(el => {
      if (el.dataset.enAria === undefined) el.dataset.enAria = el.getAttribute('aria-label');
      el.setAttribute('aria-label', next === 'es' ? el.dataset.esAria : el.dataset.enAria);
    });
    $$('[data-es-ph]').forEach(el => {
      if (el.dataset.enPh === undefined) el.dataset.enPh = el.placeholder;
      el.placeholder = next === 'es' ? el.dataset.esPh : el.dataset.enPh;
    });
    $$('.lang').forEach(b => {
      b.querySelector('.lang__on').textContent = next.toUpperCase();
      b.querySelector('.lang__off').textContent = next === 'es' ? 'EN' : 'ES';
      b.setAttribute('aria-label', next === 'es' ? 'Switch to English' : 'Cambiar a español');
    });
    if (cfg.titleEs) document.title = next === 'es' ? cfg.titleEs : cfg.titleEn;
    store.set(next);
    hours();
    if (hasGsap) ScrollTrigger.refresh();
  }
  $$('.lang').forEach(b => b.addEventListener('click', () => setLang(lang === 'en' ? 'es' : 'en')));

  /* ---------- open now, in Florida time ---------- */
  // day: [open, close] in hours, null = closed. 0 = Sunday
  const WEEK = JSON.parse(cfg.week || '{}');
  function tampaNow() {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const get = t => p.find(x => x.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, h: (+get('hour') % 24) + (+get('minute')) / 60 };
  }
  function fmt(h) { const ap = h >= 12 ? 'PM' : 'AM'; const x = h % 12 || 12; return `${x} ${ap}`; }
  function hours() {
    const { day, h } = tampaNow();
    const t = WEEK[day];
    const open = !!t && h >= t[0] && h < t[1];
    $$('.week li').forEach(li => li.classList.toggle('is-today', +li.dataset.day === day));
    let msg;
    if (open) msg = L(`Open now · until ${fmt(t[1])}`, `Abierto ahora · hasta las ${fmt(t[1])}`);
    else {
      let d = day, first = true;
      for (let i = 0; i < 8; i++) {
        const tt = WEEK[d];
        if (tt && (!first || h < tt[0])) {
          const names = lang === 'es' ? ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const when = i === 0 ? L('today', 'hoy') : i === 1 ? L('tomorrow', 'mañana') : names[d];
          msg = L(`Closed · opens ${when} at ${fmt(tt[0])}`, `Cerrado · abre ${when} a las ${fmt(tt[0])}`);
          break;
        }
        d = (d + 1) % 7; first = false;
      }
    }
    $$('.status').forEach(s => { s.classList.toggle('is-open', open); s.querySelector('.status__t').textContent = msg; });
  }
  setInterval(hours, 60000);

  /* ---------- nav ---------- */
  const nav = $('.nav');
  const burger = $('.nav__burger');
  const menu = $('#menu');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    menu.toggleAttribute('inert', !open);
    menu.setAttribute('aria-hidden', String(!open));
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); burger.focus(); } });

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = $(id);
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { offset: id === '#top' ? 0 : -70, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    if (id === '#book') setTimeout(() => $('#b-name')?.focus({ preventScroll: true }), reduce ? 0 : 1300);
  }));
  const onScroll = y => nav.classList.toggle('is-scrolled', y > 40);
  if (lenis) lenis.on('scroll', e => onScroll(e.scroll)); else addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  onScroll(scrollY);

  /* ---------- motion ---------- */
  if (hasGsap && !reduce) {
    gsap.registerPlugin(ScrollTrigger);
    root.classList.add('motion');
    // hero entrance
    const tl = gsap.timeline({ delay: 0.15 });
    tl.from($$('.hero__kicker'), { y: 18, opacity: 0, duration: 0.8, ease: 'power3.out' })
      .from($$('.hero__title .ln > span'), { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.09 }, '-=0.5')
      .from($$('.hero__lede, .hero__actions, .hero__meta, .hero__status'), { y: 22, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, '-=0.6');
    if ($('.hero__arch')) tl.from('.hero__arch', { clipPath: 'inset(100% 0 0 0 round 999px 999px 0 0)', duration: 1.6, ease: 'power4.inOut' }, 0);
    // generic reveals
    $$('[data-reveal]').forEach(el => {
      gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    $$('[data-stagger]').forEach(g => {
      gsap.from(g.children, { y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: g, start: 'top 85%' } });
    });
    // headline lines rise
    $$('.h2 .ln > span').forEach(s => {
      gsap.from(s, { yPercent: 105, duration: 1.1, ease: 'power4.out', scrollTrigger: { trigger: s.closest('.h2'), start: 'top 86%' } });
    });
    // image parallax
    $$('[data-parallax] img').forEach(img => {
      gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.closest('[data-parallax]'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // ticker drifts with scroll
    $$('.ticker__row').forEach((r, i) => {
      gsap.to(r, { xPercent: i % 2 ? 12 : -12, ease: 'none', scrollTrigger: { trigger: r, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // gallery: horizontal ride on wide screens
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const track = $('.ride__track');
      if (!track) return;
      const dist = () => track.scrollWidth - innerWidth + parseFloat(getComputedStyle(track).paddingLeft);
      gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: '.ride', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 }
      });
    });
    // service list photo follows the hovered group
    addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- services: image swaps with the hovered / visible group ---------- */
  const svcImgs = $$('.menu__photo img');
  $$('.svc').forEach((g, i) => {
    const on = () => svcImgs.forEach((im, j) => im.classList.toggle('is-on', j === i));
    g.addEventListener('mouseenter', on);
    g.addEventListener('focusin', on);
    if (hasGsap && !reduce) ScrollTrigger.create({ trigger: g, start: 'top 60%', end: 'bottom 60%', onToggle: s => s.isActive && on() });
  });

  /* ---------- the shave: the pinned photo follows the step in view ---------- */
  const simgs = $$('.simg'), cur = $('.shave__cur');
  $$('.step').forEach((s, i) => {
    const on = () => { simgs.forEach((im, j) => im.classList.toggle('is-on', j === i)); if (cur) cur.textContent = String(i + 1).padStart(2, '0'); };
    if (hasGsap && !reduce) ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: st => st.isActive && on() });
    else new IntersectionObserver(es => es.forEach(e => e.isIntersecting && on()), { rootMargin: '-45% 0px -45% 0px' }).observe(s);
  });

  /* ---------- tabs (arrow keys move between them) ---------- */
  const tabs = $$('[role="tab"]');
  const pick = tab => {
    tabs.forEach(t => { const on = t === tab; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; const p = $('#' + t.getAttribute('aria-controls')); if (p) { p.hidden = !on; p.classList.toggle('is-on', on); } });
    if (hasGsap && !reduce) { const p = $('#' + tab.getAttribute('aria-controls')); gsap.from(p.querySelectorAll('li, .panel__img'), { y: 18, opacity: 0, duration: 0.6, stagger: 0.04, ease: 'power3.out' }); ScrollTrigger.refresh(); }
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => pick(t));
    t.addEventListener('keydown', e => {
      const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!k) return; e.preventDefault(); const n = tabs[(i + k + tabs.length) % tabs.length]; n.focus(); pick(n);
    });
  });

  /* ---------- reviews carousel ---------- */
  const revs = $$('.rev__item');
  if (revs.length) {
    let ri = 0, timer;
    const show = n => {
      ri = (n + revs.length) % revs.length;
      revs.forEach((r, j) => r.classList.toggle('is-on', j === ri));
      const c = $('.rev__i'); if (c) c.textContent = ri + 1;
    };
    $$('.rev__btn').forEach(b => b.addEventListener('click', () => { show(ri + +b.dataset.dir); clearInterval(timer); }));
    if (!reduce) timer = setInterval(() => show(ri + 1), 7000);
  }

  /* ---------- "book with ..." links preselect the person ---------- */
  $$('[data-stylist]').forEach(a => a.addEventListener('click', () => {
    const r = $(`input[name="stylist"][value="${a.dataset.stylist}"]`); if (r) r.checked = true;
    const s = $('#b-staff'); if (s) s.value = a.dataset.stylist;
  }));

  /* ---------- gallery lightbox ---------- */
  const dlg = $('.lightbox');
  if (dlg && dlg.showModal) {
    const big = $('.lightbox img', dlg), cap = $('.lightbox figcaption', dlg);
    $$('.shot').forEach(b => b.addEventListener('click', () => {
      const im = $('img', b);
      big.src = b.dataset.full; big.alt = im.alt; cap.textContent = $('.shot__cap', b)?.textContent || '';
      dlg.showModal(); if (lenis) lenis.stop();
    }));
    dlg.addEventListener('close', () => { if (lenis) lenis.start(); });
    dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('.lightbox__x')) dlg.close(); });
  }

  /* ---------- booking ---------- */
  const form = $('#book-form');
  if (form) {
    const date = $('#b-date');
    const d = new Date(); const iso = x => new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    date.min = iso(d);
    const next = new Date(d); next.setDate(d.getDate() + 1); while (!WEEK[next.getDay()]) next.setDate(next.getDate() + 1);
    date.value = iso(next);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const bad = $$('[required]', form).filter(f => !f.value.trim());
      $$('.field', form).forEach(f => f.classList.remove('is-bad'));
      if (bad.length) { bad.forEach(f => f.closest('.field').classList.add('is-bad')); bad[0].focus(); return; }
      const dt = new Date($('#b-date').value + 'T12:00');
      if (!WEEK[dt.getDay()]) { $('#b-date').closest('.field').classList.add('is-bad'); $('.form__msg').textContent = L('We are closed that day. Please pick another.', 'Ese día cerramos. Por favor escoge otro.'); $('#b-date').focus(); return; }
      const name = $('#b-name').value.trim().split(' ')[0];
      const svc = $('#b-service').selectedOptions[0].textContent.split(' · ')[0];
      const when = dt.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const time = $('#b-time').selectedOptions[0].textContent;
      const ok = $('.form__done');
      ok.querySelector('.form__done-h').textContent = L(`You're in, ${name}.`, `Listo, ${name}.`);
      ok.querySelector('.form__done-p').textContent = L(`${svc}, ${when} at ${time}. We'll text you a confirmation within the hour.`, `${svc}, el ${when} a las ${time}. Te mandamos un texto de confirmación en menos de una hora.`);
      form.classList.add('is-done');
      $('.form__msg').textContent = '';
      ok.focus();
    });
    $('.form__again')?.addEventListener('click', () => { form.reset(); form.classList.remove('is-done'); date.value = iso(next); $('#b-name').focus(); });
  }

  /* ---------- year ---------- */
  $$('.year').forEach(y => (y.textContent = new Date().getFullYear()));

  if (store.get() === 'es') setLang('es'); else hours();
})();
