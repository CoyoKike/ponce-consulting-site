// Layer 3: interaction. Everything marked .press goes down under the finger like it is under
// pressure (it shrinks and tips toward the exact point you pressed, with an inner shadow), then
// springs back on release. A hairline ring spreads from the press point. Works for mouse, touch and keyboard.
const bound = new WeakSet();
let cursorReady = false;

export function initPress(root = document) {
  const gsap = window.gsap;
  if (!gsap) return;
  if (!cursorReady) { cursorReady = true; initCursor(gsap); }
  root.querySelectorAll('.press').forEach(el => {
    if (bound.has(el)) return;
    bound.add(el);
    const big = () => el.offsetWidth > 220 || el.offsetHeight > 160;   // cards tip, buttons squash
    let down = false;
    const press = (x, y) => {
      if (el.disabled) return;
      down = true;
      const r = el.getBoundingClientRect();
      const nx = x == null ? 0 : ((x - r.left) / r.width) * 2 - 1;
      const ny = y == null ? 0 : ((y - r.top) / r.height) * 2 - 1;
      el.classList.add('is-pressed');
      gsap.to(el, big()
        ? { scale: .975, rotationX: ny * 5, rotationY: -nx * 6, transformPerspective: 900, duration: .16, ease: 'power2.out', overwrite: 'auto' }
        : { scaleX: 1.04, scaleY: .9, duration: .12, ease: 'power2.out', overwrite: 'auto' });
      ring(el, x == null ? r.width / 2 : x - r.left, y == null ? r.height / 2 : y - r.top, Math.max(r.width, r.height));
    };
    const release = () => {
      if (!down) return;
      down = false;
      el.classList.remove('is-pressed');
      gsap.to(el, { scale: 1, scaleX: 1, scaleY: 1, rotationX: 0, rotationY: 0, duration: 1, ease: 'elastic.out(1.15, .32)', overwrite: 'auto' });
    };
    el.addEventListener('pointerdown', e => { if (e.button === 0) press(e.clientX, e.clientY); });
    el.addEventListener('pointerup', release);
    el.addEventListener('pointerleave', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !down && !e.repeat) press(); });
    el.addEventListener('keyup', release);
    el.addEventListener('blur', release);
  });
  // buttons lean a little toward the cursor before the click (desktop)
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    root.querySelectorAll('.btn').forEach(b => {
      if (b._mag) return; b._mag = true;
      const xTo = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3' }), yTo = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3' });
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .18); yTo((e.clientY - r.top - r.height / 2) * .25); });
      b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }
}

function ring(el, x, y, size) {
  const gsap = window.gsap;
  const r = document.createElement('span');
  r.className = 'press-ring';
  r.style.left = x + 'px'; r.style.top = y + 'px';
  el.append(r);
  // grow the ring itself (not a scale) so its hairline stays a hairline
  gsap.fromTo(r, { width: 10, height: 10, marginLeft: -5, marginTop: -5, opacity: .9 }, { width: size * 1.6, height: size * 1.6, marginLeft: -size * .8, marginTop: -size * .8, opacity: 0, duration: .9, ease: 'power2.out', onComplete: () => r.remove() });
}

function initCursor(gsap) {
  const c = document.querySelector('.cursor');
  if (!c || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const xTo = gsap.quickTo(c, 'x', { duration: .35, ease: 'power3' }), yTo = gsap.quickTo(c, 'y', { duration: .35, ease: 'power3' });
  gsap.set(c, { opacity: 0 });
  addEventListener('pointermove', e => {
    xTo(e.clientX); yTo(e.clientY);
    if (!c._on) { c._on = true; gsap.to(c, { opacity: 1, duration: .3 }); }
    const over = e.target.closest?.('a, button, .press, input, select, textarea, label');
    if (e.target.tagName !== 'CANVAS') c.classList.toggle('is-hover', !!over);
  }, { passive: true });
  addEventListener('pointerdown', () => c.classList.add('is-down'));
  addEventListener('pointerup', () => c.classList.remove('is-down'));
  document.documentElement.addEventListener('pointerleave', () => { c._on = false; gsap.to(c, { opacity: 0, duration: .3 }); });
}
