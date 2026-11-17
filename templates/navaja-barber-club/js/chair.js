// The hero: a vintage barber chair (Poly Haven "Barber Shop Chair 01", CC0) lit by a Poly Haven
// studio HDRI with a warm key and an oxblood rim. It turns slowly on its base; scrolling swivels
// it half a turn the way a barber spins a client to the mirror, and the mouse tilts the view.
// Cigar-smoke dust drifts behind it. With reduced motion it renders one still frame.
import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { RGBELoader } from './vendor/RGBELoader.js';

const canvas = document.querySelector('.hero__gl');
const hero = document.querySelector('.hero');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function webglOK() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
}
// build the scene after the page has loaded so text and photos come first
const later = fn => { const go = () => setTimeout(fn, 60); if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true }); };
if (canvas && webglOK()) later(init);

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(190,40,40,.55)'); r.addColorStop(0.45, 'rgba(120,20,24,.22)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

async function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.6, 11);

  let hdr, gltf;
  try {
    [hdr, gltf] = await Promise.all([
      new RGBELoader().loadAsync('assets/models/brown_photostudio_02.hdr'),
      new GLTFLoader().loadAsync('assets/models/barber-chair.glb')
    ]);
  } catch (e) { return; } // the poster photo stays
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  scene.environmentIntensity = 0.75;
  hdr.dispose(); pmrem.dispose();

  /* ---------- the chair: centred on its base, 3.6 units tall ---------- */
  const chair = gltf.scene;
  const box = new THREE.Box3().setFromObject(chair), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const s = 3.6 / size.y;
  chair.scale.setScalar(s);
  chair.position.set(-c.x * s, -box.min.y * s - 1.8, -c.z * s);
  chair.traverse(o => { if (o.isMesh) { o.castShadow = false; if (o.material) o.material.envMapIntensity = 1; } });
  const turn = new THREE.Group(); turn.add(chair);
  const rig = new THREE.Group(); rig.add(turn); scene.add(rig);

  // a soft oxblood glow behind, and a contact shadow under the base
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(7, 7, 1); glow.position.set(0, 0.2, -2.5); rig.add(glow);
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const sg = sc.getContext('2d'), sr = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
  sr.addColorStop(0, 'rgba(0,0,0,.65)'); sr.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = sr; sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.79; rig.add(shadow);

  /* ---------- light ---------- */
  const key = new THREE.SpotLight(0xffe2c0, 160, 30, 0.55, 0.6, 1.4); key.position.set(-5, 6, 7); scene.add(key); scene.add(key.target);
  const rim = new THREE.PointLight(0xff3a30, 70, 14, 1.6); rim.position.set(3.2, 2.2, -2.8); scene.add(rim);
  const rim2 = new THREE.PointLight(0x6a80ff, 16, 14, 1.6); rim2.position.set(-3.6, 0.5, -2.4); scene.add(rim2);

  /* ---------- smoke dust ---------- */
  const N = 800, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 14; pos[i * 3 + 1] = (Math.random() - 0.5) * 9; pos[i * 3 + 2] = -4 + Math.random() * 7; seed[i] = Math.random(); }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; uniform float uT; uniform float uPR; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y + uT * (0.12 + seed * 0.18) + 4.5, 9.0) - 4.5; p.x += sin(uT * 0.3 + seed * 20.0) * 0.25;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
      gl_PointSize = (2.0 + seed * 5.0) * uPR * (6.0 / -mv.z); vA = (0.25 + 0.75 * seed) * smoothstep(4.5, 2.5, abs(p.y)); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 0.78, 0.6, smoothstep(0.5, 0.0, d) * vA * 0.5); }`
  });
  const dust = new THREE.Points(dg, dustMat); scene.add(dust);

  /* ---------- layout ---------- */
  let mobile = false; const base = { x: 0, y: 0 };
  function layout() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    mobile = r.width < 760;
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z, halfW = halfH * camera.aspect;
    if (mobile) { rig.position.set(halfW * 0.22, halfH * 0.42, 0); rig.scale.setScalar(0.62); }
    else { rig.position.set(Math.min(halfW * 0.52, 3.5), -0.05, 0); rig.scale.setScalar(1); }
    base.x = rig.position.x; base.y = rig.position.y;
  }

  /* ---------- input ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduce) addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  let prog = 0;
  if (!reduce && window.gsap && window.ScrollTrigger) ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onUpdate: st => { prog = st.progress; } });

  /* ---------- loop ---------- */
  let visible = true, last = performance.now(), t = 0, spin = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !reduce) requestAnimationFrame(tick); }, { rootMargin: '100px' }).observe(hero);
  function frame(dt) {
    t += dt;
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    spin = -0.75 + Math.sin(t * 0.25) * 0.35 + prog * Math.PI;   // idle sway + scroll swivel
    turn.rotation.y = spin;
    rig.rotation.x = 0.06 + mouse.y * 0.1;
    rig.rotation.y = mouse.x * 0.25;
    rig.position.x = base.x + mouse.x * 0.2 - (mobile ? 0 : prog * 0.6);
    rig.position.y = base.y + prog * (mobile ? 0.4 : 0.8);
    camera.position.z = 11 - prog * 1.6;
    camera.lookAt(0, 0.2, 0);
    dustMat.uniforms.uT.value = t;
    dust.rotation.y = mouse.x * 0.15;
    glow.material.opacity = 0.85 + Math.sin(t * 1.3) * 0.08;
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
