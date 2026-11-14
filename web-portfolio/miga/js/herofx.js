// Hero: the loaf photo seen through the letters of the name.
// A cream sheet covers the photo with "Miga" cut out of it (SVG mask). Scrolling flies the camera through the stem of the i:
// the letters grow around a point inside the i until the stem fills the screen, while the photo behind settles back (scales down),
// so the two layers move against each other. Flour dust drifts in front of the photo; the mouse slides the photo behind the letters.
export function initHero(stage, { reduce }) {
  const $ = s => stage.querySelector(s);
  const photo = $('.hero__photo'), dustC = $('.hero__dust'), word = $('.hero__word'), text = $('.hero__letters'), sheet = $('.hero__sheet');
  const dx = dustC.getContext('2d');
  const st = { p: 0, mx: 0, my: 0, tx: 0, ty: 0, intro: reduce ? 1 : 0, vw: 0, vh: 0, ix: 0, iy: 0 };
  const phone = () => innerWidth <= 760;
  const ZEND = .72;     // share of the pinned scroll spent flying through the i
  const S = 70;         // final scale of the letters

  /* ---------- layout: size the word to the screen, find the i ---------- */
  function layout() {
    const vw = stage.clientWidth, vh = stage.clientHeight;
    st.vw = vw; st.vh = vh;
    const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navh')) || 72;
    const copyTop = $('.hero__copy').offsetTop - (phone() ? 18 : 56);
    // the word is a fixed path (Fraunces 144 pt master, 2000 units per em; drawn once with fontTools), so the browser never
    // has to rasterize giant type: word box x -1..3797, y -1400..492; the stem of the i is centred at x 1806, 400 units up
    const W = 3798, H = 1892, X0 = -1, Y0 = -1400;
    const top = nav + (phone() ? 18 : 10), avail = Math.max(80, copyTop - top);
    const k = Math.min(vw * .9 / W, avail / H);
    const tx = (vw - W * k) / 2 - X0 * k, ty = top + (avail - H * k) / 2 - Y0 * k;
    text.setAttribute('transform', `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(5)})`);
    st.ix = tx + 1806 * k; st.iy = ty - 400 * k;
    const d = Math.min(devicePixelRatio || 1, 1.5);
    dustC.width = Math.round(vw * d); dustC.height = Math.round(vh * d); dx.setTransform(d, 0, 0, d, 0, 0);
    place(performance.now());
  }

  /* ---------- flour dust in the window light ---------- */
  const dust = [];
  const fleck = () => ({ x: Math.random() * st.vw, y: Math.random() * st.vh, vx: 4 + Math.random() * 10, vy: -2 - Math.random() * 5, r: .5 + Math.random() * 1.3, age: 0, life: 6 + Math.random() * 7, ph: Math.random() * 6.3 });

  const fine = matchMedia('(pointer: fine)').matches;
  if (fine && !reduce) addEventListener('pointermove', e => { st.tx = e.clientX / innerWidth * 2 - 1; st.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  const ease = q => q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;   // easeInOutCubic
  function place(t) {
    const { p, vw, vh } = st;
    st.mx += (st.tx - st.mx) * .05; st.my += (st.ty - st.my) * .05;
    const q = Math.min(1, p / ZEND), e = ease(q);
    // letters: scale around the i (log scale feels like a constant speed), drifting the i to the centre of the screen
    const s = Math.exp(Math.log(S) * e);
    const cx = st.ix + (vw / 2 - st.ix) * e, cy = st.iy + (vh / 2 - st.iy) * e;
    word.setAttribute('transform', `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${s.toFixed(4)}) translate(${(-st.ix).toFixed(2)} ${(-st.iy).toFixed(2)})`);
    sheet.style.opacity = q < .86 ? 1 : Math.max(0, 1 - (q - .86) / .14);
    // photo: laid out 120% of the screen and only ever scaled DOWN, so it stays sharp; it settles back as the letters fly at you
    const bx = Math.sin(t * .00011) * 5, by = Math.cos(t * .00009) * 4;
    const sc = (1 - e * .13) * (1 + (1 - st.intro) * .05);
    photo.style.transform = `translate3d(${(bx + st.mx * -16).toFixed(1)}px, ${(by + st.my * -10 - p * vh * .03).toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
  }

  let visible = true, last = performance.now();
  function frame(t) {
    if (!visible) return;
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    place(t);
    const { vw, vh } = st;
    dx.clearRect(0, 0, vw, vh);
    const want = phone() ? 30 : 60;
    while (dust.length < want) dust.push(fleck());
    for (let i = dust.length; i--;) {
      const f = dust[i]; f.age += dt;
      if (f.age > f.life) { dust.splice(i, 1); continue; }
      f.vy += Math.sin(t * .0006 + f.ph) * 2 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
      const a = Math.sin(f.age / f.life * Math.PI) * .55;
      dx.fillStyle = `rgba(255,252,246,${a.toFixed(3)})`; dx.beginPath(); dx.arc(f.x + st.mx * -30, f.y + st.my * -18, f.r, 0, 6.283); dx.fill();
    }
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !reduce) { last = performance.now(); requestAnimationFrame(frame); } }).observe(stage);

  layout();
  addEventListener('resize', layout);
  if (reduce) return { setScroll() {}, intro() {} };
  requestAnimationFrame(frame);

  return {
    setScroll(v) { st.p = v; },
    intro(now) { const gsap = window.gsap; if (now || !gsap) { st.intro = 1; return; } gsap.to(st, { intro: 1, duration: 2.4, ease: 'expo.out' }); },
  };
}
