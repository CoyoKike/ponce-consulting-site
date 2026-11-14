// Layer 3 — Interaction: pressure clicks, shockwaves, magnetic buttons, cursor, the reserve orb
const { gsap } = window;
const fine = matchMedia('(pointer: fine)').matches;

/* ---------- Shockwave + sparks at a screen point ---------- */
export function burst(x, y, power = 1, color = '255,179,107') {
  const ring = document.createElement('span');
  ring.className = 'shock';
  ring.style.cssText = `left:${x}px;top:${y}px;--c:${color}`;
  document.body.appendChild(ring);
  gsap.fromTo(ring, { scale: 0, opacity: 1 }, { scale: 2.2 + power * 2.4, opacity: 0, duration: .9 + power * .3, ease: 'expo.out', onComplete: () => ring.remove() });
  const n = Math.round(8 + power * 10);
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span'); p.className = 'spark';
    p.style.cssText = `left:${x}px;top:${y}px;--c:${color}`;
    document.body.appendChild(p);
    const a = (i / n) * Math.PI * 2 + Math.random() * .4, d = 40 + Math.random() * 70 * (1 + power);
    gsap.fromTo(p, { x: 0, y: 0, scale: 1, opacity: 1 }, { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 0, opacity: 0,
      duration: .7 + Math.random() * .5, ease: 'expo.out', onComplete: () => p.remove() });
  }
}

/* ---------- Press: element sinks under pressure, deeper the longer you hold, then springs back ---------- */
function pressable(el) {
  const isCard = el.classList.contains('card');
  let holdTl = null, down = false;
  const base = { scale: 1, y: 0, rotateX: 0, rotateY: 0 };
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    down = true; el.classList.add('is-pressed');
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
    gsap.killTweensOf(el, 'scale,y,rotateX,rotateY,x');
    holdTl = gsap.timeline();
    // first contact: quick hard press, tilted toward the finger
    holdTl.to(el, { scale: isCard ? .95 : .9, y: isCard ? 6 : 2, rotateX: isCard ? ny * -14 : 0, rotateY: isCard ? nx * 14 : 0,
      transformPerspective: 900, duration: .16, ease: 'power3.out' })
      // keep holding: pressure builds
      .to(el, { scale: isCard ? .9 : .84, y: isCard ? 12 : 3, duration: 1.4, ease: 'power1.out' })
      // at the limit: strained tremble
      .to(el, { x: '+=1.2', duration: .05, repeat: -1, yoyo: true, ease: 'none' });
    el.style.setProperty('--px', `${(nx + .5) * 100}%`); el.style.setProperty('--py', `${(ny + .5) * 100}%`);
  });
  const up = e => {
    if (!down) return; down = false;
    const held = holdTl ? Math.min(1.6, holdTl.time()) : 0; holdTl && holdTl.kill();
    el.classList.remove('is-pressed');
    const power = .35 + held / 1.6;
    gsap.to(el, { scale: 1, y: 0, x: 0, rotateX: 0, rotateY: 0, duration: 1.1 + power * .5, ease: `elastic.out(${1 + power * .4}, ${.32 - power * .08})` });
    if (e && e.type === 'pointerup') {
      const feature = el.classList.contains('card--feature') || el.classList.contains('btn--solid');
      burst(e.clientX, e.clientY, power, feature ? '255,255,255' : '255,179,107');
    }
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointerleave', () => up(null));
  el.addEventListener('pointercancel', () => up(null));
}

/* ---------- Magnetic pull toward the cursor ---------- */
function magnetic(el, strength = .35) {
  const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3.out' }), yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3.out' });
  el.addEventListener('pointermove', e => {
    if (el.classList.contains('is-pressed')) return;
    const r = el.getBoundingClientRect();
    xTo((e.clientX - r.left - r.width / 2) * strength); yTo((e.clientY - r.top - r.height / 2) * strength);
  });
  el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
}

/* ---------- Custom cursor ---------- */
export function initCursor() {
  const c = document.querySelector('.cursor'); if (!fine || !c) return { label() {} };
  c.style.display = 'block'; document.documentElement.classList.add('has-cursor');
  const dot = c.querySelector('.cursor__dot'), ring = c.querySelector('.cursor__ring'), lab = c.querySelector('.cursor__label');
  const dx = gsap.quickTo(dot, 'x', { duration: .08 }), dy = gsap.quickTo(dot, 'y', { duration: .08 });
  const rx = gsap.quickTo([ring, lab], 'x', { duration: .45, ease: 'power3.out' }), ry = gsap.quickTo([ring, lab], 'y', { duration: .45, ease: 'power3.out' });
  addEventListener('pointermove', e => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
  addEventListener('pointerdown', () => c.classList.add('is-down'));
  addEventListener('pointerup', () => c.classList.remove('is-down'));
  document.querySelectorAll('a, button, .pressable').forEach(el => {
    el.addEventListener('pointerenter', () => c.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => c.classList.remove('is-hover'));
  });
  return {
    label(text, on) {
      c.classList.toggle('is-planet', !!on);
      if (text) lab.textContent = text; else if (on) lab.textContent = 'Push';
    }
  };
}

/* ---------- The reserve orb: follows the light, squashes when held ---------- */
function orb() {
  const el = document.querySelector('.orb'); if (!el) return;
  const core = el.querySelector('.orb__core'), label = el.querySelector('.orb__label');
  const sec = el.closest('section');
  const tx = gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }), ty = gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' });
  sec.addEventListener('pointermove', e => {
    const r = sec.getBoundingClientRect(), er = el.getBoundingClientRect();
    const mx = e.clientX - (er.left + er.width / 2), my = e.clientY - (er.top + er.height / 2);
    if (!el.classList.contains('is-pressed')) { tx(mx * .06); ty(my * .06); }
    // light follows the mouse across the sphere
    const lx = 34 + Math.max(-1, Math.min(1, mx / r.width * 2)) * 18, ly = 28 + Math.max(-1, Math.min(1, my / r.height * 2)) * 18;
    core.style.setProperty('--lx', lx + '%'); core.style.setProperty('--ly', ly + '%');
  });
  sec.addEventListener('pointerleave', () => { tx(0); ty(0); });
  let t0 = 0;
  el.addEventListener('pointerdown', () => { t0 = performance.now(); label.innerHTML = 'Hold'; gsap.to(core, { scaleX: 1.14, scaleY: .78, duration: 1.4, ease: 'power2.out' }); });
  const up = e => {
    if (!t0) return;
    const p = Math.min(1, (performance.now() - t0) / 1400); t0 = 0;
    gsap.killTweensOf(core);
    gsap.fromTo(core, { scaleX: 1.14 - .1 * (1 - p), scaleY: .78 + .1 * (1 - p) }, { scaleX: 1, scaleY: 1, duration: 1.6, ease: 'elastic.out(1.4, .22)' });
    if (e && e.type === 'pointerup') {
      label.innerHTML = p > .6 ? 'Welcome<br>aboard' : 'Request<br>invitation';
      const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, .6 + p * 1.2);
      if (p > .6) setTimeout(() => label.innerHTML = 'Request<br>invitation', 2600);
    } else label.innerHTML = 'Request<br>invitation';
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointerleave', () => up(null));
}

export function initPress() {
  document.querySelectorAll('.pressable').forEach(el => { if (!el.classList.contains('orb')) pressable(el); });
  if (fine) document.querySelectorAll('.magnetic').forEach(el => magnetic(el));
  orb();
}
