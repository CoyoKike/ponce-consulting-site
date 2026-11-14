// Miga motion. GSAP + ScrollTrigger + Lenis.
// The opening flies through the i of the name into the loaf; small photos open inside the story sentence;
// the bake steps scroll past one pinned photo that wipes to the next step; the counter grid reshuffles on a filter;
// two rows of photos slide against each other.
export function initMotion({ ready, getHero, bus, reduce }) {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const loader = $('.loader');
  const nav = $('.nav');
  const setBar = () => nav.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', setBar, { passive: true }); setBar();
  if (!gsap || !ST) { loader?.remove(); return; }
  gsap.registerPlugin(ST);
  const mm = gsap.matchMedia();

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
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

  /* ---------- loader: the name fills from the bottom like rising dough, then the page slides up from under it ---------- */
  const fill = $('.loader__fill');
  const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  intro.from('.hero__title .line', { yPercent: 105, duration: 1.3, stagger: .1 }, 0)
    .from(['.hero__kicker', '.hero__lede', '.hero__actions', '.hero__cue'], { y: 18, opacity: 0, duration: 1.1, stagger: .07 }, .2)
    .from('.nav', { y: -16, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, .25);
  if (loader && !reduce) {
    const c = { v: 0 };
    const draw = () => (fill.style.clipPath = `inset(${(100 - c.v).toFixed(1)}% 0 0 0)`);
    const grow = gsap.to(c, { v: 80, duration: 1.8, ease: 'power2.out', onUpdate: draw });
    Promise.race([ready, new Promise(r => setTimeout(r, 6000))]).then(() => {
      grow.kill();
      gsap.timeline()
        .to(c, { v: 100, duration: .45, ease: 'power2.inOut', onUpdate: draw }, Math.max(0, 1 - grow.time()))
        .to('.loader__note', { opacity: 0, duration: .3 }, '<')
        .to(loader, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '+=.1')
        .add(() => { getHero()?.intro(); intro.play(); }, '-=.6')
        .set(loader, { display: 'none' });
    });
  } else { loader?.remove(); ready.then(() => getHero()?.intro(true)); intro.progress(1); }

  const links = $$('.nav__links a');
  const activeLinks = () => links.forEach(a => {
    const sec = $(a.getAttribute('href'));
    ST.create({ trigger: sec, start: 'top 45%', end: 'bottom 45%', onToggle: s => s.isActive && links.forEach(l => l.classList.toggle('is-active', l === a)), onLeaveBack: () => a === links[0] && links.forEach(l => l.classList.remove('is-active')) });
  });

  if (reduce) { activeLinks(); ST.refresh(); return; }

  /* ---------- HERO: pinned. Fly through the i into the loaf, then the loaf's name card ---------- */
  const stageH = () => $('.hero__stage').offsetHeight;
  const heroLen = () => stageH() * 2.6;
  ST.create({ trigger: '.hero', start: 'top top', end: () => '+=' + heroLen(), pin: '.hero__stage', pinSpacing: true, scrub: true, anticipatePin: 1,
    onUpdate: self => getHero()?.setScroll(self.progress) });
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: () => '+=' + heroLen(), scrub: .5 } })
    .to('.hero__copy', { y: 60, opacity: 0, ease: 'power1.in', duration: .14 }, 0)
    .to('.hero__cue', { opacity: 0, duration: .06 }, 0)
    .fromTo('.hero__land', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .1, ease: 'power2.out' }, .66)
    .to('.hero__land', { y: 0, duration: .24 }, .76);

  /* ---------- headings: each line slides up out of a mask ---------- */
  $$('section:not(.hero) .h2').forEach(h => {
    const parts = h.innerHTML.split(/<br\s*\/?>/i);
    h.innerHTML = parts.map(x => `<span class="ln"><span>${x}</span></span>`).join('');
    gsap.from(h.querySelectorAll('.ln > span'), { yPercent: 105, duration: 1.2, ease: 'expo.out', stagger: .09, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });
  $$('section:not(.hero) .kicker').forEach(k => gsap.from(k, { opacity: 0, y: 10, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: k, start: 'top 92%', once: true } }));

  /* ---------- STORY: the photos open inside the sentence as it scrolls up ---------- */
  $$('.pill').forEach((p, i) => {
    const w = parseFloat(p.dataset.w) || 2;
    gsap.fromTo(p, { width: '0em', marginLeft: '-.1em', marginRight: '-.1em' }, { width: w + 'em', marginLeft: '.06em', marginRight: '.06em', ease: 'power2.out',
      scrollTrigger: { trigger: '.statement', start: `top ${78 - i * 6}%`, end: `top ${40 - i * 6}%`, scrub: .6 } });
  });
  gsap.from('.statement', { y: 50, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.statement', start: 'top 90%', once: true } });
  $$('.count').forEach(n => {
    const to = +n.dataset.to;
    ST.create({ trigger: n, start: 'top 90%', once: true, onEnter: () => { const c = { v: 0 }; gsap.to(c, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: () => (n.textContent = Math.round(c.v)) }); } });
  });
  gsap.from('.fact', { y: 40, opacity: 0, duration: 1.1, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.story__cols', start: 'top 88%', once: true } });
  // the wide photo opens from a narrow band to the full width, while the image inside drifts slower than the page
  gsap.fromTo('.story__wideimg', { clipPath: 'inset(0% 18% 0% 18%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: '.story__wide', start: 'top 95%', end: 'top 25%', scrub: true } });
  gsap.fromTo('.story__wideimg img', { yPercent: -16 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.story__wide', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- PROCESS: one pinned photo; each step wipes its photo up over the last ---------- */
  const steps = $$('.pstep'), imgs = $$('.pimg'), clock = $('.process__t');
  mm.add('(min-width: 761px)', () => {
    steps.forEach((s, i) => {
      ST.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: self => {
        if (!self.isActive) return;
        steps.forEach(x => x.classList.toggle('is-active', x === s));
        gsap.fromTo(clock, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .5, ease: 'power3.out', onStart: () => (clock.textContent = s.dataset.t) });
      } });
      if (!i) return;
      gsap.timeline({ scrollTrigger: { trigger: s, start: 'top 95%', end: 'top 40%', scrub: .6 } })
        .fromTo(imgs[i], { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0)
        .fromTo(imgs[i], { scale: 1.18 }, { scale: 1, ease: 'none' }, 0)
        .to(imgs[i - 1], { scale: .94, ease: 'none' }, 0);
    });
    gsap.fromTo('.process__rail span', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.process__steps', start: 'top 55%', end: 'bottom 55%', scrub: true } });
    steps[0].classList.add('is-active');
    return () => steps.forEach(x => x.classList.remove('is-active'));
  });
  mm.add('(max-width: 760px)', () => {
    $$('.pstep__img').forEach(im => gsap.fromTo(im, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', scrollTrigger: { trigger: im, start: 'top 92%', end: 'top 55%', scrub: .6 } }));
  });

  /* ---------- COUNTER: cards rise in rows; a filter fades the grid out and deals the kept cards back in ---------- */
  const items = $$('.item');
  const batch = ST.batch(items, { start: 'top 92%', once: true, onEnter: b => gsap.from(b, { y: 50, opacity: 0, duration: 1, stagger: .07, ease: 'expo.out' }) });
  let busy = null;
  window.__filterAnim = (all, keep) => {
    busy?.kill();
    // after the first filter the grid is in view: drop the rise-in triggers so they never replay on the dealt cards
    batch.forEach(t => t.kill()); gsap.killTweensOf(all);
    const out = all.filter(i => !i.hidden);
    busy = gsap.timeline()
      .to(out, { opacity: 0, y: 14, duration: .22, stagger: .015, ease: 'power2.in' })
      .add(() => { all.forEach(i => (i.hidden = !keep.includes(i))); ST.refresh(); })
      .fromTo(keep, { opacity: 0, y: 30, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: .7, stagger: .05, ease: 'expo.out', clearProps: 'transform' });
  };
  gsap.from('.menu__3d', { opacity: 0, scale: .9, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.menu__head', start: 'top 80%', once: true } });

  /* ---------- GALLERY: the two rows slide in opposite directions ---------- */
  const shift = el => Math.max(0, el.scrollWidth - innerWidth);
  gsap.fromTo('.strip--a', { x: 0 }, { x: () => -shift($('.strip--a')), ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: .4, invalidateOnRefresh: true } });
  gsap.fromTo('.strip--b', { x: () => -shift($('.strip--b')) }, { x: 0, ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: .4, invalidateOnRefresh: true } });

  /* ---------- VISIT ---------- */
  gsap.from('.week li', { y: 30, opacity: 0, duration: .9, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: '.week', start: 'top 90%', once: true } });
  gsap.fromTo('.visit__shop img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.visit__shop', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.visit__shop', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.visit__grid', start: 'top 85%', once: true } });
  gsap.from('.where', { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.visit__grid', start: 'top 85%', once: true } });

  /* ---------- ORDER ---------- */
  gsap.from('.form > *', { y: 24, opacity: 0, duration: .9, stagger: .05, ease: 'power3.out', scrollTrigger: { trigger: '.form', start: 'top 85%', once: true } });
  gsap.from('.tray', { y: 80, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.tray', start: 'top 90%', once: true } });
  bus.addEventListener('formerror', () => gsap.fromTo('.form .btn--big', { x: -10 }, { x: 0, duration: .7, ease: 'elastic.out(1.2, .2)' }));
  bus.addEventListener('booked', () => gsap.from('.form__done > *', { y: 24, opacity: 0, duration: .9, stagger: .07, ease: 'expo.out' }));

  /* ---------- FOOTER ---------- */
  gsap.from('.foot__grid > *', { y: 30, opacity: 0, duration: 1, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 92%', once: true } });

  activeLinks();
  addEventListener('load', () => ST.refresh());
  ready.then(() => ST.refresh());
  document.fonts?.ready.then(() => ST.refresh());
}
