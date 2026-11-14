// Layer 2 — Motion: smooth scroll, parallax and scroll-driven scenes (GSAP + ScrollTrigger + Lenis)
const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);

export const vessel = { p: 0, h: 0 };   // h: hero dive 0 to 1, p: craft tour 0 to 1
const HERO = 1.3, CRAFT = 4.6;          // pin lengths, in screen heights
export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Smooth scroll ---------- */
export function initScroll() {
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: !reduced });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) { e.preventDefault(); lenis.scrollTo(0, { duration: 2.2 }); return; }
    if (id === '#craft' && window.__craftY != null) { e.preventDefault(); lenis.scrollTo(window.__craftY(), { duration: 2.6, easing: t => 1 - Math.pow(1 - t, 4) }); return; }
    const el = document.querySelector(id);
    if (el) { e.preventDefault(); lenis.scrollTo(el, { duration: 2.2, easing: t => 1 - Math.pow(1 - t, 4) }); }
  }));
  return lenis;
}

/* ---------- Hero starfield: three depth layers, streaks with scroll speed ---------- */
function starfield(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w, h, stars = [];
  const state = { speed: 0, zoom: 0, mx: 0, my: 0 };
  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round(w * h / 5200) }, () => ({
      x: (Math.random() - .5) * w * 1.6, y: (Math.random() - .5) * h * 1.6,
      z: Math.random() * .9 + .1, tw: Math.random() * Math.PI * 2
    }));
  }
  resize(); window.addEventListener('resize', resize);
  window.addEventListener('pointermove', e => { state.mx = e.clientX / innerWidth - .5; state.my = e.clientY / innerHeight - .5; });
  let visible = true, last = 0, pmx = 0, pmy = 0;
  new IntersectionObserver(([en]) => visible = en.isIntersecting).observe(canvas);
  gsap.ticker.add(time => {
    if (!visible) return;
    pmx += (state.mx - pmx) * .05; pmy += (state.my - pmy) * .05;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, warp = 1 + state.zoom * 2.4, streak = Math.min(state.speed, 60) * .6 + state.zoom * 26;
    for (const s of stars) {
      const k = warp * (0.6 + s.z);
      const x = cx + s.x * k - pmx * 60 * s.z, y = cy + s.y * k - pmy * 40 * s.z;
      if (x < -50 || x > w + 50 || y < -50 || y > h + 50) continue;
      const a = (.35 + .65 * s.z) * (.75 + .25 * Math.sin(time * 2 + s.tw));
      const r = .4 + s.z * 1.3;
      if (streak > 1.5) {
        const dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy) || 1, l = streak * s.z;
        ctx.strokeStyle = `rgba(230,236,255,${a})`; ctx.lineWidth = r;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dx / len * l, y - dy / len * l); ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(230,236,255,${a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    state.speed *= .9; last = time;
  });
  return state;
}

/* ---------- Intro (after loader) ---------- */
export function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  const split = new SplitText('.hero__title .word', { type: 'chars', charsClass: 'char' });
  gsap.set('.hero__title .word', { overflow: 'hidden', paddingBottom: '.06em', marginBottom: '-.06em', verticalAlign: 'top' });
  tl.from('.hero__img', { scale: 1.35, filter: 'brightness(.2) saturate(.4)', duration: 2.6, ease: 'power3.out' }, 0)
    .from(split.chars, { yPercent: 115, rotate: 8, duration: 1.4, stagger: .028 }, .25)
    .from('.hero__eyebrow, .hero__lede, .hero__foot .btn', { y: 30, opacity: 0, duration: 1.2, stagger: .1 }, .9)
    .from('.nav > *', { y: -30, opacity: 0, duration: 1, stagger: .08 }, 1)
    .from('.hero__scroll', { opacity: 0, duration: 1 }, 1.4)
    .from('.vessel__canvas', { opacity: 0, duration: 2.4, ease: 'power2.out' }, .4);
  return tl;
}

