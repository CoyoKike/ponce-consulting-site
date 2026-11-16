// The hero: a turned-brass barber pole with a glass tube, a spinning red / cream / navy spiral
// and a milk-glass globe that glows. Cigar-smoke dust drifts behind it. Scroll spins it faster
// and pulls the camera in; the mouse tilts it. With reduced motion it renders one still frame.
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const canvas = document.querySelector('.hero__gl');
const hero = document.querySelector('.hero');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
}

// build the scene after the page has loaded so text and photos come first
const later = fn => { const go = () => setTimeout(fn, 60); if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true }); };
if (canvas && webglOK()) later(init);

function stripeTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d'), img = ctx.createImageData(S, S), d = img.data;
  // red, cream, navy, cream: four bands per turn, soft edges
  const cols = [[148, 22, 30], [238, 228, 210], [24, 36, 70], [238, 228, 210]];
  const n = cols.length;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const t = ((x / S + y / S) % 1) * n, k = Math.floor(t), f = t - k;
    const a = cols[k], b = cols[(k + 1) % n];
    const m = Math.min(1, Math.max(0, (f - 0.94) / 0.06)); // narrow blend at the band edge
    const i = (y * S + x) * 4;
    // a faint fabric-like grain so the stripes are not flat vector colour
    const g = 1 + (Math.sin(x * 0.9) * Math.sin(y * 1.3)) * 0.015;
    d[i] = (a[0] + (b[0] - a[0]) * m) * g; d[i + 1] = (a[1] + (b[1] - a[1]) * m) * g; d[i + 2] = (a[2] + (b[2] - a[2]) * m) * g; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.repeat.set(2, 2.2);
  return t;
}

