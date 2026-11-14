(function () {
  gsap.registerPlugin(ScrollTrigger);
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  let counted = false, hotOn = null;   // used by scroll callbacks that can fire during setup

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!REDUCED) {
    lenis = new Lenis({ lerp: .075, wheelMultiplier: .85, touchMultiplier: 1.2 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t, { duration: 1.8 }) : t.scrollIntoView();
  }));

  /* ---------- split text ---------- */
  $$('.hero-title .line').forEach(l => {
    l.innerHTML = [...l.textContent].map(c => c === ' ' ? ' ' : `<span class="ch">${c}</span>`).join('');
  });
  const st = $('#statement');
  st.innerHTML = st.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  $$('.zone-copy h2').forEach(h => {
    h.innerHTML = h.textContent.trim().split(/\s+/).map(w => `<span class="mask"><span>${w}</span></span>`).join(' ');
  });

  /* ---------- depth gauge ---------- */
  const g = { d: $('#gDepth'), a: $('#gAtm'), t: $('#gTemp'), l: $('#gLight'), fill: $('.gauge-fill'), dot: $('.gauge-dot'), track: $('.gauge-track') };
  const TEMP = [[0, 26], [200, 15], [1000, 5], [4000, 2.2], [6000, 1.6]];
  function piece(stops, x) {
    if (x <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) if (x <= stops[i][0]) {
      const [x0, y0] = stops[i - 1], [x1, y1] = stops[i];
      return lerp(y0, y1, (x - x0) / (x1 - x0));
    }
    return stops[stops.length - 1][1];
  }
  let depth = 0;
  function setDepth(d) {
    depth = d;
    g.d.textContent = fmt(d);
    g.a.textContent = fmt(1 + d / 10.06);
    g.t.textContent = piece(TEMP, d).toFixed(1);
    g.l.textContent = d > 600 ? '0' : Math.max(0, 100 * Math.exp(-d * Math.LN10 * 2 / 200)).toFixed(d < 60 ? 0 : 1);
    const k = d / 6000;
    g.fill.style.transform = `scaleY(${k})`;
    g.dot.style.transform = `translateY(${k * g.track.offsetHeight}px)`;
  }

  /* ---------- press-and-release on everything clickable ---------- */
  function ripple(el, e) {
    const b = el.getBoundingClientRect(), r = document.createElement('span');
    const size = Math.max(b.width, b.height) * 2.2;
    r.className = 'ripple';
    Object.assign(r.style, { width: size + 'px', height: size + 'px', left: (e.clientX - b.left) + 'px', top: (e.clientY - b.top) + 'px' });
    el.appendChild(r);
    gsap.fromTo(r, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: .9, ease: 'power2.out', onComplete: () => r.remove() });
  }
  $$('.press, .press-card').forEach(el => {
    const card = el.classList.contains('press-card');
    const down = e => {
      if (e.button > 0) return;
      if (card && e.target.closest('.press') && e.target.closest('.press') !== el) return;
      e.stopPropagation();
      gsap.to(el, card
        ? { scaleX: 1.012, scaleY: .955, duration: .18, ease: 'power3.out', overwrite: 'auto' }
        : { scaleX: 1.07, scaleY: .84, y: 2, duration: .14, ease: 'power3.out', overwrite: 'auto' });
      if (el.classList.contains('btn')) ripple(el, e);
    };
    const up = () => gsap.to(el, { scaleX: 1, scaleY: 1, y: 0, duration: card ? 1.1 : .95, ease: 'elastic.out(1.15, 0.3)', overwrite: 'auto' });
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('pointercancel', up);
  });

  /* ---------- spheres ---------- */
  const heroField = new SphereField($('#heroSpheres'), { style: 'bubble', layout: 'cluster', rise: .35, host: $('#hero') });
  const pField = new SphereField($('#pressureSpheres'), { style: 'bubble', layout: 'fill', density: .7, rise: .45, xMin: innerWidth > 900 ? .42 : 0, host: $('#pressure') });

  /* ---------- marine snow (drifts up as you go down) ---------- */
  const snow = $('#snow'), sg = snow.getContext('2d');
  let flakes = [];
  function sizeSnow() {
    snow.width = innerWidth; snow.height = innerHeight;
    flakes = Array.from({ length: innerWidth < 700 ? 60 : 130 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, z: .25 + Math.random() * .75, s: Math.random() * 6.28 }));
  }
  sizeSnow(); addEventListener('resize', sizeSnow);
  if (!REDUCED) gsap.ticker.add(() => {
    const v = lenis ? lenis.velocity : 0, H = snow.height, W = snow.width;
    const a = clamp(.1 + depth / 1400, .1, .7);
    sg.clearRect(0, 0, W, H);
    sg.fillStyle = '#dfeaee';
    for (const f of flakes) {
      f.y -= (0.12 + v * .55) * f.z; f.s += .01; f.x += Math.sin(f.s) * .15 * f.z;
      if (f.y < -4) { f.y = H + 4; f.x = Math.random() * W; }
      if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
      sg.globalAlpha = a * f.z;
      const len = 1 + Math.min(Math.abs(v) * 1.4, 14) * f.z;
      sg.fillRect(f.x, f.y, 1.4 * f.z + .4, len);
    }
    sg.globalAlpha = 1;
  });

  /* ---------- loader + hero intro ---------- */
  const pct = $('#loadPct');
  const firstImgs = $$('.hero-media img');
  const ready = Promise.all([document.fonts.ready, ...firstImgs.map(i => i.decode ? i.decode().catch(() => {}) : Promise.resolve())]);
  const counter = { v: 0 };
  const count = gsap.to(counter, { v: 92, duration: 1.4, ease: 'power2.out', onUpdate: () => pct.textContent = Math.round(counter.v) });
  document.body.classList.add('loading');

  function intro() {
    document.body.classList.remove('loading');
    if (lenis) lenis.start();
    const tl = gsap.timeline();
    tl.to(counter, { v: 100, duration: .3, onUpdate: () => pct.textContent = Math.round(counter.v) })
      .to('.loader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' })
      .set('.loader', { display: 'none' })
      .from('.hero-media', { scale: 1.35, duration: 2.2, ease: 'expo.out' }, '-=.75')
      .from('.hero-title .ch', { yPercent: 115, rotate: 6, duration: 1.2, ease: 'expo.out', stagger: .028 }, '<.15')
      .from('.hero-sub, .hero-ctas', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: .1 }, '<.5')
      .from('.nav, .gauge', { opacity: 0, duration: 1 }, '<');
    ScrollTrigger.refresh();
  }
  if (REDUCED) { $('.loader').style.display = 'none'; document.body.classList.remove('loading'); }
  else Promise.race([ready, new Promise(r => setTimeout(r, 2500))]).then(() => count.then(intro));

  /* ---------- hero: mouse parallax + scroll zoom ---------- */
  if (!REDUCED) {
    const mx = gsap.quickTo('.hero-media img', 'x', { duration: 1.2, ease: 'power3' });
    const my = gsap.quickTo('.hero-media img', 'y', { duration: 1.2, ease: 'power3' });
    $('#hero').addEventListener('pointermove', e => {
      mx((e.clientX / innerWidth - .5) * -36);
      my((e.clientY / innerHeight - .5) * -24);
    });
  }

  const mm = gsap.matchMedia();
  const parts = {};   // progress of each depth segment, summed into one depth reading

  function updateDepth() {
    const h = parts.hero || 0, s = parts.statement || 0, dsc = parts.descent || 0;
    if (dsc > 0) {
      setDepth(piece(DESCENT_STOPS, dsc));
    } else setDepth(h * 15 + s * 25);
  }
  // descent progress (0..1) mapped to depth in meters; rebuilt from the real timeline below
  const ZN = $$('.zone').length;
  let DESCENT_STOPS = [[0, 40], [.25, 200], [.5, 1000], [.75, 4000], [1, 6000]];
  let descentTL = null;

  mm.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 901px)' }, ctx => {
    const { motion, desktop } = ctx.conditions;

    ScrollTrigger.create({ trigger: '#hero', start: 'bottom 80%', onToggle: s => $('.nav').classList.toggle('solid', s.isActive || s.progress === 1), end: 'max' });
    if (!motion) return;

    // hero: pin, push into the image
    if (motion) {
      const htl = gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=90%', pin: true, scrub: 1,
        onUpdate: s => { parts.hero = s.progress; updateDepth(); } } });
      htl.to('.hero-media', { scale: 1.55, ease: 'none' }, 0)
         .to('.hero-title .line:nth-child(1)', { y: -innerHeight * .32, ease: 'none' }, 0)
         .to('.hero-title .line:nth-child(2)', { y: -innerHeight * .2, ease: 'none' }, 0)
         .to('.hero-sub, .hero-ctas', { y: -innerHeight * .12, opacity: 0, ease: 'none' }, 0)
         .to('.hero-title', { opacity: 0, ease: 'power1.in' }, .35)
         .to('#heroSpheres', { y: -innerHeight * .45, scale: 1.3, ease: 'none' }, 0)
         .to('.hero-shade', { opacity: 1.0, backgroundColor: 'rgba(7,26,36,.65)', ease: 'none' }, .2);
    }

    // statement: words light up as you read
    gsap.to('#statement .w', { opacity: 1, ease: 'none', stagger: .1,
      scrollTrigger: { trigger: '.statement', start: 'top 70%', end: 'bottom 55%', scrub: true,
        onUpdate: s => { parts.statement = s.progress; updateDepth(); } } });

    // descent: layered fly-through. Each zone has its own life window in which every
    // layer drifts at a different speed; neighbours cross-fade with a zoom so there is
    // never a still frame. Only transform and opacity are animated.
    const zones = $$('.zone'), H = () => innerHeight;
    gsap.set(zones.slice(1), { autoAlpha: 0 });
    gsap.set(zones.slice(1).map(z => $$('.zone-copy h2 .mask > span', z)).flat(), { yPercent: 115 });
    gsap.set(zones.slice(1).map(z => $$('.zone-copy > :not(h2)', z)).flat(), { y: 30, autoAlpha: 0 });
    const END = ZN + .3;
    const dtl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
      trigger: '#descent', start: 'top top', end: `+=${ZN * 150}%`, pin: '.descent-stage', scrub: .7, anticipatePin: 1,
      onUpdate: s => { parts.descent = s.progress; updateDepth(); } } });
    zones.forEach((z, i) => {
      const s0 = i === 0 ? 0 : i - .5, e0 = Math.min(END, i + 1.5), life = e0 - s0;
      const media = $('.zone-media', z), sub = $('.zone-subject', z), num = $('.zone-num', z);
      const words = $$('.zone-copy h2 .mask > span', z), rest = $$('.zone-copy > :not(h2)', z);
      if (media) dtl.fromTo(media, { yPercent: i === 0 ? 0 : 5, scale: i === 0 ? 1.08 : 1.16 }, { yPercent: -5, scale: 1, duration: life }, s0);
      if (sub) dtl.fromTo(sub, { yPercent: 38, rotation: -7 }, { yPercent: -38, rotation: 5, duration: life }, s0);
      dtl.fromTo(num, { y: () => H() * .34 }, { y: () => -H() * .34, duration: life }, s0);
      if (i > 0) {
        dtl.fromTo(z, { autoAlpha: 0, scale: .9 }, { autoAlpha: 1, scale: 1, duration: .6, ease: 'power1.inOut', immediateRender: false }, i - .3)
           .to(words, { yPercent: 0, duration: .4, stagger: .06, ease: 'power3.out' }, i - .02)
           .to(rest, { y: 0, autoAlpha: 1, duration: .35, stagger: .05, ease: 'power2.out' }, i + .1);
      }
      if (i < ZN - 1) {
        dtl.to(z, { scale: 1.32, autoAlpha: 0, duration: .55, ease: 'power1.in' }, i + .75)
           .to(words, { yPercent: -115, duration: .3, stagger: .04, ease: 'power2.in' }, i + .62)
           .to(rest, { y: -30, autoAlpha: 0, duration: .25, ease: 'power2.in' }, i + .62);
      }
    });
    dtl.to({}, { duration: END - dtl.duration() > 0 ? END - dtl.duration() : .01 });
    const T = dtl.duration();
    DESCENT_STOPS = [[0, 40], [1 / T, 200], [2 / T, 1000], [3 / T, 4000], [3.9 / T, 6000], [1, 6000]];
    descentTL = dtl;
    // page water darkens as you go down
    gsap.to('body', { backgroundColor: '#050a0e', ease: 'none',
      scrollTrigger: { trigger: '#descent', start: 'top bottom', end: 'bottom top', scrub: true } });

    // vessel: pinned. A porthole opens onto the submersible, then the story and
    // the specs come in on top while the photo keeps drifting.
    if (desktop) {
      const r0 = () => Math.min(innerWidth, innerHeight) * .17, R = () => Math.hypot(innerWidth, innerHeight) / 2 + 40;
      gsap.set('.vessel-title .vl > span', { yPercent: 110 });
      gsap.set('.vessel-copy .body', { y: 30, autoAlpha: 0 });
      gsap.set('.hot', { scale: 0 });
      gsap.set('.spec', { yPercent: 70, scale: .82, autoAlpha: 0 });
      const vtl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
        trigger: '#vessel', start: 'top top', end: '+=230%', pin: '.vessel-stage', scrub: .7, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: s => { if (s.progress > .6) countUp(); if (s.progress < .3) hideHot(); } } });
      vtl.fromTo('.vessel-porthole', { clipPath: () => `circle(${r0()}px at 50% 50%)` }, { clipPath: () => `circle(${R()}px at 50% 50%)`, duration: 1, ease: 'power2.in' }, 0)
         .fromTo('.porthole-ring', { scale: 1, autoAlpha: 1 }, { scale: () => R() / r0(), duration: 1, ease: 'power2.in' }, 0)
         .to('.porthole-ring', { autoAlpha: 0, duration: .3 }, .7)
         .fromTo('.vessel-frame', { scale: 1.45 }, { scale: 1, duration: 1.3, ease: 'power1.out' }, 0)
         .to('.vessel-frame', { yPercent: -2, duration: 1.6 }, 1)
         .to('.vessel-shade', { autoAlpha: 1, duration: .6 }, .85)
         .to('.vessel-title .vl > span', { yPercent: 0, duration: .5, stagger: .1, ease: 'power3.out' }, .9)
         .to('.vessel-copy .body', { y: 0, autoAlpha: 1, duration: .4, ease: 'power2.out' }, 1.2)
         .to('.hot', { scale: 1, duration: .35, stagger: .12, ease: 'back.out(2.2)' }, 1.1)
         .to('.spec', { yPercent: 0, scale: 1, autoAlpha: 1, duration: .55, stagger: .1, ease: 'power3.out' }, 1.55)
         .fromTo('.vessel-copy', { y: () => H() * .08 }, { y: () => -H() * .05, duration: 2.6 }, .6)
         .fromTo('.escort', { y: () => H() * .7, autoAlpha: 0 }, { y: () => -H() * .08, autoAlpha: 1, duration: 1.8 }, .8)
         .fromTo('.escort-img img', { yPercent: -18 }, { yPercent: 0, duration: 1.8 }, .8)
         .to({}, { duration: .3 });
    }
    // phone: no pin, simple reveals
    else {
      gsap.from('.vessel-copy > *', { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.vessel-copy', start: 'top 80%' } });
    }

    // surface band: photo drifts, the two lines slide past each other
    gsap.fromTo('.surface-media', { yPercent: -12 }, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.surface', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.surface-line span:nth-child(1)', { xPercent: -18 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: '.surface', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.surface-line span:nth-child(2)', { xPercent: 18 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: '.surface', start: 'top bottom', end: 'bottom top', scrub: true } });

    // dives: vertical scroll pans the strip sideways
    if (desktop) {
      const track = $('.dives-track');
      const dist = () => track.scrollWidth - innerWidth;
      const pan = gsap.to(track, { x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: '.dives', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true } });
      $$('.dive').forEach(d => {
        gsap.fromTo($('img', d), { xPercent: -16 }, { xPercent: 0, ease: 'none',
          scrollTrigger: { trigger: d, containerAnimation: pan, start: 'left right', end: 'right left', scrub: true } });
      });
    }
    gsap.from('.dives-head .h2', { yPercent: 60, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.dives', start: 'top 70%' } });

    // pressure + booking headings
    // pressure: photo drifts slower than the page, headline lines rise out of their masks
    gsap.fromTo('.pressure-media', { yPercent: -10 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.pressure', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('#pressureSpheres', { yPercent: 8 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.pressure', start: 'top bottom', end: 'bottom top', scrub: true } });
    const ptl = gsap.timeline({ scrollTrigger: { trigger: '.pressure', start: 'top 60%' } });
    ptl.from('.pressure-eyebrow', { opacity: 0, x: -30, duration: 1, ease: 'expo.out' })
       .from('.pressure-title .pl > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: .1 }, '<.1')
       .from('.pressure-copy .body, .pressure-how', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: .08 }, '<.35')
       .from('.pressure-face', { scale: .6, opacity: 0, duration: 1.4, ease: 'elastic.out(1, .5)' }, '<')
       .fromTo('.dial-track', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power3.inOut' }, '<')
       .from('.pressure-read div', { y: 16, opacity: 0, duration: .8, ease: 'expo.out', stagger: .07 }, '<.3');
    gsap.from('.book-title', { yPercent: 40, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.book', start: 'top 75%' } });
    gsap.from('.trip', { y: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.trips', start: 'top 80%' } });
    gsap.fromTo('.foot-word', { yPercent: 45 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  });

  // reduced motion: no scrubbing, only the readings
  if (REDUCED) {
    $$('.zone').forEach(z => z.style.position = 'relative');
    $('.descent-stage').style.height = 'auto';
    $$('.zone').forEach(z => z.style.height = '100dvh');
    ScrollTrigger.create({ trigger: '#descent', start: 'top center', end: 'bottom center', onUpdate: s => setDepth(piece(DESCENT_STOPS, s.progress)) });
  }

  /* ---------- count-ups ---------- */
  function countUp() {
    if (counted) return;
    counted = true;
    $$('[data-count]').forEach((el, i) => {
      const end = +el.dataset.count, o = { v: 0 };
      gsap.to(o, { v: end, duration: REDUCED ? 0 : 1.8, delay: REDUCED ? 0 : i * .12, ease: 'power3.out', onUpdate: () => el.textContent = el.dataset.fmt ? fmt(o.v) : Math.round(o.v) });
    });
  }
  // the pinned desktop vessel calls countUp itself once the cards are in
  if (REDUCED || innerWidth < 901) ScrollTrigger.create({ trigger: '.specs', start: 'top 85%', once: true, onEnter: countUp });

  /* ---------- descent: mouse depth, foreground particles, torch, sonar, vent sparks ---------- */
  const stage = $('.descent-stage');
  const ptr = { x: .5, y: .5, sx: .5, sy: .5, on: false };   // normalised pointer over the stage, raw + smoothed
  stage.addEventListener('pointermove', e => {
    const b = stage.getBoundingClientRect();
    ptr.x = (e.clientX - b.left) / b.width; ptr.y = (e.clientY - b.top) / b.height; ptr.on = true;
  });
  stage.addEventListener('pointerleave', () => { ptr.on = false; });
  // layers further back move less with the mouse than layers in front
  const layerMove = REDUCED ? [] : [
    ...$$('.zone-media', stage).map(el => ({ el, k: -18 })),
    ...$$('.zone-subject', stage).map(el => ({ el, k: 34 })),
    ...$$('.zone-num', stage).map(el => ({ el, k: 60, xOnly: true })),
  ].map(o => ({ ...o, qx: gsap.quickSetter(o.el, 'x', 'px'), qy: o.xOnly ? null : gsap.quickSetter(o.el, 'y', 'px') }));

  const torch = $('.zone-torch'), torchZone = torch.closest('.zone');
  const bk = $('.bokeh', stage), bg = bk.getContext('2d');
  const heat = $('.vent-heat', stage), hg = heat.getContext('2d'), heatZone = heat.closest('.zone');
  function softDot(r, g, b) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(.35, `rgba(${r},${g},${b},.55)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return c;
  }
  const DOT_SUN = softDot(255, 244, 222), DOT_DEEP = softDot(120, 220, 255), DOT_EMBER = softDot(255, 150, 70);
  let motes = [], sparks = [], kicks = [];
  function sizeStage() {
    for (const c of [bk, heat]) { c.width = stage.clientWidth; c.height = stage.clientHeight; }
    const n = innerWidth < 700 ? 16 : 30;
    motes = Array.from({ length: n }, () => {
      const z = Math.random();
      return { x: Math.random(), y: Math.random() * 1.2, z, r: 3 + z * z * 46, ph: Math.random() * 6.28, vx: 0, vy: 0, ox: 0, oy: 0 };
    });
    sparks = [];
  }
  sizeStage(); addEventListener('resize', sizeStage);

  let stageOn = false;
  new IntersectionObserver(es => { stageOn = es[0].isIntersecting; }).observe(stage);
  let lastP = 0, drift = 0;
  if (!REDUCED) gsap.ticker.add((time, dt) => {
    if (!stageOn) return;
    ptr.sx += ((ptr.on ? ptr.x : .5) - ptr.sx) * .06; ptr.sy += ((ptr.on ? ptr.y : .5) - ptr.sy) * .06;
    const mx = ptr.sx - .5, my = ptr.sy - .5;
    for (const l of layerMove) { l.qx(mx * l.k); if (l.qy) l.qy(my * l.k * .6); }

    // torch: follows the pointer, rests on the animal when the pointer leaves
    if (gsap.getProperty(torchZone, 'opacity') > 0) {
      const sb = $('.zone-subject img', torchZone).getBoundingClientRect(), b = stage.getBoundingClientRect();
      const hx = ptr.on ? ptr.sx : (sb.left + sb.width / 2 - b.left) / b.width;
      const hy = ptr.on ? ptr.sy : (sb.top + sb.height * .45 - b.top) / b.height;
      torch.style.setProperty('--tx', (hx * 100).toFixed(2) + '%');
      torch.style.setProperty('--ty', (hy * 100).toFixed(2) + '%');
    }

    // foreground motes: they pass the camera much faster than the photo moves
    const p = descentTL ? descentTL.progress() : 0, dp = p - lastP; lastP = p; drift += dt / 1000;
    const W = bk.width, Hh = bk.height, deep = clamp((depth - 200) / 1500, 0, 1);
    bg.clearRect(0, 0, W, Hh);
    bg.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      m.y -= dp * (1.2 + m.z * 9) + .00025 * (.4 + m.z);
      m.y = ((m.y % 1.2) + 1.2) % 1.2;
      for (const k of kicks) {                          // sonar pushes motes outward
        const dx = m.x * W - k.x, dy = (m.y - .1) * Hh - k.y, d = Math.hypot(dx, dy) || 1;
        const f = k.f * Math.max(0, 1 - d / 700) * (.3 + m.z);
        m.vx += dx / d * f; m.vy += dy / d * f;
      }
      m.ox += m.vx; m.oy += m.vy; m.vx *= .92; m.vy *= .92; m.ox *= .97; m.oy *= .97;
      const x = m.x * W + Math.sin(drift * .5 + m.ph) * 20 * m.z + mx * -120 * m.z + m.ox;
      const y = (m.y - .1) * Hh + my * -70 * m.z + m.oy;
      const a = (.05 + m.z * .22) * (m.z > .85 ? .55 : 1);
      bg.globalAlpha = a; bg.drawImage(DOT_SUN, x - m.r, y - m.r, m.r * 2, m.r * 2);
      if (deep > 0) { bg.globalAlpha = a * deep * 1.4; bg.drawImage(DOT_DEEP, x - m.r, y - m.r, m.r * 2, m.r * 2); }
    }
    kicks.length = 0;
    bg.globalAlpha = 1; bg.globalCompositeOperation = 'source-over';

    // vent sparks rise from the chimney in the last zone and scatter from the pointer
    const hz = +gsap.getProperty(heatZone, 'opacity');
    hg.clearRect(0, 0, heat.width, heat.height);
    if (hz > 0.01) {
      const vb = $('.zone-media img', heatZone).getBoundingClientRect(), sb = stage.getBoundingClientRect();
      const cx = vb.left - sb.left + vb.width * .53, cy = vb.top - sb.top + vb.height * .3;
      if (sparks.length < 90) for (let i = 0; i < 2; i++) sparks.push({ x: cx + (Math.random() - .5) * vb.width * .05, y: cy + Math.random() * vb.height * .08, vx: (Math.random() - .6) * .5, vy: -.6 - Math.random() * 1.3, life: 1, r: 2 + Math.random() * 7 });
      const px = ptr.sx * heat.width, py = ptr.sy * heat.height;
      hg.globalCompositeOperation = 'lighter';
      for (const s of sparks) {
        if (ptr.on) { const dx = s.x - px, dy = s.y - py, d = Math.hypot(dx, dy) || 1; if (d < 160) { s.vx += dx / d * .5 * (1 - d / 160); s.vy += dy / d * .5 * (1 - d / 160); } }
        s.vx += Math.sin(drift * 2 + s.r) * .02; s.vx *= .985; s.x += s.vx; s.y += s.vy; s.life -= .006;
        hg.globalAlpha = Math.max(0, s.life) * hz * .8;
        hg.drawImage(DOT_EMBER, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      }
      sparks = sparks.filter(s => s.life > 0 && s.y > -20);
      hg.globalAlpha = 1; hg.globalCompositeOperation = 'source-over';
    } else sparks.length = 0;
  });

  // sonar: click anywhere in the descent
  const hint = $('.descent-hint');
  stage.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const b = stage.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    kicks.push({ x, y, f: 9 });
    for (let i = 0; i < 2; i++) {
      const r = document.createElement('span'); r.className = 'ping';
      Object.assign(r.style, { left: x + 'px', top: y + 'px' });
      stage.appendChild(r);
      gsap.fromTo(r, { scale: .05, opacity: 1 }, { scale: 2.6 + i * 1.4, opacity: 0, duration: 1.6 + i * .5, delay: i * .18, ease: 'expo.out', onComplete: () => r.remove() });
    }
    const below = Math.max(0, 6000 - depth);
    const t = document.createElement('span'); t.className = 'ping-read';
    t.textContent = below < 50 ? 'Sea floor contact' : `Sea floor ${fmt(below)} m below`;
    Object.assign(t.style, { left: x + 'px', top: y + 'px' });
    stage.appendChild(t);
    gsap.timeline({ onComplete: () => t.remove() })
      .fromTo(t, { opacity: 0, x: 8 }, { opacity: 1, x: 22, duration: .4, ease: 'power3.out' })
      .to(t, { opacity: 0, duration: .6 }, 1.4);
    // the whole scene flinches, then settles
    gsap.fromTo(stage, { scale: .985 }, { scale: 1, duration: 1.1, ease: 'elastic.out(1, .35)', overwrite: 'auto' });
    if (hint) gsap.to(hint, { opacity: 0, duration: .6 });
  });

  /* ---------- vessel: hotspots + tilting spec cards ---------- */
  const hotCard = $('.hot-card');
  function placeHot() {
    if (!hotOn) return;
    const b = hotOn.getBoundingClientRect(), w = hotCard.offsetWidth;
    const left = b.right + 14 + w > innerWidth - 20 ? b.left - w - 14 : b.right + 14;
    gsap.set(hotCard, { x: left, y: b.top - 6 });
  }
  function hideHot() {
    if (!hotOn) return;
    hotOn.classList.remove('on'); hotOn = null;
    gsap.to(hotCard, { autoAlpha: 0, scale: .9, duration: .25, ease: 'power2.in' });
  }
  $$('.hot').forEach(h => {
    h.addEventListener('pointerdown', () => gsap.to(h, { scaleX: 1.25, scaleY: .7, duration: .12, ease: 'power3.out', overwrite: 'auto' }));
    const up = () => gsap.to(h, { scaleX: 1, scaleY: 1, duration: .9, ease: 'elastic.out(1.2, .3)', overwrite: 'auto' });
    h.addEventListener('pointerup', up); h.addEventListener('pointerleave', up);
    h.addEventListener('click', e => {
      e.stopPropagation();
      if (hotOn === h) return hideHot();
      if (hotOn) hotOn.classList.remove('on');
      hotOn = h; h.classList.add('on');
      $('b', hotCard).textContent = h.dataset.label; $('span', hotCard).textContent = h.dataset.text;
      placeHot();
      gsap.fromTo(hotCard, { autoAlpha: 0, scale: .85 }, { autoAlpha: 1, scale: 1, duration: .5, ease: 'back.out(1.8)' });
    });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.hot')) hideHot(); });
  if (lenis) lenis.on('scroll', placeHot); else addEventListener('scroll', placeHot, { passive: true });

  // the photo behind the porthole follows the mouse a little
  if (!REDUCED) {
    const vf = $('.vessel-frame'), vx = gsap.quickTo(vf, 'x', { duration: 1.4, ease: 'power3' }), vy = gsap.quickTo(vf, 'y', { duration: 1.4, ease: 'power3' });
    const tx = gsap.quickTo('.vessel-copy', 'x', { duration: 1.4, ease: 'power3' });
    $('.vessel-stage').addEventListener('pointermove', e => {
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      vx(nx * -40); vy(ny * -26); tx(nx * 18);
    });
    $$('.spec').forEach(c => {
      const rx = gsap.quickTo(c, 'rotationX', { duration: .6, ease: 'power3' }), ry = gsap.quickTo(c, 'rotationY', { duration: .6, ease: 'power3' });
      gsap.set(c, { transformPerspective: 700 });
      c.addEventListener('pointermove', e => {
        const b = c.getBoundingClientRect(), nx = (e.clientX - b.left) / b.width, ny = (e.clientY - b.top) / b.height;
        rx((.5 - ny) * 16); ry((nx - .5) * 20);
        c.style.setProperty('--gx', nx * 100 + '%'); c.style.setProperty('--gy', ny * 100 + '%');
      });
      c.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  /* ---------- pressure: press and hold to dive ---------- */
  // Holding the button takes you from the surface to 6,000 m. Pressure uses the same formula as the
  // depth gauge; bubbles follow Boyle's law (volume = 1 / pressure, so radius = cube root of that).
  const pb = $('#pressureBtn'), face = $('.pressure-face', pb), arc = $('.dial-arc', pb), pHint = $('.pressure-hint', pb);
  const pDepth = $('#pDepth'), pVal = $('#pVal'), pVol = $('#pVol'), pLight = $('#pLight');
  const pImg = $('.pressure-media img'), pDark = $('.pressure-dark');
  const P = { v: 0, holding: false };
  function renderPressure() {
    const v = P.v, d = v * 6000, atm = 1 + d / 10.06, vol = 100 / atm;
    const light = d > 600 ? 0 : 100 * Math.exp(-d * Math.LN10 * 2 / 200);
    pDepth.textContent = fmt(d);
    pVal.textContent = fmt(atm);
    pVol.textContent = vol >= 10 ? Math.round(vol) : vol.toFixed(vol >= 1 ? 1 : 2);
    pLight.textContent = light >= 10 || light === 0 ? Math.round(light) : light.toFixed(1);
    arc.style.strokeDashoffset = 1 - v;
    pField.shrink = Math.cbrt(1 / atm);
    // the water closes over you: the photo sinks away and the light fades
    gsap.set(pImg, { scale: 1 + v * .22, yPercent: v * -6 });
    pDark.style.opacity = Math.min(.94, Math.pow(v, .55) * .94);
    // the button is squeezed by the water
    if (P.holding) gsap.set(face, { scaleX: 1.04 + v * .05, scaleY: .9 - v * .1 });
  }
  // about 5 seconds of holding reaches the bottom, fast at first and easing in near 6,000 m
  const DIVE_S = 5;
  const pressTick = (time, dt) => {
    if (!P.holding || P.v >= 1) return;
    const t = DIVE_S * (1 - Math.sqrt(1 - P.v)) + Math.min(dt, 50) / 1000;
    P.v = t >= DIVE_S ? 1 : 1 - Math.pow(1 - t / DIVE_S, 2);
    renderPressure();
  };
  gsap.ticker.add(pressTick);
  function hold(e) {
    if (e && e.button > 0) return;
    P.holding = true;
    gsap.killTweensOf(P); gsap.killTweensOf(face);
    pHint.textContent = 'Diving';
    gsap.to(face, { scaleX: 1.04, scaleY: .9, duration: .12, ease: 'power3.out' });
    if (e && e.pointerId != null) pb.setPointerCapture(e.pointerId);
  }
  function release() {
    if (!P.holding) return;
    P.holding = false;
    pHint.textContent = 'Hold';
    const power = P.v, c = pField.c.getBoundingClientRect(), b = pb.getBoundingClientRect();
    // ascent: bubbles swell back and race to the surface
    pField.lift(b.left + b.width / 2 - c.left, b.top + b.height / 2 - c.top, 4 + power * 22);
    const sec = $('#pressure').getBoundingClientRect(), s = document.createElement('span');
    s.className = 'shock';
    Object.assign(s.style, { left: (b.left - sec.left) + 'px', top: (b.top - sec.top) + 'px', width: b.width + 'px', height: b.height + 'px' });
    $('#pressure').appendChild(s);
    gsap.fromTo(s, { scale: 1, opacity: .8 }, { scale: 1.4 + power * 1.4, opacity: 0, duration: 1.2 + power * .5, ease: 'expo.out', onComplete: () => s.remove() });
    gsap.to(P, { v: 0, duration: .8 + power * 1.2, ease: 'power3.out', onUpdate: renderPressure });
    gsap.fromTo(face, { scaleX: 1 - power * .05, scaleY: 1 + power * .1 }, { scaleX: 1, scaleY: 1, duration: 1.4, ease: 'elastic.out(1.1, .3)' });
  }
  pb.addEventListener('pointerdown', hold);
  pb.addEventListener('pointerup', release);
  pb.addEventListener('pointercancel', release);
  pb.addEventListener('lostpointercapture', release);
  pb.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); hold(); } });
  pb.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') release(); });
  pb.addEventListener('contextmenu', e => e.preventDefault());

  // click anywhere else in the section: bubbles scatter from that point
  $('#pressure').addEventListener('pointerdown', e => {
    if (e.target.closest('.pressure-btn')) return;
    const c = pField.c.getBoundingClientRect();
    pField.impulse(e.clientX - c.left, e.clientY - c.top, 14);
  });
  // the section shows its own readings, so the page depth gauge steps aside here
  ScrollTrigger.create({ trigger: '#pressure', start: 'top 55%', end: 'bottom 45%', onToggle: s => $('.gauge').classList.toggle('off', s.isActive) });


  /* ---------- reserve sheet ---------- */
  const sheet = $('#sheet'), form = $('#sheetForm'), done = $('.sheet-done');
  function openSheet(trip) {
    $('#sheetTrip').textContent = trip;
    form.hidden = false; done.hidden = true; form.reset();
    $$('.err', form).forEach(x => x.classList.remove('on'));
    sheet.showModal();
    if (lenis) lenis.stop();
    gsap.fromTo(sheet, { y: 40, scale: .94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: .7, ease: 'expo.out' });
  }
  function closeSheet() {
    gsap.to(sheet, { y: 30, scale: .96, opacity: 0, duration: .3, ease: 'power2.in', onComplete: () => { sheet.close(); if (lenis) lenis.start(); } });
  }
  $$('.trip').forEach(t => t.addEventListener('click', () => openSheet(t.dataset.trip)));
  $('#sheetClose').addEventListener('click', closeSheet);
  $('#sheetOk').addEventListener('click', closeSheet);
  sheet.addEventListener('cancel', e => { e.preventDefault(); closeSheet(); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#fName'), email = $('#fEmail');
    const okName = name.value.trim().length > 1, okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    $('[data-for="fName"]').classList.toggle('on', !okName);
    $('[data-for="fEmail"]').classList.toggle('on', !okEmail);
    if (!okName || !okEmail) { gsap.fromTo(form, { x: -10 }, { x: 0, duration: .6, ease: 'elastic.out(1, .25)' }); return; }
    form.hidden = true; done.hidden = false;
    gsap.from(done.children, { y: 20, opacity: 0, duration: .6, ease: 'expo.out', stagger: .08 });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