/* ---------- Scroll scenes ---------- */
export function initMotion() {
  const stars = starfield(document.querySelector('.hero__stars'));
  ScrollTrigger.create({ onUpdate: self => { stars.speed = Math.abs(self.getVelocity()) / 60; } });

  // WORLD: one pinned stage. Phase 1 (hero): fly into the nebula while the station grows out of the dark.
  // Phase 2 (craft): the camera circles the station, then flies on to the lunar lander.
  const T = HERO + CRAFT, at = x => HERO + CRAFT * x;   // craft progress x -> timeline time
  const world = gsap.timeline({ defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.world', start: 'top top', end: () => '+=' + innerHeight * T, scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: self => { stars.zoom = Math.min(self.progress * T / HERO, 1); } }
  });
  window.__craftY = () => { const st = world.scrollTrigger; return st.start + (st.end - st.start) * (HERO / T) + 2; };
  world.to(vessel, { h: 1, duration: HERO, ease: 'power1.inOut' }, 0)
       .to(vessel, { p: 1, duration: CRAFT }, HERO)
       .to('.hero__img', { scale: 2.3, duration: HERO, ease: 'power1.in' }, 0)
       .to('.hero__title .line:first-child', { scale: 2.8, yPercent: -120, xPercent: -18, opacity: 0, filter: 'blur(14px)', duration: HERO * .5, ease: 'power2.in' }, 0)
       .to('.hero__title .line--serif', { scale: 2.8, yPercent: 60, xPercent: 12, opacity: 0, filter: 'blur(14px)', duration: HERO * .5, ease: 'power2.in' }, HERO * .07)
       .to('.hero__eyebrow, .hero__foot', { y: 120, opacity: 0, duration: HERO * .3, ease: 'power1.in' }, 0)
       .to('.hero__scroll', { opacity: 0, duration: HERO * .15 }, 0)
       .to('.hero__veil', { opacity: 0, duration: HERO * .4 }, 0)
       .to('.hero__media', { opacity: 0, duration: HERO * .35, ease: 'power1.in' }, HERO * .65)
       .to('.hero__stars', { opacity: 0, duration: HERO * .2 }, HERO * .8)
       .fromTo('.vessel__intro', { opacity: 0, y: 120 }, { opacity: 1, y: 0, duration: HERO * .3, ease: 'power2.out', immediateRender: false }, HERO * .72)
       .to('.vessel__intro', { y: -120, opacity: 0, filter: 'blur(10px)', duration: CRAFT * .08, ease: 'power1.in' }, at(.07))
       .fromTo('.world__hud', { opacity: 0 }, { opacity: 1, duration: HERO * .2 }, HERO * .8)
       .fromTo('.world__hud b', { scaleX: 0 }, { scaleX: 1, duration: CRAFT }, HERO)
       .fromTo('.vessel__credit', { opacity: 0 }, { opacity: 1, duration: HERO * .2 }, HERO * .8)
       // giant hairline words drift behind the craft, far slower than the camera: the deepest parallax layer
       .fromTo('.world__word--a', { xPercent: 30, opacity: 0 }, { xPercent: -40, opacity: 1, duration: CRAFT * .55 }, at(0))
       .to('.world__word--a', { opacity: 0, duration: CRAFT * .1 }, at(.48))
       .fromTo('.world__word--b', { xPercent: 30, opacity: 0 }, { xPercent: -30, opacity: 1, duration: CRAFT * .4 }, at(.6));
  const notes = gsap.utils.toArray('.vessel__note');
  [[.14, .3], [.34, .5], [.8, .96]].forEach(([a, b], i) => {
    const n = notes[i], side = i % 2 ? 1 : -1;
    world.fromTo(n, { opacity: 0, x: 90 * side }, { opacity: 1, x: 0, duration: CRAFT * .05, ease: 'power2.out' }, at(a))
         .fromTo(n.querySelector('i'), { scaleX: 0 }, { scaleX: 1, duration: CRAFT * .05, ease: 'power2.out' }, at(a + .02))
         .to(n, { opacity: 0, x: -60 * side, filter: 'blur(8px)', duration: CRAFT * .04, ease: 'power1.in' }, at(b));
  });
  // HUD label follows the phase of the tour
  const hudN = document.querySelector('.world__hud-n'), hudT = document.querySelector('.world__hud-t');
  const phases = [[0, '00', 'Approach'], [HERO, '01', 'The station'], [at(.56), '02', 'Transit'], [at(.74), '03', 'The lander']];
  let lastPhase = -1;
  world.eventCallback('onUpdate', () => {
    const t = world.time(); let k = 0; phases.forEach((ph, i) => { if (t >= ph[0]) k = i; });
    if (k !== lastPhase) { lastPhase = k; hudN.textContent = phases[k][1]; hudT.textContent = phases[k][2]; }
  });

  // mouse parallax in the opening view: each layer moves a different amount, so the scene has depth
  if (!reduced && matchMedia('(pointer: fine)').matches) {
    const layers = [['.hero__media', 34], ['.hero__content', -8], ['.hero__title', -16]]
      .map(([sel, d]) => [gsap.quickTo(sel, 'x', { duration: 1.2, ease: 'power3.out' }), gsap.quickTo(sel, 'y', { duration: 1.2, ease: 'power3.out' }), d]);
    addEventListener('pointermove', e => {
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      layers.forEach(([qx, qy, d]) => { qx(-nx * d); qy(-ny * d * .6); });
    }, { passive: true });
  }

  // MANIFESTO — words light up as you read
  const mSplit = new SplitText('.manifesto__text', { type: 'words', wordsClass: 'mw' });
  gsap.fromTo(mSplit.words, { opacity: .12, y: 12 }, {
    opacity: 1, y: 0, stagger: .04, ease: 'none',
    scrollTrigger: { trigger: '.manifesto__text', start: 'top 80%', end: 'bottom 45%', scrub: true }
  });
  gsap.from('.manifesto .eyebrow', { x: -40, opacity: 0, duration: 1, scrollTrigger: { trigger: '.manifesto', start: 'top 80%' } });
  document.querySelectorAll('.stat__num').forEach(el => {
    const n = { v: 0 }, end = +el.dataset.count;
    el.textContent = '0';
    gsap.to(n, { v: end, duration: 2.2, ease: 'expo.out', onUpdate: () => el.textContent = Math.round(n.v).toLocaleString(),
      scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  gsap.from('.stat', { y: 60, opacity: 0, duration: 1.2, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.stats', start: 'top 88%' } });

  // DEPARTURE — window opens until you are inside the launch
  const dep = gsap.timeline({
    scrollTrigger: { trigger: '.departure', start: 'top top', end: '+=160%', scrub: 1, pin: '.departure__pin', anticipatePin: 1 }
  });
  dep.fromTo('.departure__frame', { clipPath: 'inset(32% 36% 32% 36% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut' }, 0)
     .fromTo('.departure__frame img', { scale: 1.6 }, { scale: 1, ease: 'power2.inOut' }, 0)
     .fromTo('.departure__l', { xPercent: 0 }, { xPercent: -60, ease: 'power2.inOut' }, 0)
     .fromTo('.departure__r', { xPercent: 0 }, { xPercent: 60, ease: 'power2.inOut' }, 0)
     .to('.departure__title', { opacity: 0, scale: 1.4, ease: 'power2.in' }, .6)
     .from('.departure__cap', { opacity: 0, y: 20 }, .7)
     .to('.departure__frame img', { scale: 1.15, ease: 'none' }, 1);

  // JOURNEY — horizontal travel, images drift inside their frames
  const track = document.querySelector('.journey__track');
  const travel = () => track.scrollWidth - innerWidth;
  const horiz = gsap.to(track, {
    x: () => -travel(), ease: 'none',
    scrollTrigger: { trigger: '.journey', start: 'top top', end: () => '+=' + travel(), scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true }
  });
  gsap.utils.toArray('.chapter').forEach((ch, i) => {
    gsap.fromTo(ch.querySelector('img'), { xPercent: -16, scale: 1.38 }, { xPercent: 16, scale: 1.38, ease: 'none',
      scrollTrigger: { trigger: ch, containerAnimation: horiz, start: 'left right', end: 'right left', scrub: true } });
    gsap.from(ch.querySelector('.chapter__body'), { y: 50, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: ch, containerAnimation: horiz, start: 'left 90%', end: 'left 55%', scrub: true } });
    gsap.fromTo(ch, { rotateY: -10, transformPerspective: 1600 }, { rotateY: 10, ease: 'none',
      scrollTrigger: { trigger: ch, containerAnimation: horiz, start: 'left right', end: 'right left', scrub: true } });
  });
  gsap.to('.journey__head', { x: -200, opacity: .25, ease: 'none',
    scrollTrigger: { trigger: '.journey', start: 'top top', end: () => '+=' + travel() * .5, scrub: true } });

  // DESTINATIONS — copy rises, scene scales in like arriving at a planet
  gsap.fromTo('.destinations', { clipPath: 'inset(8% 6% 8% 6% round 40px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
    scrollTrigger: { trigger: '.destinations', start: 'top bottom', end: 'top top', scrub: true } });
  gsap.from('.destinations__copy > *', { y: 80, opacity: 0, stagger: .12, duration: 1.3, ease: 'expo.out',
    scrollTrigger: { trigger: '.destinations', start: 'top 55%' } });

  // EARTHRISE — deep parallax, quote drifts against the image
  gsap.fromTo('.earthrise__bg', { yPercent: -24, scale: 1.2 }, { yPercent: 24, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.earthrise', start: 'top bottom', end: 'bottom top', scrub: true } });
  const qSplit = new SplitText('.earthrise__quote p', { type: 'lines,words', linesClass: 'ql' });
  gsap.from(qSplit.words, { yPercent: 100, opacity: 0, rotate: 4, stagger: .02, ease: 'power2.out',
    scrollTrigger: { trigger: '.earthrise__quote', start: 'top 95%', end: 'top 55%', scrub: 1 } });
  gsap.fromTo('.earthrise__quote', { y: 220 }, { y: -220, ease: 'none',
    scrollTrigger: { trigger: '.earthrise', start: 'top bottom', end: 'bottom top', scrub: true } });

  // VOYAGES — cards tip up out of the floor
  gsap.from('.voyages__head > *', { y: 60, opacity: 0, stagger: .1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.voyages', start: 'top 70%' } });
  gsap.from('.card', { y: 160, rotateX: -35, opacity: 0, transformOrigin: '50% 100%', stagger: .12, duration: 1.6, ease: 'expo.out',
    scrollTrigger: { trigger: '.cards', start: 'top 85%' } });
  gsap.utils.toArray('.card').forEach((c, i) => gsap.to(c, { yPercent: [-10, -30, -6][i], ease: 'none',
    scrollTrigger: { trigger: '.cards', start: 'top bottom', end: 'bottom top', scrub: true } }));

  // RESERVE — headline converges, orb rises like a sunrise
  gsap.fromTo('.reserve__title span', { xPercent: -40, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'power2.out',
    scrollTrigger: { trigger: '.reserve', start: 'top 85%', end: 'top 25%', scrub: 1 } });
  gsap.fromTo('.reserve__title em', { xPercent: 40, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'power2.out',
    scrollTrigger: { trigger: '.reserve', start: 'top 85%', end: 'top 25%', scrub: 1 } });
  gsap.fromTo('.orb', { y: 200, scale: .4 }, { y: 0, scale: 1, ease: 'power2.out',
    scrollTrigger: { trigger: '.reserve', start: 'top 60%', end: 'center center', scrub: 1 } });

  // DEPTH: anything with data-speed drifts against the scroll (below 1 lags behind, above 1 runs ahead)
  if (!reduced) gsap.utils.toArray('[data-speed]').forEach(el => {
    const k = 1 - parseFloat(el.dataset.speed);
    gsap.fromTo(el, { y: () => -k * innerHeight * .5 }, { y: () => k * innerHeight * .5, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
  });

  // PAGE PROGRESS: a hairline on the right edge
  const prog = document.querySelector('.progress span');
  if (prog) ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => { prog.style.transform = `scaleY(${s.progress})`; } });

  // FOOTER — wordmark rises out of the dark
  gsap.fromTo('.footer__big', { yPercent: 90 }, { yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  // NAV — hide on scroll down, show on scroll up
  const nav = document.querySelector('.nav');
  ScrollTrigger.create({ start: 120, end: 'max', onUpdate: self => gsap.to(nav, { yPercent: self.direction === 1 ? -130 : 0, duration: .5, ease: 'power3.out', overwrite: true }) });

  window.addEventListener('load', () => ScrollTrigger.refresh());
}
