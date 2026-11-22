/* Tandem: loader, smooth scroll, parallax, sideways funding, give form. */
(function () {
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = window.gsap && window.ScrollTrigger;

  // on the home page, "/#x" links are plain anchors
  const home = !!$('.hero');
  if (home) $$('a[href^="/#"]').forEach(a => a.setAttribute('href', a.getAttribute('href').slice(1)));

  if (!hasGsap || reduce) {
    html.classList.remove('t-intro');
    initGive(); initMenu(null); initHead(null);
    return;
  }
  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  // ---------- smooth scroll ----------
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const headH = () => ($('#siteHead') ? $('#siteHead').offsetHeight : 0);
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = $(id);
    if (!t) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : t, { offset: id === '#funding' || id === '#belief' ? 0 : -headH() + 1, duration: 1.4 });
    else t.scrollIntoView({ behavior: 'smooth' });
  }));

  // ---------- loader: bar only moves forward, then the two halves part ----------
  const heroImg = $('.hero .wp-block-cover__image-background');
  const lines = $$('.hl > span');
  function intro() {
    const tl = gsap.timeline();
    if (heroImg) tl.fromTo(heroImg, { scale: 1.14 }, { scale: 1, duration: 2.2, ease: 'power3.out' }, 0);
    if (lines.length) tl.fromTo(lines, { y: 0, yPercent: 108 }, { y: 0, yPercent: 0, duration: 1.25, ease: 'power4.out', stagger: 0.12 }, 0.1);
    tl.from(['.hero-kicker', '.hero-foot'], { y: 26, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1 }, 0.45);
    tl.from('#siteHead', { y: -20, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.5);
  }
  const loader = $('.loader');
  if (loader && html.classList.contains('t-intro') && home) {
    if (lenis) lenis.stop();
    const bar = $('.loader-bar');
    let shown = 0;
    const p = { v: 0 };
    const draw = () => { shown = Math.max(shown, p.v); bar.style.transform = 'scaleX(' + shown + ')'; };
    const toEighty = gsap.to(p, { v: 0.82, duration: 1.3, ease: 'power2.out', onUpdate: draw });
    const ready = [];
    if (document.fonts && document.fonts.ready) ready.push(document.fonts.ready);
    if (heroImg && !heroImg.complete) ready.push(new Promise(r => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); }));
    const minTime = new Promise(r => setTimeout(r, 900));
    const cap = new Promise(r => setTimeout(r, 4200));
    Promise.race([Promise.all(ready.concat(minTime)), cap]).then(() => {
      toEighty.kill();
      gsap.to(p, {
        v: 1, duration: 0.45, ease: 'power1.inOut', onUpdate: draw, onComplete: () => {
          html.classList.add('t-parting');
          gsap.set(lines, { y: 0, yPercent: 108 });
          html.classList.remove('t-intro');
          const tl = gsap.timeline({ onComplete: () => { loader.remove(); html.classList.remove('t-parting'); if (lenis) lenis.start(); window.ScrollTrigger.refresh(); } });
          tl.to('.loader-mid', { opacity: 0, duration: 0.3, ease: 'power1.out' }, 0)
            .to('.loader-l', { xPercent: -101, duration: 1.1, ease: 'expo.inOut' }, 0.15)
            .to('.loader-r', { xPercent: 101, duration: 1.1, ease: 'expo.inOut' }, 0.15)
            .add(intro, 0.55);
        }
      });
    });
  } else {
    html.classList.remove('t-intro');
    if (loader) loader.remove();
    if (home) intro();
  }

  // ---------- hero on scroll: photo sinks, the two lines ride apart ----------
  if (heroImg) {
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to(heroImg, { yPercent: 12, scale: 1.25, ease: 'none' }, 0)
      .to('.hl-1', { xPercent: -16, ease: 'none' }, 0)
      .to('.hl-2', { xPercent: 12, ease: 'none' }, 0)
      .to('.hero-foot', { opacity: 0, y: -50, ease: 'none' }, 0);
  }

  // ---------- belief ----------
  const bImg = $('.belief-frame img');
  if (bImg) {
    gsap.fromTo('.belief-frame', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.4, ease: 'power3.inOut', scrollTrigger: { trigger: '.belief', start: 'top 75%' } });
    gsap.fromTo(bImg, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.belief', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from(['.belief-big', '.belief-small'], { y: 50, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: 0.18, scrollTrigger: { trigger: '.belief-text', start: 'top 70%' } });
  }

  // ---------- own ----------
  if ($('.own')) {
    gsap.from('.own-title', { xPercent: -8, opacity: 0, duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: '.own', start: 'top 78%' } });
    $$('.own-col').forEach((c, i) => {
      const pic = $('.own-pic', c), img = $('img', c);
      gsap.fromTo(pic, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'power3.inOut', delay: i * 0.08, scrollTrigger: { trigger: c, start: 'top 85%' } });
      gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: 'power3.out', delay: i * 0.08, scrollTrigger: { trigger: c, start: 'top 85%' } });
      gsap.from([$('h3', c), $('p', c)], { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.3 + i * 0.08, scrollTrigger: { trigger: c, start: 'top 85%' } });
    });
    gsap.matchMedia().add('(min-width: 901px)', () => {
      gsap.to('.own-col-2', { y: -110, ease: 'none', scrollTrigger: { trigger: '.own-cols', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.to('.own-col-3', { y: -45, ease: 'none', scrollTrigger: { trigger: '.own-cols', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  // ---------- ledger ----------
  if ($('.ledger')) {
    gsap.from('.ledger-title', { y: 60, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.ledger', start: 'top 78%' } });
    gsap.from('.ledger-note', { y: 30, opacity: 0, duration: 1, delay: 0.15, ease: 'power3.out', scrollTrigger: { trigger: '.ledger', start: 'top 78%' } });
    gsap.from('.lrow', { x: -60, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: '.ledger-table', start: 'top 82%' } });
  }

  // ---------- funding: sideways on wide screens ----------
  const track = $('.fund-track');
  if (track) {
    gsap.matchMedia().add('(min-width: 901px)', () => {
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.funding', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 } });
    });
    gsap.matchMedia().add('(max-width: 900px)', () => {
      $$('.fund-panel').forEach(p => gsap.from(p.children, { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06, scrollTrigger: { trigger: p, start: 'top 82%' } }));
    });
  }

  // ---------- voice ----------
  const vImg = $('.voice-frame img');
  if (vImg) {
    gsap.fromTo(vImg, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.voice', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.voice-frame', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.4, ease: 'power3.inOut', scrollTrigger: { trigger: '.voice', start: 'top 72%' } });
    gsap.from(['.voice-quote p', '.voice-quote footer'], { y: 40, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: 0.2, scrollTrigger: { trigger: '.voice-quote', start: 'top 78%' } });
  }

  // ---------- give ----------
  if ($('.give')) {
    gsap.from('.give-title', { y: 60, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.give', start: 'top 75%' } });
    gsap.from('.give-form > *', { y: 30, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.give-form', start: 'top 85%' } });
    gsap.fromTo('.give-photo img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.give-photo', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  // ---------- v2: big section titles rise out of a mask ----------
  $$('.own-title, .ledger-title, .give-title, .fund-intro h2').forEach(t => {
    gsap.fromTo(t, { clipPath: 'inset(0 0 100% 0)', y: 60 }, { clipPath: 'inset(0 0 -10% 0)', y: 0, duration: 1.3, ease: 'power4.out', scrollTrigger: { trigger: t, start: 'top 88%' } });
  });
  // ---------- v2: wide photo opens up as you scroll ----------
  if ($('.wide')) {
    gsap.fromTo('.wide-frame', { clipPath: 'inset(14% 16% 14% 16%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: '.wide', start: 'top bottom', end: 'top 15%', scrub: true } });
    gsap.fromTo('.wide-frame img', { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.wide', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.wl > span', { yPercent: 110, duration: 1.2, ease: 'power4.out', stagger: 0.1, scrollTrigger: { trigger: '.wide-copy', start: 'top 85%' } });
    gsap.timeline({ scrollTrigger: { trigger: '.wide', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.wl:nth-child(1)', { xPercent: -10, ease: 'none' }, 0)
      .to('.wl-2', { xPercent: 8, ease: 'none' }, 0);
    gsap.from('.wide-cap', { opacity: 0, y: 20, duration: 1, delay: 0.4, ease: 'power3.out', scrollTrigger: { trigger: '.wide-copy', start: 'top 85%' } });
  }

  // ---------- v2: charts draw in ----------
  if ($('.charts')) {
    const st = (t, s) => ({ trigger: t, start: s || 'top 80%' });
    gsap.from('.charts-total', { yPercent: 60, opacity: 0, duration: 1.2, ease: 'power4.out', scrollTrigger: st('.charts') });
    const segs = $$('.donut-seg');
    segs.forEach((s, i) => {
      const len = parseFloat(s.getAttribute('stroke-dasharray'));
      gsap.fromTo(s, { strokeDasharray: '0 100' }, { strokeDasharray: len + ' ' + (100 - len), duration: 0.9, delay: i * 0.55, ease: 'power2.inOut', scrollTrigger: st('.chart-donut') });
    });
    gsap.from('.donut-mid', { scale: 0.6, opacity: 0, duration: 1, delay: 0.5, ease: 'back.out(1.6)', scrollTrigger: st('.chart-donut') });
    gsap.from('.chart-donut .chart-key li', { x: -30, opacity: 0, duration: 0.7, stagger: 0.12, delay: 0.6, ease: 'power3.out', scrollTrigger: st('.chart-donut') });
    $$('.chart-bars .bar').forEach((b, i) => {
      gsap.from(b, { scaleY: 0, transformOrigin: '50% 100%', duration: 1.1, delay: i * 0.15, ease: 'power4.out', scrollTrigger: st('.chart-bars') });
    });
    gsap.from('.chart-bars .bar-val', { y: 20, opacity: 0, duration: 0.8, stagger: 0.15, delay: 0.5, ease: 'power3.out', scrollTrigger: st('.chart-bars') });
    gsap.fromTo('.line-path', { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', scrollTrigger: st('.chart-line') });
    gsap.from('.line-area', { opacity: 0, duration: 1.2, delay: 1, scrollTrigger: st('.chart-line') });
    gsap.from('.line-dot', { scale: 0, transformOrigin: 'center', transformBox: 'fill-box', duration: 0.4, stagger: 0.2, delay: 0.2, ease: 'back.out(2)', scrollTrigger: st('.chart-line') });
    gsap.from('.line-big', { y: 30, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: st('.chart-line') });
  }

  // ---------- v2: where your money goes ----------
  if ($('.split')) {
    gsap.from('.split-bar .sp', { scaleX: 0, transformOrigin: '0 50%', transformBox: 'fill-box', duration: 1, stagger: 0.2, ease: 'power4.out', scrollTrigger: { trigger: '.split', start: 'top 85%' } });
    gsap.from('.split-key li', { y: 20, opacity: 0, duration: 0.8, stagger: 0.12, delay: 0.3, ease: 'power3.out', scrollTrigger: { trigger: '.split', start: 'top 85%' } });
  }

  initGive(); initMenu(lenis); initHead(lenis);
  window.addEventListener('load', () => window.ScrollTrigger.refresh());

  // ---------- helpers ----------
  function closeMenu() {
    const m = $('#menu'), b = $('.menu-btn');
    if (!m || m.hidden) return;
    m.hidden = true; html.classList.remove('menu-open'); b.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
  }
  function initMenu(ln) {
    const m = $('#menu'), b = $('.menu-btn');
    if (!m || !b) return;
    b.addEventListener('click', () => {
      const open = m.hidden;
      m.hidden = !open; html.classList.toggle('menu-open', open); b.setAttribute('aria-expanded', String(open));
      $('.menu-label', b).textContent = open ? 'Close' : 'Menu';
      if (ln) open ? ln.stop() : ln.start();
      if (open && window.gsap && !reduce) window.gsap.from('#menu nav a', { yPercent: 60, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05 });
    });
    $$('#menu a').forEach(a => a.addEventListener('click', () => { m.hidden = true; html.classList.remove('menu-open'); b.setAttribute('aria-expanded', 'false'); $('.menu-label', b).textContent = 'Menu'; if (ln) ln.start(); }));
  }
  function initHead(ln) {
    const h = $('#siteHead');
    if (!h) return;
    let last = 0;
    const solidAt = () => (home ? Math.max(80, ($('.hero') ? $('.hero').offsetHeight : 600) - 90) : -1);
    const on = y => {
      h.classList.toggle('is-solid', y > solidAt());
      if (!html.classList.contains('menu-open')) h.classList.toggle('is-hidden', y > 500 && y > last + 2);
      if (y < last - 2) h.classList.remove('is-hidden');
      last = y;
    };
    if (ln) ln.on('scroll', e => on(e.scroll)); else window.addEventListener('scroll', () => on(window.scrollY), { passive: true });
    on(window.scrollY);
  }
  function initGive() {
    const f = $('#giveForm');
    if (!f) return;
    const what = { '$50': '$50 covers a member’s first Co-op Academy class.', '$100': '$100 pays for a day of expert help for a new co-op.', '$250': '$250 helps tenants have a lawyer review a building purchase.', '$500': '$500 funds a feasibility study for a worker buyout.' };
    const btn = $('#giveBtn span'), w = $('#giveWhat');
    const upd = () => {
      const a = (f.querySelector('input[name=amt]:checked') || {}).value || '$100';
      const fr = (f.querySelector('input[name=freq]:checked') || {}).value || 'Once';
      btn.textContent = 'Give ' + a + (fr === 'Monthly' ? ' monthly' : '');
      w.textContent = what[a];
      const n = parseInt(a.replace(/\D/g, ''), 10) || 100;
      $$('[data-split-amt]').forEach(e => { e.textContent = a; });
      $$('[data-share]').forEach(e => { e.textContent = '$' + Math.round(n * e.dataset.share / 100); });
    };
    f.addEventListener('change', upd);
    f.addEventListener('submit', e => { e.preventDefault(); btn.textContent = 'Thank you.'; });
    upd();
  }
})();
