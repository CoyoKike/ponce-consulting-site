// Layer 2: motion. GSAP + ScrollTrigger + Lenis. Every chart motion draws a real value.
export function initMotion({ heroMap, setHeroStep, steps, growBars }) {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  const loader = document.querySelector('.loader');
  if (!gsap || !ST) { loader?.remove(); return; }
  gsap.registerPlugin(ST);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Solid top bar once the page scrolls, so no text runs under it ---------- */
  const nav = document.querySelector('.nav');
  const setBar = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', setBar, { passive: true }); setBar();

  const isPhone = matchMedia('(max-width: 760px)').matches;

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : document.querySelector(id);
      if (target === null) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.4 });
    }));
  }

  /* ---------- Loader: counts while the map and data are ready, then lifts ---------- */
  const num = loader?.querySelector('.loader__num');
  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  if (loader && !reduce) {
    const c = { v: 0 };
    intro.to(c, { v: 100, duration: 1.1, ease: 'power2.inOut', onUpdate: () => (num.textContent = Math.round(c.v)) })
      .to(loader, { yPercent: -100, duration: .9, ease: 'expo.inOut' })
      .set(loader, { display: 'none' });
  } else loader?.remove();
  intro.from('.hero__title .line', { yPercent: 110, opacity: 0, duration: 1.1, stagger: .12 }, loader && !reduce ? '-=.45' : 0)
    .from(['.hero__content .eyebrow', '.hero__lede'], { y: 24, opacity: 0, duration: .9, stagger: .1 }, '<.25')
    .from('.hero__panel', { x: 40, opacity: 0, duration: .9 }, '<.1')
    .from('.nav', { y: -30, opacity: 0, duration: .8, clearProps: 'transform,opacity' }, '<');

  /* ---------- Progress bar ---------- */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });

  /* ---------- Hero: pinned; each quarter of the scroll is one indicator ---------- */
  const v0 = { ...heroMap.view };
  ST.create({
    trigger: '.hero', start: 'top top', end: () => '+=' + innerHeight * (steps - 0.2), pin: '.hero__stage', scrub: true, anticipatePin: 1,
    onUpdate(self) {
      const p = self.progress;
      setHeroStep(Math.min(steps - 1, Math.floor(p * steps * 0.999)));
      if (!reduce) {
        const c = Math.min(1, p / 0.3); // first 30%: map slides to the centre as the name leaves
        heroMap.setView({ az: v0.az + p * 0.75, el: v0.el - p * 0.12, dist: v0.dist * (1 - p * 0.08), offsetX: v0.offsetX * (1 - c) });
      }
    },
  });
  if (!reduce) {
    // layered parallax: photo, map and title move at different speeds
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: () => '+=' + innerHeight * steps, scrub: true } })
      .to('.hero__media', { yPercent: 8, scale: 1.08, ease: 'none' }, 0)
      .to('.hero__content', { y: () => -innerHeight * .25, opacity: 0, ease: 'none', duration: .3 }, 0)
      .to('.hero__scroll', { opacity: 0, ease: 'none', duration: .1 }, 0)
      .to({}, { duration: .7 }, .3);
  }
  // step number roll
  const stepN = document.querySelector('.hero__step-n');
  const panelSwap = () => gsap.fromTo(['[data-metric-title]', '[data-metric-top]'], { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: .5, stagger: .05, overwrite: true });
  new MutationObserver(panelSwap).observe(stepN, { childList: true });

  if (reduce) return;

  /* ---------- Photo plates: slow parallax behind each section ---------- */
  document.querySelectorAll('.plate').forEach(sec => {
    const media = sec.querySelector('.plate__media');
    if (!media || media.classList.contains('plate__media--fixed')) return;
    gsap.fromTo(media, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  const dataMedia = document.querySelector('.plate__media--fixed');
  if (dataMedia) gsap.fromTo(dataMedia, { yPercent: 0 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '#datos', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- Headings and eyebrows ---------- */
  gsap.utils.toArray('section:not(.hero):not(.band) .h2, section:not(.hero):not(.band) .eyebrow, .data__lede').forEach(el => {
    gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  /* ---------- About: panels slide in at different speeds ---------- */
  gsap.from('.about__text', { x: -40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.about__grid', start: 'top 85%', once: true } });
  gsap.from('.about .facts div', { y: 20, opacity: 0, duration: .7, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.about__grid', start: 'top 85%', once: true } });
  gsap.to('.about__grid', { y: -60, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- Timeline: the line fills as you read ---------- */
  const tl = document.querySelector('.timeline');
  const fill = document.createElement('span');
  fill.className = 'timeline__fill';
  tl.prepend(fill);
  gsap.to(fill, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: true } });
  gsap.utils.toArray('.tl').forEach(li => {
    gsap.from(li, { x: 40, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 88%', once: true } });
  });

  /* ---------- Cards: staggered entrance ---------- */
  [['.kpi', '.kpis'], ['.project', '.projects__list']].forEach(([items, wrap]) => {
    gsap.from(items, { y: 60, opacity: 0, duration: 1, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: wrap, start: 'top 85%', once: true } });
  });
  // projects: middle card drifts at a different speed (layered parallax)
  if (!isPhone) gsap.utils.toArray('.project').forEach((p, i) => {
    gsap.to(p, { y: [-30, 30, -10][i] || 0, ease: 'none', scrollTrigger: { trigger: '.projects', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- KPI numbers count up to their real value ---------- */
  document.querySelectorAll('.kpi__v').forEach(el => {
    ST.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter() {
        const text = el.textContent;
        const target = parseFloat(text.replace(/[^\d.]/g, ''));
        const dec = (text.split('.')[1] || '').length;
        const fmt = new Intl.NumberFormat(document.documentElement.lang === 'en' ? 'en-US' : 'es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
        const c = { v: 0 };
        gsap.to(c, { v: target, duration: 1.4, ease: 'power2.out', onUpdate: () => (el.textContent = fmt.format(c.v)), onComplete: () => (el.textContent = text) });
      },
    });
  });

  /* ---------- Charts ---------- */
  document.querySelectorAll('.card').forEach(card => {
    gsap.from(card, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 88%', once: true } });
    const chart = card.querySelector('.chart');
    ST.create({
      trigger: card, start: 'top 88%', once: true,
      onEnter() {
        if (chart._bars) growBars(chart);
        const path = chart.querySelector('.line');
        if (path) {
          const len = path.getTotalLength();
          gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' });
        }
      },
    });
  });

  /* ---------- Contact ---------- */
  gsap.from(['.contact__lede', '.service', '.contact__facts'], { y: 40, opacity: 0, duration: 1, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.contact__inner', start: 'top 80%', once: true } });
  gsap.from('.contact__visual', { x: 60, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.contact__inner', start: 'top 80%', once: true } });
  // closing name drifts sideways as the page ends (layered parallax)
  gsap.fromTo('.contact__mark', { xPercent: 4 }, { xPercent: -4, ease: 'none', scrollTrigger: { trigger: '.contact__mark', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- Scroll scenes: text arrives as the scene pins ---------- */
  gsap.utils.toArray('.band').forEach(band => {
    gsap.from(band.querySelectorAll('.band__text > *'), { y: 40, opacity: 0, duration: 1, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: band, start: 'top 55%', once: true } });
  });

  /* ---------- Active nav link ---------- */
  const links = [...document.querySelectorAll('.nav__links a')];
  links.forEach(a => {
    const sec = document.querySelector(a.getAttribute('href'));
    if (!sec) return;
    ST.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: s => s.isActive && links.forEach(l => l.classList.toggle('is-active', l === a)) });
  });

  window.addEventListener('load', () => ST.refresh());
}
