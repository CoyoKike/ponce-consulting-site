// Coquina hero: an inline-four cutaway built in code. Crank, rods, pistons, cam, valves and springs
// all move with real slider-crank kinematics. Scrolling revs it; the tach in the hero bar follows.
import * as THREE from 'three';
import { RoomEnvironment } from '../assets/vendor/RoomEnvironment.js';

const TAU = Math.PI * 2;

function brushedTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const y = Math.random() * 256, v = 110 + Math.random() * 60 | 0;
    g.strokeStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.35})`;
    g.lineWidth = Math.random() * 1.4 + 0.2;
    g.beginPath(); g.moveTo(Math.random() * -60, y); g.lineTo(256 + Math.random() * 60, y + (Math.random() - 0.5) * 2); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,240,200,1)'); r.addColorStop(0.25, 'rgba(255,190,40,.75)'); r.addColorStop(1, 'rgba(255,120,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(0,0,0,.65)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
// extrude a 2D shape into a slab whose thickness runs along world X (shape Y stays Y)
function slab(shape, depth, bevel = 0.012, seg = 32) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: seg });
  g.translate(0, 0, -depth / 2); g.rotateY(Math.PI / 2); g.computeVertexNormals();
  return g;
}
function gearShape(teeth, r, depth, hole, holes = 0, holeR = 0, holeAt = 0) {
  const s = new THREE.Shape(), n = teeth * 4;
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * TAU, rr = (k % 4 === 0 || k % 4 === 1) ? r : r - depth;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    k ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); s.holes.push(h); }
  for (let i = 0; i < holes; i++) {
    const a = (i / holes) * TAU, h = new THREE.Path();
    h.absarc(Math.cos(a) * holeAt, Math.sin(a) * holeAt, holeR, 0, TAU, true); s.holes.push(h);
  }
  return s;
}
function hullPath(path, r1, r2, d, move) {
  const a = Math.asin((r2 - r1) / d);
  const p = (cx, cy, r, ang) => [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
  const s = p(0, 0, r1, a);
  move ? path.moveTo(...s) : path.moveTo(...s);
  path.lineTo(...p(0, d, r2, a));
  path.absarc(0, d, r2, a, Math.PI - a, false);
  path.lineTo(...p(0, 0, r1, Math.PI - a));
  path.absarc(0, 0, r1, Math.PI - a, a + TAU, false);
  return path;
}

export function initEngine(canvas, opts = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  const small = matchMedia('(max-width: 760px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);

  // lights: warm key, signal-yellow rim, cool fill
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4); key.position.set(-4, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc21a, 4.5); rim.position.set(5, 3, -6); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffa83a, 2.0); rim2.position.set(-6, 1, -4); scene.add(rim2);
  const fill = new THREE.DirectionalLight(0x8fb4ff, 0.7); fill.position.set(2, -3, 6); scene.add(fill);

  const brushed = brushedTexture(); brushed.repeat.set(3, 3);
  const M = {
    steel: new THREE.MeshStandardMaterial({ color: 0xa4a8ad, metalness: 1, roughness: 0.3, roughnessMap: brushed }),
    dark: new THREE.MeshStandardMaterial({ color: 0x55595e, metalness: 1, roughness: 0.38, roughnessMap: brushed }),
    alu: new THREE.MeshStandardMaterial({ color: 0xdfe2e5, metalness: 1, roughness: 0.22, roughnessMap: brushed }),
    rod: new THREE.MeshStandardMaterial({ color: 0x80858b, metalness: 1, roughness: 0.34 }),
    liner: new THREE.MeshStandardMaterial({ color: 0x2f3236, metalness: 0.85, roughness: 0.42, side: THREE.DoubleSide }),
    linerEdge: new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 0.4, roughness: 0.35 }),
    spring: new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 0.35, roughness: 0.32 }),
    belt: new THREE.MeshStandardMaterial({ color: 0x1b1b1d, metalness: 0, roughness: 0.75 }),
  };

  const engine = new THREE.Group(); scene.add(engine);
  const R = 0.32, L = 1.0, xs = [-1.5, -0.5, 0.5, 1.5], phase = [0, Math.PI, Math.PI, 0];
  const fire = [0, 3 * Math.PI, Math.PI, 2 * Math.PI]; // firing order 1-3-4-2, in crank radians over a 4π cycle

  /* ---- crankshaft ---- */
  const crank = new THREE.Group(); engine.add(crank);
  const mainGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.5, 48).rotateZ(Math.PI / 2);
  [-2, -1, 0, 1, 2].forEach(x => { const m = new THREE.Mesh(mainGeo, M.steel); m.position.x = x; crank.add(m); });
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 32).rotateZ(Math.PI / 2), M.steel); nose.position.x = 2.45; crank.add(nose);
  const pinGeo = new THREE.CylinderGeometry(0.135, 0.135, 0.3, 40).rotateZ(Math.PI / 2);
  const web = new THREE.Shape();
  { const pr = 0.2, cw = 0.52; web.moveTo(-pr, R); web.absarc(0, R, pr, Math.PI, 0, true);
    web.lineTo(Math.cos(-0.15) * cw, Math.sin(-0.15) * cw); web.absarc(0, 0, cw, -0.15, Math.PI + 0.15, true); web.lineTo(-pr, R); }
  const webGeo = slab(web, 0.1, 0.014);
  xs.forEach((x, i) => {
    const p = new THREE.Mesh(pinGeo, M.steel); p.position.set(x, R * Math.cos(phase[i]), R * Math.sin(phase[i])); crank.add(p);
    [-0.2, 0.2].forEach(dx => { const w = new THREE.Mesh(webGeo, M.dark); w.position.x = x + dx; w.rotation.x = phase[i]; crank.add(w); });
  });
  // flywheel with ring gear, and the timing sprocket
  const fly = new THREE.Mesh(slab(gearShape(84, 1.0, 0.035, 0.12, 6, 0.09, 0.52), 0.12, 0.01, 12), M.steel); fly.position.x = -2.42; crank.add(fly);
  const flyHub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 48).rotateZ(Math.PI / 2), M.dark); flyHub.position.x = -2.5; crank.add(flyHub);
  const sprA = new THREE.Mesh(slab(gearShape(22, 0.24, 0.035, 0.06), 0.13, 0.006, 8), M.alu); sprA.position.x = 2.5; crank.add(sprA);

  /* ---- rods and pistons ---- */
  const rodShape = new THREE.Shape();
  rodShape.moveTo(0.075, L - 0.11); rodShape.absarc(0, L, 0.13, -0.95, Math.PI + 0.95, false);
  rodShape.lineTo(-0.11, 0.2); rodShape.absarc(0, 0, 0.23, 2.07, 1.07 + TAU, false); rodShape.lineTo(0.075, L - 0.11);
  { const h1 = new THREE.Path(); h1.absarc(0, 0, 0.14, 0, TAU, true); rodShape.holes.push(h1);
    const h2 = new THREE.Path(); h2.absarc(0, L, 0.06, 0, TAU, true); rodShape.holes.push(h2); }
  const rodGeo = slab(rodShape, 0.15, 0.02, 28);
  const pts = [[0, 0.1], [0.31, 0.1], [0.31, 0], [0.355, 0], [0.36, 0.02], [0.36, 0.29], [0.345, 0.29], [0.345, 0.315], [0.36, 0.315], [0.36, 0.35], [0.345, 0.35], [0.345, 0.375], [0.36, 0.375], [0.36, 0.41], [0.345, 0.41], [0.345, 0.435], [0.36, 0.435], [0.36, 0.5], [0.34, 0.525], [0.2, 0.535], [0, 0.54]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const pistonGeo = new THREE.LatheGeometry(pts, 64);
  const rods = [], pistons = [];
  xs.forEach(x => {
    const r = new THREE.Mesh(rodGeo, M.rod); r.position.x = x; engine.add(r); rods.push(r);
    const p = new THREE.Mesh(pistonGeo, M.alu); p.position.x = x; engine.add(p); pistons.push(p);
  });

  /* ---- liners, cut away toward the camera ---- */
  const camAz = 0.78;
  const gap = Math.PI * 0.62;
  const linerGeo = new THREE.CylinderGeometry(0.39, 0.39, 1.2, 64, 1, true, camAz + gap / 2, TAU - gap);
  const lipGeo = new THREE.TorusGeometry(0.39, 0.018, 8, 64, TAU - gap).rotateX(Math.PI / 2);
  xs.forEach(x => {
    const l = new THREE.Mesh(linerGeo, M.liner); l.position.set(x, 1.12, 0); engine.add(l);
    [0.52, 1.72].forEach(y => { const lip = new THREE.Mesh(lipGeo, M.linerEdge); lip.position.set(x, y, 0); lip.rotation.y = camAz + gap / 2 + (TAU - gap) - Math.PI / 2; engine.add(lip); });
  });

  /* ---- camshaft, valves, springs ---- */
  const CAMY = 2.15;
  const cam = new THREE.Group(); cam.position.y = CAMY; engine.add(cam);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.9, 24).rotateZ(Math.PI / 2), M.steel); shaft.position.x = 0.05; cam.add(shaft);
  const lobe = new THREE.Shape();
  for (let k = 0; k <= 96; k++) {
    const t = (k / 96) * TAU, r = 0.1 + 0.055 * Math.pow(Math.max(0, Math.cos(t)), 2.5);
    const x = Math.sin(t) * r, y = Math.cos(t) * r; k ? lobe.lineTo(x, y) : lobe.moveTo(x, y);
  }
  const lobeGeo = slab(lobe, 0.09, 0.008, 8);
  const sprB = new THREE.Mesh(slab(gearShape(44, 0.44, 0.035, 0.06, 5, 0.07, 0.25), 0.12, 0.006, 8), M.alu); sprB.position.x = 2.5; cam.add(sprB);
  // valve: head + stem, retainer, bucket
  const valveGeo = new THREE.LatheGeometry([[0, 0], [0.1, 0], [0.1, 0.012], [0.03, 0.05], [0.018, 0.08], [0.018, 0.3], [0, 0.3]].map(([x, y]) => new THREE.Vector2(x, y)), 40);
  const bucketGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.06, 32);
  const retGeo = new THREE.CylinderGeometry(0.065, 0.05, 0.02, 32);
  class Helix extends THREE.Curve { getPoint(t, o = new THREE.Vector3()) { const a = t * TAU * 6; return o.set(Math.cos(a) * 0.055, t, Math.sin(a) * 0.055); } }
  const springGeo = new THREE.TubeGeometry(new Helix(), 220, 0.011, 8, false);
  const BASE = 1.73, SEAT = 1.83;
  const valves = [];
  xs.forEach((x, i) => {
    [[-0.17, -(fire[i] + 2.5 * Math.PI) / 2], [0.17, -(fire[i] + 1.5 * Math.PI) / 2]].forEach(([dx, ph]) => {
      const l = new THREE.Mesh(lobeGeo, M.steel); l.position.x = x + dx; l.rotation.x = Math.PI + ph; cam.add(l);
      const v = new THREE.Group(); v.position.set(x + dx, BASE, 0);
      v.add(new THREE.Mesh(valveGeo, M.steel));
      const ret = new THREE.Mesh(retGeo, M.steel); ret.position.y = 0.26; v.add(ret);
      const b = new THREE.Mesh(bucketGeo, M.alu); b.position.y = 0.29; v.add(b);
      engine.add(v);
      const s = new THREE.Mesh(springGeo, M.spring); s.position.set(x + dx, SEAT, 0); engine.add(s);
      valves.push({ v, s, ph });
    });
  });
  // timing belt around both sprockets (static path)
  const belt = new THREE.Shape(); hullPath(belt, 0.27, 0.47, CAMY, true);
  const hole = new THREE.Path(); hullPath(hole, 0.24, 0.44, CAMY, true); belt.holes.push(hole);
  const beltMesh = new THREE.Mesh(slab(belt, 0.15, 0, 48), M.belt); beltMesh.position.x = 2.5; engine.add(beltMesh);

  /* ---- combustion glow and ground shadow ---- */
  const glowTex = glowTexture();
  const flashes = xs.map(x => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    s.position.set(x, 1.62, 0); s.scale.setScalar(0.9); engine.add(s); return s;
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 3.2), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.78; engine.add(shadow);

  const center = new THREE.Vector3(0, 0.95, 0);

  function pose(theta) {
    crank.rotation.x = theta;
    for (let i = 0; i < 4; i++) {
      const a = theta + phase[i], yp = R * Math.cos(a), zp = R * Math.sin(a);
      const yPiston = yp + Math.sqrt(L * L - zp * zp);
      rods[i].position.y = yp; rods[i].position.z = zp; rods[i].rotation.x = Math.atan2(-zp, yPiston - yp);
      pistons[i].position.y = yPiston - 0.18;
      const c = ((theta - fire[i]) % (2 * TAU) + 2 * TAU) % (2 * TAU);
      flashes[i].material.opacity = c < 1.2 ? Math.exp(-c * 3.2) : 0;
      flashes[i].scale.setScalar(0.5 + (c < 1.2 ? (1 - Math.exp(-c * 3)) * 0.6 : 0));
    }
    cam.rotation.x = theta / 2;
    valves.forEach(({ v, s, ph }) => {
      const psi = theta / 2 + ph, lift = 0.055 * Math.pow(Math.max(0, Math.cos(psi)), 2.5);
      v.position.y = BASE - lift;
      s.scale.y = (BASE - lift + 0.26) - SEAT;
    });
  }

  /* ---- camera framing ---- */
  let W = 1, H = 1, dist = 11, shiftX = 0, shiftY = 0;
  function resize() {
    const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const phone = W < 760;
    dist = phone ? Math.max(11, 4.8 / (2 * half * camera.aspect)) : Math.max(14.5, 6 / (2 * half * camera.aspect));
    shiftX = phone ? 0 : -W * 0.19;
    shiftY = phone ? H * 0.25 : H * 0.03;
    camera.setViewOffset(W, H, shiftX, shiftY, W, H);
    camera.updateProjectionMatrix();
  }
  let mx = 0, my = 0, smx = 0, smy = 0, prog = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  function place() {
    smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05;
    const az = camAz + smx * 0.22 + prog * 0.55, el = 0.3 - smy * 0.12 + prog * 0.18;
    const d = dist * (1 - prog * 0.08);
    camera.position.set(center.x + Math.sin(az) * Math.cos(el) * d, center.y + Math.sin(el) * d, center.z + Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(center);
  }

  const tachNeedle = document.querySelector('.tach__needle'), tachFill = document.querySelector('.tach__fill'), tachV = document.querySelector('.tach__v');
  const IDLE = TAU * 0.5, MAX = TAU * 3.2;
  let theta = 0.6, omega = IDLE, visible = true, raf = 0, last = performance.now();
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf && !reduce) { last = performance.now(); raf = requestAnimationFrame(tick); } });
  io.observe(canvas);
  function tach(rpm) {
    if (!tachNeedle) return;
    const f = Math.min(rpm / 8000, 1);
    tachNeedle.style.transform = `rotate(${f * 180}deg)`;
    tachFill.style.strokeDashoffset = 157 * (1 - f);
    tachV.textContent = (rpm / 1000).toFixed(1);
  }
  function tick(now) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const v = Math.abs((window.__lenis && window.__lenis.velocity) || 0);
    const target = IDLE + Math.min(v * 0.22, 1) * (MAX - IDLE);
    omega += (target - omega) * (target > omega ? 0.08 : 0.025);
    theta += omega * dt;
    const top = canvas.getBoundingClientRect().top;
    prog = Math.min(Math.max(-top / H, 0), 1);
    pose(theta); place();
    renderer.render(scene, camera);
    tach(850 + (omega - IDLE) / (MAX - IDLE) * 6100);
    raf = requestAnimationFrame(tick);
  }
  new ResizeObserver(() => { resize(); if (reduce) { pose(theta); place(); renderer.render(scene, camera); } }).observe(canvas);
  resize(); pose(theta); place(); renderer.render(scene, camera); tach(850);
  if (!reduce) raf = requestAnimationFrame(tick);
  return { renderer };
}
