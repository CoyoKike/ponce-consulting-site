/* SMJ Global — motion layer (scroll, parallax, reveals). Interaction lives in interact.js. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = matchMedia('(max-width: 900px)').matches;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.25, easing: t => 1 - Math.pow(1 - t, 4), smoothWheel: true, wheelMultiplier: .9 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'); if (id.length < 2) return;
      const el = id === '#top' ? 0 : $(id); if (el === null) return;
      e.preventDefault(); lenis.scrollTo(el, { duration: 1.8 });
    }));
  }

  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- statement: split into words ---------- */
  const st = $('#statementText');
  const splitWords = () => { st.innerHTML = st.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' '); };
  splitWords();

  /* ---------- loader then intro ---------- */
  const loader = $('#loader'), bar = $('#loaderBar'), num = $('#loaderNum');
  // wait only for the hero photo (the browser picks the right size) and the fonts
  const heroImg = $('.hero-img');
  const prog = { v: 0 };
  const showProg = () => { bar.style.transform = `scaleX(${prog.v / 100})`; num.textContent = String(Math.round(prog.v)).padStart(3, '0'); };
  gsap.to(prog, { v: 80, duration: 1.2, ease: 'power2.out', onUpdate: showProg });
  const ready = Promise.all([
    heroImg.complete ? Promise.resolve() : new Promise(res => { heroImg.onload = heroImg.onerror = res; }),
    heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve(),
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(res => setTimeout(res, reduce ? 0 : 700)),
  ]);
  const failSafe = new Promise(res => setTimeout(res, 6000));
  if (lenis) lenis.stop();

  gsap.set('.hero-title .line > span', { yPercent: 115 });
  gsap.set(['.eyebrow', '.hero-lede', '.hero-ctas', '.hero-meta', '.scroll-cue', '.nav'], { autoAlpha: 0, y: 24 });
  gsap.set('.hero-img', { scale: 1.3 });

  Promise.race([ready, failSafe]).then(() => {
    gsap.to(prog, { v: 100, duration: .3, onUpdate: showProg });
    const tl = gsap.timeline({ delay: .35, onComplete: () => { loader.remove(); if (lenis) lenis.start(); document.documentElement.classList.add('is-ready'); } });
    tl.to('.loader-inner', { autoAlpha: 0, y: -20, duration: .5, ease: 'power2.in' })
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=.1')
      .to('.hero-img', { scale: 1, duration: 2.2, ease: 'expo.out' }, '-=.9')
      .to('.hero-title .line > span', { yPercent: 0, duration: 1.4, stagger: .1, ease: 'expo.out' }, '-=2')
      .to(['.nav', '.eyebrow', '.hero-lede', '.hero-ctas', '.hero-meta', '.scroll-cue'], { autoAlpha: 1, y: 0, duration: 1, stagger: .06, ease: 'power3.out' }, '-=1.2');
    if (reduce) tl.progress(1);
  });
  gsap.set(loader, { clipPath: 'inset(0 0 0% 0)' });

  if (reduce) { document.addEventListener('smj:lang', splitWords); return; }

  /* ---------- hero: scrolling pushes you into the image ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero-media', { scale: 1.35, yPercent: 18, ease: 'none' }, 0)
    .to('.hero-copy', { yPercent: -60, autoAlpha: 0, ease: 'none' }, 0)
    .to('.hero-meta, .scroll-cue', { autoAlpha: 0, ease: 'none', duration: .4 }, 0)
    .to('.hero-shade', { opacity: .4, ease: 'none' }, 0);

  /* ---------- generic parallax: [data-speed] ---------- */
  $$('[data-speed]').forEach(el => {
    const s = parseFloat(el.dataset.speed);
    gsap.fromTo(el, { yPercent: -s * 100 }, { yPercent: s * 100, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // images drift inside their frames
  $$('.sfig img, .pm img').forEach(img => {
    gsap.fromTo(img, { yPercent: -8, scale: 1.18 }, { yPercent: 8, scale: 1.18, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // clip reveal of framed images
  $$('.sfig, .pm-main').forEach(el => {
    gsap.fromTo(el, { clipPath: 'inset(18% 12% 18% 12%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 35%', scrub: true } });
  });

  /* ---------- statement words light up ---------- */
  let wordsTw;
  const lightWords = () => { wordsTw = gsap.fromTo('#statementText .w', { opacity: .1 }, { opacity: 1, stagger: .05, ease: 'none', scrollTrigger: { trigger: '#statementText', start: 'top 80%', end: 'bottom 45%', scrub: true } }); };
  lightWords();

  /* ---------- section labels + headings ---------- */
  $$('.label, .h-big, .contact-title').forEach(el => {
    gsap.from(el, { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  /* ---------- JOURNEY: scroll guides you through four steps ---------- */
  const layers = $$('.journey-layer'), steps = $$('.journey-step');
  const N = layers.length;
  layers.forEach((l, i) => { gsap.set(l, { zIndex: i + 1, clipPath: i ? 'inset(50% 50% 50% 50%)' : 'inset(0% 0% 0% 0%)' }); gsap.set(l.querySelector('img'), { scale: i ? 1.6 : 1.15 }); });
  gsap.set(steps, { autoAlpha: 0, y: 60 }); gsap.set(steps[0], { autoAlpha: 1, y: 0 });
  const at = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.journey', start: 'top top', end: 'bottom bottom', scrub: 1.2 } });
  at.to(layers[0].querySelector('img'), { scale: 1.45, yPercent: 6, duration: 1 }, 0);
  for (let i = 1; i < N; i++) {
    const t = i - .35;                                     // each stage = 1 unit, change-over in the last third
    at.to(layers[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: .55, ease: 'power2.inOut' }, t)
      .to(layers[i].querySelector('img'), { scale: 1.05, duration: 1.3 }, t)
      .to(layers[i - 1].querySelector('img'), { scale: '+=0.5', duration: .55, ease: 'power2.in' }, t)
      .to(steps[i - 1], { autoAlpha: 0, y: -60, duration: .25 }, t)
      .to(steps[i], { autoAlpha: 1, y: 0, duration: .3 }, t + .3);
  }
  at.to('.journey-lines', { backgroundPosition: '0 50vh', duration: N - .35 }, 0);
  at.to({}, { duration: .35 }); // hold the last stage
  const gStep = $('#gStep'), gStage = $('#gStage'), gTrack = $('#gTrack');
  const STAGES = () => (window.SMJ_I18N && SMJ_I18N.t('stages')) || ['Reach out', 'We listen', 'We prepare', 'Next steps'];
  let stageI = 0;
  ScrollTrigger.create({ trigger: '.journey', start: 'top top', end: 'bottom bottom', onUpdate: s => {
    let i = 0; const T = at.duration(); for (let k = 1; k < N; k++) if (s.progress * T >= k - .1) i = k;   // follows each change-over
    gStep.textContent = '0' + (i + 1) + ' / 0' + N; stageI = i; gStage.textContent = STAGES()[i];
    gTrack.style.transform = `scaleX(${s.progress})`;
  } });

  /* ---------- SERVICES: horizontal track ---------- */
  const track = $('#workTrack'), idx = $('#workIdx'), cards = $$('.card', track);
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const ht = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: {
    trigger: '.work-pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
    onUpdate: s => { idx.textContent = String(Math.min(cards.length, 1 + Math.floor(s.progress * cards.length))).padStart(2, '0'); } } });
  cards.forEach(c => {
    gsap.fromTo(c.querySelector('img'), { xPercent: 8 }, { xPercent: -8, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: ht, start: 'left right', end: 'right left', scrub: true } });
    gsap.from(c.querySelector('.card-media'), { clipPath: 'inset(100% 0 0 0)', ease: 'none', scrollTrigger: { trigger: c, containerAnimation: ht, start: 'left 105%', end: 'left 55%', scrub: true } });
  });
  gsap.to('.work-head', { yPercent: -40, ease: 'none', scrollTrigger: { trigger: '.work', start: 'top top', end: 'top -60%', scrub: true } });

  /* ---------- OUR ROLE ---------- */
  gsap.from('.disc li', { y: 40, autoAlpha: 0, stagger: .1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.disc', start: 'top 82%', once: true } });

  /* ---------- MARQUEE: drifts with scroll, faster when you scroll faster ---------- */
  $$('.marquee-row').forEach(row => {
    const dir = +row.dataset.dir;
    gsap.fromTo(row, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: .6 } });
  });
  const mq = $('.marquee');
  ScrollTrigger.create({ trigger: mq, start: 'top bottom', end: 'bottom top', onUpdate: s => {
    const v = gsap.utils.clamp(-12, 12, s.getVelocity() / 300);
    gsap.to('.marquee-row', { skewX: -v, duration: .4, overwrite: 'auto' });
  }, onLeave: () => gsap.to('.marquee-row', { skewX: 0 }), onLeaveBack: () => gsap.to('.marquee-row', { skewX: 0 }) });

  /* ---------- LANGUAGES + CONTACT ---------- */
  gsap.from('.notice', { y: 40, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.notice', start: 'top 88%', once: true } });
  gsap.from('.values li', { yPercent: 60, autoAlpha: 0, stagger: .12, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.values', start: 'top 88%', once: true } });
  gsap.from('.studio-list li', { y: 50, autoAlpha: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.studio-list', start: 'top 80%', once: true } });
  gsap.fromTo('.contact-bg img', { scale: 1.35 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.from('.contact-list > div', { y: 30, autoAlpha: 0, stagger: .08, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: '.contact-list', start: 'top 88%', once: true } });
  gsap.from('.contact-form > *', { y: 30, autoAlpha: 0, stagger: .06, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: '.contact-form', start: 'top 85%', once: true } });

  /* ---------- footer word rises letter by letter ---------- */
  const fb = $('.foot-big');
  fb.innerHTML = [...fb.textContent].map(c => `<span style="display:inline-block">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  gsap.from('.foot-big span', { yPercent: 100, stagger: .04, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* ---------- page progress line ---------- */
  gsap.to('#progressBar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  /* ---------- nav hides on the way down ---------- */
  const nav = $('#nav'); let lastY = 0;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => {
    const y = s.scroll(); if (Math.abs(y - lastY) < 6) return;
    const hide = y > lastY && y > 300;
    gsap.to(nav, { yPercent: hide ? -110 : 0, duration: .5, ease: 'power3.out', overwrite: 'auto' }); lastY = y;
  } });

  /* ---------- language change: re-split the intro, rename the stage, re-measure ---------- */
  document.addEventListener('smj:lang', () => {
    if (wordsTw) { wordsTw.scrollTrigger && wordsTw.scrollTrigger.kill(); wordsTw.kill(); }
    splitWords(); lightWords();
    gStage.textContent = STAGES()[stageI];
    ScrollTrigger.refresh();
  });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
