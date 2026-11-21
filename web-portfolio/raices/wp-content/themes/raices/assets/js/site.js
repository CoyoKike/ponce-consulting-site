/* Raíces — interaction + motion */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* nav turns solid after the hero */
  const nav = $('.r-nav'), hero = $('.r-hero');
  const solid = () => nav && nav.classList.toggle('is-solid', scrollY > (hero ? hero.offsetHeight - 90 : 40));
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

  /* mission highlights */
  const hls = $$('.hl');
  if (reduce || !('IntersectionObserver' in window)) hls.forEach(h => h.classList.add('on'));
  else { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const i = hls.indexOf(e.target); setTimeout(() => e.target.classList.add('on'), i * 350); io.unobserve(e.target); } }), { threshold: .8 }); hls.forEach(h => io.observe(h)); }

  if (reduce || !window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);
  if (window.Lenis) { const l = new Lenis({ duration: 1.15, smoothWheel: true }); l.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => l.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const el = $(a.getAttribute('href')); if (!el) return; e.preventDefault(); l.scrollTo(el, { offset: -70, duration: 1.4 }); })); }

  /* hero intro + scroll */
  gsap.to('.r-hero .wp-block-cover__image-background', { scale: 1, duration: 2.2, ease: 'expo.out' });
  gsap.from(['.r-eyebrow', '.r-hero-title', '.r-hero-lede', '.r-hero-ctas'], { y: 50, autoAlpha: 0, duration: 1.3, stagger: .12, ease: 'expo.out', delay: .2 });
  gsap.to('.r-hero .wp-block-cover__image-background', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.r-hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* reveals */
  $$('.r-label, .r-h2, .r-mission-text, .r-mission-sign, .r-tile, .r-row-copy, .r-stat, .r-homes-list li, .r-quote, .r-ev, .r-give-cards > *').forEach(el =>
    gsap.from(el, { y: 50, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));

  /* image parallax + clip reveal */
  $$('.r-row-media figure').forEach(f => {
    gsap.fromTo(f, { clipPath: 'inset(12% 8% 12% 8% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', ease: 'none', scrollTrigger: { trigger: f, start: 'top 95%', end: 'top 40%', scrub: true } });
    gsap.fromTo($('img', f), { yPercent: -9 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.r-story-img img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.r-story', start: 'top bottom', end: 'center center', scrub: true } });

  /* counters */
  $$('.r-stat-n').forEach(n => { const end = parseFloat(n.dataset.n), dec = String(n.dataset.n).includes('.'), o = { v: 0 };
    gsap.to(o, { v: end, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: n, start: 'top 85%', once: true },
      onUpdate: () => { n.textContent = dec ? `$${o.v.toFixed(1)}M` : Math.round(o.v).toLocaleString('en-US'); } }); });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
