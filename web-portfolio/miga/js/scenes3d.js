// Every small 3D piece below the hero is drawn by ONE fixed canvas with a viewport per slot
// (elements with data-scene). One WebGL context, so phones never run out.
// Pieces use free scanned models (see CREDITS.md): menu (one still life per counter tab),
// lantern (a kettle that steams while the bakery is open), table (the order basket, one croissant per croissant ordered).
import * as THREE from 'three';
import { RoomEnvironment } from '../assets/vendor/RoomEnvironment.js';
import { localNow } from './main.js';
import { model } from './models.js';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const clamp01 = v => Math.max(0, Math.min(1, v));

// soft morning light from a window on the left, warm bounce from the table
function lights(scene) {
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xcbb9a4, 1.1));
  const k = new THREE.DirectionalLight(0xfff1de, 2.6); k.position.set(-4, 6, 4); scene.add(k);
  const r = new THREE.DirectionalLight(0xffe2c4, .8); r.position.set(4, 2, -3); scene.add(r);
}
// a soft round shadow under each piece, so nothing floats
let shadowTex = null;
function contact(size, opacity = .35) {
  if (!shadowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(70,45,25,.9)'); gr.addColorStop(.55, 'rgba(70,45,25,.35)'); gr.addColorStop(1, 'rgba(70,45,25,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity }));
  m.rotation.x = -Math.PI / 2; m.position.y = .002; return m;
}
const topOf = m => new THREE.Box3().setFromObject(m).max.y;

/* ================= menu: one still life per tab ================= */
async function menu(bus) {
  const s = new THREE.Scene(); lights(s);
  const cam = new THREE.PerspectiveCamera(28, 1, .1, 50); cam.position.set(0, 2.3, 4.5); cam.lookAt(0, .3, 0);
  const pieces = {};
  // bread: three soft rolls on a wooden board
  {
    const g = new THREE.Group();
    const [board, buns] = await Promise.all([model('wooden_cutting_board', { size: 3.1 }), model('hamburger_buns', { size: 2.3 })]);
    buns.position.y = topOf(board) - .01;
    // the scan is pale, like raw dough: give the rolls a baked, golden crust
    buns.traverse(o => o.isMesh && o.material.color.multiply(new THREE.Color(1, .72, .42)));
    g.add(board, buns, contact(3.6));
    pieces.tasting = g;
  }
  // pastry: a croissant on a plate, with a cup of coffee on its saucer
  {
    const g = new THREE.Group();
    const [plate, c1, saucer, cup] = await Promise.all([
      model('tea_set_01', { size: 1.7, only: 'tea_set_01_plate_large_circular_03' }), model('croissant', { size: 1.1 }),
      model('tea_set_01', { size: .95, only: 'tea_set_01_saucer_circular_03' }), model('tea_set_01', { size: .62, only: 'tea_set_01_cup_small_01' }),
    ]);
    plate.position.set(-.35, 0, .15);
    c1.position.set(-.35, topOf(plate) - .02, .15); c1.rotation.y = .7;
    saucer.position.set(.95, 0, -.45); cup.position.set(.95, topOf(saucer) - .01, -.45);
    g.add(plate, c1, saucer, cup, contact(3.6));
    pieces.fire = g;
  }
  // cakes: a whole strawberry cake beside a carrot cake
  {
    const g = new THREE.Group();
    const [cake, carrot] = await Promise.all([model('strawberry_chocolate_cake', { size: 1.6 }), model('carrot_cake', { size: 1.25 })]);
    cake.position.set(-.45, 0, .1); carrot.position.set(.85, 0, -.45);
    g.add(cake, carrot, contact(3.8));
    pieces.agave = g;
  }
  const holder = new THREE.Group(); s.add(holder);
  Object.values(pieces).forEach(p => { p.visible = false; holder.add(p); });
  let cur = 'tasting'; pieces.tasting.visible = true;
  const st = { spin: 0, hop: 0, swap: 1 };
  const gsap = window.gsap;
  bus.addEventListener('tab', e => {
    const next = e.detail.tab; if (next === cur || !gsap) return;
    gsap.timeline()
      .to(st, { swap: 0, duration: .35, ease: 'power2.in' })
      .add(() => { pieces[cur].visible = false; cur = next; pieces[cur].visible = true; })
      .to(st, { swap: 1, duration: .9, ease: 'elastic.out(1, .5)' });
  });
  bus.addEventListener('dish', () => { if (!gsap) return; gsap.fromTo(st, { hop: 1 }, { hop: 0, duration: .9, ease: 'power3.out' }); st.spin += .9; });
  let spin = 0;
  return { scene: s, cam, update(c) {
    spin += (st.spin - spin) * .08;
    holder.rotation.y = -.5 + c.prog * 1.2 + c.px * .5 + spin;
    holder.rotation.x = c.py * .1;
    holder.position.y = Math.sin(st.hop * Math.PI) * .25 * st.hop;
    holder.scale.setScalar(Math.max(.001, st.swap));
  } };
}

