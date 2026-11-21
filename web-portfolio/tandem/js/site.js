/* Tandem Cooperative Fund — motion + interaction */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => n.toLocaleString('en-US');

  /* ---------- hall of fame (works with or without motion) ---------- */
  const heroes = [
    ['1975', 'Harold Jensen', 'Agriculture', 'Organized dairy farmers into one of the Midwest’s largest co-ops.'],
    ['1979', 'Eleanor Price', 'Credit unions', 'Opened credit unions to farmworkers across the Central Valley.'],
    ['1983', 'Ruth Abernathy', 'Agriculture', 'Founded a cotton co-op that kept Black-owned farms in families.'],
    ['1988', 'Samuel Okafor', 'Housing', 'Pioneered limited-equity housing co-ops in Chicago.'],
    ['1996', 'Marguerite Lewis', 'Housing', 'Helped 300 manufactured-home communities become resident-owned.'],
    ['2004', 'Ana Lucía Torres', 'Worker-owned', 'Built the first bilingual worker co-op network in the Southwest.'],
    ['2011', 'Ida Carver', 'Food', 'Opened 14 food co-ops in neighborhoods without a grocery store.'],
    ['2016', 'Grace Whitehorse', 'Food', 'Led tribal food co-ops returning bison to community tables.'],
    ['2021', 'Daniel Kim', 'Energy', 'Brought member-owned solar to 40 rural electric co-ops.'],
    ['2027', 'Tomás Reyes', 'Worker-owned', 'Converted 60 retiring owners’ businesses to employee ownership.'],
    ['2027', 'Joseph Nguyen', 'Credit unions', 'Grew a community credit union serving 90,000 immigrant members.'],
    ['2027', 'Lena Fischer', 'Energy', 'Wrote the model bylaws used by community wind co-ops nationwide.'],
  ];
  const list = $('#hofList'), q = $('#hofQ'), secWrap = $('#hofS'), cnt = $('#hofCount');
  let sector = '';
  ['All', ...new Set(heroes.map(h => h[2]))].forEach((s, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = s; b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    b.addEventListener('click', () => { $$('button', secWrap).forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); sector = s === 'All' ? '' : s; render(); });
    secWrap.appendChild(b);
  });
  function render() {
    const t = q.value.trim().toLowerCase();
    const r = heroes.filter(h => (!sector || h[2] === sector) && (h[1] + ' ' + h[3]).toLowerCase().includes(t));
    list.innerHTML = r.map(h => `<li><span class="yr">${h[0]}</span><div><h3>${h[1]}</h3><p>${h[3]}</p></div><span class="sec mono">${h[2]}</span></li>`).join('');
    cnt.textContent = `${r.length} of ${heroes.length} inductees`;
  }
  q.addEventListener('input', render); render();

  /* ---------- give form ---------- */
  const amts = $$('.amounts button'), freqs = $$('.freq button'), gb = $('#giveBtn span');
  const sel = (group, b) => { group.forEach(x => x.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); upd(); };
  const upd = () => { const a = amts.find(x => x.getAttribute('aria-checked') === 'true').textContent; const f = freqs.find(x => x.getAttribute('aria-checked') === 'true').textContent; gb.textContent = `Give ${a}${f === 'Monthly' ? ' monthly' : ''}`; };
  amts.forEach(b => b.addEventListener('click', () => sel(amts, b)));
  freqs.forEach(b => b.addEventListener('click', () => sel(freqs, b)));
  $('#giveForm').addEventListener('submit', e => { e.preventDefault(); gb.textContent = 'Thank you (preview)'; });

  /* ---------- path list: photo follows the cursor ---------- */
  const peek = $('#pathPeek'), pimg = $('img', peek);
  if (matchMedia('(hover: hover)').matches && window.gsap) {
    const px = gsap.quickTo(peek, 'x', { duration: .6, ease: 'power3' }), py = gsap.quickTo(peek, 'y', { duration: .6, ease: 'power3' });
    $('#pathList').addEventListener('mousemove', e => { px(e.clientX); py(e.clientY); });
    $$('#pathList a').forEach(a => {
      a.addEventListener('mouseenter', () => { pimg.src = a.dataset.img; gsap.to(peek, { autoAlpha: 1, scale: 1, rotate: gsap.utils.random(-4, 4), duration: .5, ease: 'expo.out' }); });
      a.addEventListener('mouseleave', () => gsap.to(peek, { autoAlpha: 0, scale: .6, duration: .4, ease: 'power2.in' }));
    });
  }

  if (!window.gsap) { $('#loader').remove(); return; }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.2, easing: t => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'); if (id.length < 2) return; const el = $(id); if (!el) return;
      e.preventDefault(); lenis.scrollTo(el, { duration: 1.6 });
    }));
  }

  /* ---------- statement words ---------- */
  const st = $('#statementText');
  st.innerHTML = st.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');

  /* ---------- loader + intro ---------- */
  const loader = $('#loader'), bar = $('#loaderBar'), num = $('#loaderNum'), heroImg = $('.hero-img');
  const prog = { v: 0 }, show = () => { bar.style.transform = `scaleX(${prog.v / 100})`; num.textContent = String(Math.round(prog.v)).padStart(3, '0'); };
  gsap.to(prog, { v: 80, duration: 1.1, ease: 'power2.out', onUpdate: show });
  const ready = Promise.all([
    heroImg.complete ? Promise.resolve() : new Promise(r => { heroImg.onload = heroImg.onerror = r; }),
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(r => setTimeout(r, reduce ? 0 : 650)),
  ]);
  if (lenis) lenis.stop();
  gsap.set('.hero-title .line > span', { yPercent: 115 });
  gsap.set(['.eyebrow', '.hero-lede', '.hero-ctas', '.hero-meta', '.scroll-cue', '.nav'], { autoAlpha: 0, y: 24 });
  gsap.set('.hero-img', { scale: 1.3 });
  gsap.from('.loader-mark circle', { attr: { r: 0 }, duration: 1, stagger: .15, ease: 'expo.out' });
  Promise.race([ready, new Promise(r => setTimeout(r, 6000))]).then(() => {
    gsap.to(prog, { v: 100, duration: .3, onUpdate: show });
    const tl = gsap.timeline({ delay: .3, onComplete: () => { loader.remove(); if (lenis) lenis.start(); } });
    tl.to('.loader-inner', { autoAlpha: 0, y: -20, duration: .5, ease: 'power2.in' })
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=.1')
      .to('.hero-img', { scale: 1, duration: 2.2, ease: 'expo.out' }, '-=.9')
      .to('.hero-title .line > span', { yPercent: 0, duration: 1.4, stagger: .1, ease: 'expo.out' }, '-=2')
      .to(['.nav', '.eyebrow', '.hero-lede', '.hero-ctas', '.hero-meta', '.scroll-cue'], { autoAlpha: 1, y: 0, duration: 1, stagger: .06, ease: 'power3.out' }, '-=1.2');
    if (reduce) tl.progress(1);
  });
  gsap.set(loader, { clipPath: 'inset(0 0 0% 0)' });

  if (reduce) return;

  /* ---------- hero pushes into the image ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero-media', { scale: 1.3, yPercent: 16, ease: 'none' }, 0)
    .to('.hero-copy', { yPercent: -50, autoAlpha: 0, ease: 'none' }, 0)
    .to('.hero-meta, .scroll-cue', { autoAlpha: 0, ease: 'none', duration: .4 }, 0);

  /* ---------- parallax + clip reveals ---------- */
  $$('[data-speed]').forEach(el => { const s = parseFloat(el.dataset.speed);
    gsap.fromTo(el, { yPercent: -s * 100 }, { yPercent: s * 100, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }); });
  $$('.sfig img, .hall-fig img').forEach(img => gsap.fromTo(img, { yPercent: -8, scale: 1.18 }, { yPercent: 8, scale: 1.18, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.sfig, .hall-fig').forEach(el => gsap.fromTo(el, { clipPath: 'inset(18% 12% 18% 12%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 35%', scrub: true } }));

  gsap.fromTo('#statementText .w', { opacity: .12 }, { opacity: 1, stagger: .05, ease: 'none', scrollTrigger: { trigger: '#statementText', start: 'top 80%', end: 'bottom 45%', scrub: true } });
  $$('.label, .h-big, .give-title').forEach(el => gsap.from(el, { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));

  /* ---------- journey ---------- */
  const layers = $$('.journey-layer'), steps = $$('.journey-step'), N = layers.length;
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
  const STAGES = ['Gather', 'Pool', 'Own', 'Stay'], gStep = $('#gStep'), gStage = $('#gStage'), gTrack = $('#gTrack');
  ScrollTrigger.create({ trigger: '.journey', start: 'top top', end: 'bottom bottom', onUpdate: s => {
    let i = 0; const T = at.duration(); for (let k = 1; k < N; k++) if (s.progress * T >= k - .1) i = k;
    gStep.textContent = `0${i + 1} / 0${N}`; gStage.textContent = STAGES[i]; gTrack.style.transform = `scaleX(${s.progress})`; } });

  /* ---------- paths ---------- */
  gsap.from('.path-list li', { y: 50, autoAlpha: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.path-list', start: 'top 80%', once: true } });

  /* ---------- programs: horizontal ---------- */
  const track = $('#workTrack'), idx = $('#workIdx'), cards = $$('.card', track);
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const ht = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.work-pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
    onUpdate: s => { idx.textContent = String(Math.min(cards.length, 1 + Math.floor(s.progress * cards.length))).padStart(2, '0'); } } });
  cards.forEach(c => {
    gsap.fromTo($('img', c), { xPercent: 8 }, { xPercent: -8, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: ht, start: 'left right', end: 'right left', scrub: true } });
    gsap.from($('.card-media', c), { clipPath: 'inset(100% 0 0 0)', ease: 'none', scrollTrigger: { trigger: c, containerAnimation: ht, start: 'left 105%', end: 'left 55%', scrub: true } });
  });

  /* ---------- impact counters ---------- */
  $$('.stats b').forEach(b => { const n = +b.dataset.n, o = { v: 0 };
    gsap.to(o, { v: n, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 85%', once: true }, onUpdate: () => { b.textContent = fmt(Math.round(o.v)); } }); });

  /* ---------- marquee ---------- */
  $$('.marquee-row').forEach(row => { const d = +row.dataset.dir;
    gsap.fromTo(row, { xPercent: d < 0 ? 0 : -50 }, { xPercent: d < 0 ? -50 : 0, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: .6 } }); });

  /* ---------- lists + give ---------- */
  gsap.from('.news-list li', { y: 40, autoAlpha: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.news-list', start: 'top 82%', once: true } });
  gsap.fromTo('.give-bg img', { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.give', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.from('.give-form > *, .give-more li', { y: 30, autoAlpha: 0, stagger: .06, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: '.give-grid', start: 'top 85%', once: true } });

  /* ---------- footer word ---------- */
  const fb = $('.foot-big');
  fb.innerHTML = [...fb.textContent].map(c => `<span style="display:inline-block">${c}</span>`).join('');
  gsap.from('.foot-big span', { yPercent: 100, stagger: .05, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* ---------- progress + nav ---------- */
  gsap.to('#progressBar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
  const nav = $('#nav'); let lastY = 0;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => { const y = s.scroll(); if (Math.abs(y - lastY) < 6) return;
    gsap.to(nav, { yPercent: y > lastY && y > 300 ? -110 : 0, duration: .5, ease: 'power3.out', overwrite: 'auto' }); lastY = y; } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
