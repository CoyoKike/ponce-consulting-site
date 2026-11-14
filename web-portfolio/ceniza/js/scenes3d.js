// Every small 3D piece below the hero is drawn by ONE fixed canvas with a viewport per slot
// (elements with data-scene). One WebGL context, so phones never run out.
// Pieces use free scanned models (see CREDITS.md):
// lantern (lit while the kitchen is open), table (one chair per guest).
import * as THREE from 'three';
import { RoomEnvironment } from '../assets/vendor/RoomEnvironment.js';
import { cdmxNow } from './main.js';
import { model } from './models.js';

const EMBER = 0xd4693a, BONE = 0xe6dfd3, EDGE = 0xece6dc;
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .7, metalness: 0, ...o });
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const clamp01 = v => Math.max(0, Math.min(1, v));

function lights(scene, warm = 1) {
  scene.add(new THREE.HemisphereLight(0xfff3e6, 0x1a1512, .7));
  const k = new THREE.DirectionalLight(0xfff0dc, 2.4); k.position.set(3, 6, 4); scene.add(k);
  const r = new THREE.DirectionalLight(0xbcd2ff, .7); r.position.set(-4, 2, -3); scene.add(r);
  const f = new THREE.PointLight(0xff8040, 3 * warm, 6, 1.5); f.position.set(-1.5, .3, 1.8); scene.add(f);
  return f;
}
// a soft round shadow under each piece, so nothing floats
let shadowTex = null;
function contact(size, opacity = .7) {
  if (!shadowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(.55, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity }));
  m.rotation.x = -Math.PI / 2; m.position.y = .002; return m;
}

/* ================= lantern: lit while the kitchen is open (Mexico City time) ================= */
const OPEN = { 0: [13, 18], 1: null, 2: [18, 23], 3: [18, 23], 4: [18, 23], 5: [18, 24], 6: [18, 24] };
async function lantern() {
  const s = new THREE.Scene(); lights(s, 0);
  const g = new THREE.Group(); s.add(g);
  const l = await model('Lantern_01', { size: 2.2, by: 'h' });
  g.add(l);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffb070, toneMapped: false }));
  flame.scale.set(1, 1.9, 1); flame.position.y = .78; g.add(flame);
  const glowL = new THREE.PointLight(0xff9a50, 0, 4, 1.4); glowL.position.y = .8; g.add(glowL);
  g.position.y = -1.1;
  const cam = new THREE.PerspectiveCamera(26, 1, .1, 50); cam.position.set(0, .3, 5.6); cam.lookAt(0, 0, 0);
  let lit = 0;
  return { scene: s, cam, update(c, dt) {
    const { day, h } = cdmxNow(); const t = OPEN[day];
    const on = t && h >= t[0] && h < t[1] ? 1 : .12;
    lit += (on - lit) * Math.min(1, dt * 3);
    const f = .85 + .1 * Math.sin(c.t * 9) + .05 * Math.sin(c.t * 17);
    glowL.intensity = 6 * lit * f; flame.scale.set(lit, 1.9 * lit * f, lit); flame.visible = lit > .05;
    g.rotation.y = -.35 + c.px * .5; g.rotation.z = Math.sin(c.t * 1.3) * .03;
  } };
}

