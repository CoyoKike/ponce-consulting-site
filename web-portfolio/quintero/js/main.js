(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  let lang = 'en';

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
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
      el.innerHTML = next === 'es' ? el.dataset.es : el.dataset.en;
    });
    $$('[data-es-ph]').forEach(el => {
      if (el.dataset.enPh === undefined) el.dataset.enPh = el.placeholder;
      el.placeholder = next === 'es' ? el.dataset.esPh : el.dataset.enPh;
    });
    $('.lang__on').textContent = next.toUpperCase();
    $('.lang__off').textContent = next === 'es' ? 'EN' : 'ES';
    store.set(next);
    calc();
    if (hasGsap) ScrollTrigger.refresh();
  }
  $('.lang').addEventListener('click', () => setLang(lang === 'en' ? 'es' : 'en'));
  if (store.get() === 'es') setLang('es');

  /* ---------- mobile menu ---------- */
  const burger = $('.nav__burger');
  const toggleMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    $('.menu').setAttribute('aria-hidden', !open);
  };
  burger.addEventListener('click', () => toggleMenu(!document.body.classList.contains('menu-open')));
  $$('.menu a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  /* ---------- mortgage calculator ---------- */
  const PRICE = 3495000, TAX_MO = Math.round(PRICE * 0.011 / 12);
  const state = { down: 20, rate: 6.25, term: 30 };
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  function calc() {
    const loan = PRICE * (1 - state.down / 100), r = state.rate / 100 / 12, n = state.term * 12;
    const pi = loan * r / (1 - Math.pow(1 + r, -n));
    $('.calc__amt').textContent = money(pi + TAX_MO);
    $('[data-v=down]').textContent = state.down + '% · ' + money(PRICE * state.down / 100);
    $('[data-v=rate]').textContent = +state.rate.toFixed(3) + '%';
    $$('.calc input').forEach(i => i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min) * 100) + '%'));
  }
  $$('.calc input').forEach(i => i.addEventListener('input', () => { state[i.dataset.k] = +i.value; calc(); }));
  $$('.calc__terms button').forEach(b => b.addEventListener('click', () => {
    $$('.calc__terms button').forEach(x => x.classList.toggle('on', x === b));
    state.term = +b.dataset.term; calc();
  }));
  calc();

  /* ---------- listing sheet ---------- */
  const LIST = [
    { img: 'acorn', en: 'A Greek Revival townhouse on the flat of the Hill, with a private roof deck, a wine room and deeded parking two doors down.', es: 'Una casa adosada neoclásica en lo plano de la colina, con terraza privada, cava y estacionamiento propio a dos puertas.' },
    { img: 'backbay', en: 'A full-floor penthouse under a restored mansard, with river views from every bedroom and a private elevator.', es: 'Un penthouse de piso completo bajo una mansarda restaurada, con vista al río desde cada habitación y ascensor privado.' },
    { img: 'southend', en: 'A bowfront brownstone facing the park, with original plaster moldings, a garden level for guests and a south-facing yard.', es: 'Una casa de ladrillo frente al parque, con molduras originales, un nivel jardín para visitas y patio al sur.' },
    { img: 'colonial', en: 'A 1792 Federal colonial two blocks from the harbor, with nine fireplaces, wide pine floors and a widow’s walk.', es: 'Una casa federal de 1792 a dos cuadras del puerto, con nueve chimeneas, pisos de pino y mirador en el techo.' },
    { img: 'stone', en: 'Stone and shingle on its own point, with 280 feet of ocean frontage, a deep-water mooring and sunsets over the city.', es: 'Piedra y tejas en su propia punta, con 85 metros frente al mar, amarre de aguas profundas y atardeceres sobre la ciudad.' },
    { img: 'dock', en: 'Sold in six days with four offers. A waterfront house with a private dock on Duxbury Bay.', es: 'Vendida en seis días con cuatro ofertas. Una casa frente al agua con muelle privado en la bahía de Duxbury.' }
  ];
  const sheet = $('.sheet');
  function openSheet(card) {
    const d = LIST[+card.dataset.i];
    $('.sheet__img img').src = `assets/img/${d.img}.webp`;
    $('.sheet__img img').alt = card.querySelector('img').alt;
    const tag = card.querySelector('.tag');
    const st = $('.sheet__tag'); st.className = tag.className + ' sheet__tag'; st.textContent = tag.textContent;
    $('.sheet__name').textContent = card.querySelector('h3').textContent;
    $('.sheet__place').textContent = card.querySelector('.card__place').textContent;
    $('.sheet__price').textContent = card.querySelector('.card__price').textContent;
    $('.sheet__desc').textContent = L(d.en, d.es);
    $('.sheet__facts').innerHTML = card.querySelector('.card__facts').innerHTML;
    if (lenis) lenis.stop();
    sheet.showModal();
  }
  const closeSheet = () => sheet.close();
  sheet.addEventListener('close', () => { if (lenis) lenis.start(); });
  $('.sheet__x').addEventListener('click', closeSheet);
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
  $('.sheet .btn').addEventListener('click', closeSheet);
  $$('.card[data-i]').forEach(c => {
    c.addEventListener('click', () => openSheet(c));
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet(c); } });
  });

  /* ---------- forms (concept: no sending) ---------- */
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
  const showQ = i => {
    qi = i;
    quotes.forEach((q, k) => q.classList.toggle('is-on', k === i));
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
  };
  const autoQ = () => { clearInterval(qt); qt = setInterval(() => showQ((qi + 1) % quotes.length), 6500); };
  dots.forEach((d, k) => d.addEventListener('click', () => { showQ(k); autoQ(); }));
  autoQ();

  /* ---------- no motion library: show everything ---------- */
  let lenis = null;
  if (!hasGsap) { $('.loader').remove(); document.documentElement.classList.add('no-motion'); return; }

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

  /* ---------- nav state ---------- */
  const nav = $('.nav');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      nav.classList.toggle('is-solid', y > innerHeight * .85);
      nav.classList.toggle('is-hidden', y > innerHeight && y > lastY && !document.body.classList.contains('menu-open'));
      lastY = y;
    }
  });

  /* ---------- intro ---------- */
  const heroImg = $('.hero__media img');
  const intro = gsap.timeline({ paused: true });
  gsap.set('.hero__title .line > *', { yPercent: 110 });
  gsap.set(['.hero__eyebrow', '.hero__foot', '.hero__scroll', '.nav'], { autoAlpha: 0 });
  gsap.set(heroImg, { scale: 1.22 });
  intro
    .to('.loader__line i', { scaleX: 1, duration: reduce ? .1 : 1.1, ease: 'power2.inOut' })
    .to('.loader__mark', { autoAlpha: 0, y: -20, duration: .5, ease: 'power2.in' })
    .to('.loader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '<.2')
    .to(heroImg, { scale: 1, duration: 2.2, ease: 'expo.out' }, '<.25')
    .to('.hero__title .line > *', { yPercent: 0, duration: 1.4, stagger: .12, ease: 'expo.out' }, '<.25')
    .to(['.hero__eyebrow', '.hero__foot', '.hero__scroll', '.nav'], { autoAlpha: 1, duration: 1, stagger: .08, ease: 'power2.out' }, '<.4')
    .add(() => $('.loader').remove());
  const go = () => intro.play();
  const imgReady = heroImg.complete ? Promise.resolve() : new Promise(r => { heroImg.onload = r; heroImg.onerror = r; });
  Promise.race([Promise.all([imgReady, document.fonts ? document.fonts.ready : 0]), new Promise(r => setTimeout(r, 3500))]).then(go);

  if (reduce) { document.documentElement.classList.add('no-motion'); return; }

  /* ---------- hero parallax ---------- */
  gsap.to(heroImg, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__inner', { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ---------- counters ---------- */
  $$('.count').forEach(el => {
    const to = +el.dataset.to, dec = +(el.dataset.dec || 0), pre = el.dataset.pre || '', suf = el.dataset.suf || '';
    const o = { v: 0 };
    gsap.to(o, {
      v: to, duration: 2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => { el.textContent = pre + o.v.toFixed(dec) + suf; }
    });
  });

  /* ---------- text reveals ---------- */
  $$('.reveal-lines, .eyebrow:not(.hero__eyebrow), .about__text > p:not(.eyebrow), .creds li, .specs div, .card--end').forEach(el => {
    gsap.from(el, { y: 40, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  gsap.from('.step', { y: 60, autoAlpha: 0, duration: 1.2, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.steps', start: 'top 82%' } });
  gsap.from('.hoods__list li', { y: 30, autoAlpha: 0, duration: 1, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: '.hoods__list', start: 'top 85%' } });
  gsap.from('.value', { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.value', start: 'top 88%' } });

  /* ---------- about portrait ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '.about__img', start: 'top 78%' } })
    .to('.about__mask', { clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'expo.inOut' })
    .to('.about__mask img', { scale: 1, duration: 2, ease: 'expo.out' }, '<.2')
    .from('.about__sig', { x: 40, autoAlpha: 0, duration: 1, ease: 'expo.out' }, '<.8');

  const mm = gsap.matchMedia();

  /* ---------- listings: horizontal on desktop ---------- */
  mm.add('(min-width: 901px)', () => {
    const track = $('.listings__track');
    const dist = () => Math.max(0, track.scrollWidth - (innerWidth - track.getBoundingClientRect().left) + 0);
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.listings__pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: s => gsap.set('.listings__progress i', { scaleX: s.progress })
      }
    });
    $$('.card__img img').forEach(img => {
      gsap.fromTo(img, { xPercent: 6 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: img.closest('.card'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });
  });

  /* ---------- signature residence ---------- */
  mm.add('(min-width: 0px)', () => {
    const narrow = innerWidth < 900;
    gsap.timeline({ scrollTrigger: { trigger: '.residence__stage', start: 'top top', end: '+=120%', pin: true, scrub: .8, anticipatePin: 1 } })
      .fromTo('.residence__frame', { clipPath: narrow ? 'inset(18% 8% 18% 8% round 6px)' : 'inset(14% 22% 14% 22% round 6px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' })
      .fromTo('.residence__frame img', { scale: 1.25 }, { scale: 1, ease: 'none' }, 0)
      .from('.residence__caption > *', { y: 80, autoAlpha: 0, stagger: .1, ease: 'power2.out' }, .45);
  });
  $$('.g').forEach(g => {
    gsap.fromTo($('img', g), { yPercent: -15 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: g, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from(g, { y: 80, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: g, start: 'top 92%' } });
  });
  gsap.from('.calc', { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.calc', start: 'top 90%' } });

  /* ---------- contact & footer ---------- */
  gsap.fromTo('.contact__bg img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.foot__word', { yPercent: 60, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* ---------- pointer niceties ---------- */
  if (fine) {
    const cur = $('.cursor');
    const cx = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' }), cy = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
    addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); cur.style.opacity = 1; }, { passive: true });
    document.addEventListener('pointerleave', () => cur.style.opacity = 0);
    $$('[data-cursor=view]').forEach(el => {
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
