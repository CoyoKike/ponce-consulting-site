// The hero: a scanned sea shell (Poly Haven "Lambis Shell", CC0) lit by a Poly Haven studio HDRI,
// turning slowly over a soft moving sage / lilac / pearl gradient with a few pearls drifting
// around it. Scrolling rolls the shell to show its spines; the pointer tilts it. Picking a shade
// in the color bar tints the pearls. With reduced motion it renders one still frame.
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

function shadowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(70,40,80,.32)'); r.addColorStop(.55, 'rgba(70,40,80,.1)'); r.addColorStop(1, 'rgba(70,40,80,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

async function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 0.4, 12);

  let hdr, gltf;
  try {
    [hdr, gltf] = await Promise.all([
      new RGBELoader().loadAsync('assets/models/studio_small_09.hdr'),
      new GLTFLoader().loadAsync('assets/models/lambis-shell.glb')
    ]);
  } catch (e) { return; } // the poster photo stays
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  scene.environmentIntensity = 0.9;
  hdr.dispose(); pmrem.dispose();

  /* ---------- moving gradient backdrop ---------- */
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

  /* ---------- the shell, centred, 3.4 units across ---------- */
  const shell = gltf.scene;
  const b = new THREE.Box3().setFromObject(shell), size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const s = 3.4 / Math.max(size.x, size.y, size.z);
  shell.scale.setScalar(s);
  shell.position.set(-c.x * s, -c.y * s, -c.z * s);
  const turn = new THREE.Group(); turn.add(shell);
  const rig = new THREE.Group(); rig.add(turn); scene.add(rig);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.35; rig.add(shadow);

  /* ---------- pearls ---------- */
  const pearl = new THREE.MeshPhysicalMaterial({
    color: 0xf4efe9, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12,
    iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [260, 760], sheen: 0.6, sheenColor: 0xe8d8f0
  });
  const PG = new THREE.SphereGeometry(1, 48, 32), pearls = [];
  [[-1.5, 1.3, -1, .18], [1.9, 1.8, -.6, .15], [2.1, -1.1, .6, .22], [-1.2, -1.4, .8, .13], [1.0, 2.4, -2, .1], [-1.9, .1, -2.4, .14], [2.8, .5, -2.6, .12]].forEach(([x, y, z, r]) => {
    const m = new THREE.Mesh(PG, pearl); m.position.set(x, y, z); m.scale.setScalar(r);
    m.userData = { x, y, z, s: Math.random() * 6, sp: 0.4 + Math.random() * 0.5 }; rig.add(m); pearls.push(m);
  });
  const base = new THREE.Color(0xf4efe9), target = base.clone();
  addEventListener('lacquer', e => { target.copy(base).lerp(new THREE.Color(e.detail), 0.35); if (reduce) { pearl.color.copy(target); frame(0); } });

  /* ---------- light ---------- */
  const key = new THREE.DirectionalLight(0xfff4ea, 1.8); key.position.set(-4, 6, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xd9c4ff, 1.4); rim.position.set(5, 2, -5); scene.add(rim);

  /* ---------- layout ---------- */
  let mobile = false; const pos0 = { x: 0, y: 0 };
  function layout() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    bgU.uAspect.value = camera.aspect;
    mobile = r.width < 760;
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z, halfW = halfH * camera.aspect;
    if (mobile) { pos0.x = 0.25; pos0.y = halfH * 0.5; rig.scale.setScalar(0.56); }
    else { pos0.x = Math.min(halfW * 0.5, 3.5); pos0.y = 0.1; rig.scale.setScalar(1.3); }
  }

  const m = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduce) addEventListener('pointermove', e => { m.tx = e.clientX / innerWidth - 0.5; m.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  let prog = 0;
  if (!reduce && window.gsap && window.ScrollTrigger) ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onUpdate: st => { prog = st.progress; } });

  let visible = true, last = performance.now(), t = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !reduce) requestAnimationFrame(tick); }, { rootMargin: '100px' }).observe(hero);
  function frame(dt) {
    t += dt;
    m.x += (m.tx - m.x) * 0.05; m.y += (m.ty - m.y) * 0.05;
    pearl.color.lerp(target, 0.06);
    bgU.uT.value = t;
    turn.rotation.y = 0.6 + t * 0.12 + m.x * 0.5 + prog * 2.2;
    turn.rotation.x = 0.85 + m.y * 0.2 + prog * 0.5;
    turn.rotation.z = 0.15 + Math.sin(t * 0.4) * 0.05;
    rig.position.set(pos0.x + m.x * 0.2, pos0.y + Math.sin(t * 0.7) * 0.06 + prog * (mobile ? 0.3 : 0.6), 0);
    shadow.material.opacity = 1 - Math.sin(t * 0.7) * 0.15;
    pearls.forEach(pp => {
      const u = pp.userData;
      pp.position.set(u.x + Math.sin(t * u.sp + u.s) * 0.12, u.y + Math.sin(t * u.sp * 1.3 + u.s) * 0.18 + prog * (u.z + 2) * 0.25, u.z);
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