/* ================= table: one chair per guest, seen as you walk up to it ================= */
async function table(bus) {
  const s = new THREE.Scene(); const fire = lights(s, .7);
  const g = new THREE.Group(); s.add(g);
  // real sizes in metres: table 1.4 m across, chairs about 0.98 m tall
  const [top, chairSrc, plateSrc, cupSrc] = await Promise.all([
    model('round_wooden_table_01', { size: 1.4 }), model('dining_chair_02', { size: .975, by: 'h' }),
    model('carved_wooden_plate', { size: .27 }), model('brass_goblets', { size: .19, by: 'h', only: 'brass_goblet_01' }),
  ]);
  const tableH = top.userData.height;
  g.add(top, contact(2.6, .8));
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .14, 24), std(BONE));
  candle.position.y = tableH + .07; g.add(candle);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(.022, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffb070 }));
  flame.scale.set(1, 1.8, 1); flame.position.y = tableH + .17; g.add(flame);
  fire.position.set(0, tableH + .35, 0); fire.distance = 3;
  // the chair file faces +z; each seat is a chair plus its plate and glass on the table in front of it
  const seats = [];
  for (let i = 0; i < 8; i++) {
    const seat = new THREE.Group();
    const chair = chairSrc.clone(true); chair.position.z = .78; chair.rotation.y = Math.PI; // pulled up to the table, facing in
    const plate = plateSrc.clone(true); plate.position.set(0, tableH, .48);
    const cup = cupSrc.clone(true); cup.position.set(.16, tableH, .38);
    seat.add(chair, plate, cup);
    seat.scale.setScalar(.001); g.add(seat); seats.push({ seat, k: 0, a: 0, ta: 0 });
  }
  let n = 2;
  // guests spread evenly, starting on the right; two guests sit left and right, facing each other
  const place = () => seats.forEach((st, i) => { st.on = i < n; if (i < n) st.ta = Math.PI / 2 + (i / n) * Math.PI * 2; });
  place(); seats.forEach(st => (st.a = st.ta));
  bus.addEventListener('party', e => { n = e.detail; place(); });
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 50);
  return { scene: s, cam, update(c, dt) {
    seats.forEach(st => {
      st.k += ((st.on ? 1 : 0) - st.k) * Math.min(1, dt * 7);
      let d = st.ta - st.a; d = Math.atan2(Math.sin(d), Math.cos(d)); st.a += d * Math.min(1, dt * 6);
      st.seat.rotation.y = st.a;
      st.seat.scale.setScalar(Math.max(.001, st.k));
    });
    const f = .85 + .1 * Math.sin(c.t * 9) + .05 * Math.sin(c.t * 17);
    flame.scale.set(1, 1.8 * f, 1); fire.intensity = 2 * f;
    // a guest's view: standing a few steps back, eyes a little above the table
    const a = c.px * .35 + (c.prog - .5) * .4;
    const d = c.aspect < 1 ? 4.6 : 3.7;
    cam.position.set(Math.sin(a) * d, 1.95 - c.py * .25, Math.cos(a) * d); cam.lookAt(0, .55, 0);
  } };
}

/* ================= the shared canvas ================= */
export async function initScenes(canvas, { reduce, bus }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth <= 760 ? 1.6 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setScissorTest(true);
  renderer.setClearColor(0x000000, 0);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose();
  const makers = { lantern, table: () => table(bus) };
  const els = [...document.querySelectorAll('[data-scene]')];
  const built = await Promise.all(els.map(el => (makers[el.dataset.scene]?.() ?? Promise.resolve(null)).catch(e => (console.warn('3D piece off', el.dataset.scene, e), null))));
  const slots = els.map((el, i) => ({ el, it: built[i], clip: el.closest('section') })).filter(s => s.it);
  slots.forEach(s => { s.it.scene.environment = env; s.it.scene.environmentIntensity = .55; });
  // compile every piece's shaders now, during the loader, so nothing stutters when a section first appears
  slots.forEach(s => { try { renderer.compile(s.it.scene, s.it.cam); } catch { } });
  const P = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', e => { P.x = e.clientX / innerWidth * 2 - 1; P.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  const size = () => renderer.setSize(innerWidth, innerHeight, false);
  size(); addEventListener('resize', size);
  // a slot fades with its own card, so 3D never shows before its section has appeared
  const opac = el => { let o = 1, n = el; for (let i = 0; i < 6 && n && n !== document.body; i++, n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; };
  let last = performance.now(), t0 = last, drewLast = true;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const t = reduce ? 0 : (now - t0) / 1000;
    P.sx += (P.x - P.sx) * Math.min(1, dt * 4); P.sy += (P.y - P.sy) * Math.min(1, dt * 4);
    const H = innerHeight;
    // nothing on screen and nothing left drawn: skip the frame entirely
    const any = slots.some(s => { const r = s.el.getBoundingClientRect(); return r.bottom > 0 && r.top < H; });
    if (!any && !drewLast) return;
    renderer.setScissor(0, 0, innerWidth, innerHeight); renderer.clear();
    drewLast = any;
    for (const s of slots) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.width < 2 || r.height < 2) continue;
      const o = opac(s.el); if (o < .3) continue;
      const cr = s.clip ? s.clip.getBoundingClientRect() : { top: 0, bottom: H, left: 0, right: innerWidth };
      const top = Math.max(r.top, cr.top, 0), bot = Math.min(r.bottom, cr.bottom, H);
      if (bot <= top) continue;
      const prog = reduce ? .5 : clamp01((H - r.top) / (H + r.height));
      s.it.cam.aspect = r.width / r.height; s.it.cam.updateProjectionMatrix();
      s.it.update({ t, prog, px: reduce ? 0 : P.sx, py: reduce ? 0 : P.sy, aspect: r.width / r.height }, dt);
      renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
      renderer.setScissor(Math.max(r.left, cr.left), H - bot, Math.min(r.right, cr.right) - Math.max(r.left, cr.left), bot - top);
      renderer.toneMappingExposure = o; // fades in with its card
      renderer.render(s.it.scene, s.it.cam);
    }
  }
  requestAnimationFrame(frame);
  return { slots };
}
