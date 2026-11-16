// Marejada Studio · the hero: lacquered training shapes riding a swell of light lines.
// The studio plays at 118 bpm, so every beat sends a pulse through the swell and kicks the shapes.
import * as THREE from 'three';

const BPM = 118, BEAT = 60 / BPM;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/* a box with real rounded edges and exact normals */
function roundedBox(w, h, d, r, seg = 6) {
  const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
  const p = g.attributes.position, n = g.attributes.normal;
  const inner = new THREE.Vector3(w / 2 - r, h / 2 - r, d / 2 - r);
  const v = new THREE.Vector3(), c = new THREE.Vector3(), o = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(clamp(v.x, -inner.x, inner.x), clamp(v.y, -inner.y, inner.y), clamp(v.z, -inner.z, inner.z));
    o.subVectors(v, c);
    if (o.lengthSq() < 1e-9) o.fromBufferAttribute(n, i);
    o.normalize();
    v.copy(c).addScaledVector(o, r);
    p.setXYZ(i, v.x, v.y, v.z); n.setXYZ(i, o.x, o.y, o.z);
  }
  return g;
}

/* a kettlebell: flattened bell, a wide handle whose ends sink into the shoulders */
function kettlebell(body, handle) {
  const g = new THREE.Group();
  const bell = new THREE.Mesh(new THREE.SphereGeometry(.64, 72, 54), body);
  bell.scale.set(1, .9, 1);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.4, .42, .07, 48), body);
  base.position.y = -.56;
  const arc = new THREE.Mesh(new THREE.TorusGeometry(.42, .1, 28, 80, Math.PI), handle);
  arc.scale.set(1, .74, 1); arc.position.y = .5;
  const hornGeo = new THREE.CylinderGeometry(.1, .13, .26, 28);
  const h1 = new THREE.Mesh(hornGeo, handle); h1.position.set(-.42, .42, 0);
  const h2 = new THREE.Mesh(hornGeo, handle); h2.position.set(.42, .42, 0);
  g.add(bell, base, arc, h1, h2);
  return g;
}

/* soft studio light for reflections: one big softbox overhead, a coral strip and a sea-green strip */
function studioEnv(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x050506);
  const box = (w, h, col, k, pos, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.rotation.set(...rot); s.add(m);
  };
  box(10, 6, 0xffffff, 2.4, [0, 7, 0], [Math.PI / 2, 0, 0]);
  box(2.2, 9, 0xff6a45, 3.2, [-7, 1, 1], [0, Math.PI / 2, 0]);
  box(2.2, 9, 0x3ce0c6, 2.2, [7, 1, -1], [0, -Math.PI / 2, 0]);
  box(8, 2, 0xfff1de, 1.2, [0, 1, 8], [0, Math.PI, 0]);
  box(14, 1.2, 0xff8c5a, .6, [0, -2.5, -8], [0, 0, 0]);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(s, .035).texture;
  pm.dispose();
  return env;
}

