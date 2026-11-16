// The hero: a faceted glass nail-polish bottle with orchid lacquer inside and a pearl cap,
// turning slowly among floating pearls over a soft moving sage / lilac / pearl gradient.
// The glass is iridescent and refracts the gradient behind it. Scrolling lifts the cap to show
// the brush; picking a shade in the color bar repaints the lacquer. Reduced motion = one still frame.
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

function roundedSquare(w, r) {
  const s = new THREE.Shape(), h = w / 2;
  s.moveTo(-h + r, -h); s.lineTo(h - r, -h); s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r); s.quadraticCurveTo(h, h, h - r, h); s.lineTo(-h + r, h);
  s.quadraticCurveTo(-h, h, -h, h - r); s.lineTo(-h, -h + r); s.quadraticCurveTo(-h, -h, -h + r, -h);
  return s;
}
function block(w, r, depth, bevel) {
  const g = new THREE.ExtrudeGeometry(roundedSquare(w, r), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 8, curveSegments: 24 });
  g.rotateX(-Math.PI / 2); g.computeVertexNormals();
  return g; // spans y 0..depth (plus bevel)
}
function shadowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(70,40,80,.38)'); r.addColorStop(.55, 'rgba(70,40,80,.12)'); r.addColorStop(1, 'rgba(70,40,80,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
  scene.environmentIntensity = 0.75;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 0.4, 12);

  /* ---------- moving gradient backdrop (also what the glass refracts) ---------- */
  const bgU = { uT: { value: 0 }, uAspect: { value: 1 } };
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: bgU, depthWrite: false, depthTest: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv; uniform float uT, uAspect;
      vec3 srgb(vec3 c){ return pow(c, vec3(2.2)); }
      float n2(vec2 p){ return sin(p.x * 1.3 + uT * 0.12) * sin(p.y * 1.7 - uT * 0.09) + 0.5 * sin((p.x + p.y) * 2.1 + uT * 0.15); }
      void main(){
        vec2 p = vec2(vUv.x * uAspect, vUv.y) * 2.2;
        float a = n2(p), b = n2(p * 0.7 + 3.1);
        vec3 pearl = srgb(vec3(0.965, 0.95, 0.935));
        vec3 lilac = srgb(vec3(0.84, 0.78, 0.9));
        vec3 sage = srgb(vec3(0.76, 0.82, 0.74));
        vec3 glass = srgb(vec3(0.8, 0.89, 0.87));
        vec3 c = mix(pearl, lilac, smoothstep(-0.6, 1.0, a) * 0.85);
        c = mix(c, sage, smoothstep(0.1, 1.2, b) * 0.6 * (1.0 - vUv.x * 0.5));
        c = mix(c, glass, smoothstep(0.4, 1.4, a * b + vUv.y) * 0.35);
        c = mix(c, pearl, smoothstep(0.55, 0.0, vUv.x) * 0.55);   // keep the text side light
        gl_FragColor = vec4(c, 1.0);
      }`
  }));
  bg.frustumCulled = false; bg.renderOrder = -1; scene.add(bg);

  /* ---------- materials ---------- */
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.02, transmission: 1, thickness: 1.4, ior: 1.52,
    iridescence: 0.55, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 620],
    clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1, envMapIntensity: 1.2,
    attenuationColor: new THREE.Color(0xf3e9f7), attenuationDistance: 3
  });
  const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x8e4f96, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.6 });
  const pearl = new THREE.MeshPhysicalMaterial({
    color: 0xf4efe9, roughness: 0.22, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.12,
    iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [260, 760], sheen: 0.6, sheenColor: 0xe8d8f0
  });
  const steel = new THREE.MeshStandardMaterial({ color: 0xd8d2cc, metalness: 1, roughness: 0.18 });

  /* ---------- the bottle ---------- */
  const bottle = new THREE.Group();
  const BW = 1.5, BH = 1.55;
  const body = new THREE.Mesh(block(BW, 0.36, BH, 0.14), glass); body.position.y = -BH / 2; bottle.add(body);
  // thick glass base, a slab of lacquer inside
  const inner = new THREE.Mesh(block(BW - 0.5, 0.2, BH * 0.74, 0.06), lacquer); inner.position.y = -BH / 2 + 0.22; bottle.add(inner);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.22, 64), glass); neck.position.y = BH / 2 + 0.2; bottle.add(neck);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.08, 64), steel); ring.position.y = BH / 2 + 0.3; bottle.add(ring);

  // cap + brush move together
  const cap = new THREE.Group(); cap.position.y = BH / 2 + 0.34; bottle.add(cap);
  const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 1.55, 96, 1), pearl); capMesh.position.y = 0.775; cap.add(capMesh);
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.34, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), pearl); capTop.scale.y = 0.18; capTop.position.y = 1.55; cap.add(capTop);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.25, 16), steel); stem.position.y = -0.62; cap.add(stem);
  const brushGeo = new THREE.CylinderGeometry(0.09, 0.03, 0.34, 24); brushGeo.translate(0, -0.17, 0);
  const brush = new THREE.Mesh(brushGeo, lacquer); brush.position.y = -1.22; cap.add(brush);

  // contact shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -BH / 2 - 0.18;

  const rig = new THREE.Group(); rig.add(bottle); rig.add(shadow); scene.add(rig);

  /* ---------- pearls ---------- */
  const pearls = [];
  const PG = new THREE.SphereGeometry(1, 48, 32);
  const spots = [[-1.7, 1.2, -1, .2], [1.9, 1.9, -.6, .17], [2.2, -1.0, .6, .26], [-1.5, -1.5, .8, .15], [1.0, 2.6, -2, .11], [-2.3, .1, -2.4, .16], [2.9, .5, -2.6, .13], [-.8, 2.5, -1.6, .1], [.5, -2.2, 1.2, .1]];
  spots.forEach(([x, y, z, r], i) => {
    const m = new THREE.Mesh(PG, pearl); m.position.set(x, y, z); m.scale.setScalar(r);
    m.userData = { x, y, z, s: Math.random() * 6, sp: 0.4 + Math.random() * 0.5 }; rig.add(m); pearls.push(m);
  });

  /* ---------- light ---------- */
  const key = new THREE.DirectionalLight(0xfff6ee, 1.6); key.position.set(-4, 6, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xd9c4ff, 1.6); rim.position.set(5, 2, -5); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfe0, 0.5));

  /* ---------- layout ---------- */
  let mobile = false; const base = { x: 0, y: 0, s: 1 };
  function layout() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    bgU.uAspect.value = camera.aspect;
    mobile = r.width < 760;
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z, halfW = halfH * camera.aspect;
    if (mobile) { base.x = 0.35; base.y = halfH * 0.4; base.s = 0.42; }
    else { base.x = Math.min(halfW * 0.5, 3.5); base.y = -0.35; base.s = 0.74; }
    rig.scale.setScalar(base.s);
  }

  /* ---------- input + scroll + shade ---------- */
  const m = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduce) addEventListener('pointermove', e => { m.tx = e.clientX / innerWidth - 0.5; m.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  let prog = 0;
  if (!reduce && window.gsap && window.ScrollTrigger) ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onUpdate: s => { prog = s.progress; } });
  const target = new THREE.Color(0x8e4f96);
  addEventListener('lacquer', e => { target.set(e.detail); if (reduce) { lacquer.color.copy(target); frame(0); } });

  let visible = true, last = performance.now(), t = 0, lift = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !reduce) requestAnimationFrame(tick); }, { rootMargin: '100px' }).observe(hero);
  function frame(dt) {
    t += dt;
    m.x += (m.tx - m.x) * 0.05; m.y += (m.ty - m.y) * 0.05;
    lacquer.color.lerp(target, 0.06);
    bgU.uT.value = t;
    const p = Math.min(1, prog * 1.8);
    lift += (p - lift) * 0.1;
    cap.position.y = BH / 2 + 0.34 + lift * 1.7;
    cap.rotation.y = lift * 2.4;
    bottle.rotation.y = 0.55 + Math.sin(t * 0.35) * 0.35 + m.x * 0.5;
    bottle.rotation.z = -0.06 + m.x * -0.08 - lift * 0.08;
    bottle.rotation.x = m.y * 0.12 + 0.05;
    rig.position.set(base.x + m.x * 0.2, base.y + Math.sin(t * 0.7) * 0.06 - lift * (mobile ? 0.3 : 0.6), 0);
    shadow.material.opacity = 1 - Math.sin(t * 0.7) * 0.15;
    pearls.forEach(pp => {
      const u = pp.userData;
      pp.position.set(u.x + Math.sin(t * u.sp + u.s) * 0.12, u.y + Math.sin(t * u.sp * 1.3 + u.s) * 0.18 + lift * (u.z + 2) * 0.25, u.z);
      pp.rotation.y = t * 0.3 + u.s;
    });
    camera.position.x = m.x * 0.4; camera.position.y = 0.4 - m.y * 0.3;
    camera.lookAt(0, 0, 0);
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
  if (reduce) { t = 1.5; frame(0); } else requestAnimationFrame(n => { last = n; tick(n); });
  hero.classList.add('has-gl');
}
