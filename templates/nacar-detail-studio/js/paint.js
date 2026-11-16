// Nácar hero: a close-up of a car's flank in clearcoated metallic paint, lit by a hexagon light ceiling.
// Left of the line the paint is corrected and coated (mirror clearcoat, water beading up);
// right of it, the same panel with wash swirls in the clearcoat. Pointer, slider or keys move the line.
import * as THREE from 'three';

const surf = (x, y) => {
  const d = y - (0.32 + 0.09 * x), k = 0.022;
  const crease = -0.2 * k * Math.log1p(Math.exp(d / k));
  return -0.06 * x * x - 0.085 * y * y + crease + 0.05 * Math.exp(-((y + 1.05) ** 2) / 0.12);
};

function flakeTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), im = g.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const a = Math.random() * Math.PI * 2, m = Math.pow(Math.random(), 2) * 0.75;
    im.data[i * 4] = 128 + Math.cos(a) * m * 127; im.data[i * 4 + 1] = 128 + Math.sin(a) * m * 127; im.data[i * 4 + 2] = 255; im.data[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(36, 26); t.colorSpace = THREE.NoColorSpace; return t;
}
function swirlTexture() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1700; i++) {
    const cx = Math.random() * S, cy = Math.random() * S, r = 30 + Math.random() * 520, a = Math.random() * Math.PI * 2, len = 0.25 + Math.random() * 1.4;
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${0.15 + Math.random() * 0.35})`;
    g.lineWidth = 0.5 + Math.random() * 0.9;
    g.beginPath(); g.arc(cx, cy, r, a, a + len); g.stroke();
  }
  const src = g.getImageData(0, 0, S, S).data, out = g.createImageData(S, S), h = (x, y) => src[(((y + S) % S) * S + ((x + S) % S)) * 4];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) / 255, dy = (h(x, y + 1) - h(x, y - 1)) / 255;
    const nx = -dx * 2.2, ny = -dy * 2.2, l = Math.hypot(nx, ny, 1), i = (y * S + x) * 4;
    out.data[i] = (nx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 3.6); t.colorSpace = THREE.NoColorSpace; return t;
}

// the studio the paint reflects: a hexagon light ceiling overhead, long strip softboxes in front,
// a dim gradient dome and a dark floor
function studio() {
  const s = new THREE.Scene();
  const lamp = k => new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(k, k, k * 1.03), side: THREE.DoubleSide });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(vec3(.004,.005,.007), vec3(.05,.055,.065), smoothstep(-.2,.8,h)); gl_FragColor = vec4(c,1.); }' }));
  s.add(dome);
  const hexGrid = new THREE.Group(), rg = 0.38, ring = new THREE.RingGeometry(rg * 0.78, rg * 0.92, 6, 1), mat = lamp(6);
  for (let c = -16; c <= 16; c++) for (let r = -12; r <= 12; r++) {
    const m = new THREE.Mesh(ring, mat);
    m.position.set(c * 1.5 * rg, r * Math.sqrt(3) * rg + (c & 1 ? Math.sqrt(3) * rg / 2 : 0), 0);
    hexGrid.add(m);
  }
  hexGrid.position.set(0, 4.2, 3); hexGrid.rotation.x = Math.PI / 2; s.add(hexGrid);
  const strip = (w, k) => new THREE.Mesh(new THREE.BoxGeometry(w, 0.09, 0.09), lamp(k));
  const a = strip(18, 5); a.position.set(0, 1.25, 7); a.rotation.z = -0.06; s.add(a);
  const b = strip(18, 3.2); b.position.set(0, -0.5, 7.5); b.rotation.z = 0.04; s.add(b);
  const c = strip(12, 2.4); c.position.set(-3, 2.6, 6); c.rotation.z = 0.5; s.add(c);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.012, 0.013, 0.016) }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -3.2; s.add(floor);
  return s;
}

const PAINTS = [
  { color: 0x12305a, metal: 0.6, rough: 0.36 },
  { color: 0x060607, metal: 0.25, rough: 0.5 },
  { color: 0x5e0610, metal: 0.55, rough: 0.34 },
  { color: 0xcfccc4, metal: 0.35, rough: 0.42 },
];

export function initPaint(canvas) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  const small = matchMedia('(max-width: 760px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const cubeRT = new THREE.WebGLCubeRenderTarget(small ? 512 : 1024, { type: THREE.HalfFloatType, generateMipmaps: false });
  new THREE.CubeCamera(0.1, 80, cubeRT).update(renderer, studio());
  scene.environment = cubeRT.texture;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

  // panel
  const geo = new THREE.PlaneGeometry(11, 8, small ? 220 : 380, small ? 160 : 260);
  { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, surf(p.getX(i), p.getY(i))); geo.computeVertexNormals(); }
  const after = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), before = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
  const flake = flakeTexture(), swirl = swirlTexture();
  const base = { metalness: PAINTS[0].metal, roughness: PAINTS[0].rough, color: PAINTS[0].color, normalMap: flake, normalScale: new THREE.Vector2(0.22, 0.22), clearcoat: 1 };
  const matA = new THREE.MeshPhysicalMaterial({ ...base, clearcoatRoughness: 0.02, clippingPlanes: [after] });
  const matB = new THREE.MeshPhysicalMaterial({ ...base, clearcoatRoughness: 0.2, clearcoatNormalMap: swirl, clearcoatNormalScale: new THREE.Vector2(0.5, 0.5), clippingPlanes: [before] });
  const body = new THREE.Group(); scene.add(body);
  body.add(new THREE.Mesh(geo, matA), new THREE.Mesh(geo, matB));

  // water beads on the coated side
  const beadCount = small ? 150 : 280;
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.02, ior: 1.33, clippingPlanes: [after], envMapIntensity: 1.3 }), beadCount);
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1), n = new THREE.Vector3(), e = 0.01;
    for (let i = 0; i < beadCount; i++) {
      const x = (Math.random() * 2 - 1) * 3.8, y = -1.7 + Math.random() * 3.0, r = 0.008 + Math.pow(Math.random(), 3) * 0.038;
      n.set(-(surf(x + e, y) - surf(x - e, y)) / (2 * e), -(surf(x, y + e) - surf(x, y - e)) / (2 * e), 1).normalize();
      q.setFromUnitVectors(zAxis, n);
      m.compose(new THREE.Vector3(x, y, surf(x, y) + r * 0.18).addScaledVector(n, 0), q, new THREE.Vector3(r, r * (0.9 + Math.random() * 0.2), r * 0.32));
      beads.setMatrixAt(i, m);
    } }
  body.add(beads);

  /* ---------- framing ---------- */
  let W = 1, H = 1;
  function resize() {
    const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0.15, Math.max(4.6, 3.4 / (2 * half * camera.aspect)));
    camera.lookAt(0, 0.05, 0);
    camera.updateProjectionMatrix();
  }

  /* ---------- wipe control ---------- */
  const input = document.querySelector('.slider__input'), wipeEl = document.querySelector('.wipe');
  const hero = canvas.closest('.hero');
  let target = +input.value / 100, wipe = reduce ? target : 0.97, user = false;
  input.addEventListener('input', () => { target = +input.value / 100; user = true; });
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    hero.addEventListener('pointermove', e => {
      if (e.target.closest('a, button, input, .hero__inner')) return;
      const r = hero.getBoundingClientRect(); target = Math.min(Math.max((e.clientX - r.left) / r.width, 0.05), 0.95); input.value = Math.round(target * 100); user = true;
    });
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  function applyWipe() {
    ndc.set(wipe * 2 - 1, 0); ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(zPlane, hit)) { after.constant = hit.x; before.constant = -hit.x; }
    wipeEl.style.transform = `translateX(${wipe * W}px)`;
  }

  /* ---------- paint swatches ---------- */
  const want = new THREE.Color(PAINTS[0].color);
  let wantMetal = PAINTS[0].metal, wantRough = PAINTS[0].rough;
  document.querySelectorAll('.swatches button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.swatches button').forEach(x => x.setAttribute('aria-checked', x === b));
    const p = PAINTS[+b.dataset.paint]; want.set(p.color); wantMetal = p.metal; wantRough = p.rough;
    if (reduce) { [matA, matB].forEach(m => { m.color.copy(want); m.metalness = wantMetal; m.roughness = wantRough; }); frame(0); }
  }));

  let mx = 0, my = 0, smx = 0, smy = 0, t = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  const t0 = performance.now();
  function frame(dt) {
    t += dt;
    const real = (performance.now() - t0) / 1000;
    smx += (mx - smx) * 0.04; smy += (my - smy) * 0.04;
    body.rotation.y = Math.sin(t * 0.17) * 0.1 + smx * 0.16;
    body.rotation.x = Math.cos(t * 0.13) * 0.05 + smy * 0.08;
    body.updateMatrixWorld();
    if (!user && !reduce) target = 0.58 + Math.sin(Math.max(t - 2, 0) * 0.35) * 0.08;
    if (real < 1.8 && !user && !reduce) { const k = real / 1.8, e = 1 - Math.pow(1 - k, 3); wipe = 0.97 + (target - 0.97) * e; }
    else wipe += (target - wipe) * Math.min(dt * 4, 1);
    [matA, matB].forEach(m => { m.color.lerp(want, Math.min(dt * 3, 1)); m.metalness += (wantMetal - m.metalness) * Math.min(dt * 3, 1); m.roughness += (wantRough - m.roughness) * Math.min(dt * 3, 1); });
    applyWipe();
    renderer.render(scene, camera);
  }

  let visible = true, raf = 0, last = performance.now();
  const tick = now => { raf = 0; if (!visible) return; const dt = Math.min((now - last) / 1000, 0.05); last = now; frame(dt); raf = requestAnimationFrame(tick); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf && !reduce) { last = performance.now(); raf = requestAnimationFrame(tick); } }).observe(canvas);
  new ResizeObserver(() => { resize(); frame(0); }).observe(canvas);
  if (reduce) input.addEventListener('input', () => { wipe = target; frame(0); });
  resize(); frame(0);
  wipeEl.classList.add('is-on');
  if (!reduce) raf = requestAnimationFrame(tick);
  return { renderer };
}