export function initHero(canvas, opt = {}) {
  const { reduce = false, isPhone = false } = opt;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isPhone ? 1.6 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const BG = new THREE.Color(0x0b0c0f);
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 10, 30);
  scene.environment = studioEnv(renderer);

  const camera = new THREE.PerspectiveCamera(isPhone ? 40 : 30, 1, .1, 80);

  /* lights: warm key, coral rim behind left, sea-green rim behind right */
  scene.add(new THREE.AmbientLight(0xffffff, .12));
  const key = new THREE.DirectionalLight(0xfff0e0, 1.6); key.position.set(-3, 6, 6); scene.add(key);
  const rimA = new THREE.PointLight(0xff5a3a, 60, 22, 1.6); rimA.position.set(-3.5, 2.5, -4); scene.add(rimA);
  const rimB = new THREE.PointLight(0x30e0c4, 40, 22, 1.6); rimB.position.set(6, 1, -3); scene.add(rimB);

  /* ---------- the swell: rows of light lines ---------- */
  const ROWS = isPhone ? 34 : 54, COLS = isPhone ? 90 : 150;
  const X0 = -16, X1 = 16, Z0 = -16, Z1 = 5, Y = -2.35;
  const segs = ROWS * (COLS - 1);
  const pos = new Float32Array(segs * 6), col = new Float32Array(segs * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  lines.frustumCulled = false;
  scene.add(lines);
  const hBuf = new Float32Array(ROWS * COLS);
  const cLow = new THREE.Color(0x1d2230), cMid = new THREE.Color(0x2fd8bf), cHigh = new THREE.Color(0xff5a3a);
  const tmp = new THREE.Color();

  /* glow behind the shapes */
  const gc = document.createElement('canvas'); gc.width = gc.height = 256;
  const gx = gc.getContext('2d'), grd = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,90,58,.55)'); grd.addColorStop(.35, 'rgba(255,90,58,.18)'); grd.addColorStop(1, 'rgba(255,90,58,0)');
  gx.fillStyle = grd; gx.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(gc); glowTex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.scale.set(14, 14, 1); glow.position.set(0, .4, -7);
  scene.add(glow);

  /* ---------- the shapes ---------- */
  const M = {
    coral: new THREE.MeshPhysicalMaterial({ color: 0xff4f2e, roughness: .26, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.1 }),
    bone: new THREE.MeshPhysicalMaterial({ color: 0xece5d9, roughness: .34, clearcoat: .8, clearcoatRoughness: .12, envMapIntensity: .9 }),
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xc9d0d8, metalness: 1, roughness: .14, iridescence: 1, iridescenceIOR: 1.45, iridescenceThicknessRange: [160, 640], envMapIntensity: 1.25 }),
    ink: new THREE.MeshPhysicalMaterial({ color: 0x16181d, metalness: .25, roughness: .3, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: 1 }),
    sea: new THREE.MeshPhysicalMaterial({ color: 0x1fc7ad, roughness: .22, clearcoat: 1, clearcoatRoughness: .08, sheen: .6, sheenColor: new THREE.Color(0xbffff4), envMapIntensity: 1 }),
  };
  const rig = new THREE.Group(); scene.add(rig);
  const items = [];
  const add = (obj, p, s, spin, ph) => {
    const holder = new THREE.Group(); holder.add(obj); rig.add(holder);
    obj.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    holder.position.set(...p); holder.scale.setScalar(s);
    items.push({ holder, obj, base: new THREE.Vector3(...p), s, spin: new THREE.Vector3(...spin), ph, kick: 0, push: new THREE.Vector3() });
  };
  const kb = kettlebell(M.chrome, M.chrome); kb.rotation.set(.18, -.5, .08);
  add(kb, [0, .1, 0], 1.55, [0, .22, 0], 0);
  items[0].obj.rotation.set(.12, -.6, .06); items[0].hero = true;
  add(new THREE.Mesh(new THREE.TorusGeometry(.62, .24, 48, 128), M.coral), [-2.15, 1.45, -1.1], 1, [.35, .5, .1], .9);
  add(new THREE.Mesh(new THREE.CapsuleGeometry(.32, .95, 16, 40), M.bone), [2.05, 1.55, -.4], 1, [.2, .1, .45], 1.7);
  add(new THREE.Mesh(roundedBox(1, 1, 1, .22), M.sea), [2.2, -1.15, .7], .95, [.4, .3, .15], 2.4);
  add(new THREE.Mesh(new THREE.SphereGeometry(.4, 48, 32), M.coral), [-.75, -1.75, 1.3], 1, [.1, .2, .1], 3.1);
  add(new THREE.Mesh(new THREE.TorusGeometry(.4, .14, 32, 96), M.bone), [.55, 2.45, -2.1], 1, [.5, .2, .3], 3.8);
  add(new THREE.Mesh(roundedBox(1.3, .55, .55, .2), M.ink), [-1.4, 3.0, -3.4], 1, [.15, .35, .2], 4.4);
  add(new THREE.Mesh(new THREE.CapsuleGeometry(.22, .6, 12, 32), M.coral), [3.55, .35, -2.9], 1, [.3, .1, .4], 5.2);
  add(new THREE.Mesh(new THREE.SphereGeometry(.3, 48, 32), M.chrome), [1.15, -2.0, -1.4], 1, [.1, .3, .1], 5.9);
  add(new THREE.Mesh(new THREE.TorusGeometry(.28, .1, 24, 72), M.sea), [-2.6, 2.6, -3.6], 1, [.3, .4, .2], 6.6);

  /* ---------- layout, pointer, scroll ---------- */
  let W = 1, H = 1, layout = { x: 3.1, y: .55, s: 1 };
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    const a = W / H;
    if (a < .8) layout = { x: 0, y: 1.75, s: .52 };          // phone: shapes above the headline
    else if (a < 1.25) layout = { x: 1.6, y: .9, s: .8 };
    else layout = { x: 3.55 + (a - 1.6) * 1.3, y: .45, s: 1 };
    if (reduce) render(2.2);
  }
  const pointer = new THREE.Vector2(0, 0), pSmooth = new THREE.Vector2(0, 0);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(9, 9), hitPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hitP = new THREE.Vector3();
  let hasPointer = false;
  addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    pointer.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
    ndc.copy(pointer); hasPointer = e.pointerType === 'mouse';
  }, { passive: true });

  let progress = 0, velocity = 0, energy = 0;

  /* ---------- the frame ---------- */
  const v3 = new THREE.Vector3();
  function waveH(x, z, t, amp, beatR, beatK) {
    let h = Math.sin(x * .32 + t * .8) * Math.cos(z * .38 - t * .55) * .55
          + Math.sin((x * .7 + z * .5) - t * 1.3) * .22
          + Math.sin(x * 1.6 - z * .9 + t * 1.9) * .06;
    const dx = x - layout.x * .9, dz = z + 1.5;
    const r = Math.sqrt(dx * dx + dz * dz);
    h += Math.exp(-((r - beatR) ** 2) * .9) * beatK * .55;
    return h * amp;
  }

  function render(t) {
    const beat = t / BEAT, bf = beat - Math.floor(beat);
    const beatR = bf * 15, beatK = (1 - bf) * (1 - bf) * (reduce ? 0 : 1);
    const amp = .9 + progress * 1.4 + energy * .9;

    /* lines */
    let k = 0;
    for (let i = 0; i < ROWS; i++) {
      const z = Z0 + (Z1 - Z0) * i / (ROWS - 1);
      for (let j = 0; j < COLS; j++) {
        const x = X0 + (X1 - X0) * j / (COLS - 1);
        hBuf[i * COLS + j] = waveH(x, z, t, amp, beatR, beatK);
      }
    }
    for (let i = 0; i < ROWS; i++) {
      const z = Z0 + (Z1 - Z0) * i / (ROWS - 1);
      const near = i / (ROWS - 1);
      for (let j = 0; j < COLS - 1; j++) {
        for (let e = 0; e < 2; e++) {
          const jj = j + e, x = X0 + (X1 - X0) * jj / (COLS - 1), h = hBuf[i * COLS + jj];
          pos[k] = x; pos[k + 1] = Y + h; pos[k + 2] = z;
          const hn = clamp(h / (amp * 1.0) * .9 + .45);
          if (hn < .55) tmp.copy(cLow).lerp(cMid, clamp((hn - .2) / .35) * .55);
          else tmp.copy(cLow).lerp(cHigh, clamp((hn - .55) / .45));
          const edge = Math.min(1, Math.min(jj, COLS - 1 - jj) / 12);
          const fade = (.35 + near * .65) * edge;
          col[k] = tmp.r * fade; col[k + 1] = tmp.g * fade; col[k + 2] = tmp.b * fade;
          k += 3;
        }
      }
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    /* shapes */
    pSmooth.lerp(pointer, .06);
    rig.position.set(layout.x, layout.y + progress * .6, 0);
    rig.scale.setScalar(layout.s);
    rig.rotation.y = pSmooth.x * .22 + progress * .35;
    rig.rotation.x = -pSmooth.y * .1;
    if (hasPointer) { ray.setFromCamera(ndc, camera); ray.ray.intersectPlane(hitPlane, hitP); rig.worldToLocal(hitP); }
    items.forEach((it, i) => {
      const lag = (i % 4) * .08;
      const local = clamp(((beat + lag) % 1));
      const punch = Math.exp(-local * 7) * (reduce ? 0 : 1);
      const bob = Math.sin(t * 1.1 + it.ph) * .14;
      const spread = 1 + progress * (it.hero ? .15 : .9);
      v3.copy(it.base).multiplyScalar(spread);
      v3.y += bob + progress * (it.hero ? -.2 : (i % 3) * .8);
      /* push away from the cursor */
      if (hasPointer) {
        const dx = it.holder.position.x - hitP.x, dy = it.holder.position.y - hitP.y, d2 = dx * dx + dy * dy;
        const f = Math.exp(-d2 * .9) * .55;
        it.push.x += (dx * f - it.push.x) * .08; it.push.y += (dy * f - it.push.y) * .08;
      } else it.push.multiplyScalar(.92);
      it.holder.position.copy(v3).add(it.push);
      const s = it.s * (1 + punch * (it.hero ? .035 : .07));
      it.holder.scale.set(s, s * (1 - punch * .03), s);
      const sp = .004 + energy * .03;
      if (!reduce) {
        it.obj.rotation.x += it.spin.x * sp * (it.hero ? .2 : 1);
        it.obj.rotation.y += it.spin.y * sp * (it.hero ? 2.2 : 1) + punch * .006;
        it.obj.rotation.z += it.spin.z * sp * (it.hero ? .2 : 1);
      }
    });
    if (items[0].hero) { items[0].obj.rotation.x = .12 + Math.sin(t * .6) * .08; items[0].obj.rotation.z = .06 + Math.sin(t * .45) * .06; }

    /* camera */
    const cz = 13 - progress * 2.5;
    camera.position.set(pSmooth.x * .5, 1.1 - progress * 1.2 + pSmooth.y * .25, cz);
    camera.lookAt(layout.x * .35, .2 - progress * .6, 0);
    glow.material.opacity = .85 + Math.sin(t * Math.PI * 2 / BEAT) * .05 + energy * .2;
    rimA.intensity = 60 + punchAll(beat) * 35;

    renderer.render(scene, camera);
  }
  const punchAll = b => Math.exp(-(b % 1) * 6);

  /* ---------- loop: runs only while the hero is on screen ---------- */
  let running = false, raf = 0, t0 = performance.now(), visible = true;
  const loop = now => {
    raf = requestAnimationFrame(loop);
    const t = (now - t0) / 1000;
    energy += (clamp(Math.abs(velocity) / 40) - energy) * .06;
    velocity *= .9;
    render(t);
  };
  const start = () => { if (!running && !reduce && visible && !document.hidden) { running = true; raf = requestAnimationFrame(loop); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  addEventListener('resize', resize);
  resize();
  if (reduce) render(2.2); else start();

  return {
    setProgress(p) { progress = clamp(p); if (reduce) render(2.2); },
    setVelocity(v) { velocity = v; },
  };
}
