/* Raíces — interaction + motion */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;

  /* nav turns solid once you start scrolling */
  const nav = $('.r-nav');
  const solid = () => nav && nav.classList.toggle('is-solid', scrollY > 40);
  addEventListener('scroll', solid, { passive: true }); solid();

  /* phone menu */
  const mb = $('.r-menu-btn'), menu = $('#r-menu');
  const setMenu = o => { mb.setAttribute('aria-expanded', String(o)); menu.hidden = !o; mb.textContent = o ? 'Close' : 'Menu'; document.body.style.overflow = o ? 'hidden' : ''; nav.classList.toggle('menu-open', o); };
  if (mb) { mb.addEventListener('click', () => setMenu(mb.getAttribute('aria-expanded') !== 'true')); $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false))); addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); }); }

  /* homes search */
  const hq = $('#r-homes-q'), ho = $('#r-homes-open');
  const filt = () => { const t = (hq.value || '').toLowerCase(); $$('#r-homes-list li').forEach(li => { li.hidden = !(li.textContent.toLowerCase().includes(t) && (!ho.checked || li.dataset.status === 'open')); }); };
  if (hq) { hq.addEventListener('input', filt); ho.addEventListener('change', filt); }

  /* events carousel */
  const tr = $('#r-ev-track');
  if (tr) {
    const step = () => ($('.r-ev', tr).getBoundingClientRect().width + 20);
    $('#r-ev-prev').addEventListener('click', () => tr.scrollBy({ left: -step(), behavior: 'smooth' }));
    $('#r-ev-next').addEventListener('click', () => tr.scrollBy({ left: step(), behavior: 'smooth' }));
    let down = false, sx = 0, sl = 0, moved = false;
    tr.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = tr.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) moved = true; tr.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { down = false; });
    tr.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);
    tr.setAttribute('data-lenis-prevent-wheel', '');
  }

  /* marquee: repeat content so it can loop seamlessly */
  const mq = $('.r-marquee-track');
  if (mq) { const html = mq.innerHTML; mq.innerHTML = html + html + html; }

  /* mission highlights */
  const hls = $$('.hl');
  if (reduce || !('IntersectionObserver' in window)) hls.forEach(h => h.classList.add('on'));
  else { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const i = hls.indexOf(e.target); setTimeout(() => e.target.classList.add('on'), 500 + i * 350); io.unobserve(e.target); } }), { threshold: .8 }); hls.forEach(h => io.observe(h)); }

  if (reduce || !window.gsap) { root.classList.remove('r-intro'); return; }
  gsap.registerPlugin(ScrollTrigger);

  let lenis = null;
  if (window.Lenis) { lenis = new Lenis({ duration: 1.15, smoothWheel: true }); lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const el = $(a.getAttribute('href')); if (!el) return; e.preventDefault(); lenis.scrollTo(el, { offset: -70, duration: 1.4 }); })); }

  /* split headings into masked words (keeps <em>, <mark>, links intact) */
  const split = el => {
    if (el.dataset.split) return $$('.wi', el); el.dataset.split = '1';
    const walk = n => [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const parts = c.textContent.split(/(\s+)/); if (!c.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        parts.forEach(p => { if (!p) return; if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          const lead = p.match(/^[,.;:!?’”)]+/); if (lead) { const prev = frag.lastChild || c.previousSibling; const tgt = prev && prev.nodeType === 1 ? (prev.classList.contains('wi') ? prev : (prev.querySelectorAll('.wi').length ? [...prev.querySelectorAll('.wi')].pop() : null)) : null; if (tgt) tgt.textContent += lead[0]; else frag.appendChild(document.createTextNode(lead[0])); p = p.slice(lead[0].length); if (!p) return; }
          const w = document.createElement('span'); w.className = 'w'; const i = document.createElement('span'); i.className = 'wi'; i.textContent = p; w.appendChild(i); frag.appendChild(w); });
        c.replaceWith(frag);
      } else if (c.nodeType === 1 && !c.classList.contains('w')) walk(c);
    });
    walk(el); return $$('.wi', el);
  };

  /* ---- intro: curtain, then headline ---- */
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  const cur = $('.r-curtain');
  if (cur && root.classList.contains('r-intro')) {
    const cs = $('span', cur); cs.innerHTML = [...cs.textContent].map(ch => `<b>${ch}</b>`).join('');
    intro.from($$('b', cs), { yPercent: 110, autoAlpha: 0, duration: .8, stagger: .05 })
      .to(cur, { yPercent: -100, duration: 1, ease: 'expo.inOut', onComplete: () => root.classList.remove('r-intro') }, '+=.25');
  } else root.classList.remove('r-intro');
  intro.from(split($('.r-hero-title')), { yPercent: 115, duration: 1.4, stagger: .08 }, cur ? '-=.55' : 0)
    .from('.r-hero-top .r-eyebrow', { y: 20, autoAlpha: 0, duration: 1, stagger: .1 }, '<.1')
    .fromTo('.r-hero-top', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.6, ease: 'expo.inOut' }, '<')
    .from('.r-badge', { scale: 0, rotate: -120, duration: 1.4 }, '<.3')
    .from(['.r-hero-lede', '.r-hero-ctas .wp-block-button'], { y: 40, autoAlpha: 0, duration: 1.2, stagger: .08 }, '<.1')
    .from('.r-stage-main', { yPercent: 18, duration: 1.6 }, '<')
    .from('.r-stage-side', { yPercent: 40, autoAlpha: 0, duration: 1.6, stagger: .1 }, '<.1');

  /* ---- hero stage: pin and open the photo to full screen ---- */
  const mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 961px)', mob: '(max-width: 960px)' }, ctx => {
    const desk = ctx.conditions.desk;
    const main = $('.r-stage-main');
    if (!main) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.r-stage', start: 'top top', end: '+=110%', pin: true, scrub: 1,
      onUpdate: s => main.classList.toggle('is-open', s.progress > .7) } });
    tl.fromTo(main, { clipPath: desk ? 'inset(4% 30% 16% 30% round 26px)' : 'inset(3% 5% 12% 5% round 20px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' }, 0)
      .fromTo($('img', main), { scale: 1.22 }, { scale: 1, ease: 'none' }, 0)
      .to('.r-stage-cap', { autoAlpha: 1, y: 0, duration: .25 }, .72)
      .from('.r-stage-cap', { y: 40, duration: .25 }, .72);
    if (desk) tl.to('.r-stage-l', { xPercent: -140, yPercent: -20, rotate: -6, ease: 'none' }, 0).to('.r-stage-r', { xPercent: 140, yPercent: 20, rotate: 6, ease: 'none' }, 0);
    gsap.to(['.r-hero-head', '.r-hero-row'], { yPercent: -30, autoAlpha: .2, ease: 'none', scrollTrigger: { trigger: '.r-hero', start: 'top top', end: () => '+=' + innerHeight * .8, scrub: true } });
  });

  /* ---- marquee that speeds up and reverses with scroll ---- */
  if (mq) {
    const loop = gsap.to(mq, { xPercent: -100 / 3, duration: 28, ease: 'none', repeat: -1 });
    let dir = 1;
    ScrollTrigger.create({ onUpdate: s => { if (s.direction !== dir) dir = s.direction;
      const v = Math.min(Math.abs(s.getVelocity()) / 300, 6);
      gsap.to(loop, { timeScale: dir * (1 + v), duration: .2, overwrite: true });
      gsap.to(loop, { timeScale: dir, duration: 1.2, delay: .25 }); } });
  }

  /* ---- headings: masked word reveal ---- */
  $$('.r-h2, .r-h3, .r-quote, .r-give-title, .r-tile h3, .r-ev h3, .r-mission-text').forEach(el => {
    const big = el.classList.contains('r-mission-text');
    gsap.from(split(el), { yPercent: 115, duration: big ? 1.2 : 1.3, stagger: big ? .025 : .06, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
  });

  /* simple rise for the rest */
  $$('.r-label, .r-kicker, .r-mission-sign, .r-row-copy > p, .r-ticks li, .r-row-copy .wp-block-buttons, .r-homes-tools, .r-homes-list li, .r-quote-name, .r-give-cards > *, .r-ev-ui').forEach(el =>
    gsap.from(el, { y: 40, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));

  /* help tiles: curtain-wipe open + image settles */
  $$('.r-tile').forEach((t, i) => {
    const st = { trigger: t, start: 'top 85%', once: true };
    gsap.fromTo(t, { clipPath: 'inset(100% 0% 0% 0% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.5, delay: (i % 2) * .12, ease: 'expo.inOut', scrollTrigger: st });
    gsap.from($('.r-tile-img img', t), { scale: 1.35, duration: 2, delay: (i % 2) * .12, ease: 'expo.out', scrollTrigger: st });
  });

  /* work rows: clip reveal + parallax */
  $$('.r-row-media figure').forEach(f => {
    gsap.fromTo(f, { clipPath: 'inset(12% 8% 12% 8% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', ease: 'none', scrollTrigger: { trigger: f, start: 'top 95%', end: 'top 40%', scrub: true } });
    gsap.fromTo($('img', f), { yPercent: -9 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.r-story-img img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.r-story', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.fromTo('.r-story-img', { clipPath: 'inset(0% 0% 100% 0% round 240px 240px 22px 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 240px 240px 22px 22px)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.r-story-img', start: 'top 80%', once: true } });
  gsap.fromTo('.r-give .wp-block-cover__image-background', { yPercent: -10, scale: 1.15 }, { yPercent: 10, scale: 1.15, ease: 'none', scrollTrigger: { trigger: '.r-give', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.r-sign-photo img', { scale: 0, rotate: -30, duration: 1.2, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.r-mission-sign', start: 'top 88%', once: true } });

  /* impact: rule draws across, stats rise, counters run */
  gsap.fromTo('.r-stats', { backgroundSize: '0% 1px' }, { backgroundSize: '100% 1px', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.r-stats', start: 'top 85%', once: true } });
  gsap.from('.r-stat', { y: 60, autoAlpha: 0, duration: 1.2, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.r-stats', start: 'top 85%', once: true } });
  $$('.r-stat-n').forEach(n => { const end = parseFloat(n.dataset.n), dec = String(n.dataset.n).includes('.'), o = { v: 0 };
    gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', scrollTrigger: { trigger: n, start: 'top 85%', once: true },
      onUpdate: () => { n.textContent = dec ? `$${o.v.toFixed(1)}M` : Math.round(o.v).toLocaleString('en-US'); } }); });

  /* events slide in from the right */
  gsap.from('.r-ev', { x: 160, autoAlpha: 0, duration: 1.3, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '.r-ev-track', start: 'top 85%', once: true } });

  /* footer wordmark letters rise */
  const fw = $('.r-foot-word');
  if (fw) { fw.innerHTML = [...fw.textContent].map(ch => `<span class="w"><span class="wi">${ch}</span></span>`).join('');
    gsap.from($$('.wi', fw), { yPercent: 115, duration: 1.2, stagger: .05, ease: 'expo.out', scrollTrigger: { trigger: fw, start: 'top 95%', once: true } }); }

  /* ---- desktop-only touches: magnetic buttons + "View" cursor ---- */
  if (fine) {
    $$('.wp-block-button__link, .r-btn, .r-badge, .r-ev-btn').forEach(b => {
      const xTo = gsap.quickTo(b, 'x', { duration: .6, ease: 'elastic.out(1,.4)' }), yTo = gsap.quickTo(b, 'y', { duration: .6, ease: 'elastic.out(1,.4)' });
      b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .3); yTo((e.clientY - r.top - r.height / 2) * .4); });
      b.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
    });
    const c = document.createElement('div'); c.className = 'r-cursor'; c.setAttribute('aria-hidden', 'true'); c.textContent = 'View'; document.body.appendChild(c);
    const cx = gsap.quickTo(c, 'x', { duration: .45, ease: 'power3' }), cy = gsap.quickTo(c, 'y', { duration: .45, ease: 'power3' });
    addEventListener('mousemove', e => { cx(e.clientX); cy(e.clientY); });
    [['.r-tile', 'View'], ['.r-row-media', 'Learn'], ['.r-stage-main', 'Fiesta'], ['.r-ev-track', 'Drag']].forEach(([s, label]) => $$(s).forEach(el => {
      el.addEventListener('mouseenter', () => { c.textContent = label; gsap.to(c, { scale: 1, duration: .5, ease: 'expo.out' }); });
      el.addEventListener('mouseleave', () => gsap.to(c, { scale: 0, duration: .4, ease: 'expo.out' }));
    }));
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