function glowTexture(inner = 'rgba(255,214,160,1)', outer = 'rgba(255,120,60,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, inner); r.addColorStop(0.25, 'rgba(255,170,110,.45)'); r.addColorStop(1, outer);
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function lathe(points, mat, seg = 96) {
  return new THREE.Mesh(new THREE.LatheGeometry(points.map(p => new THREE.Vector2(p[0], p[1])), seg), mat);
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.2, 11);

  /* ---------- materials ---------- */
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a062, metalness: 1, roughness: 0.26 });
  const brassDark = new THREE.MeshStandardMaterial({ color: 0x8a6a3c, metalness: 1, roughness: 0.38 });
  const stripes = stripeTexture();
  const inner = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.42, metalness: 0 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.25, ior: 1.46,
    clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 1, envMapIntensity: 1.4
  });
  const milk = new THREE.MeshPhysicalMaterial({
    color: 0xf6ead6, emissive: 0xffc98a, emissiveIntensity: 0.9, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.4, sheenColor: 0xffe2b8
  });

  /* ---------- the pole ---------- */
  const pole = new THREE.Group();
  const H = 3.1, R = 0.5;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 128, 1, true), inner);
  pole.add(tube);
  const glassTube = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.07, R + 0.07, H + 0.02, 128, 1, true), glass);
  pole.add(glassTube);

  // turned brass collars
  const top = H / 2, bot = -H / 2;
  pole.add(lathe([[0, 0], [0.66, 0], [0.7, 0.04], [0.7, 0.1], [0.62, 0.14], [0.62, 0.2], [0.68, 0.24], [0.68, 0.3], [0.5, 0.36], [0.34, 0.4], [0.3, 0.44], [0, 0.44]], brass).translateY(top - 0.02));
  pole.add(lathe([[0, 0], [0.66, 0], [0.7, -0.04], [0.7, -0.1], [0.62, -0.14], [0.62, -0.22], [0.7, -0.28], [0.66, -0.36], [0.46, -0.52], [0.3, -0.72], [0.18, -0.96], [0.1, -1.1], [0.13, -1.16], [0.06, -1.3], [0, -1.32]], brass).translateY(bot + 0.02));
  // thin dark rings where glass meets brass
  [top - 0.02, bot + 0.02].forEach(y => { const r = new THREE.Mesh(new THREE.TorusGeometry(R + 0.08, 0.025, 16, 128), brassDark); r.rotation.x = Math.PI / 2; r.position.y = y; pole.add(r); });

  // milk-glass globe with a brass crown and finial
  const gy = top + 0.44 + 0.46;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.48, 96, 64), milk);
  globe.position.y = gy; pole.add(globe);
  pole.add(lathe([[0, 0], [0.24, 0], [0.26, 0.04], [0.2, 0.08], [0.09, 0.14], [0.06, 0.24], [0.11, 0.3], [0.1, 0.36], [0.04, 0.42], [0, 0.44]], brass, 64).translateY(gy + 0.44));
  const bulb = new THREE.PointLight(0xffb070, 6, 6, 1.6); bulb.position.y = gy; pole.add(bulb);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
  halo.scale.set(3.4, 3.4, 1); halo.position.y = gy; pole.add(halo);

  pole.position.y = -0.55;
  const rig = new THREE.Group(); rig.add(pole); scene.add(rig);

  /* ---------- light ---------- */
  scene.add(new THREE.HemisphereLight(0x3a2a24, 0x050404, 0.6));
  const key = new THREE.SpotLight(0xffe0bc, 140, 30, 0.5, 0.6, 1.4); key.position.set(-5, 4, 7); scene.add(key); scene.add(key.target);
  const rim = new THREE.PointLight(0xff2f2a, 55, 14, 1.6); rim.position.set(3.2, 1.2, -2.6); scene.add(rim);
  const rim2 = new THREE.PointLight(0x5a78ff, 18, 14, 1.6); rim2.position.set(-3.4, -1.2, -2.2); scene.add(rim2);

  /* ---------- smoke dust ---------- */
  const N = 900, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 14; pos[i * 3 + 1] = (Math.random() - 0.5) * 9; pos[i * 3 + 2] = -4 + Math.random() * 7;
    seed[i] = Math.random();
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; uniform float uT; uniform float uPR; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y + uT * (0.12 + seed * 0.18) + 4.5, 9.0) - 4.5; p.x += sin(uT * 0.3 + seed * 20.0) * 0.25;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
      gl_PointSize = (2.0 + seed * 5.0) * uPR * (6.0 / -mv.z); vA = (0.25 + 0.75 * seed) * smoothstep(4.5, 2.5, abs(p.y)); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA * 0.55; gl_FragColor = vec4(1.0, 0.78, 0.6, a); }`
  });
  const dust = new THREE.Points(dg, dustMat); scene.add(dust);

  /* ---------- layout ---------- */
  let W = 1, Hh = 1, mobile = false;
  function layout() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); Hh = Math.max(1, r.height);
    renderer.setSize(W, Hh, false);
    camera.aspect = W / Hh; camera.updateProjectionMatrix();
    mobile = W < 760;
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfW = halfH * camera.aspect;
    if (mobile) { rig.position.set(halfW * 0.34, halfH * 0.3, 0); rig.scale.setScalar(0.5); }
    else { rig.position.set(Math.min(halfW * 0.56, 3.6), 0.32, 0); rig.scale.setScalar(0.66); }
    base.x = rig.position.x; base.y = rig.position.y;
  }
  const base = { x: 0, y: 0 };

  /* ---------- input ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduce) addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  let prog = 0;
  if (!reduce && window.gsap && window.ScrollTrigger) {
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onUpdate: s => { prog = s.progress; } });
  }

  /* ---------- loop ---------- */
  let visible = true, last = performance.now(), t = 0, spin = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !reduce) requestAnimationFrame(tick); }, { rootMargin: '100px' }).observe(hero);

  function frame(dt) {
    t += dt;
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    const speed = 0.22 + prog * 1.4;
    spin += dt * speed;
    stripes.offset.y = -spin;
    pole.rotation.y = t * 0.12;
    rig.rotation.z = -0.1 + mouse.x * -0.12;
    rig.rotation.x = mouse.y * 0.14 + prog * 0.25;
    rig.position.x = base.x + mouse.x * 0.25 - (mobile ? 0 : prog * 0.8);
    rig.position.y = base.y + Math.sin(t * 0.8) * 0.05 + prog * (mobile ? 0.6 : 1.1);
    camera.position.z = 11 - prog * 2.2;
    camera.lookAt(0, 0.1, 0);
    dustMat.uniforms.uT.value = t;
    dust.rotation.y = mouse.x * 0.15;
    halo.material.opacity = 0.75 + Math.sin(t * 1.7) * 0.06 + Math.sin(t * 5.3) * 0.03;
    renderer.render(scene, camera);
  }
  // adaptive quality: on slow devices drop to 1x pixels; if frames still crawl (software
  // rendering), stop the loop and redraw only when the visitor scrolls or moves the pointer
  let avg = 16, cut = false, lowPower = false, pending = false;
  function tick(now) {
    if (!visible || lowPower) return;
    const raw = now - last, dt = Math.min(0.05, raw / 1000); last = now;
    frame(dt);
    avg = avg * 0.85 + Math.min(raw, 1000) * 0.15;
    if (avg > 45 && !cut) { cut = true; renderer.setPixelRatio(1); layout(); }
    if (avg > 160) {
      lowPower = true;
      const poke = () => { if (pending || !visible) return; pending = true; setTimeout(() => { pending = false; frame(0.2); }, 250); };
      addEventListener('scroll', poke, { passive: true }); addEventListener('pointermove', poke, { passive: true });
      return;
    }
    requestAnimationFrame(tick);
  }

  layout();
  addEventListener('resize', () => { layout(); if (reduce) frame(0); });
  if (reduce) { t = 2; frame(0); }
  else requestAnimationFrame(n => { last = n; tick(n); });
  hero.classList.add('has-gl');
}
