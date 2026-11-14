// Layer 3 — Interaction: planets that react to the mouse (Three.js + a small spring/collision sim)
import * as THREE from 'three';
import { RoomEnvironment } from '../assets/vendor/RoomEnvironment.js';

const { gsap, ScrollTrigger } = window;

export function initSpheres(canvas, { onLabel = () => {}, onBurst = () => {}, reduced = false } = {}) {
  const section = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .55;
  const key = new THREE.DirectionalLight(0xfff1e0, 3.4); key.position.set(-12, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7fb0ff, 3.2); rim.position.set(8, -2, -6); scene.add(rim);

  const camera = new THREE.PerspectiveCamera(35, 1, .1, 200); camera.position.set(0, 0, 22);

  // real planet surface maps (NASA / USGS mosaics), sent to the GPU as soon as they arrive
  const texs = [], mgr = new THREE.LoadingManager(() => texs.forEach(t => renderer.initTexture(t)));
  const loaderT = new THREE.TextureLoader(mgr);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = n => { const t = loaderT.load(`assets/img/planets/${n}`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, maxAniso); texs.push(t); return t; };
  const planet = (n, roughness, bump = 0) => { const map = tex(`${n}.jpg`);
    return new THREE.MeshStandardMaterial({ map, roughness, envMap: scene.environment, envMapIntensity: .12, ...(bump ? { bumpMap: map, bumpScale: bump } : {}) }); };
  const M = {
    saturn: planet('saturn', .85),
    mars: planet('mars', .92, 1.4),
    europaMap: planet('europa', .6, .8),
    luna: planet('luna', .95, 1.6),
    neptune: planet('neptune', .7),
    io: planet('io', .88, 1),
    enceladus: planet('enceladus', .6, .9),
    europa: new THREE.MeshPhysicalMaterial({ color: 0xdbeaff, roughness: .12, clearcoat: 1, iridescence: .7, iridescenceIOR: 1.6 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: .1 }),
    pearl: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .2, iridescence: 1, iridescenceIOR: 2, clearcoat: 1 }),
    ember: new THREE.MeshPhysicalMaterial({ color: 0xff7a3d, roughness: .25, clearcoat: 1, emissive: 0x7a1e00, emissiveIntensity: .25 }),
    ink: new THREE.MeshPhysicalMaterial({ color: 0x15161c, roughness: .18, clearcoat: 1, metalness: .2 }),
  };
  const geo = new THREE.SphereGeometry(1, 64, 48);

  // name, material, radius, home (x, y) as fraction of the view, depth z
  const PLANETS = [
    ['Saturn', 'saturn', 2.05, [.32, .1], 0],
    ['Mars', 'mars', 1.35, [-.02, -.34], .4],
    ['Europa', 'europaMap', 1.1, [.06, .3], -.6],
    ['Neptune', 'neptune', 1.25, [.62, -.32], -.3],
    ['Luna', 'luna', .85, [.66, .36], .2],
    ['Io', 'io', .9, [.18, -.12], 1],
    ['Enceladus', 'enceladus', .7, [.44, -.42], .8],
  ];
  const bodies = [];
  const group = new THREE.Group(); scene.add(group);
  function addBody(name, mat, r, home, z, small = false) {
    const mesh = new THREE.Mesh(geo, M[mat]);
    const banded = mat === 'saturn' || mat === 'neptune' || mat === 'io';  // spin on their axis (Io's map has no poles)
    mesh.rotation.set(banded ? .18 : Math.random() * Math.PI, Math.random() * Math.PI, banded ? -.12 : .3);
    const holder = new THREE.Group(); holder.add(mesh); group.add(holder);
    const b = { name, r, home, z, small, banded, holder, mesh, p: new THREE.Vector2(), v: new THREE.Vector2(), hp: new THREE.Vector2(),
      s: new THREE.Vector2(1, 1), sv: new THREE.Vector2(), phase: Math.random() * 10, m: r * r * r };
    if (name === 'Saturn') {
      // ring: real Cassini-based ring map, laid out radially across the ring
      const IN = 1.24, OUT = 2.27, rg = new THREE.RingGeometry(IN, OUT, 160, 1), pos = rg.attributes.position, uv = rg.attributes.uv, v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - IN) / (OUT - IN), .5); }
      const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: tex('saturn_ring.png'), roughness: .8, side: THREE.DoubleSide,
        transparent: true, depthWrite: false, envMap: scene.environment, envMapIntensity: .2 }));
      ring.rotation.set(Math.PI / 2.35, .25, 0); holder.add(ring); b.ring = ring;
    }
    bodies.push(b); return b;
  }
  PLANETS.forEach(([n, m, r, h, z]) => addBody(n, m, r, h, z));
  const SMALL = ['ember', 'chrome', 'pearl', 'ink', 'europa', 'ember', 'ink', 'chrome'];
  for (let i = 0; i < 26; i++) {
    addBody(null, SMALL[i % SMALL.length], .14 + Math.random() * .26, [Math.random() * 1.05 - .2, Math.random() * 1.0 - .5], (Math.random() - .5) * 3, true);
  }

  let vw = 1, vh = 1, mobile = false;
  function resize() {
    const w = section.clientWidth, h = section.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    vh = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); vw = vh * camera.aspect;
    mobile = w < 900;
    const k = mobile ? .62 : 1;
    bodies.forEach(b => {
      // desktop: planets live in the right ~60% of the screen; mobile: lower part
      const hx = mobile ? (b.home[0] - .2) * vw * .95 : b.home[0] * vw * .62 + vw * .02;
      const hy = mobile ? b.home[1] * vh * .55 - vh * .14 : b.home[1] * vh * .82;
      b.hp.set(hx, hy); b.holder.scale.setScalar(b.r * k); b.rr = b.r * k;
      if (!b.init) { b.p.copy(b.hp); b.init = true; }
    });
  }
  resize(); addEventListener('resize', resize);

  // pointer in world units on the z=0 plane
  const ptr = { x: 9999, y: 9999, px: 9999, py: 9999, vx: 0, vy: 0, inside: false, down: false, charge: 0, held: null };
  function toWorld(e) {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width - .5) * vw, -((e.clientY - r.top) / r.height - .5) * vh];
  }
  const hit = (x, y) => { let best = null, bd = 1e9;
    for (const b of bodies) { const d = Math.hypot(b.p.x - x, b.p.y - y) - b.rr * b.s.x; if (d < 0 && d < bd) { bd = d; best = b; } }
    return best; };
  section.addEventListener('pointermove', e => {
    const [x, y] = toWorld(e); ptr.x = x; ptr.y = y; ptr.inside = true;
    const b = hit(x, y); onLabel(b ? (b.name || '') : null, !!b);
  });
  section.addEventListener('pointerleave', () => { ptr.inside = false; ptr.x = ptr.y = 9999; onLabel(null, false); release(null); });
  section.addEventListener('pointerdown', e => {
    const [x, y] = toWorld(e); ptr.down = true; ptr.charge = 0; ptr.held = hit(x, y); ptr.x = x; ptr.y = y;
  });
  function release(e) {
    if (!ptr.down) return;
    ptr.down = false;
    const c = .35 + ptr.charge;  // 0.35 .. 1.35
    for (const b of bodies) {
      const dx = b.p.x - ptr.x, dy = b.p.y - ptr.y, d = Math.max(.6, Math.hypot(dx, dy));
      const f = c * 34 / (d * Math.sqrt(b.m) + 1.5);
      b.v.x += dx / d * f; b.v.y += dy / d * f;
      b.sv.x += (Math.random() - .5) * 6 * c; b.sv.y += (Math.random() - .5) * 6 * c;
    }
    if (ptr.held) { ptr.held.sv.y += 14 * c; ptr.held.sv.x -= 8 * c; }
    if (e) onBurst(e.clientX, e.clientY, c);
    ptr.held = null; ptr.charge = 0;
  }
  addEventListener('pointerup', release);

  // entrance: planets fly in from deep space
  const intro = { z: reduced ? 0 : -60 };
  ScrollTrigger.create({ trigger: section, start: 'top 75%', once: true,
    onEnter: () => gsap.to(intro, { z: 0, duration: 2.4, ease: 'expo.out' }) });
  const camState = { y: 0 };
  gsap.fromTo(camState, { y: 2.2 }, { y: -2.2, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true } });

  let visible = false;
  new IntersectionObserver(([en]) => visible = en.isIntersecting, { rootMargin: '100px' }).observe(section);

  const tmpAxis = new THREE.Vector3(), q = new THREE.Quaternion();
  let lt = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) { lt = now; return; }
    const dt = Math.min(.033, (now - lt) / 1000); lt = now;
    const t = now / 1000;
    if (ptr.px < 9000 && ptr.x < 9000) { ptr.vx = (ptr.x - ptr.px) / Math.max(dt, .001); ptr.vy = (ptr.y - ptr.py) / Math.max(dt, .001); }
    ptr.px = ptr.x; ptr.py = ptr.y;
    if (ptr.down) ptr.charge = Math.min(1, ptr.charge + dt / 1.3);

    for (const b of bodies) {
      // spring home with a slow orbital drift
      const hx = b.hp.x + Math.sin(t * .35 + b.phase) * .25, hy = b.hp.y + Math.cos(t * .3 + b.phase * 1.3) * .3;
      b.v.x += (hx - b.p.x) * 3.2 * dt * (b.small ? 1.4 : 1); b.v.y += (hy - b.p.y) * 3.2 * dt * (b.small ? 1.4 : 1);
      // mouse: push away, and drag along with the sweep
      if (ptr.inside && !ptr.down) {
        const dx = b.p.x - ptr.x, dy = b.p.y - ptr.y, d = Math.hypot(dx, dy) || .001, R = b.rr + 1.6;
        if (d < R) {
          const k = (1 - d / R);
          b.v.x += (dx / d * k * 70 + ptr.vx * k * 1.4) * dt / Math.cbrt(b.m);
          b.v.y += (dy / d * k * 70 + ptr.vy * k * 1.4) * dt / Math.cbrt(b.m);
          b.sv.x += Math.abs(ptr.vx) * k * dt * .8; b.sv.y -= Math.abs(ptr.vx) * k * dt * .4;
        }
      }
      // press & hold: gravity well pulls everything in
      if (ptr.down) {
        const dx = ptr.x - b.p.x, dy = ptr.y - b.p.y, d = Math.max(.8, Math.hypot(dx, dy));
        const g = (8 + ptr.charge * 26) / (d * .6 + 1);
        b.v.x += dx / d * g * dt; b.v.y += dy / d * g * dt;
      }
      b.v.multiplyScalar(Math.pow(.18, dt));
      b.p.addScaledVector(b.v, dt);

      // squash & stretch spring (pressed body is crushed)
      let tx = 1, ty = 1;
      if (ptr.held === b) { tx = 1 + .16 * ptr.charge + .06; ty = 1 - .26 * ptr.charge - .08; }
      b.sv.x += ((tx - b.s.x) * 260 - b.sv.x * 9) * dt; b.sv.y += ((ty - b.s.y) * 260 - b.sv.y * 9) * dt;
      b.s.x += b.sv.x * dt; b.s.y += b.sv.y * dt;
    }
    // collisions
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], c = bodies[j];
      const dx = c.p.x - a.p.x, dy = c.p.y - a.p.y, d = Math.hypot(dx, dy) || .001, min = a.rr + c.rr + (a.ring || c.ring ? .5 : .05);
      if (d < min) {
        const nx = dx / d, ny = dy / d, o = min - d, wa = c.m / (a.m + c.m), wc = a.m / (a.m + c.m);
        a.p.x -= nx * o * wa; a.p.y -= ny * o * wa; c.p.x += nx * o * wc; c.p.y += ny * o * wc;
        const rv = (c.v.x - a.v.x) * nx + (c.v.y - a.v.y) * ny;
        if (rv < 0) { const imp = -1.6 * rv / (1 / a.m + 1 / c.m); a.v.x -= imp * nx / a.m; a.v.y -= imp * ny / a.m; c.v.x += imp * nx / c.m; c.v.y += imp * ny / c.m;
          a.sv.x += Math.min(4, -rv) * .6; c.sv.x += Math.min(4, -rv) * .6; }
      }
    }
    for (const b of bodies) {
      b.holder.position.set(b.p.x, b.p.y, b.z + intro.z * (1 + b.z * .1 + (b.small ? .6 : 0)));
      const k = b.rr; b.mesh.scale.set(b.s.x, b.s.y, b.s.x);
      // roll in the direction of travel + idle spin
      const sp = b.v.length();
      if (sp > .001 && !b.banded) { tmpAxis.set(-b.v.y, b.v.x, 0).normalize(); q.setFromAxisAngle(tmpAxis, sp / k * dt * .5); b.mesh.quaternion.premultiply(q); }
      b.mesh.rotateY(dt * (b.small ? .6 : .12));
      if (b.ring) b.ring.scale.set(b.s.x, b.s.x, 1);
    }
    camera.position.y = camState.y; camera.lookAt(0, camState.y * .6, 0);
    renderer.render(scene, camera);
  }
  // compile shaders and upload textures now (idle time), not on first sight mid-scroll
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
