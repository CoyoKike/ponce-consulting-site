/* MONOLITH — load-test rig: hold the button, the press head comes down onto the beam and bends it. */
(() => {
  const DPR = Math.min(matchMedia('(hover: none)').matches ? 1.5 : 2, window.devicePixelRatio || 1);
  const rig = document.getElementById('loadCanvas');
  const btn = document.getElementById('loadBtn');
  if (!rig || !btn) return;

  const fit = cv => {
    const r = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * DPR)); cv.height = Math.max(1, Math.round(r.height * DPR));
    return { w: r.width, h: r.height };
  };
  const visible = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };

  const g = rig.getContext('2d'); let W = 0, H = 0;
  const st = { load: 0, defl: 0, dv: 0, head: 0, hv: 0, holding: false };
  const MAXKN = 1200, WORK = 800, HEAD_H = 34;
  const out = { val: document.getElementById('lVal'), def: document.getElementById('lDef'), stat: document.getElementById('lStat'), fill: btn.querySelector('.fill') };
  const geom = () => ({ x0: W * .1, x1: W * .9, y: H * .66, maxD: H * .1, top: H * .08 });
  const beamY = x => { const { x0, x1, y } = geom(); const u = Math.min(1, Math.max(0, (x - x0) / (x1 - x0))); return y + st.defl * Math.sin(Math.PI * u); };
  const layout = () => { ({ w: W, h: H } = fit(rig)); };
  layout(); addEventListener('resize', layout);

  const press = on => {
    if (st.holding === on) return; st.holding = on;
    btn.classList.toggle('is-holding', on);
    btn.querySelector('span').textContent = on ? 'Loading…' : 'Hold to load';
    if (!on) { st.dv -= st.defl * .25; st.hv -= 6 + st.load * 14; }   // release: beam rebounds, head lifts off
  };
  btn.addEventListener('pointerdown', e => { e.preventDefault(); btn.setPointerCapture && btn.setPointerCapture(e.pointerId); press(true); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, () => press(false)));
  btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(true); } });
  btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') press(false); });
  btn.addEventListener('contextmenu', e => e.preventDefault());

  const status = kn => kn < 5 ? 'At rest' : kn < WORK ? 'Under load' : kn < 1100 ? 'Past working load' : 'Proof load';
  let lastTxt = '', last = performance.now();
  const step = (now = performance.now()) => {
    requestAnimationFrame(step);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!visible(rig)) return;
    const { x0, x1, y, maxD, top } = geom(), mid = (x0 + x1) / 2;
    // load ramps up while held (about 1.6 s to working load, 3.5 s to proof load), drops fast on release
    st.load += st.holding ? dt * (.42 - st.load * .2) : -st.load * Math.min(1, dt * 9);
    st.load = Math.max(0, Math.min(1, st.load));
    // the head travels down to the beam first; the beam only bends once the head is on it
    const reach = y - HEAD_H - top;
    const goal = st.holding || st.load > .02 ? reach + st.defl : 0;
    st.hv += (goal - st.head) * .1; st.hv *= .74; st.head += st.hv;
    const contact = st.head >= reach - 1;
    const bend = contact ? st.load : 0;
    // beam deflection: damped spring towards the load (it overshoots when released)
    st.dv += (bend * maxD - st.defl) * .14; st.dv *= .82; st.defl += st.dv;
    const headY = Math.min(top + st.head, beamY(mid) - HEAD_H);

    /* draw */
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
    const hw = Math.max(60, (x1 - x0) * .16);
    // frame: crosshead and two columns
    g.fillStyle = 'rgba(255,255,255,.14)';
    g.fillRect(x0 - 30, 0, 6, y + 59); g.fillRect(x1 + 24, 0, 6, y + 59);
    g.fillStyle = '#1b1b1b'; g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1;
    g.fillRect(x0 - 40, 0, x1 - x0 + 80, top * .55); g.strokeRect(x0 - 39.5, .5, x1 - x0 + 79, top * .55 - 1);
    // piston rod
    g.fillStyle = '#fafaf8'; g.fillRect(mid - 9, top * .55, 18, headY - top * .55);
    // press head
    g.fillStyle = '#1b1b1b'; g.fillRect(mid - hw / 2, headY, hw, HEAD_H); g.strokeRect(mid - hw / 2 + .5, headY + .5, hw - 1, HEAD_H - 1);
    g.fillStyle = 'rgba(255,255,255,.18)'; for (let hx = mid - hw / 2 + 10; hx < mid + hw / 2 - 8; hx += 12) g.fillRect(hx, headY + 6, 1, HEAD_H - 14);
    g.fillStyle = '#fafaf8'; g.fillRect(mid - hw / 2, headY + HEAD_H - 3, hw, 3);
    // supports
    g.fillStyle = '#fafaf8';
    [x0, x1].forEach(x => { g.beginPath(); g.moveTo(x, y + 14); g.lineTo(x - 22, y + 56); g.lineTo(x + 22, y + 56); g.closePath(); g.fill(); });
    g.fillRect(x0 - 40, y + 56, 80, 3); g.fillRect(x1 - 40, y + 56, 80, 3);
    // beam (thick curved band)
    g.beginPath();
    for (let i = 0; i <= 60; i++) { const x = x0 - 18 + (x1 - x0 + 36) * i / 60; g[i ? 'lineTo' : 'moveTo'](x, beamY(x)); }
    for (let i = 60; i >= 0; i--) { const x = x0 - 18 + (x1 - x0 + 36) * i / 60; g.lineTo(x, beamY(x) + 16); }
    g.closePath(); g.fillStyle = '#d9d8d4'; g.fill();
    // stress marks under the beam, stronger with load
    g.strokeStyle = `rgba(255,255,255,${.12 + bend * .5})`;
    for (let i = 1; i < 12; i++) { const x = x0 + (x1 - x0) * i / 12, yy = beamY(x) + 22; g.beginPath(); g.moveTo(x, yy); g.lineTo(x, yy + 6 + bend * 18 * Math.sin(Math.PI * i / 12)); g.stroke(); }

    const kn = Math.round(bend * MAXKN), mm = (st.defl / maxD * 48);
    const txt = kn + '|' + mm.toFixed(1);
    if (txt !== lastTxt) {
      lastTxt = txt;
      out.val.textContent = kn.toLocaleString('en-US') + ' kN';
      out.def.textContent = Math.max(0, mm).toFixed(1) + ' mm';
      out.stat.textContent = status(kn);
      out.fill.style.transform = `scaleX(${st.load})`;
      btn.style.setProperty('--load', st.load.toFixed(3));
    }
  };
  step();
})();
