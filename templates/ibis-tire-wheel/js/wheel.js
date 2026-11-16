// Ibis hero: a 245/40 R18 tire on a twin-spoke alloy, built in code. The tread is real geometry
// (four circumferential grooves, directional shoulder blocks, center sipes), the sidewall
// lettering is a raised bump map, and the drilled rotor spins behind a fixed caliper.
import * as THREE from 'three';
import { RoomEnvironment } from '../assets/vendor/RoomEnvironment.js';

const TAU = Math.PI * 2;
const sstep = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

function treadDepth(u, z) {
  const az = Math.abs(z), D = 0.03;
  if (az > 0.35) return 0;
  let d = 0;
  for (const c of [-0.205, -0.068, 0.068, 0.205]) d = Math.max(d, D * (1 - sstep(0.012, 0.024, Math.abs(z - c))));
  const N = 64, arc = TAU / N;
  if (az > 0.218) { // shoulder blocks, directional
    const s = u / arc + az * 3.2, f = Math.abs(s - Math.round(s)) * arc;
    d = Math.max(d, D * (1 - sstep(0.011, 0.02, f)) * sstep(0.218, 0.232, az));
  } else if (az > 0.08) { // intermediate ribs: grooves that stop short of the center groove
    const s = u / arc + az * 3.2 + 0.5, f = Math.abs(s - Math.round(s)) * arc;
    d = Math.max(d, D * 0.8 * (1 - sstep(0.007, 0.014, f)) * sstep(0.12, 0.15, az));
  } else { // center rib sipes
    const s = u / (arc / 2) + az * 3.2, f = Math.abs(s - Math.round(s)) * (arc / 2);
    d = Math.max(d, D * 0.45 * (1 - sstep(0.004, 0.009, f)) * (1 - sstep(0.03, 0.05, az)));
  }
  return d;
}

function sidewallCanvas(sizeText) {
  const W = 4096, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  return { c, g, W, H, sizeText };
}
function paintSidewall(sc, v0, v1) {
  const { g, W, H } = sc;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  // rotate 180° so letters read clockwise with their tops toward the tread
  g.translate(W, H); g.rotate(Math.PI);
  const y0 = H - v1 * H, y1 = H - v0 * H, mid = (y0 + y1) / 2, band = y1 - y0;
  g.fillStyle = '#fff'; g.textBaseline = 'middle';
  g.font = `900 ${band * 0.62}px Anybody, "Arial Black", sans-serif`;
  g.fillText(sc.sizeText + '  97W', W * 0.06, mid);
  g.font = `800 ${band * 0.34}px Anybody, "Arial Black", sans-serif`;
  g.fillText('ALL-SEASON  TOURING', W * 0.36, mid);
  g.fillText('RADIAL TUBELESS · M+S', W * 0.6, mid);
  g.fillText('TREADWEAR 600  A  A', W * 0.84, mid);
  g.lineWidth = band * 0.04; g.strokeStyle = '#fff';
  g.beginPath(); g.moveTo(0, y1 - band * 0.06); g.lineTo(W, y1 - band * 0.06); g.stroke();
}

function shadowTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(18,19,20,.55)'); r.addColorStop(0.35, 'rgba(18,19,20,.22)'); r.addColorStop(1, 'rgba(18,19,20,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export function initWheel(canvas) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  const phoneish = matchMedia('(max-width: 760px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, phoneish ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.9;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 5, 4); scene.add(key);
  const back = new THREE.DirectionalLight(0xffe2d6, 1.4); back.position.set(4, 2, -4); scene.add(back);

  /* ---------- tire ---------- */
  const N = phoneish ? 480 : 760, M = phoneish ? 100 : 140;
  const half = [[0.335, 0.70], [0.352, 0.722], [0.369, 0.76], [0.381, 0.81], [0.386, 0.86], [0.382, 0.905], [0.37, 0.945], [0.352, 0.975], [0.326, 0.996], [0.29, 1.005], [0.2, 1.009], [0.1, 1.011], [0, 1.012]];
  const ctrl = [...half.map(([z, r]) => new THREE.Vector3(z, r, 0)), ...half.slice(0, -1).reverse().map(([z, r]) => new THREE.Vector3(-z, r, 0))];
  const prof = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal').getSpacedPoints(M);
  const pos = new Float32Array((N + 1) * (M + 1) * 3), uv = new Float32Array((N + 1) * (M + 1) * 2);
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * TAU, cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= M; j++) {
      const { x: z, y: r0 } = prof[j];
      const r = r0 - treadDepth(u, z) * sstep(0.965, 0.99, r0);
      const k = i * (M + 1) + j;
      pos[k * 3] = r * cu; pos[k * 3 + 1] = r * su; pos[k * 3 + 2] = z;
      uv[k * 2] = i / N; uv[k * 2 + 1] = j / M;
    }
  }
  const idx = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const a = i * (M + 1) + j, b = (i + 1) * (M + 1) + j, c = a + 1, d = b + 1;
    idx.push(a, c, b, b, c, d);
  }
  const tireGeo = new THREE.BufferGeometry();
  tireGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  tireGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  tireGeo.setIndex(idx);
  tireGeo.computeVertexNormals();
  { // stitch the seam normals
    const n = tireGeo.attributes.normal;
    for (let j = 0; j <= M; j++) {
      const a = j, b = N * (M + 1) + j, v = new THREE.Vector3(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
      n.setXYZ(a, v.x, v.y, v.z); n.setXYZ(b, v.x, v.y, v.z);
    }
  }
  // sidewall band (front side, z > 0) in uv.v
  let v0 = 1, v1 = 0;
  prof.forEach((p, j) => { if (p.x > 0.3 && p.y > 0.79 && p.y < 0.94) { v0 = Math.min(v0, j / M); v1 = Math.max(v1, j / M); } });
  const sc = sidewallCanvas('245/40 R18');
  paintSidewall(sc, v0, v1);
  const sideTex = new THREE.CanvasTexture(sc.c); sideTex.anisotropy = 8;
  if (document.fonts) document.fonts.load('900 40px Anybody').then(() => { paintSidewall(sc, v0, v1); sideTex.needsUpdate = true; }).catch(() => {});
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.82, metalness: 0, bumpMap: sideTex, bumpScale: 3 });
  const tire = new THREE.Mesh(tireGeo, tireMat);

  /* ---------- wheel ---------- */
  const machined = new THREE.MeshStandardMaterial({ color: 0xe8eaec, metalness: 1, roughness: 0.18 });
  const gun = new THREE.MeshStandardMaterial({ color: 0x2b2d31, metalness: 0.85, roughness: 0.35 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 1, roughness: 0.08 });
  const rimPts = [[0.64, -0.3], [0.64, 0.22], [0.655, 0.27], [0.7, 0.295], [0.728, 0.305], [0.738, 0.318], [0.733, 0.332], [0.715, 0.338], [0.67, 0.336], [0.645, 0.33]].map(([x, y]) => new THREE.Vector2(x, y));
  const rimGeo = new THREE.LatheGeometry(rimPts, 128).rotateX(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ color: 0xd9dcdf, metalness: 1, roughness: 0.22, side: THREE.DoubleSide }));
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.628, 0.628, 0.6, 96, 1, true).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a3c40, metalness: 0.9, roughness: 0.5, side: THREE.BackSide }));
  barrel.position.z = -0.01;

  const spokeShape = new THREE.Shape();
  spokeShape.moveTo(-0.05, 0.16);
  spokeShape.quadraticCurveTo(-0.03, 0.42, -0.034, 0.6);
  spokeShape.quadraticCurveTo(-0.04, 0.645, -0.07, 0.66);
  spokeShape.lineTo(0.07, 0.66);
  spokeShape.quadraticCurveTo(0.04, 0.645, 0.034, 0.6);
  spokeShape.quadraticCurveTo(0.03, 0.42, 0.05, 0.16);
  spokeShape.lineTo(-0.05, 0.16);
  const spokeGeo = new THREE.ExtrudeGeometry(spokeShape, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 3, curveSegments: 16, steps: 1 });
  { // bend: concave face, hub sits deeper than the lip
    const p = spokeGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const rr = Math.hypot(p.getX(i), p.getY(i)), t = Math.min(Math.max((rr - 0.16) / 0.5, 0), 1);
      p.setZ(i, p.getZ(i) + 0.24 - 0.13 * Math.pow(1 - t, 1.6));
    }
    spokeGeo.computeVertexNormals();
  }
  const spokes = new THREE.Group();
  for (let k = 0; k < 5; k++) for (const s of [-0.15, 0.15]) {
    const m = new THREE.Mesh(spokeGeo, [machined, gun]); m.rotation.z = (k / 5) * TAU + s; spokes.add(m);
  }
  const hub = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.205], [0.06, 0.205], [0.1, 0.2], [0.17, 0.185], [0.2, 0.15], [0.2, 0.1], [0, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 64).rotateX(Math.PI / 2), machined);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.02, 48).rotateX(Math.PI / 2), gun); cap.position.z = 0.215;
  const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.006, 8, 64), new THREE.MeshStandardMaterial({ color: 0xf03c10, metalness: 0.3, roughness: 0.35 })); capRing.position.z = 0.225;
  const nutGeo = new THREE.CylinderGeometry(0.022, 0.024, 0.05, 6).rotateX(Math.PI / 2);
  const nuts = new THREE.Group();
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + TAU / 10, n = new THREE.Mesh(nutGeo, chrome); n.position.set(Math.cos(a) * 0.125, Math.sin(a) * 0.125, 0.215); nuts.add(n); }

  // drilled rotor (spins) and caliper (fixed)
  const rotorShape = new THREE.Shape(); rotorShape.absarc(0, 0, 0.56, 0, TAU, false);
  { const h = new THREE.Path(); h.absarc(0, 0, 0.24, 0, TAU, true); rotorShape.holes.push(h);
    for (let ring = 0; ring < 3; ring++) for (let k = 0; k < 18; k++) {
      const a = (k / 18) * TAU + ring * 0.11, rr = 0.36 + ring * 0.06, hh = new THREE.Path();
      hh.absarc(Math.cos(a) * rr, Math.sin(a) * rr, 0.012, 0, TAU, true); rotorShape.holes.push(hh);
    } }
  const rotor = new THREE.Mesh(new THREE.ExtrudeGeometry(rotorShape, { depth: 0.05, bevelEnabled: false, curveSegments: 64 }), new THREE.MeshStandardMaterial({ color: 0x9a9da1, metalness: 1, roughness: 0.42 }));
  rotor.position.z = -0.08;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 64).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x55585c, metalness: 0.9, roughness: 0.5 })); hat.position.z = 0.0;
  const calShape = new THREE.Shape();
  calShape.absarc(0, 0, 0.62, -0.45, 0.45, false); calShape.absarc(0, 0, 0.43, 0.45, -0.45, true);
  const caliper = new THREE.Mesh(new THREE.ExtrudeGeometry(calShape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 4, curveSegments: 32 }),
    new THREE.MeshPhysicalMaterial({ color: 0xe0360c, metalness: 0.1, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 }));
  caliper.position.z = -0.12; caliper.rotation.z = 0.5;

  const assembly = new THREE.Group(); scene.add(assembly);
  const spin = new THREE.Group(); assembly.add(spin);
  spin.add(tire, rim, barrel, spokes, hub, cap, capRing, nuts, rotor, hat);
  assembly.add(caliper);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.012; scene.add(shadow);

  /* ---------- callouts ---------- */
  const callouts = document.querySelector('.callouts');
  const coEls = { tread: callouts.querySelector('[data-co="tread"]'), side: callouts.querySelector('[data-co="side"]'), rim: callouts.querySelector('[data-co="rim"]') };
  const coPts = { tread: new THREE.Vector3(Math.cos(1.95) * 1.0, Math.sin(1.95) * 1.0, 0.12), side: new THREE.Vector3(Math.cos(3.6) * 0.86, Math.sin(3.6) * 0.86, 0.39), rim: new THREE.Vector3(Math.cos(-0.5) * 0.72, Math.sin(-0.5) * 0.72, 0.33) };
  const tmp = new THREE.Vector3();
  document.addEventListener('tiresize', e => {
    sc.sizeText = e.detail; paintSidewall(sc, v0, v1); sideTex.needsUpdate = true;
    const t = coEls.side; t.lastChild.textContent = e.detail;
    const rimIn = e.detail.split('R')[1]; coEls.rim.lastChild.textContent = `${rimIn} × ${rimIn >= 20 ? '9.5' : rimIn >= 18 ? '8.5' : '7'}`;
  });

  /* ---------- framing ---------- */
  let W = 1, H = 1, dist = 7;
  function resize() {
    const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), phone = W < 760;
    dist = phone ? Math.max(6, 2.9 / (2 * half * camera.aspect)) : Math.max(6.6, 3.1 / (2 * half * camera.aspect));
    camera.setViewOffset(W, H, phone ? 0 : -W * 0.245, phone ? H * 0.255 : H * 0.01, W, H);
    camera.updateProjectionMatrix();
  }

  /* ---------- interaction ---------- */
  let mx = 0, my = 0, smx = 0, smy = 0, prog = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  const IDLE = reduce ? 0 : 0.45;
  let omega = IDLE, angle = 0.3, drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, t: performance.now() }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const now = performance.now(), dx = e.clientX - drag.x, dt = Math.max(now - drag.t, 8) / 1000;
    omega = THREE.MathUtils.clamp(-dx * 0.012 / dt, -24, 24); angle += -dx * 0.012;
    drag = { x: e.clientX, t: now };
  });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  function frame(dt) {
    if (!drag) omega += (IDLE + Math.abs((window.__lenis && window.__lenis.velocity) || 0) * 0.35 - omega) * Math.min(dt * 1.6, 1);
    angle += omega * dt;
    spin.rotation.z = -angle;
    smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05;
    const top = canvas.getBoundingClientRect().top; prog = Math.min(Math.max(-top / H, 0), 1);
    assembly.rotation.y = -0.62 + smx * 0.25 - prog * 0.7;
    assembly.rotation.x = smy * 0.08;
    const el = 0.12 + prog * 0.1, d = dist;
    camera.position.set(0, Math.sin(el) * d, Math.cos(el) * d);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    // callouts follow their points on the wheel
    assembly.updateMatrixWorld();
    for (const k in coPts) {
      tmp.copy(coPts[k]).applyMatrix4(assembly.matrixWorld).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
      coEls[k].style.transform = `translate(${x + 12}px, ${y - 18}px)`;
    }
    callouts.style.opacity = String(1 - Math.min(prog * 3, 1));
  }

  let visible = true, raf = 0, last = performance.now();
  const tick = now => { raf = 0; if (!visible) return; const dt = Math.min((now - last) / 1000, 0.05); last = now; frame(dt); raf = requestAnimationFrame(tick); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf && !reduce) { last = performance.now(); raf = requestAnimationFrame(tick); } }).observe(canvas);
  new ResizeObserver(() => { resize(); if (reduce) frame(0); }).observe(canvas);
  resize(); frame(0);
  setTimeout(() => callouts.classList.add('is-on'), reduce ? 0 : 1200);
  if (reduce) {
    // no autoplay: still let a drag turn it
    canvas.addEventListener('pointermove', () => { if (drag) frame(0.016); });
  } else raf = requestAnimationFrame(tick);
  return { renderer };
}
