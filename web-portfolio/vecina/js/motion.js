/* Vecina motion: headline word rise, scroll reveals and parallax. Decorative only; all of it is off with reduced motion. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // 1. headline: wrap each word so it can rise in (re-run after a language switch, which rewrites the text)
  function splitHero() {
    const h = document.getElementById('heroTitle'); if (!h) return;
    let i = 0;
    h.querySelectorAll('[data-i18n]').forEach(part => {
      const words = part.textContent.trim().split(/\s+/);
      part.innerHTML = words.map(w => `<span class="w" style="animation-delay:${(0.08 + i++ * 0.09).toFixed(2)}s">${w}</span>`).join(' ');
    });
  }
  splitHero();
  new MutationObserver(muts => { if (muts.some(m => m.type === 'attributes')) splitHero(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  if (reduce) { $$('[data-reveal]').forEach(e => e.classList.add('in')); return; }

  // 2. scroll reveal with a small stagger inside groups
  const mark = (sel, step = 0.07) => $$(sel).forEach((el, i) => { el.setAttribute('data-reveal', ''); el.style.setProperty('--dly', `${(i % 8) * step}s`); });
  const tag = () => {
    mark('.needs__grid li', 0.06); mark('.stack__card', 0.15);
    mark('.steps li', 0.1);
    mark('.finder__head, .count', 0);
    mark('.panel', 0); mark('.mapbox', 0.12);
    mark('.access .eyebrow, .access h2, .access__lede', 0.08);
    mark('.ledger__item', 0.1);
    mark('.carhead, .carhint, .access h3, .tested li, .access__note', 0.05);
    mark('.howtest', 0);
    mark('.foot p', 0.06);
    mark('.band__title, .band__stats li', 0.12);
    mark('.about-reveal', 0.08);
  };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  const watch = () => { tag(); $$('[data-reveal]:not(.in)').forEach(el => io.observe(el)); };
  watch();
  // lists are rebuilt on language change: tag the new nodes too
  new MutationObserver(ms => { if (ms.every(m => m.target.closest && m.target.closest("#map"))) return; clearTimeout(watch.t); watch.t = setTimeout(watch, 30); })
    .observe(document.getElementById('main'), { childList: true, subtree: true });
  // anything that gets keyboard focus is shown at once
  document.addEventListener('focusin', e => { const r = e.target.closest('[data-reveal]'); if (r) r.classList.add('in'); });

  // 3. parallax: each layer moves at its own speed (data-px), relative to its section
  const layers = $$('[data-px]');
  let ticking = false;
  const frame = () => {
    ticking = false;
    const vh = innerHeight;
    for (const el of layers) {
      const host = el.closest('section') || document.body;
      const r = host.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const k = parseFloat(el.dataset.px) || 0;
      const f = el.classList.contains('stack__card') ? 0.5 : 0.35;
      el.style.setProperty('--py', `${(-r.top * k * f).toFixed(1)}px`);
    }
    // hero: text lifts and fades, photo stack fans out
    const hero = document.querySelector('.hero'), main = document.querySelector('.hero__main');
    if (hero && main) {
      const hr = hero.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -hr.top / hr.height));
      main.style.setProperty('--hy', `${(-p * 120).toFixed(1)}px`);
      $$('.stack__card').forEach(c => c.style.setProperty('--spread', `${(p * 9).toFixed(2)}deg`));
      const ph = document.querySelector('.hero__photo'); if (ph) ph.style.scale = (1 + p * 0.12).toFixed(3);
    }
    // band: photo zooms slowly while it crosses the screen
    const band = document.querySelector('.band');
    if (band) {
      const br = band.getBoundingClientRect();
      const q = Math.min(1, Math.max(0, (vh - br.top) / (vh + br.height)));
      const bp = band.querySelector('.band__photo'); if (bp) bp.style.setProperty('--ps', (1.05 + q * 0.15).toFixed(3));
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();

  // 4. band numbers count up once when they come into view (the final number is in the HTML for everyone)
  const nums = $$('[data-count]');
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, end = +el.dataset.count, t0 = performance.now();
    cio.unobserve(el);
    const tick = now => { const k = Math.min(1, (now - t0) / 1400); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  nums.forEach(n => cio.observe(n));

  // 5. the photo stack tilts toward the pointer (desktop only)
  const stack = document.querySelector('.stack');
  if (stack && matchMedia('(hover: hover)').matches) {
    const zone = stack.closest('.hero') || stack;
    zone.addEventListener('pointermove', e => {
      const r = stack.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 1.2)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 1.2)));
      stack.style.setProperty('--tx', `${(dy * -7).toFixed(2)}deg`); stack.style.setProperty('--ty', `${(dx * 9).toFixed(2)}deg`);
      stack.querySelectorAll('.stack__card').forEach((c, i) => c.style.setProperty('--sx', `${(dx * (i + 1) * 10).toFixed(1)}px`));
    });
    zone.addEventListener('pointerleave', () => { stack.style.setProperty('--tx', '0deg'); stack.style.setProperty('--ty', '0deg'); stack.querySelectorAll('.stack__card').forEach(c => c.style.setProperty('--sx', '0px')); });
  }

  // 6. hero pins lean toward the pointer a little
  const hero = document.querySelector('.hero');
  if (hero && matchMedia('(hover: hover)').matches) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      $$('.fpin', hero).forEach(p => { const k = parseFloat(p.dataset.px) || .5; p.style.marginLeft = `${(dx * 26 * k).toFixed(1)}px`; });
    });
  }
})();
