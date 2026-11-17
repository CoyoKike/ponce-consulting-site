// The hero: a gilded salon mirror (Poly Haven "Ornate Mirror 01", CC0) hanging in the arch,
// lit by a Poly Haven studio HDRI so the gold and the glass catch real reflections. It sways
// slowly, follows the pointer, and turns toward you as you scroll. Warm dust drifts in the light.
// With reduced motion it renders one still frame.
import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { RGBELoader } from './vendor/RGBELoader.js';

const canvas = document.querySelector('.hero__gl');
const box = document.querySelector('.hero__arch');
const hero = document.querySelector('.hero');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function webglOK() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
}
// build the scene after the page has loaded so text and photos come first
const later = fn => { const go = () => setTimeout(fn, 60); if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true }); };
if (canvas && box && webglOK()) later(init);

async function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  let hdr, gltf;
  try {
    [hdr, gltf] = await Promise.all([
      new RGBELoader().loadAsync('assets/models/studio_small_03.hdr'),
      new GLTFLoader().loadAsync('assets/models/ornate-mirror.glb')
    ]);
  } catch (e) { return; } // the poster photo stays
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  scene.environmentIntensity = 1.0;
  hdr.dispose(); pmrem.dispose();

  /* ---------- the mirror, centred and sized to the arch ---------- */
  const mirror = gltf.scene;
  const b = new THREE.Box3().setFromObject(mirror), size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  // face the camera with its widest side
  if (size.z > size.x) mirror.rotation.y = Math.PI / 2;
  const s = 3.0 / Math.max(size.x, size.y, size.z);
  mirror.scale.setScalar(s);
  mirror.position.set(-c.x * s, -c.y * s, -c.z * s);
  // the model's glass is matte, so lay a polished, arch-shaped reflector just in front of it
  // (behind the gilded frame) that picks up the studio lights
  const gw = size.x * 0.83 * s, gh = size.y * 0.885 * s, r = gw / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-gw / 2, -gh / 2); shape.lineTo(gw / 2, -gh / 2); shape.lineTo(gw / 2, gh / 2 - r);
  shape.absarc(0, gh / 2 - r, r, 0, Math.PI, false); shape.lineTo(-gw / 2, -gh / 2);
  // glass: a warm reflected room, soft light falling across it in two diagonal streaks
  const gc = document.createElement('canvas'); gc.width = 256; gc.height = 512;
  const gx = gc.getContext('2d');
  const base = gx.createLinearGradient(0, 0, 0, 512); base.addColorStop(0, '#e9d9c4'); base.addColorStop(0.55, '#b89a80'); base.addColorStop(1, '#6e5444');
  gx.fillStyle = base; gx.fillRect(0, 0, 256, 512);
  gx.globalCompositeOperation = 'lighter';
  [[40, 0.55, 70], [170, 0.3, 34]].forEach(([x, a, w]) => {
    const g = gx.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, 'rgba(255,240,220,0)'); g.addColorStop(0.5, `rgba(255,240,220,${a})`); g.addColorStop(1, 'rgba(255,240,220,0)');
    gx.save(); gx.translate(128, 256); gx.rotate(-0.42); gx.translate(-128, -256); gx.fillStyle = g; gx.fillRect(x - w, -200, w * 2, 912); gx.restore();
  });
  const gtex = new THREE.CanvasTexture(gc); gtex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.ShapeGeometry(shape, 48);
  // map the arch shape onto the texture
  const pa = geo.attributes.position, uv = new Float32Array(pa.count * 2);
  for (let i = 0; i < pa.count; i++) { uv[i * 2] = pa.getX(i) / gw + 0.5; uv[i * 2 + 1] = pa.getY(i) / gh + 0.5; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const glass = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: gtex, metalness: 0.2, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.7 }));
  glass.position.set(0, -size.y * 0.015 * s, size.z * 0.42 * s);
  const pivot = new THREE.Group(); pivot.add(mirror); pivot.add(glass);
  const rig = new THREE.Group(); rig.add(pivot); scene.add(rig);

  /* ---------- light: warm key from the window side, clay rim ---------- */
  const key = new THREE.SpotLight(0xffe4c4, 90, 30, 0.6, 0.7, 1.4); key.position.set(-4, 5, 6); scene.add(key); scene.add(key.target);
  const rim = new THREE.PointLight(0xd06a40, 30, 12, 1.6); rim.position.set(2.6, -1, -2); scene.add(rim);

  /* ---------- dust in the light ---------- */
  const N = 420, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 6; pos[i * 3 + 1] = (Math.random() - 0.5) * 7; pos[i * 3 + 2] = -2 + Math.random() * 4; seed[i] = Math.random(); }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; uniform float uT; uniform float uPR; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y - uT * (0.05 + seed * 0.08) + 3.5, 7.0) - 3.5; p.x += sin(uT * 0.25 + seed * 30.0) * 0.2;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
      gl_PointSize = (1.5 + seed * 4.0) * uPR * (5.0 / -mv.z); vA = (0.2 + 0.8 * seed); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 0.86, 0.66, smoothstep(0.5, 0.0, d) * vA * 0.45); }`
  });
  const dust = new THREE.Points(dg, dustMat); scene.add(dust);

  function layout() {
    const r = box.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    // fit the mirror to about 72% of the arch width or 70% of its height, whichever is tighter
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z, halfW = halfH * camera.aspect;
    rig.scale.setScalar(Math.min(halfW * 2 * 0.72, halfH * 2 * 0.7) / 3.0);
  }
  const m = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduce) addEventListener('pointermove', e => { m.tx = e.clientX / innerWidth - 0.5; m.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  let prog = 0;
  if (!reduce && window.gsap && window.ScrollTrigger) ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onUpdate: st => { prog = st.progress; } });

  let visible = true, last = performance.now(), t = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !reduce) requestAnimationFrame(tick); }, { rootMargin: '100px' }).observe(box);
  function frame(dt) {
    t += dt;
    m.x += (m.tx - m.x) * 0.05; m.y += (m.ty - m.y) * 0.05;
    pivot.rotation.y = -0.45 + Math.sin(t * 0.3) * 0.18 + m.x * 0.5 + prog * 0.45;
    pivot.rotation.x = m.y * 0.15;
    pivot.rotation.z = Math.sin(t * 0.45) * 0.02;
    rig.position.y = Math.sin(t * 0.6) * 0.05 + prog * 0.4;
    camera.position.z = 9 - prog * 1.2;
    dustMat.uniforms.uT.value = t;
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
  if (reduce) { t = 2; frame(0); } else requestAnimationFrame(n => { last = n; tick(n); });
  hero.classList.add('has-gl');
}
