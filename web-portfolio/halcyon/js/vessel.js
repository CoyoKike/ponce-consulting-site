// The craft: real NASA 3D models (public domain). The camera circles the Space Station,
// then flies on through the dark to the Apollo Lunar Module. Scroll drives the camera (state.p, set in motion.js).
import * as THREE from 'three';
import { GLTFLoader } from '../assets/vendor/GLTFLoader.js';
import { DRACOLoader } from '../assets/vendor/DRACOLoader.js';
import { RoomEnvironment } from '../assets/vendor/RoomEnvironment.js';

export function initVessel(canvas, state, { reduced = false } = {}) {
  const { gsap } = window;
  const mobile = matchMedia('(max-width: 760px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);   // transparent: the nebula photo shows through in the opening view

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#05060a', 120, 260);
  const camera = new THREE.PerspectiveCamera(mobile ? 52 : 34, 1, 0.05, 600);

  // sunlight: one hard warm key, a faint blue fill like light off the Earth, a cool rim
  const sun = new THREE.DirectionalLight('#fff1dc', 4.2); sun.position.set(-12, 9, 10); scene.add(sun);
  const earthshine = new THREE.HemisphereLight('#7fa6e0', '#0a0c12', 0.55); scene.add(earthshine);
  const rim = new THREE.DirectionalLight('#9fc6ff', 1.4); rim.position.set(10, -4, -12); scene.add(rim);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  // stars: fixed points far away, so they barely move while the craft sweeps past
  const N = 2600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = 380 + Math.random() * 120, s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(t), r * u, r * s * Math.sin(t)], i * 3);
    const b = 0.35 + Math.random() * 0.65; col.set([b, b, b * (0.92 + Math.random() * 0.08)], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: mobile ? 1.6 : 1.3, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, depthWrite: false }));
  scene.add(stars);

  // the two craft, placed along the flight path
  const LM_Z = -46;
  const iss = new THREE.Group(), lm = new THREE.Group();
  lm.position.set(3, -1, LM_Z);
  scene.add(iss, lm);

  const fit = (obj, size) => {
    const box = new THREE.Box3().setFromObject(obj), s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const k = size / Math.max(s.x, s.y, s.z);
    obj.scale.setScalar(k); obj.position.copy(c.multiplyScalar(-k));
    return s.multiplyScalar(k);
  };

  const draco = new DRACOLoader().setDecoderPath('assets/vendor/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const load = url => new Promise((res, rej) => loader.load(url, g => res(g.scene), undefined, rej));

  let ready = false;
  const info = {};
  const loaded = Promise.all([load('assets/models/iss.glb'), load('assets/models/lm.glb')]).then(([a, b]) => {
    // ISS: the NASA file is untextured grey, so give it believable materials:
    // big flat parts are the solar arrays (dark blue cells with a gold sheen), the rest is white thermal blanket and metal
    a.updateMatrixWorld(true);
    const whole = new THREE.Box3().setFromObject(a).getSize(new THREE.Vector3());
    const span = Math.max(whole.x, whole.y, whole.z);
    const solar = new THREE.MeshStandardMaterial({ color: '#4a3622', metalness: 0.55, roughness: 0.48, side: THREE.DoubleSide });
    const hull = new THREE.MeshStandardMaterial({ color: '#d9d6cf', metalness: 0.15, roughness: 0.62 });
    const truss = new THREE.MeshStandardMaterial({ color: '#8d8f94', metalness: 0.7, roughness: 0.42 });
    info.iss = [];
    const stray = [];
    a.traverse(o => {
      if (!o.isMesh) return;
      o.geometry.computeBoundingBox();
      const s = o.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(o.getWorldScale(new THREE.Vector3()));
      const dims = [s.x, s.y, s.z].sort((p, q) => p - q);
      const flat = dims[0] / dims[2] < 0.04 && dims[2] > span * 0.08;
      const name = (o.material && o.material.name) || '';
      o.material = flat ? solar : /truss/i.test(name) ? truss : hull;
      const wc = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
      if (wc.y / span > 0.6) stray.push(o);   // a loose part floating far above the station in the NASA file
      info.iss.push([o.name, name, dims.map(d => +(d / span).toFixed(3)), flat, wc.toArray().map(v => +(v / span).toFixed(2))]);
    });
    stray.forEach(o => o.removeFromParent());
    fit(a, 16); iss.add(a);

    // Lunar Module: keep NASA's own materials (gold foil, grey stages), just tune them for this light
    b.traverse(o => {
      if (!o.isMesh) return;
      const m = o.material;
      if (m && m.isMeshStandardMaterial) {
        const c = m.color, gold = c.r > c.b * 2 && c.r > 0.4;
        if (gold) { m.metalness = 0.9; m.roughness = 0.28; } else { m.metalness = Math.max(m.metalness, 0.25); m.roughness = Math.min(Math.max(m.roughness, 0.4), 0.7); }
      }
    });
    fit(b, 7.5); lm.add(b);
    ready = true; resize();
    window.__vesselInfo = info;
  }).catch(e => { console.error('vessel models', e); });

  // camera path. p 0 → .56: circle the station; .56 → .74: fly on to the lander; .74 → 1: circle the lander
  const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const camPos = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3();
  const issTarget = new THREE.Vector3(0, 0, 0), lmTarget = new THREE.Vector3().copy(lm.position);
  function orbit(center, ang, rad, h, out) { return out.set(center.x + Math.sin(ang) * rad, center.y + h, center.z + Math.cos(ang) * rad); }

  let p = state.p, h = state.h, mx = 0, my = 0, tmx = 0, tmy = 0;
  addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; }, { passive: true });

  function place(time) {
    p += (state.p - p) * (reduced ? 1 : 0.08);
    h += (state.h - h) * (reduced ? 1 : 0.08);
    mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
    // act 1: wide, then down along the truss, then under the arrays
    const a1 = ss(0, 0.56, p);
    const ang1 = lerp(-0.9, 1.35, a1), rad1 = lerp(34, 15.5, ss(0, 0.32, p)) + ss(0.32, 0.56, p) * 3, h1 = lerp(9, -2.5, a1);
    orbit(issTarget, ang1, rad1, h1, camPos);
    look.copy(issTarget);
    // on wide screens, slide the station away from whichever side the words are on
    if (camera.aspect > 1) {
      const off = (2.6 - 5.4 * ss(0.29, 0.36, p)) * (1 - ss(0.5, 0.58, p));
      look.x -= off * Math.cos(ang1); look.z += off * Math.sin(ang1);
    }
    // act 2: fly on through the dark to the lander, then circle it
    const fly = ss(0.56, 0.74, p);
    if (fly > 0) {
      const ang2 = lerp(0.35, -1.5, ss(0.7, 1, p)), rad2 = lerp(19, 15, ss(0.7, 0.95, p)), h2 = lerp(3.5, 2.2, ss(0.7, 1, p));
      orbit(lmTarget, ang2, rad2, h2, tmp);
      camPos.lerp(tmp, fly);
      // keep the lander right of centre on wide screens, so the words on the left stay clear
      tmp.copy(lmTarget); if (camera.aspect > 1) { tmp.x -= 3.2 * Math.cos(ang2); tmp.z += 3.2 * Math.sin(ang2); }
      look.lerp(tmp, ss(0.56, 0.72, p));
    }
    // opening view: the station hangs far off in the nebula; the hero scroll dives the camera in to the tour's first pose
    const far = 1 - ss(0, 1, h);
    if (far > 0) {
      orbit(issTarget, -1.55, 72, 19, tmp);
      camPos.lerp(tmp, far);
    }
    const md = 1 + far * 3;   // the mouse moves the far view more, so the station swings against the nebula
    camPos.x += mx * 1.6 * md; camPos.y -= my * 1.1 * md;
    camera.position.copy(camPos); camera.lookAt(look);
    frame(far);
    iss.rotation.y = time * 0.012; lm.rotation.y = -time * 0.02;
    lm.visible = p > 0.5; lm.scale.setScalar(0.6 + 0.4 * ss(0.5, 0.74, p));
    // the station falls behind into the fog; the lander fades up out of it
    stars.rotation.y = p * 0.25;
    stars.material.opacity = 0.15 + 0.85 * ss(0.55, 1, h);   // the nebula has its own stars in the opening view
  }

  // in the opening view, slide the picture so the station sits upper right (desktop) or above the title (phone)
  let lastFar = -1;
  function frame(far) {
    const k = Math.round(far * 1000) / 1000;
    if (k === lastFar) return; lastFar = k;
    const w = canvas.clientWidth, hh = canvas.clientHeight;
    if (!w || !hh) return;
    if (k <= 0) { camera.clearViewOffset(); return; }
    const wide = w / hh > 1;
    camera.setViewOffset(w, hh, (wide ? -0.21 : 0) * w * k, (wide ? 0.25 : 0.2) * hh * k, w, hh);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = (w / h < 0.8 ? 58 : mobile ? 52 : 34); camera.updateProjectionMatrix(); lastFar = -1;
  }
  addEventListener('resize', resize); resize();

  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '20% 0px' }).observe(canvas);
  if (ready) renderer.compile(scene, camera);
  gsap.ticker.add(time => {
    if (!visible || !ready) return;
    place(time);
    renderer.render(scene, camera);
  });
  return { info, loaded };
}
