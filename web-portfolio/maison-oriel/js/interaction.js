// Interaction layer: cursor, magnetic buttons, glass tilt + glare, hover depth, smart nav.
document.fonts.ready.then(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // ---------- Nav hides on the way down, returns on the way up ----------
  const nav = $('.nav');
  let lastY = 0;
  window.__lenis?.on('scroll', ({ scroll }) => {
    const down = scroll > lastY && scroll > 200;
    nav.classList.toggle('is-hidden', down);
    lastY = scroll;
  });

  if (!fine || reduce) return;
  document.documentElement.classList.add('has-cursor');

  // ---------- Cursor ----------
  const cur = $('.cursor'), label = $('.cursor__label');
  const cx = gsap.quickTo(cur, 'x', { duration: 0.45, ease: 'power3' });
  const cy = gsap.quickTo(cur, 'y', { duration: 0.45, ease: 'power3' });
  addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.add('is-out'));
  document.addEventListener('pointerenter', () => cur.classList.remove('is-out'));
  $$('[data-cursor]').forEach(el => {
    el.addEventListener('pointerenter', () => { label.textContent = el.dataset.cursor; cur.classList.add('is-view'); });
    el.addEventListener('pointerleave', () => cur.classList.remove('is-view'));
  });
  $$('a, button, input, select, [data-tilt]').forEach(el => {
    el.addEventListener('pointerenter', () => cur.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => cur.classList.remove('is-hover'));
  });

  // ---------- Magnetic ----------
  $$('[data-magnetic]').forEach(el => {
    const xT = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, .4)' });
    const yT = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, .4)' });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      xT((e.clientX - r.left - r.width / 2) * 0.35);
      yT((e.clientY - r.top - r.height / 2) * 0.45);
    });
    el.addEventListener('pointerleave', () => { xT(0); yT(0); });
  });

  // ---------- Glass tilt with moving glare ----------
  $$('[data-tilt], .stat, .contact__form').forEach(el => {
    const strength = el.matches('.contact__form') ? 4 : 10;
    gsap.set(el, { transformPerspective: 900 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3' });
    el.classList.add('has-glare');
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      rx((0.5 - py) * strength); ry((px - 0.5) * strength);
      el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%');
    });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });

  // ---------- Hero: scene shifts with the mouse ----------
  const hero = $('.hero');
  const bgX = gsap.quickTo('.hero__bg img', 'x', { duration: 1.4, ease: 'power3' });
  const bgY = gsap.quickTo('.hero__bg img', 'y', { duration: 1.4, ease: 'power3' });
  const cardX = gsap.quickTo('.hero__card', 'x', { duration: 1.2, ease: 'power3' });
  const cardY = gsap.quickTo('.hero__card', 'y', { duration: 1.2, ease: 'power3' });
  gsap.set('.hero__bg img', { scale: 1.06 });
  hero.addEventListener('pointermove', e => {
    const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
    bgX(nx * -30); bgY(ny * -20); cardX(nx * 40); cardY(ny * 30);
  });

  // ---------- Projects: image leans toward the pointer ----------
  $$('.project').forEach(p => {
    const media = $('.project__media', p), info = $('.project__info', p);
    p.addEventListener('pointerenter', () => { gsap.to(media, { scale: 0.97, duration: 0.9, ease: 'power3' }); gsap.to(info, { y: -10, duration: 0.9, ease: 'power3' }); });
    p.addEventListener('pointerleave', () => { gsap.to(media, { scale: 1, duration: 0.9, ease: 'power3' }); gsap.to(info, { y: 0, duration: 0.9, ease: 'power3' }); });
  });

  // ---------- Footer letters lift under the pointer ----------
  $$('.footer__big div').forEach(ch => {
    ch.addEventListener('pointerenter', () => gsap.to(ch, { yPercent: -18, color: '#c9a46a', duration: 0.5, ease: 'power3' }));
    ch.addEventListener('pointerleave', () => gsap.to(ch, { yPercent: 0, clearProps: 'color', duration: 0.9, ease: 'elastic.out(1, .35)' }));
  });
});
