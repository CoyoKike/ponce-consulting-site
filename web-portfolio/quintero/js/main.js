(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isPhone = matchMedia('(max-width: 900px)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  let lang = 'en', lenis = null, ride = null;

  /* ---------- hero letters ---------- */
  function splitChars() {
    $$('.chars').forEach(el => {
      el.innerHTML = [...el.textContent].map(c => c === ' ' ? ' ' : `<span class="ch">${c}</span>`).join('');
    });
  }

  /* ---------- language ---------- */
  const store = {
    get: () => { try { return localStorage.getItem('aq-lang'); } catch (e) { return null; } },
    set: v => { try { localStorage.setItem('aq-lang', v); } catch (e) {} }
  };
  const L = (en, es) => (lang === 'es' ? es : en);
  function setLang(next) {
    lang = next;
    document.documentElement.lang = next;
    $$('[data-es]').forEach(el => {
      if (el.dataset.en === undefined) el.dataset.en = el.classList.contains('chars') ? el.textContent : el.innerHTML;
      el.innerHTML = next === 'es' ? el.dataset.es : el.dataset.en;
    });
    $$('[data-es-ph]').forEach(el => {
      if (el.dataset.enPh === undefined) el.dataset.enPh = el.placeholder;
      el.placeholder = next === 'es' ? el.dataset.esPh : el.dataset.enPh;
    });
    $('.lang__on').textContent = next.toUpperCase();
    $('.lang__off').textContent = next === 'es' ? 'EN' : 'ES';
    splitChars();
    store.set(next);
    if (hasGsap) ScrollTrigger.refresh();
  }
  $('.lang').addEventListener('click', () => setLang(lang === 'en' ? 'es' : 'en'));
  if (store.get() === 'es') setLang('es'); else splitChars();

  /* ---------- mobile menu ---------- */
  const burger = $('.nav__burger');
  const toggleMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    $('.menu').setAttribute('aria-hidden', !open);
  };
  burger.addEventListener('click', () => toggleMenu(!document.body.classList.contains('menu-open')));
  $$('.menu a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  /* ---------- home details ---------- */
  const LIST = [
    { img: 'acorn', en: 'A Greek Revival townhouse on the flat of the Hill, with a private roof deck, a wine room and deeded parking two doors down. Four bedrooms, three and a half baths.', es: 'Una casa neoclásica en lo plano de la colina, con terraza privada, cava y estacionamiento propio a dos puertas. Cuatro habitaciones, tres baños y medio.' },
    { img: 'backbay', en: 'A full-floor penthouse under a restored mansard, with river views from every bedroom and a private elevator. Three bedrooms, three baths.', es: 'Un penthouse de piso completo bajo una mansarda restaurada, con vista al río desde cada habitación y ascensor privado. Tres habitaciones, tres baños.' },
    { img: 'southend', en: 'A bowfront brownstone facing the park, with original plaster moldings, a garden level for guests and a south-facing yard. Five bedrooms, four baths.', es: 'Una casa de ladrillo frente al parque, con molduras originales, un nivel jardín para visitas y patio al sur. Cinco habitaciones, cuatro baños.' },
    { img: 'colonial', en: 'A Federal colonial built in 1792, two blocks from the harbor, with nine fireplaces, wide pine floors and a widow’s walk. Five bedrooms.', es: 'Una casa federal de 1792 a dos cuadras del puerto, con nueve chimeneas, pisos de pino y mirador en el techo. Cinco habitaciones.' }
  ];
  const sheet = $('.sheet');
  function openSheet(card) {
    const d = LIST[+card.dataset.i];
    $('.sheet__img img').src = `assets/img/${d.img}.webp`;
    $('.sheet__img img').alt = card.querySelector('img').alt;
    const tag = card.querySelector('.tag');
    const st = $('.sheet__tag'); st.className = tag.className + ' sheet__tag'; st.textContent = tag.textContent;
    $('.sheet__name').innerHTML = card.querySelector('.home__name').innerHTML;
    $('.sheet__place').textContent = card.querySelector('.home__place').textContent;
    $('.sheet__price').textContent = card.querySelector('.home__price').textContent;
    $('.sheet__desc').textContent = L(d.en, d.es);
    if (lenis) lenis.stop();
    sheet.showModal();
  }
  sheet.addEventListener('close', () => { if (lenis) lenis.start(); });
  $('.sheet__x').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
  $('.sheet .btn').addEventListener('click', () => sheet.close());
  $$('.stop--home').forEach(c => {
    c.tabIndex = 0;
    c.addEventListener('click', () => openSheet(c));
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet(c); } });
  });

  /* ---------- forms (concept: nothing is sent) ---------- */
  function fakeSubmit(form, okSel) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      $$('[required]', form).forEach(i => {
        const bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value));
        i.classList.toggle('bad', bad); if (bad) ok = false;
      });
      if (!ok) return;
      $$('input,textarea,button[type=submit]', form).forEach(x => x.disabled = true);
      $(okSel, form).hidden = false;
    });
  }
  fakeSubmit($('.value'), '.value__ok');
  fakeSubmit($('.contact__form'), '.contact__ok');
  $$('.seg button').forEach(b => b.addEventListener('click', () => $$('.seg button').forEach(x => x.classList.toggle('on', x === b))));

  /* ---------- testimonials ---------- */
  const quotes = $$('.quote'), dots = $$('.quotes__dots button');
  let qi = 0, qt;
  const showQ = i => { qi = i; quotes.forEach((q, k) => q.classList.toggle('is-on', k === i)); dots.forEach((d, k) => d.classList.toggle('on', k === i)); };
  const autoQ = () => { clearInterval(qt); qt = setInterval(() => showQ((qi + 1) % quotes.length), 6500); };
  dots.forEach((d, k) => d.addEventListener('click', () => { showQ(k); autoQ(); }));
  autoQ();

  /* ---------- the walk: overlay cards follow the camera ---------- */
  const stops = $$('.stop'), wdots = $$('.walk__dots i'), flash = $('.walk__flash'), shade = $('.walk__shade');
  function paint(f) {
    stops.forEach(el => {
      const i = +el.dataset.at, d = f - i;
      let a = 1 - ss((Math.abs(d) - .12) / .2);
      if (i === 0) a = 1 - ss((d - .1) / .25);
      if (i === 5) a = Math.min(a, 1 - ss((d - .02) / .2));
      el.style.opacity = a.toFixed(3);
      el.classList.toggle('on', a > .02);
      const y = d * -60;
      if (el.classList.contains('stop--home') && !isPhone) el.style.transform = `translate3d(0, calc(-50% + ${y}px), 0)`;
      else if (el.classList.contains('stop--door')) el.style.transform = `translate3d(0, calc(-50% + ${y}px), 0)`;
      else el.style.transform = `translate3d(0, ${Math.max(0, y)}px, 0)`;
    });
    const on = Math.min(5, Math.round(f));
    wdots.forEach((d, k) => d.classList.toggle('on', k === on));
    flash.style.opacity = ss((f - 5.35) / .4).toFixed(3);
    flash.style.setProperty('--p', ss((f - 5.65) / .3).toFixed(3));
    shade.style.opacity = (1 - ss((f - .05) / .4)).toFixed(3);
  }
  paint(0);

  /* ---------- no motion library ---------- */
  if (!hasGsap) { $('.loader').remove(); document.documentElement.classList.add('no-motion', 'no3d'); return; }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); const t = id === '#top' ? 0 : $(id);
    if (t === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(t, { duration: 1.6 });
    else if (t === 0) scrollTo({ top: 0, behavior: 'smooth' }); else t.scrollIntoView({ behavior: 'smooth' });
  }));

  /* ---------- nav ---------- */
  const nav = $('.nav'), walk = $('.walk');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll(), past = y > walk.offsetTop + walk.offsetHeight - innerHeight * .9;
      nav.classList.toggle('is-solid', past);
      nav.classList.toggle('is-hidden', y > innerHeight * .5 && y > lastY && !document.body.classList.contains('menu-open'));
      lastY = y;
    }
  });

  /* ---------- the 3D walk ---------- */
  const line = $('.loader__line i');
  gsap.set('.stop--hero .ch', { yPercent: 115 });
  gsap.set(['.stop--hero .eyebrow', '.hero__lede', '.hero__cue', '.nav'], { autoAlpha: 0 });
  let walkF = 0;
  ScrollTrigger.create({
    trigger: walk, start: 'top top', end: 'bottom bottom',
    onUpdate: s => { walkF = s.progress * 6; if (ride) ride.setF(walkF); else paint(walkF); }
  });
  ScrollTrigger.create({ trigger: walk, start: 'top bottom', end: 'bottom top', onToggle: s => ride && ride.run(s.isActive) });

  function intro() {
    gsap.timeline()
      .to('.loader__mark', { autoAlpha: 0, y: -20, duration: .5, ease: 'power2.in' })
      .to('.loader', { autoAlpha: 0, duration: 1.2, ease: 'power2.inOut' }, '<.2')
      .add(() => ride && ride.intro(), '<')
      .to('.stop--hero .ch', { yPercent: 0, duration: 1.4, stagger: .035, ease: 'expo.out' }, '<.5')
      .to(['.stop--hero .eyebrow', '.hero__lede', '.hero__cue', '.nav'], { autoAlpha: 1, duration: 1, stagger: .1, ease: 'power2.out' }, '<.5')
      .add(() => $('.loader').remove());
  }
  const canvas = $('.walk__canvas');
  const gl = (() => { try { return !!canvas.getContext('webgl2'); } catch (e) { return false; } })();
  if (!gl) {
    document.documentElement.classList.add('no3d');
    gsap.to(line, { scaleX: 1, duration: .6, onComplete: intro });
  } else {
    gsap.to(line, { scaleX: .15, duration: .6 });
    import('./ride.js')
      .then(m => m.initRide(canvas, { reduce, isPhone, onProgress: p => gsap.to(line, { scaleX: .15 + .85 * p, duration: .4 }) }))
      .then(r => { ride = r; ride.onFrame = paint; ride.jump(walkF); setTimeout(intro, 450); })
      .catch(err => { console.error(err); document.documentElement.classList.add('no3d'); ScrollTrigger.refresh(); intro(); });
  }

  if (reduce) { document.documentElement.classList.add('no-motion'); return; }

  /* ---------- reveals ---------- */
  $$('.reveal, .eyebrow:not(.stop .eyebrow), .g figcaption').forEach(el => {
    gsap.from(el, { y: 40, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  gsap.from('.step', { y: 60, autoAlpha: 0, duration: 1.2, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.steps', start: 'top 82%' } });
  gsap.from('.hoods__list li', { y: 30, autoAlpha: 0, duration: 1, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: '.hoods__list', start: 'top 85%' } });
  gsap.from('.value', { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.value', start: 'top 88%' } });

  gsap.timeline({ scrollTrigger: { trigger: '.about__img', start: 'top 78%' } })
    .to('.about__mask', { clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'expo.inOut' })
    .to('.about__mask img', { scale: 1, duration: 2, ease: 'expo.out' }, '<.2')
    .from('.about__sig', { x: 40, autoAlpha: 0, duration: 1, ease: 'expo.out' }, '<.8');

  /* ---------- signature residence ---------- */
  const narrow = innerWidth < 900;
  gsap.timeline({ scrollTrigger: { trigger: '.residence__stage', start: 'top top', end: '+=120%', pin: true, scrub: .8, anticipatePin: 1 } })
    .fromTo('.residence__frame', { clipPath: narrow ? 'inset(18% 8% 18% 8% round 6px)' : 'inset(14% 22% 14% 22% round 6px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' })
    .fromTo('.residence__frame img', { scale: 1.25 }, { scale: 1, ease: 'none' }, 0)
    .from('.residence__caption > *', { y: 80, autoAlpha: 0, stagger: .1, ease: 'power2.out' }, .45);
  $$('.g').forEach(g => {
    gsap.fromTo($('img', g), { yPercent: -15 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: g, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from($('.g__in', g), { clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: g, start: 'top 90%' } });
  });

  gsap.fromTo('.contact__bg img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.foot__word', { yPercent: 60, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.from('.marquee__track', { xPercent: 10, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- pointer ---------- */
  if (fine) {
    const cur = $('.cursor');
    const cx = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' }), cy = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
    addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); cur.style.opacity = 1; }, { passive: true });
    document.addEventListener('pointerleave', () => cur.style.opacity = 0);
    $$('.stop--home').forEach(el => {
      el.addEventListener('pointerenter', () => cur.classList.add('is-view'));
      el.addEventListener('pointerleave', () => cur.classList.remove('is-view'));
    });
    $$('.magnetic').forEach(b => {
      const xt = gsap.quickTo(b, 'x', { duration: .6, ease: 'elastic.out(1,.4)' }), yt = gsap.quickTo(b, 'y', { duration: .6, ease: 'elastic.out(1,.4)' });
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); xt((e.clientX - r.left - r.width / 2) * .25); yt((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener('pointerleave', () => { xt(0); yt(0); });
    });
    const fl = $('.hoods__float'), flImg = $('img', fl);
    gsap.set(fl, { xPercent: -50, yPercent: -50, scale: .85 });
    const fx = gsap.quickTo(fl, 'x', { duration: .7, ease: 'power3' }), fy = gsap.quickTo(fl, 'y', { duration: .7, ease: 'power3' });
    const list = $('.hoods__list');
    list.addEventListener('pointermove', e => { fx(e.clientX + innerWidth * .06); fy(e.clientY); });
    $$('li', list).forEach(li => li.addEventListener('pointerenter', () => {
      const src = `assets/img/${li.dataset.img}-1280.webp`;
      if (!flImg.src.endsWith(src)) { flImg.src = src; gsap.fromTo(flImg, { scale: 1.2 }, { scale: 1, duration: .9, ease: 'expo.out' }); }
      fl.classList.add('on'); gsap.to(fl, { scale: 1, duration: .6, ease: 'expo.out' });
    }));
    list.addEventListener('pointerleave', () => { fl.classList.remove('on'); gsap.to(fl, { scale: .85, duration: .4 }); });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
