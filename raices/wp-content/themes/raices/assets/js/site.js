/* Raíces — motion + interaction (WordPress theme) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => n.toLocaleString('en-US');

  /* ---------- homes & waitlists: filter the listing cards ---------- */
  const list = $('#hofList'), q = $('#hofQ'), secWrap = $('#hofS'), cnt = $('#hofCount');
  if (list) {
    const cards = $$('.lst', list); let sector = '';
    const render = () => {
      const t = q.value.trim().toLowerCase(); let n = 0;
      cards.forEach(c => { const ok = (!sector || c.dataset.status === sector) && c.textContent.toLowerCase().includes(t); c.hidden = !ok; if (ok) n++; });
      cnt.textContent = `${n} of ${cards.length} buildings`;
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    ['All', 'Open', 'Coming soon', 'Closed'].forEach((s, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = s; b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', () => { $$('button', secWrap).forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); sector = s === 'All' ? '' : s; render(); });
      secWrap.appendChild(b);
    });
    q.addEventListener('input', render); render();
  }

  /* ---------- give form ---------- */
  const amts = $$('.amounts button'), freqs = $$('.freq button'), gb = $('#giveBtn span');
  const sel = (group, b) => { group.forEach(x => x.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); upd(); };
  const upd = () => { const a = amts.find(x => x.getAttribute('aria-checked') === 'true').textContent; const f = freqs.find(x => x.getAttribute('aria-checked') === 'true').textContent; gb.textContent = `Give ${a}${f === 'Monthly' ? ' monthly' : ''}`; };
  amts.forEach(b => b.addEventListener('click', () => sel(amts, b)));
  freqs.forEach(b => b.addEventListener('click', () => sel(freqs, b)));
  $('#giveForm') && $('#giveForm').addEventListener('submit', e => { e.preventDefault(); gb.textContent = 'Thank you (preview)'; });

  /* ---------- path list: photo follows the cursor ---------- */
  const peek = $('#pathPeek'), pimg = peek && $('img', peek);
  if (peek && matchMedia('(hover: hover)').matches && window.gsap) {
    const px = gsap.quickTo(peek, 'x', { duration: .6, ease: 'power3' }), py = gsap.quickTo(peek, 'y', { duration: .6, ease: 'power3' });
    $('#pathList').addEventListener('mousemove', e => { px(e.clientX); py(e.clientY); });
    $$('#pathList a').forEach(a => {
      a.addEventListener('mouseenter', () => { pimg.src = a.dataset.img; gsap.to(peek, { autoAlpha: 1, scale: 1, rotate: gsap.utils.random(-4, 4), duration: .5, ease: 'expo.out' }); });
      a.addEventListener('mouseleave', () => gsap.to(peek, { autoAlpha: 0, scale: .6, duration: .4, ease: 'power2.in' }));
    });
  }

  /* ---------- menu (phones) ---------- */
  const mb = $('#menuBtn'), menu = $('#menu');
  const setMenu = o => { mb.setAttribute('aria-expanded', String(o)); menu.hidden = !o; document.body.style.overflow = o ? 'hidden' : ''; if (window.__lenis) { o ? __lenis.stop() : __lenis.start(); } };
  mb.addEventListener('click', () => setMenu(mb.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); mb.focus(); } });

  /* ---------- nav gets a solid bar once you scroll ---------- */
  const navEl = $('#nav'); const onS = () => navEl.classList.toggle('scrolled', scrollY > 40); addEventListener('scroll', onS, { passive: true }); onS();

  /* ---------- program filters ---------- */
  const fbtns = $$('.filters button');
  fbtns.forEach(b => b.addEventListener('click', () => { fbtns.forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true');
    const f = b.dataset.f; $$('.car-track .card').forEach(c => { c.hidden = !(f === 'all' || c.dataset.tags.split(' ').includes(f)); });
    if (window.ScrollTrigger) ScrollTrigger.refresh(); }));


  /* ---------- programs carousel ---------- */
  (() => {
    const tr = $('#workTrack'); if (!tr) return;
    const slides = $$('.card', tr), bar = $('#carBar'), now = $('#carNow'), prev = $('#carPrev'), next = $('#carNext');
    const step = () => slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(tr).columnGap || 24);
    const upd = () => {
      const max = tr.scrollWidth - tr.clientWidth, p = max > 0 ? tr.scrollLeft / max : 0;
      const vis = Math.max(1, Math.round(tr.clientWidth / step()));
      bar.style.transform = `scaleX(${Math.min(1, vis / slides.length + p * (1 - vis / slides.length))})`;
      now.textContent = String(Math.min(slides.length, Math.round(tr.scrollLeft / step()) + 1)).padStart(2, '0');
      prev.disabled = tr.scrollLeft < 4; next.disabled = tr.scrollLeft > max - 4;
    };
    prev.addEventListener('click', () => tr.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => tr.scrollBy({ left: step(), behavior: 'smooth' }));
    tr.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
    tr.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); } if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); } });
    // drag with the mouse
    let down = false, sx = 0, sl = 0, moved = false;
    tr.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = tr.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) { moved = true; tr.classList.add('dragging'); } tr.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = false; tr.classList.remove('dragging');
      if (moved) { const i = Math.round(tr.scrollLeft / step()); tr.scrollTo({ left: i * step(), behavior: 'smooth' }); } });
    tr.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    // horizontal wheel/trackpad shouldn't be hijacked by smooth scroll
    tr.setAttribute('data-lenis-prevent-wheel', '');
  })();

  /* ---------- on the home page, "/#section" links become in-page links ---------- */
  if ($('.hero:not(.hero--page)')) $$('a[href^="/#"]').forEach(a => a.setAttribute('href', a.getAttribute('href').slice(1)));

  /* ---------- contact form (preview) ---------- */
  const cf = $('#contactForm');
  if (cf) cf.addEventListener('submit', e => { e.preventDefault(); $('#cfNote').textContent = 'Thanks. We will get back to you within one business day.'; });

  const root = document.documentElement;
  const endIntro = () => { root.classList.remove('r-intro'); const l = $('#loader'); if (l) l.remove(); };
  if (!window.gsap) { endIntro(); return; }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.2, easing: t => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update); window.__lenis = lenis;
    gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'); if (id.length < 2) return; const el = $(id); if (!el) return;
      e.preventDefault(); lenis.scrollTo(el, { duration: 1.6 });
    }));
  }

  /* ---------- statement words ---------- */
  const st = $('#statementText');
  if (st) [...st.childNodes].forEach(n => {
    if (n.nodeType === 3) { const f = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach(p => { if (!p) return; if (/^\s+$/.test(p)) f.append(p); else { const sp = document.createElement('span'); sp.className = 'w'; sp.textContent = p; f.append(sp); } }); n.replaceWith(f); }
    else { n.classList.add('w'); }
  });

  /* ---------- loader + intro ---------- */
  const loader = $('#loader') || document.createElement('div'), bar = $('#loaderBar'), num = $('#loaderNum'), heroImg = $('.hero .wp-block-cover__image-background');
  const prog = { v: 0 }; let shown = 0; const show = () => { if (!bar || !num) return; shown = Math.max(shown, prog.v); bar.style.transform = `scaleX(${shown / 100})`; num.textContent = String(Math.round(shown)).padStart(3, '0'); };
  const toEighty = gsap.to(prog, { v: 80, duration: 1.1, ease: 'power2.out', onUpdate: show });
  const ready = Promise.all([
    heroImg.complete ? Promise.resolve() : new Promise(r => { heroImg.onload = heroImg.onerror = r; }),
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(r => setTimeout(r, reduce ? 0 : 650)),
  ]);
  if (lenis) lenis.stop();
  gsap.set('.hero-title .line > span', { yPercent: 115 });
  gsap.set(['.eyebrow', '.hero-lede', '.hero-ctas', '.hero-meta', '.scroll-cue', '.nav'], { autoAlpha: 0, y: 24 });
  gsap.set(heroImg, { scale: 1.3 });
  gsap.from('.loader-mark circle', { attr: { r: 0 }, duration: 1, stagger: .15, ease: 'expo.out' });
  Promise.race([ready, new Promise(r => setTimeout(r, 6000))]).then(() => {
    toEighty.kill(); gsap.to(prog, { v: 100, duration: .35, ease: 'power1.out', onUpdate: show });
    const tl = gsap.timeline({ delay: .3, onComplete: () => { endIntro(); if (lenis) lenis.start(); } });
    tl.to('.loader-inner', { autoAlpha: 0, y: -20, duration: .5, ease: 'power2.in' })
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=.1')
      .to(heroImg, { scale: 1, duration: 2.2, ease: 'expo.out' }, '-=.9')
      .to('.hero-title .line > span', { yPercent: 0, duration: 1.4, stagger: .1, ease: 'expo.out' }, '-=2')
      .to(['.nav', '.eyebrow', '.hero-lede', '.hero-ctas', '.hero-meta', '.scroll-cue'], { autoAlpha: 1, y: 0, duration: 1, stagger: .06, ease: 'power3.out' }, '-=1.2');
    if (reduce) tl.progress(1);
  });
  gsap.set(loader, { clipPath: 'inset(0 0 0% 0)' });

  if (reduce) return;

  /* ---------- hero pushes into the image ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to(heroImg, { scale: 1.25, yPercent: 14, ease: 'none' }, 0)
    .to('.hero-copy', { yPercent: -50, autoAlpha: 0, ease: 'none' }, 0)
    .to('.hero-meta, .scroll-cue', { autoAlpha: 0, ease: 'none', duration: .4 }, 0);

  /* ---------- parallax + clip reveals ---------- */
  $$('[data-speed]').forEach(el => { const s = parseFloat(el.dataset.speed);
    gsap.fromTo(el, { yPercent: -s * 100 }, { yPercent: s * 100, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }); });
  $$('.sfig img, .hall-fig img').forEach(img => gsap.fromTo(img, { yPercent: -8, scale: 1.18 }, { yPercent: 8, scale: 1.18, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.sfig, .hall-fig').forEach(el => gsap.fromTo(el, { clipPath: 'inset(18% 12% 18% 12%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 35%', scrub: true } }));

  if (st) gsap.fromTo('#statementText .w', { opacity: .12 }, { opacity: 1, stagger: .05, ease: 'none', scrollTrigger: { trigger: '#statementText', start: 'top 80%', end: 'bottom 45%', scrub: true } });

  /* ---------- about page: timeline, team portraits ---------- */
  $$('.timeline li').forEach(li => {
    gsap.from(li, { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: li, start: 'top 88%', once: true } });
    gsap.from($('.tl-year', li), { xPercent: -14, ease: 'none', scrollTrigger: { trigger: li, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  if ($('.timeline')) gsap.fromTo('.timeline', { '--tl': 0 }, { '--tl': 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 60%', scrub: true } });
  $$('.person').forEach((p, i) => {
    const ph = $('.person-photo', p), im = $('img', p);
    gsap.fromTo(ph, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.5, delay: (i % 4) * .08, ease: 'expo.inOut', scrollTrigger: { trigger: p, start: 'top 90%', once: true } });
    gsap.fromTo(im, { yPercent: -10, scale: 1.2 }, { yPercent: 10, scale: 1.2, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from($$('.person-body > *', p), { y: 30, autoAlpha: 0, stagger: .08, duration: 1, delay: .3 + (i % 4) * .08, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 90%', once: true } });
  });
  $$('.lead-photo img, .page-photo img').forEach(im => gsap.fromTo(im, { yPercent: -12, scale: 1.25 }, { yPercent: 12, scale: 1.25, ease: 'none', scrollTrigger: { trigger: im.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  if ($('.lead')) gsap.from('.lead-quote, .lead-meta', { y: 50, autoAlpha: 0, stagger: .12, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.lead', start: 'top 75%', once: true } });


  /* ---------- contact page ---------- */
  if ($('.info-grid')) gsap.from('.info-col', { y: 50, autoAlpha: 0, stagger: .1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.info-grid', start: 'top 85%', once: true } });
  if ($('.contact-grid')) gsap.from('.contact-form > *, .faq details', { y: 30, autoAlpha: 0, stagger: .06, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.contact-grid', start: 'top 85%', once: true } });
  const splitWords = el => { const walk = n => [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) { if (!c.textContent.trim()) return; const f = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) { f.append(w); return; }
          const o = document.createElement('span'); o.className = 'wm'; const i = document.createElement('span'); i.className = 'wi'; i.textContent = w; o.append(i); f.append(o); });
        c.replaceWith(f); } else if (c.nodeType === 1) walk(c); }); walk(el); return $$('.wi', el); };
  $$('.h-big, .give-title, .band-quote p:first-child, .journey-step h2').forEach(el => { const ws = splitWords(el);
    if (!el.closest('.journey')) gsap.from(ws, { yPercent: 110, rotate: 4, duration: 1.3, stagger: .05, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }); });
  $$('.label').forEach(el => { if (el.closest('.journey')) return; gsap.from(el, { x: -30, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }); });

  /* ---------- journey ---------- */
  const layers = $$('.journey-layer'), steps = $$('.journey-step'), N = layers.length;
  if (N) {
  layers.forEach((l, i) => { gsap.set(l, { zIndex: i + 1, clipPath: i ? 'inset(50% 50% 50% 50%)' : 'inset(0% 0% 0% 0%)' }); gsap.set($('img', l), { scale: i ? 1.6 : 1.15 }); });
  gsap.set(steps, { autoAlpha: 0, y: 60 }); gsap.set(steps[0], { autoAlpha: 1, y: 0 });
  const at = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.journey', start: 'top top', end: 'bottom bottom', scrub: 1.2 } });
  at.to($('img', layers[0]), { scale: 1.45, yPercent: 6, duration: 1 }, 0);
  for (let i = 1; i < N; i++) { const t = i - .35;
    at.to(layers[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: .55, ease: 'power2.inOut' }, t)
      .to($('img', layers[i]), { scale: 1.05, duration: 1.3 }, t)
      .to($('img', layers[i - 1]), { scale: '+=0.5', duration: .55, ease: 'power2.in' }, t)
      .to(steps[i - 1], { autoAlpha: 0, y: -60, duration: .25 }, t)
      .to(steps[i], { autoAlpha: 1, y: 0, duration: .3 }, t + .3); }
  at.to({}, { duration: .35 });
  const dots = $$('.jdots li');
  ScrollTrigger.create({ trigger: '.journey', start: 'top top', end: 'bottom bottom', onUpdate: st2 => {
    let i = 0; const T = at.duration(); for (let k = 1; k < N; k++) if (st2.progress * T >= k - .1) i = k;
    dots.forEach((d, k) => d.classList.toggle('on', k === i)); } });
  }

  /* ---------- paths ---------- */
  if ($('.path-list')) gsap.from('.path-list li', { y: 50, autoAlpha: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.path-list', start: 'top 80%', once: true } });

  /* ---------- programs: cards rise in ---------- */
  $$('.car-track .card').forEach(c => {
    gsap.from($('.card-media', c), { clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 90%', once: true } });
    gsap.fromTo($('img', c), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- impact counters ---------- */
  $$('.stats b').forEach(b => { const n = +b.dataset.n, o = { v: 0 };
    gsap.to(o, { v: n, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 85%', once: true }, onUpdate: () => { b.textContent = fmt(Math.round(o.v)); } }); });

  /* ---------- quote band ---------- */
  gsap.fromTo('.band .wp-block-cover__image-background', { scale: 1.25, yPercent: -6 }, { scale: 1, yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.band-quote > *', { y: 60, autoAlpha: 0, stagger: .12, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.band-quote', start: 'top 85%', once: true } });

  /* ---------- lists + give ---------- */
  gsap.from('.news-list li', { y: 40, autoAlpha: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.news-list', start: 'top 82%', once: true } });
  gsap.fromTo('.give-bg img', { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.give', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.from('.give-form > *, .give-more li', { y: 30, autoAlpha: 0, stagger: .06, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: '.give-grid', start: 'top 85%', once: true } });

  /* ---------- footer word ---------- */
  const fb = $('.foot-big');
  fb.innerHTML = [...fb.textContent].map(c => `<span style="display:inline-block">${c}</span>`).join('');
  gsap.from('.foot-big span', { yPercent: 100, stagger: .05, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* ---------- progress ---------- */
  gsap.to('#progressBar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  /* ---------- nav hides on the way down, returns on the way up ---------- */
  let lastY = 0; const navH = gsap.quickTo(navEl, 'yPercent', { duration: .5, ease: 'power3.out' });
  addEventListener('scroll', () => { const y = scrollY; if (menu && !menu.hidden) return; navH(y > 300 && y > lastY ? -110 : 0); lastY = y; }, { passive: true });

  /* ---------- homes list + pillars + card bodies stagger in ---------- */
  $$('.lst').forEach((c, i) => { gsap.from(c, { y: 70, autoAlpha: 0, duration: 1.2, delay: (i % 3) * .1, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 92%', once: true } });
    gsap.fromTo($('.lst-media', c), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, delay: (i % 3) * .1, ease: 'expo.inOut', scrollTrigger: { trigger: c, start: 'top 92%', once: true } }); });
  gsap.from('.hall-bar, .hall-count', { y: 30, autoAlpha: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.hall-bar', start: 'top 88%', once: true } });
  $$('.car-track .card-body').forEach(b => gsap.from(b.children, { y: 24, autoAlpha: 0, stagger: .07, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: b, start: 'top 95%', once: true } }));
  gsap.from('.stats > div', { y: 60, autoAlpha: 0, stagger: .1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.stats', start: 'top 85%', once: true } });
  gsap.from('.foot-tag, .foot-cols ul, .foot-row', { y: 30, autoAlpha: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.foot-tag', start: 'top 95%', once: true } });

  /* ---------- section photos settle as they arrive ---------- */
  $$('.path-list .thumb').forEach(im => gsap.fromTo(im, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'expo.inOut', scrollTrigger: { trigger: im, start: 'top 88%', once: true } }));

  /* ---------- desktop: magnetic buttons, path rows lean in ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.btn, .car-btn, .menu-btn').forEach(b => { const xT = gsap.quickTo(b, 'x', { duration: .6, ease: 'elastic.out(1,.45)' }), yT = gsap.quickTo(b, 'y', { duration: .6, ease: 'elastic.out(1,.45)' });
      b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); xT((e.clientX - r.left - r.width / 2) * .25); yT((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener('mouseleave', () => { xT(0); yT(0); }); });
    $$('.car-track .card').forEach(c => { const im = $('.card-media img', c);
      c.addEventListener('mousemove', e => { const r = c.getBoundingClientRect(); gsap.to(im, { xPercent: ((e.clientX - r.left) / r.width - .5) * -4, duration: .8, ease: 'power3.out' }); });
      c.addEventListener('mouseleave', () => gsap.to(im, { xPercent: 0, duration: .8, ease: 'power3.out' })); });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
