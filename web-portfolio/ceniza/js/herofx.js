// Hero: one photo with layered depth. Each layer moves at its own speed on scroll and drifts with the mouse:
// photo (slowest, pushing in on the molcajete) -> headline -> out-of-focus fire -> embers (fastest). Click or tap: the photo presses in and springs back (no particles).
// The push-in ends at PUSH; after that the room photo rises over the hero like a curtain (motion.js) while the hero sinks back.
export function initHero(stage, { reduce }) {
  const $ = s => stage.querySelector(s);
  const photo = $('.hero__photo'), emberC = $('.hero__embers'), fg = $('.hero__fg'), copy = $('.hero__copy');
  const ex = emberC.getContext('2d');
  const st = { emo: [0, 0], p: 0, mx: 0, my: 0, tx: 0, ty: 0, press: 0, intro: reduce ? 1 : 0, vw: 0, vh: 0, Z: 1 };
  const phone = () => innerWidth <= 760;
  const PUSH = .62;                             // share of the pinned scroll spent pushing in
  const ZOOM = () => (phone() ? 1.32 : 1.5);    // the v5 depth; laid out at full size, so it stays sharp

  /* ---------- geometry ----------
     The resting frame is a little larger than the screen (room for drift). The element itself is laid out at the size of the
     deepest zoom (Z times the resting frame, around the same focus point) and scaled DOWN by 1/Z at rest, so the browser always
     draws it from the full-resolution file and the push-in never blows up a small bitmap. */
  function layout() {
    const vw = stage.clientWidth, vh = stage.clientHeight;
    st.vw = vw; st.vh = vh;
    const ph = phone(), Z = ZOOM(); st.Z = Z;
    const ix = ph ? .03 : .04, iy = ph ? .04 : .06;   // resting frame overhang
    const ox = ph ? .5 : .57, oy = ph ? .4 : .46;     // focus point, as a share of the frame
    const bw = vw * (1 + 2 * ix), bh = vh * (1 + 2 * iy), bx = -vw * ix, by = -vh * iy;
    const fx = bx + ox * bw, fy = by + oy * bh, w = bw * Z, h = bh * Z;
    Object.assign(photo.style, {
      left: (fx - ox * w).toFixed(1) + 'px', top: (fy - oy * h).toFixed(1) + 'px', width: w.toFixed(1) + 'px', height: h.toFixed(1) + 'px',
      right: 'auto', bottom: 'auto', transformOrigin: `${ox * 100}% ${oy * 100}%`,
    });
    const d = Math.min(devicePixelRatio || 1, 1.5);
    emberC.width = Math.round(vw * d); emberC.height = Math.round(vh * d); ex.setTransform(d, 0, 0, d, 0, 0);
  }

  /* ---------- embers: small sparks rising from the fire ---------- */
  const embers = [];
  const newEmber = (x, y) => {
    const a = -Math.PI / 2 + (Math.random() - .5) * .5, sp = 30 + Math.random() * 60;
    return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: .6 + Math.random() * 1.5, age: 0, life: 3 + Math.random() * 2.5, ph: Math.random() * 6.3, heat: Math.random() };
  };
  const spawnBase = () => newEmber(st.vw * (.3 + Math.random() * .65), st.vh * (1.02 + Math.random() * .05));

  /* ---------- mouse drift and click press ---------- */
  const fine = matchMedia('(pointer: fine)').matches;
  if (fine && !reduce) addEventListener('pointermove', e => { st.tx = e.clientX / innerWidth * 2 - 1; st.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  const gsap = window.gsap;
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('a, button') || reduce) return;
    gsap?.to(st, { press: 1, duration: .16, ease: 'power2.out', overwrite: true });
  });
  const release = () => gsap?.to(st, { press: 0, duration: 1.1, ease: 'elastic.out(1, .35)', overwrite: true });
  stage.addEventListener('pointerup', release); stage.addEventListener('pointerleave', release);

  /* ---------- render loop (only while the hero is on screen) ---------- */
  let visible = true, last = performance.now();
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !reduce) { last = performance.now(); requestAnimationFrame(frame); } }).observe(stage);
  layout();
  addEventListener('resize', layout);
  for (let i = 0; i < 40; i++) { const e = spawnBase(); e.y = st.vh * Math.random(); e.age = Math.random() * e.life; embers.push(e); }

  function place(t) {
    const { p, vh } = st;
    st.mx += (st.tx - st.mx) * .05; st.my += (st.ty - st.my) * .05;
    const m = (k) => `${(st.mx * k).toFixed(2)}px ${(st.my * k * .6).toFixed(2)}px`;
    // a slow breathing drift, so the photo is never fully still
    const bx = Math.sin(t * .00011) * 6, by = Math.cos(t * .00009) * 4;
    // push in: slow at first, then settle on the stone bowl by PUSH; then the hero sinks back a little as the room covers it
    const q = Math.min(1, p / PUSH), e = q * q * (3 - 2 * q);
    const after = Math.max(0, (p - PUSH) / (1 - PUSH));
    const y = -e * vh * (phone() ? .02 : .05) - after * vh * .12;
    const zoom = (1 + e * (st.Z - 1)) * (1 - st.press * .025);
    const sc = Math.min(zoom, st.Z) / st.Z * (1 - (1 - st.intro) * .04);   // never above 1: never upscaled
    photo.style.transform = `translate3d(${bx.toFixed(1)}px, ${(y + by).toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
    photo.style.translate = m(-14);
    photo.style.opacity = .25 + st.intro * .75;
    // the canvas stays put; its contents are offset when drawn, so no edge ever shows
    st.emo = [st.mx * -90, st.my * -54 - p * vh * .3];
    copy.style.translate = m(-40);
    // the out-of-focus fire sits low and fades away as you push in, so nothing soft is smeared over the stone
    fg.style.transform = `translate3d(0, ${((.22 + e * .12) * vh).toFixed(1)}px, 0)`;
    fg.style.opacity = ((.38 + st.press * .25) * (1 - e)).toFixed(3);
    fg.style.translate = m(-70);
  }

  function frame(t) {
    if (!visible) return;
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    place(t);
    const { vw, vh, p } = st;
    ex.clearRect(0, 0, vw, vh);
    ex.globalCompositeOperation = 'lighter';
    const want = (phone() ? 34 : 60) * (1 + Math.min(1, p / PUSH) * .8);
    let base = 0;
    for (let i = embers.length; i--;) {
      const e = embers[i]; e.age += dt;
      if (e.age > e.life || e.y < -20) { embers.splice(i, 1); continue; }
      base++;
      e.vx += Math.sin(t * .002 + e.ph) * 14 * dt; e.vy -= 6 * dt; e.vx *= .99; e.vy *= .995;
      e.x += e.vx * dt; e.y += e.vy * dt;
      const k = e.age / e.life, fl = .55 + .45 * Math.sin(t * .02 + e.ph * 5);
      const a = (1 - k) * fl, r = e.r * (1 - k * .5);
      const col = e.heat > .6 ? '255,214,140' : e.heat > .25 ? '255,150,70' : '240,95,40';
      ex.fillStyle = `rgba(${col},${(a * .25).toFixed(3)})`; ex.beginPath(); ex.arc(e.x + st.emo[0], e.y + st.emo[1], r * 4, 0, 6.283); ex.fill();
      ex.fillStyle = `rgba(${col},${a.toFixed(3)})`; ex.beginPath(); ex.arc(e.x + st.emo[0], e.y + st.emo[1], r, 0, 6.283); ex.fill();
    }
    ex.globalCompositeOperation = 'source-over';
    while (base++ < want && Math.random() < .5) embers.push(spawnBase());
    requestAnimationFrame(frame);
  }
  if (reduce) { place(0); return { setScroll() {}, intro() {} }; }
  requestAnimationFrame(frame);

  return {
    setScroll(v) { st.p = v; },
    intro(now) { if (now || !gsap) { st.intro = 1; return; } gsap.to(st, { intro: 1, duration: 2.6, ease: 'expo.out' }); },
  };
}
