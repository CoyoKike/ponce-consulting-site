// Layer 2: motion. GSAP + ScrollTrigger + Lenis.
// Scrolling moves you forward: the camera lands on the dish, an arch opens into the room,
// the fire stages slide sideways, photos drift at different depths.
export function initMotion({ ready, getHero, getScenes, bus, reduce }) {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const loader = $('.loader');
  const nav = $('.nav');
  const setBar = () => nav.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', setBar, { passive: true }); setBar();
  if (!gsap || !ST) { loader?.remove(); return; }
  gsap.registerPlugin(ST);
  const isPhone = matchMedia('(max-width: 760px)').matches;
  const mm = gsap.matchMedia();

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.6, offset: id === '#top' ? 0 : -10 });
    else (target === 0 ? scrollTo(0, 0) : target.scrollIntoView());
  }));

  /* ---------- loader: fills while the 3D loads, then lifts like a curtain ---------- */
  const bar = $('.loader__bar span'), num = $('.loader__num');
  const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  intro.from('.hero__title .line', { yPercent: 105, duration: 1.4, stagger: .12 }, 0)
    .from(['.hero__copy .eyebrow', '.hero__lede', '.hero__actions'], { y: 26, opacity: 0, duration: 1.2, stagger: .08 }, .25)
    .from(['.hero__meta', '.hero__scroll', '.hero__chapters'], { opacity: 0, duration: 1.2 }, .5)
    .from('.nav', { y: -20, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, .3);
  if (loader && !reduce) {
    const c = { v: 0 };
    const fill = gsap.to(c, { v: 90, duration: 1.6, ease: 'power2.out', onUpdate: () => { num.textContent = Math.round(c.v); bar.style.transform = `scaleX(${c.v / 100})`; } });
    Promise.race([ready, new Promise(r => setTimeout(r, 6000))]).then(() => {
      fill.kill();
      gsap.timeline()
        .to(c, { v: 100, duration: .5, ease: 'power2.inOut', onUpdate: () => { num.textContent = Math.round(c.v); bar.style.transform = `scaleX(${c.v / 100})`; } }, Math.max(0, 1.1 - fill.time()))
        .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' })
        .add(() => { getHero()?.intro(); intro.play(); }, '-=.55')
        .set(loader, { display: 'none' });
    });
  } else { loader?.remove(); ready.then(() => getHero()?.intro(true)); intro.progress(1); }

  /* ---------- top progress line and active link ---------- */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
  // active link: made after every pin exists, so the positions include the pinned scroll distance
  const links = $$('.nav__links a');
  const activeLinks = () => links.forEach(a => {
    const sec = $(a.getAttribute('href'));
    ST.create({ trigger: sec, start: 'top 45%', end: 'bottom 45%', onToggle: s => s.isActive && links.forEach(l => l.classList.toggle('is-active', l === a)), onLeaveBack: () => a === links[0] && links.forEach(l => l.classList.remove('is-active')) });
  });

  if (reduce) { activeLinks(); ST.refresh(); return; }

  /* ---------- HERO: pinned. The camera pushes in and lands on the dish; copy and meta lift away ---------- */
  // The pin is 3.4 stage heights long (about 2.1 of them push in, like v5). .enter overlaps the hero by exactly one stage height (CSS margin-top -100svh),
  // so during the last stage height of the pin the room photo rises over the held, sharp molcajete like a curtain,
  // and the room's own pin starts on the very frame where the hero's ends: no band, no seam.
  const stageH = () => $('.hero__stage').offsetHeight;
  const heroLen = () => stageH() * 3.4;
  const chapters = $$('.chapter');
  ST.create({
    trigger: '.hero', start: 'top top', end: () => '+=' + heroLen(), pin: '.hero__stage', pinSpacing: true, scrub: true, anticipatePin: 1,
    onUpdate(self) {
      const p = self.progress;
      getHero()?.setScroll(p);
      const k = Math.min(2, Math.floor(p * 3.2));
      chapters.forEach((c, i) => c.classList.toggle('is-on', i === k));
    },
  });
  chapters[0]?.classList.add('is-on');
  // timeline positions are shares of the hero pin (total 1); the room starts covering at 1 - 1/3.4 = .706
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: () => '+=' + heroLen(), scrub: .6 } })
    .to('.hero__copy', { y: () => -innerHeight * .3, opacity: 0, ease: 'power1.in', duration: .2 }, 0)
    .to(['.hero__meta', '.hero__scroll'], { opacity: 0, duration: .1 }, 0)
    .to('.hero__shade', { opacity: .35, duration: .32 }, 0)
    .to('.hero__chapters', { y: -40, opacity: 0, duration: .08 }, .40)
    // the push lands on the molcajete: its name rises in, holds, and lifts away just before the room arrives
    .fromTo('.hero__land', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .08, ease: 'power2.out' }, .50)
    .to('.hero__land', { y: -24, opacity: 0, duration: .06, ease: 'power1.in' }, .64)
    // as the room covers it, the molcajete sinks into shadow
    .fromTo('.hero__dim', { opacity: 0 }, { opacity: .7, ease: 'none', duration: .294 }, .706);

  /* ---------- ENTER: a black panel rises over the hero like a curtain, with the room seen through a keyhole arch in it.
     Then the stage pins: the arch opens to full screen while the camera pushes through it into the room ---------- */
  const ph = () => innerWidth <= 760;
  // rounded-top arch as shares of the screen (top, right, bottom, left); radius = half the arch width, so the top is a true half circle
  const archAt = () => ph() ? 'inset(20% 16% 22% 16% round 34vw 34vw 0vw 0vw)' : 'inset(14% 37% 10% 37% round 13vw 13vw 0vw 0vw)';
  const archOpen = 'inset(0% 0% 0% 0% round 0vw 0vw 0vw 0vw)';
  gsap.set('.enter__frame', { clipPath: archAt() });
  // while it rises, the room inside the arch slides at its own (slower) speed, so it has depth as it comes up
  gsap.fromTo('.enter__frame img', { yPercent: -10, scale: 1.04 }, { yPercent: 0, scale: 1.04, ease: 'none', immediateRender: true,
    scrollTrigger: { trigger: '.enter', start: 'top bottom', end: 'top top', scrub: true, invalidateOnRefresh: true } });
  gsap.fromTo('.enter__text', { y: () => innerHeight * .18, opacity: 0 }, { y: 0, opacity: 1, ease: 'power2.out', immediateRender: true,
    scrollTrigger: { trigger: '.enter', start: 'top 70%', end: 'top 5%', scrub: true, invalidateOnRefresh: true } });
  const enterTl = gsap.timeline({ scrollTrigger: { trigger: '.enter', start: 'top top', end: () => '+=' + innerHeight * 1.9, pin: '.enter__stage', scrub: .8, anticipatePin: 1, invalidateOnRefresh: true } });
  // keyhole: the arch widens to full screen while the room grows, like walking up to the keyhole and through it
  enterTl.fromTo('.enter__frame', { clipPath: archAt }, { clipPath: archOpen, ease: 'power2.inOut', duration: .78, immediateRender: false }, 0)
    .fromTo('.enter__frame img', { scale: 1.04 }, { scale: () => ph() ? 1.1 : 1.3, ease: 'power1.inOut', duration: 1, immediateRender: false }, 0)
    .fromTo('.enter__text', { scale: 1 }, { scale: 1.12, ease: 'none', duration: .6, immediateRender: false }, 0)
    .to('.enter__text', { scale: 1.6, opacity: 0, ease: 'power2.in', duration: .4 }, .55)
    .from('.enter__label', { opacity: 0, y: 10, duration: .2 }, .7);

  /* ---------- section headings: lines rise out of a mask ---------- */
  $$('section:not(.hero):not(.enter) .h2').forEach(h => {
    const parts = h.innerHTML.split(/<br\s*\/?>/i);
    h.innerHTML = parts.map(x => `<span class="ln"><span>${x}</span></span>`).join('');
    gsap.from(h.querySelectorAll('.ln > span'), { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });
  $$('section:not(.hero):not(.enter) .eyebrow').forEach(e => {
    gsap.from(e, { opacity: 0, x: -16, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: e, start: 'top 90%', once: true } });
  });

  /* ---------- STORY: words light up as you read; photos drift at their own depth ---------- */
  $$('.reveal-words').forEach(p => {
    p.innerHTML = p.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
    gsap.to(p.querySelectorAll('.w'), { opacity: 1, stagger: .05, ease: 'none', scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 52%', scrub: true } });
  });
  $$('[data-speed]:not(.gcol)').forEach(el => {
    const s = parseFloat(el.dataset.speed);
    gsap.fromTo(el, { y: () => -s * innerHeight }, { y: () => s * innerHeight, ease: 'none', scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
  });
  $$('.ph img').forEach(img => gsap.fromTo(img, { yPercent: -9 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.ph').forEach(ph => gsap.from(ph, { clipPath: 'inset(100% 0 0 0)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: ph, start: 'top 85%', once: true } }));
  $$('.facts dt').forEach(dt => {
    const v = +dt.textContent;
    ST.create({ trigger: dt, start: 'top 90%', once: true, onEnter: () => { const c = { v: 0 }; gsap.to(c, { v, duration: 1.6, ease: 'power3.out', onUpdate: () => (dt.textContent = Math.round(c.v)) }); } });
  });
  gsap.from('.facts div', { y: 30, opacity: 0, duration: 1, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.facts', start: 'top 90%', once: true } });

  /* ---------- JOURNEY: pinned, the four stages slide past sideways ---------- */
  const track = $('.journey__track'), count = $('.journey__n'), steps = $$('.step');
  const dist = () => Math.max(0, track.scrollWidth - (innerWidth - track.getBoundingClientRect().left) + 20);
  const jt = gsap.timeline({ scrollTrigger: { trigger: '.journey', start: 'top top', end: () => '+=' + (dist() + innerHeight * .4), pin: '.journey__stage', scrub: .8, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: s => { count.textContent = '0' + (1 + Math.min(3, Math.floor(s.progress * 4 * .999))); } } });
  jt.to(track, { x: () => -dist(), ease: 'none' }, 0);
  steps.forEach((st, i) => {
    jt.fromTo(st.querySelector('img'), { xPercent: -12 }, { xPercent: 0, ease: 'none' }, 0);
    jt.fromTo(st, { rotate: i % 2 ? 1.2 : -1.2, y: i % 2 ? 26 : -10 }, { rotate: 0, y: 0, ease: 'none' }, 0);
  });
  gsap.from(steps, { x: 120, opacity: 0, duration: 1.3, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.journey', start: 'top 70%', once: true } });

  /* ---------- MENU ---------- */
  const rowsIn = panel => gsap.fromTo(panel.querySelectorAll('.dish'), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .05, ease: 'power3.out', overwrite: true });
  ST.create({ trigger: '.menu__grid', start: 'top 85%', once: true, onEnter: () => rowsIn($('.panel.is-on')) });
  gsap.set('.panel.is-on .dish', { opacity: 0 });
  bus.addEventListener('tab', e => rowsIn(e.detail.panel));
  mm.add('(min-width: 1081px)', () => {
    gsap.fromTo('.menu__photo img', { scale: 1.15, yPercent: -6 }, { scale: 1, yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.menu', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.menu__show', { clipPath: 'inset(0 0 100% 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.menu__grid', start: 'top 80%', once: true } });
  });
  const peek = $('.dish-peek');
  const px = gsap.quickTo(peek, 'x', { duration: .5, ease: 'power3' }), py = gsap.quickTo(peek, 'y', { duration: .5, ease: 'power3' });
  const pr = gsap.quickTo(peek, 'rotation', { duration: .8, ease: 'power3' });
  let lastX = 0;
  bus.addEventListener('peek', e => {
    const d = e.detail;
    if (!d.on) { gsap.to(peek, { autoAlpha: 0, scale: .85, duration: .3, overwrite: 'auto' }); return; }
    px(d.x + 28); py(d.y - 140); pr(gsap.utils.clamp(-8, 8, (d.x - lastX) * .6)); lastX = d.x;
    gsap.to(peek, { autoAlpha: 1, scale: 1, duration: .35, overwrite: 'auto' });
  });

  /* ---------- GALLERY: four columns at four depths ---------- */
  // each column rises from its own depth and settles at its place, never above it, so no photo
  // ever slides over the heading
  $$('.gcol').forEach(el => {
    const s = Math.abs(parseFloat(el.dataset.speed)) * 1.6;
    gsap.fromTo(el, { y: () => s * innerHeight }, { y: 0, ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true } });
  });
  $$('.gi').forEach(gi => gsap.from(gi, { clipPath: 'inset(0 0 100% 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: gi, start: 'top 92%', once: true } }));
  $$('.gi img').forEach(img => gsap.fromTo(img, { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom 30%', scrub: true } }));

  /* ---------- VISIT and RESERVE ---------- */
  gsap.from('.visit .card', { y: 80, opacity: 0, duration: 1.2, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.visit__grid', start: 'top 85%', once: true } });
  gsap.from('.hours__table tr', { x: -20, opacity: 0, duration: .8, stagger: .06, ease: 'power3.out', scrollTrigger: { trigger: '.hours__table', start: 'top 90%', once: true } });
  gsap.fromTo('.reserve__bg', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.reserve', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.form', { y: 90, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.reserve__grid', start: 'top 80%', once: true } });
  gsap.from('.form > *', { y: 20, opacity: 0, duration: .9, stagger: .05, ease: 'power3.out', scrollTrigger: { trigger: '.reserve__grid', start: 'top 75%', once: true } });

  /* ---------- FOOTER: the name drifts in from both sides ---------- */
  const mark = $('.foot__mark');
  mark.innerHTML = [...mark.textContent].map(ch => `<span>${ch}</span>`).join('');
  gsap.fromTo(mark.children, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: .05, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  $$('.foot__mark span').forEach(s => (s.style.display = 'inline-block'));

  /* ---------- tabs: one pill slides under the chosen tab ---------- */
  const tabsEl = $('.tabs'), pill = document.createElement('span');
  pill.className = 'tabs__pill'; tabsEl.prepend(pill);
  const movePill = (instant) => { const t = $('.tab.is-on'); gsap.to(pill, { x: t.offsetLeft, width: t.offsetWidth, duration: instant ? 0 : .7, ease: 'elastic.out(1, .75)' }); };
  movePill(true); addEventListener('resize', () => movePill(true));
  bus.addEventListener('tab', () => movePill());
  // a wrong form shakes the button, like a door that will not open
  bus.addEventListener('formerror', () => gsap.fromTo('.form .btn--big', { x: -10 }, { x: 0, duration: .7, ease: 'elastic.out(1.2, .2)' }));
  bus.addEventListener('booked', () => gsap.from('.form__done > *', { y: 24, opacity: 0, duration: .9, stagger: .07, ease: 'expo.out' }));

  activeLinks();
  addEventListener('load', () => ST.refresh());
  ready.then(() => ST.refresh());
}