/* ================= kettle: steams while the bakery is open (Austin time) ================= */
const OPEN = { 0: [8, 15], 1: null, 2: [7, 19], 3: [7, 19], 4: [7, 19], 5: [7, 19], 6: [7, 19] };
async function lantern() {
  const s = new THREE.Scene(); lights(s);
  const g = new THREE.Group(); s.add(g);
  const k = await model('vintage_electric_kettle', { size: 2.0, by: 'h' });
  g.add(k, contact(2.4));
  // steam: soft round puffs that rise, widen and fade
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c), top = k.userData.height;
  const puffs = [], R = rng(7);
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xf3ece2, transparent: true, depthWrite: false, opacity: 0 }));
    m.userData = { age: R() * 3, life: 2.4 + R() * 1.2, dx: (R() - .5) * .5 };
    g.add(m); puffs.push(m);
  }
  g.position.y = -1.05;
  const cam = new THREE.PerspectiveCamera(26, 1, .1, 50); cam.position.set(0, .4, 6.4); cam.lookAt(0, .1, 0);
  let lit = 0;
  return { scene: s, cam, update(cx, dt) {
    const { day, h } = localNow(); const t = OPEN[day];
    const on = t && h >= t[0] && h < t[1] ? 1 : 0;
    lit += (on - lit) * Math.min(1, dt * 2);
    puffs.forEach(p => {
      const u = p.userData; u.age += dt;
      if (u.age > u.life) { u.age = 0; u.dx = (Math.random() - .5) * .5; }
      const q = u.age / u.life;
      p.position.set(u.dx * q + Math.sin(cx.t * 1.5 + u.life * 9) * .06 * q, top + .05 + q * 1.1, 0);
      p.scale.setScalar(.25 + q * .7);
      p.material.opacity = lit * .55 * Math.sin(q * Math.PI);
    });
    g.rotation.y = -.5 + cx.px * .5;
  } };
}

/* ================= order basket: one croissant per croissant ordered ================= */
async function table(bus) {
  const s = new THREE.Scene(); lights(s);
  const g = new THREE.Group(); s.add(g);
  const [board, src] = await Promise.all([model('wooden_cutting_board', { size: 2.9 }), model('croissant', { size: .56 })]);
  const y0 = topOf(board) - .01;
  g.add(board, contact(3.2, .4));
  // up to twelve croissants in three rows of four on the board (middle row first, then front, then back), each a little turned
  const R = rng(3), slots = [], ROWS = [0, .42, -.42];
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / 4), col = i % 4;
    const c = src.clone(true);
    c.position.set((col - 1.5) * .6 + (R() - .5) * .05, y0, ROWS[row] + (R() - .5) * .05);
    c.rotation.y = (row % 2 ? .3 : -.3) + (R() - .5) * .4;
    c.scale.setScalar(.001); g.add(c); slots.push({ c, k: 0, on: false, base: c.scale.x });
  }
  let n = 4;
  const place = () => slots.forEach((st, i) => (st.on = i < n));
  place();
  bus.addEventListener('party', e => { n = e.detail; place(); });
  const one = src.scale.x;
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 50);
  return { scene: s, cam, update(c, dt) {
    slots.forEach(st => {
      st.k += ((st.on ? 1 : 0) - st.k) * Math.min(1, dt * 7);
      st.c.scale.setScalar(Math.max(.001, st.k * one));
      st.c.position.y = y0 + (1 - st.k) * .4;
    });
    const a = c.px * .35 + (c.prog - .5) * .4;
    const d = c.aspect < 1 ? 5.6 : 4.7;
    cam.position.set(Math.sin(a) * d, 2.5 - c.py * .25, Math.cos(a) * d); cam.lookAt(0, 0, 0);
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
  const makers = { menu: () => menu(bus), lantern, table: () => table(bus) };
  const els = [...document.querySelectorAll('[data-scene]')];
  const built = await Promise.all(els.map(el => (makers[el.dataset.scene]?.() ?? Promise.resolve(null)).catch(e => (console.warn('3D piece off', el.dataset.scene, e), null))));
  const slots = els.map((el, i) => ({ el, it: built[i], clip: el.closest('section') })).filter(s => s.it);
  slots.forEach(s => { s.it.scene.environment = env; s.it.scene.environmentIntensity = .6; });
  slots.forEach(s => { try { renderer.compile(s.it.scene, s.it.cam); } catch { } });
  const P = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', e => { P.x = e.clientX / innerWidth * 2 - 1; P.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  const size = () => renderer.setSize(innerWidth, innerHeight, false);
  size(); addEventListener('resize', size);
  const opac = el => { let o = 1, n = el; for (let i = 0; i < 6 && n && n !== document.body; i++, n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; };
  let last = performance.now(), t0 = last, drewLast = true;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const t = reduce ? 0 : (now - t0) / 1000;
    P.sx += (P.x - P.sx) * Math.min(1, dt * 4); P.sy += (P.y - P.sy) * Math.min(1, dt * 4);
    const H = innerHeight;
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
      renderer.toneMappingExposure = o;
      renderer.render(s.it.scene, s.it.cam);
    }
  }
  requestAnimationFrame(frame);
  return { slots };
}
