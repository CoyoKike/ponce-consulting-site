// Polish layer: velocity marquee, room progress, gentle image load-in.
document.fonts.ready.then(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // ---------- Images fade in instead of popping ----------
  $$('img[loading="lazy"]').forEach(img => {
    if (img.complete) return;
    img.classList.add('is-pending');
    img.addEventListener('load', () => img.classList.remove('is-pending'), { once: true });
  });

  // ---------- Rooms: highlight the room being read + progress badge ----------
  const rooms = $$('.room'), idx = $('.rooms__idx'), bar = $('.rooms__bar i');
  rooms.forEach((r, i) => ScrollTrigger.create({
    trigger: r, start: 'top 55%', end: 'bottom 55%',
    onToggle: self => {
      if (!self.isActive) return;
      rooms.forEach(x => x.classList.toggle('is-active', x === r));
      idx.textContent = String(i + 1).padStart(2, '0');
      bar.style.transform = `scaleX(${(i + 1) / rooms.length})`;
    }
  }));
  rooms[0].classList.add('is-active');

  if (reduce) return;

  // ---------- Hero light beam only animates while the hero is on screen ----------
  ScrollTrigger.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top', onToggle: s => $('.hero').classList.toggle('is-off', !s.isActive) });

  // ---------- Marquee: drifts on its own, speeds up and skews with scroll ----------
  const row = $('.marquee__row');
  row.innerHTML += row.innerHTML;
  const loop = gsap.to(row, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
  const skew = gsap.quickTo(row, 'skewX', { duration: 0.5, ease: 'power3' });
  window.__lenis?.on('scroll', ({ velocity }) => {
    loop.timeScale(1 + Math.min(Math.abs(velocity) * 0.25, 6));
    skew(gsap.utils.clamp(-8, 8, -velocity * 0.4));
  });
  ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onToggle: s => (s.isActive ? loop.play() : loop.pause()) });
});
