// Motion layer: smooth scroll, intro, parallax, scroll fades.
document.fonts.ready.then(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // ---------- Smooth scroll ----------
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  window.__lenis = lenis;
  lenis.stop();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href')); if (!t) return;
    e.preventDefault(); lenis.scrollTo(t, { duration: 1.8 });
  }));

  // ---------- Loader + intro ----------
  const heroLines = $$('.hero__title .line');
  const heroSplit = SplitText.create(heroLines, { type: 'chars', charsClass: 'ch' });
  const intro = () => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.3, ease: 'expo.inOut' })
      .add(() => { document.body.classList.remove('is-loading'); lenis.start(); ScrollTrigger.refresh(); })
      .from('.hero__bg img', { scale: 1.35, duration: 2.4 }, '<0.1')
      .from(heroSplit.chars, { yPercent: 110, opacity: 0, rotate: 6, duration: 1.4, stagger: 0.028 }, '<0.35')
      .from('.hero .eyebrow, .hero__meta > *', { y: 30, opacity: 0, duration: 1.2, stagger: 0.1 }, '<0.4')
      .from('.nav', { y: -40, opacity: 0, duration: 1.2 }, '<')
      .from('.hero__card', { x: 60, opacity: 0, filter: 'blur(12px)', duration: 1.4 }, '<0.1')
      .from('.hero__scroll', { opacity: 0, duration: 1 }, '<0.3');
    return tl;
  };
  gsap.set('.loader', { clipPath: 'inset(0 0 0% 0)' });
  const arch = $('.loader__arch path'); const len = arch.getTotalLength();
  gsap.set(arch, { strokeDasharray: len, strokeDashoffset: len });
  const counter = { v: 0 };
  const ready = new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
  gsap.timeline()
    .to(arch, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' })
    .to(counter, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => ($('.loader__count span').textContent = Math.round(counter.v)) }, 0)
    .then(() => ready.then(intro));

  if (reduce) { ScrollTrigger.refresh(); return; }

  // ---------- Hero parallax ----------
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero__bg', { yPercent: 22, ease: 'none' }, 0)
    .to('.hero__content', { yPercent: -35, opacity: 0, ease: 'none' }, 0)
    .to('.hero__card', { yPercent: -260, ease: 'none' }, 0)
    .to('.hero__veil', { opacity: 1.0, backgroundColor: 'rgba(21,17,13,.6)', ease: 'none' }, 0);

  // ---------- Arched window opens ----------
  gsap.timeline({ scrollTrigger: { trigger: '.window', start: 'top top', end: '+=160%', pin: '.window__stage', scrub: 1 } })
    .fromTo('.window__frame', { clipPath: 'inset(18% 34% 12% 34% round 999px 999px 0px 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'power2.inOut' }, 0)
    .fromTo('.window__frame img', { scale: 1.45 }, { scale: 1, ease: 'power2.inOut' }, 0)
    .fromTo('.window__text', { scale: 1 }, { scale: 2.6, opacity: 0, ease: 'power2.in' }, 0);

  // ---------- Section titles: masked line reveal ----------
  $$('.section-title, .contact__title').forEach(el => {
    const s = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'ln' });
    gsap.from(s.lines, { yPercent: 105, duration: 1.4, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });

  // ---------- Generic fade-up ----------
  $$('.eyebrow:not(.hero .eyebrow), .lede, .room, .contact__form, .quote cite, .footer__row').forEach(el =>
    gsap.from(el, { y: 50, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));

  // ---------- Manifesto: words light up as you read ----------
  const mWords = SplitText.create('.manifesto__text', { type: 'words' }).words;
  gsap.fromTo(mWords, { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.manifesto__text', start: 'top 75%', end: 'bottom 45%', scrub: true } });
  gsap.from('.stat', { y: 80, opacity: 0, filter: 'blur(10px)', duration: 1.4, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.manifesto__stats', start: 'top 85%' } });
  $$('[data-count]').forEach(el => {
    const o = { v: 0 };
    gsap.to(o, { v: +el.dataset.count, duration: 2.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' }, onUpdate: () => (el.textContent = Math.round(o.v)) });
  });
  gsap.fromTo('.manifesto', { '--gx': '0vw' }, { '--gx': '-30vw', ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'bottom top', scrub: true } });

  // ---------- Residences: horizontal gallery ----------
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const track = $('.residences__track');
    const dist = () => track.scrollWidth - innerWidth;
    const h = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.residences', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true } });
    $$('.project').forEach((p, i) => {
      gsap.fromTo($('img', p), { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: h, start: 'left right', end: 'right left', scrub: true } });
      gsap.from($('.project__info', p), { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: p, containerAnimation: h, start: 'left 75%' } });
      gsap.fromTo(p, { rotate: i % 2 ? 2.5 : -2.5 }, { rotate: i % 2 ? -2.5 : 2.5, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: h, start: 'left right', end: 'right left', scrub: true } });
    });
  });
  mm.add('(max-width: 900px)', () => {
    $$('.project').forEach(p => gsap.from(p, { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 90%' } }));
  });

  // ---------- Materials: layered parallax ----------
  $$('.mat').forEach(m => {
    const s = parseFloat(m.dataset.speed || 1);
    gsap.fromTo(m, { y: (s - 1) * -500 }, { y: (s - 1) * 500, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo($('img', m), { scale: 1.3, yPercent: -8 }, { scale: 1.05, yPercent: 8, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from($('figcaption', m), { y: 30, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: m, start: 'top 70%' } });
  });

  // ---------- Rooms: images crossfade with the text ----------
  const roomImgs = $$('.rooms__visual img');
  gsap.set(roomImgs, { opacity: 0, scale: 1.12 }); gsap.set(roomImgs[0], { opacity: 1, scale: 1 });
  let current = 0;
  const show = i => {
    if (i === current) return;
    gsap.to(roomImgs[current], { opacity: 0, scale: 1.06, duration: 1.4, ease: 'power3.inOut', overwrite: true });
    gsap.fromTo(roomImgs[i], { opacity: 0, scale: 1.14 }, { opacity: 1, scale: 1, duration: 1.6, ease: 'power3.out', overwrite: true });
    current = i;
  };
  $$('.room').forEach((r, i) => ScrollTrigger.create({ trigger: r, start: 'top 55%', end: 'bottom 55%', onToggle: self => self.isActive && show(i) }));
  gsap.fromTo('.rooms__visual', { clipPath: 'inset(8% 8% 8% 8% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '.rooms', start: 'top bottom', end: 'top top', scrub: true } });

  // ---------- Generic background parallax ----------
  $$('.atelier__bg, .contact__bg').forEach(bg =>
    gsap.fromTo(bg, { yPercent: -12 }, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: bg.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  gsap.from('.service', { y: 120, opacity: 0, rotateX: -25, transformOrigin: '50% 100%', duration: 1.6, ease: 'expo.out', stagger: 0.14, scrollTrigger: { trigger: '.services', start: 'top 85%' } });

  // ---------- Quote ----------
  gsap.fromTo('.quote__img img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.quote__img', { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 18px 18px)', duration: 1.8, ease: 'expo.inOut', scrollTrigger: { trigger: '.quote', start: 'top 70%' } });
  const qWords = SplitText.create('.quote p', { type: 'words' }).words;
  gsap.from(qWords, { opacity: 0, y: 20, filter: 'blur(8px)', duration: 1.2, ease: 'power3.out', stagger: 0.04, scrollTrigger: { trigger: '.quote blockquote', start: 'top 75%' } });

  // ---------- Footer ----------
  const fChars = SplitText.create('.footer__big', { type: 'chars' }).chars;
  gsap.from(fChars, { yPercent: 100, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.035, scrollTrigger: { trigger: '.footer', start: 'top 85%' } });

  // ---------- Nav colour + progress ----------
  const nav = $('.nav');
  $$('[data-theme]').forEach(sec => ScrollTrigger.create({ trigger: sec, start: 'top 40px', end: 'bottom 40px', onToggle: self => self.isActive && nav.classList.toggle('is-light', sec.dataset.theme === 'light') }));
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  // ---------- Light sections rise like a curtain over the dark ones ----------
  $$('.manifesto, .materials, .quote').forEach(sec =>
    gsap.fromTo(sec, { borderRadius: '48px 48px 0 0', scaleX: 0.94 }, { borderRadius: '0px 0px 0 0', scaleX: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 20%', scrub: true } }));
});
