// The scroll ride. One camera on one smooth path: a product shot of the tower at dusk, down into
// the pit as time runs back to day one, up with the structure as the floors are poured, along the
// glass as it closes in, then out wide as night falls and the lights come on.
import * as THREE from 'three';
import { RGBELoader } from '../assets/vendor/RGBELoader.js';
import { GLTFLoader } from '../assets/vendor/GLTFLoader.js';
import { buildTower, loadTextures, FH, N } from './tower.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

// camera stops: [position, target]; one Catmull-Rom spline through all of them, no cuts
const KEYS = {
  desk: [
    [[116, 52, 152], [-2, 53, 0]],      // 0 hero: the tower half built at dusk, crane working
    [[30, 20, 36], [-2, -4, 0]],       // 1 ground: at the pit edge, looking down at the piles
    [[62, 36, 62], [-2, 30, 0]],       // 2 structure: rising with the frame
    [[-36, 60, 62], [-8, 50, -2]],     // 3 envelope: close along the glass in low sun
    [[118, 62, 140], [-4, 38, 0]],     // 4 handover: wide, night, lights on
    [[136, 54, 140], [-4, 40, 0]],     // 5 a slow drift round the lit tower as the work section slides in
  ],
  phone: [
    [[150, 58, 196], [-2, 40, 0]],
    [[54, 42, 62], [0, -6, 0]],
    [[78, 46, 78], [0, 30, 0]],
    [[-48, 66, 84], [-6, 52, 0]],
    [[176, 66, 214], [0, 30, 0]],
    [[196, 60, 214], [0, 31, 0]],
  ],
};

export async function initJourney(canvas, { reduce, isPhone }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isPhone ? 2 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const BG = new THREE.Color(0x111213);
  scene.background = BG.clone();
  scene.fog = new THREE.Fog(0x111213, 170, 420);
  const camera = new THREE.PerspectiveCamera(isPhone ? 46 : 34, 1, .5, 900);

  const [tex, hdr] = await Promise.all([
    loadTextures(),
    new Promise(r => new RGBELoader().load('assets/tex/venice_sunset_1k.hdr', r, undefined, () => r(null))),
  ]);
  if (hdr) {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromEquirectangular(hdr).texture;
    hdr.dispose(); pm.dispose();
  }
  const T = buildTower(tex);
  scene.add(T.root);
  T.addProps(new GLTFLoader()).then(() => { needs = true; });

  // light: a low warm sun that sinks through the ride, a cool sky fill
  const sun = new THREE.DirectionalLight(0xfff0e0, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isPhone ? 1024 : 2048, isPhone ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 100, bottom: -30, near: 1, far: 320 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xb8c6d6, 0x3a3632, .7);
  scene.add(hemi);
  // a warm glow at street level for the night shot
  const street = new THREE.PointLight(0xffb070, 0, 120, 1.6); street.position.set(24, 6, 30); scene.add(street);

  const K = isPhone ? KEYS.phone : KEYS.desk;
  // the camera path is laid out round the tower (angle, distance, height), so between stops it
  // circles the building at a steady distance instead of cutting through the frame
  let pa = null;
  const cyl = K.map(([[x, y, z]]) => {
    let a = Math.atan2(z, x);
    if (pa !== null) while (a - pa > Math.PI) a -= 2 * Math.PI; while (pa !== null && a - pa < -Math.PI) a += 2 * Math.PI;
    pa = a;
    return new THREE.Vector3(a * 60, y, Math.hypot(x, z));   // angle scaled so the spline treats it like distance
  });
  const posC = new THREE.CatmullRomCurve3(cyl, false, 'catmullrom', .5);
  const cv = new THREE.Vector3();
  const tgtC = new THREE.CatmullRomCurve3(K.map(k => new THREE.Vector3(...k[1])), false, 'centripetal');
  const last = K.length - 1;

  // build state for every point of the ride
  function buildAt(f) {
    const s = { piles: 1, raft: 1, s: 15, glass: 9, lights: 0, crane: 1, night: 0 };
    if (f < 1) {               // hero -> ground: time runs back to day one
      // the rewind happens while the camera is still back far enough to see the whole site
      const r = ss((f - .1) / .5);
      s.s = lerp(15, -.4, r); s.glass = lerp(9, 0, ss(r * 1.6));
      s.crane = 1 - ss((f - .3) / .25);
      s.raft = 1 - ss((f - .62) / .2); s.piles = 1 - ss((f - .74) / .2);
      if (f > .94) s.piles = ss((f - .94) / .3);
    } else {
      s.piles = ss((f - .94) / .3);
      s.raft = ss((f - 1.18) / .22);
      s.s = lerp(-.4, N + 1, ss((f - 1.3) / 1.45));
      s.glass = lerp(0, N, ss((f - 2.05) / 1.25));
      s.lights = lerp(0, N + 1, ss((f - 3.45) / .75));
      s.crane = Math.min(ss((f - 1.15) / .3), 1 - ss((f - 3.4) / .4));
      s.night = ss((f - 3.2) / .8);
    }
    return s;
  }

  let F = 0, Fs = 0, running = true, needs = true, mx = 0, my = 0, smx = 0, smy = 0, introP = reduce ? 1 : 0;
  const v = new THREE.Vector3(), tg = new THREE.Vector3();
  const sunDay = new THREE.Color(0xfff0e0), sunLow = new THREE.Color(0xffdcc0);
  let lastBuild = '';

  function setUp(f) {
    // ease into each stop and hold there a little: the camera rests while you read
    const i = Math.min(last - 1, Math.floor(f)), fr = f - i;
    const e = ss(clamp((fr - .06) / .88));
    const u = (i + e) / last;
    posC.getPoint(u, cv); tgtC.getPoint(u, tg);
    // from the frame up to the glass the camera swings wide round the corner, never in among the columns
    const wide = i === 2 ? 1 + .32 * Math.sin(Math.PI * e) : 1;
    v.set(Math.cos(cv.x / 60) * cv.z * wide, cv.y, Math.sin(cv.x / 60) * cv.z * wide);
    // during the structure stop the camera follows the top of the frame up
    const st = buildAt(f);
    if (f > 1.2 && f < 2.9) {
      const topY = Math.max(0, st.s) * FH;
      const k = ss((f - 1.2) / .4) * (1 - ss((f - 2.5) / .4));
      tg.y = lerp(tg.y, topY - 4, k * .7);
    }
    // a slow drift and the mouse turn the view a little, like walking the site
    const tm = performance.now() / 1000;
    const orbit = Math.sin(tm * .06) * .05 + smx * .07;
    const dx = v.x - tg.x, dz = v.z - tg.z;
    const c = Math.cos(orbit), s = Math.sin(orbit);
    v.x = tg.x + dx * c - dz * s; v.z = tg.z + dx * s + dz * c;
    v.y += -smy * 3;
    // intro: start a little further out and settle in
    const ip = 1 - Math.pow(1 - introP, 3);
    v.lerp(tg, -(1 - ip) * .25);
    camera.position.copy(v); camera.lookAt(tg);
    // push the tower away from the text: right of centre on desktop, above the card on phones
    // between stops, while no text is up, the tower slides back towards the middle of the screen
    const txt = f < .3 ? 1 : 1 - ss((Math.abs(f - Math.round(f)) - .18) / .16) * (f > 4.5 ? 0 : 1);
    const push = .35 + .65 * txt;
    if (isPhone) camera.setViewOffset(vw, vh, 0, vh * lerp(.26, .13, ss(f)) * push, vw, vh);
    else camera.setViewOffset(vw, vh, -vw * lerp(.2, .13, ss(f)) * push, 0, vw, vh);
    camera.updateProjectionMatrix();

    const key = [st.piles, st.raft, st.s, st.glass, st.lights, st.crane].map(x => x.toFixed(3)).join();
    if (key !== lastBuild) { Object.assign(T.state, st); T.apply(); lastBuild = key; }
    T.state.slew = -.5 + f * .35;

    // light: dusk sun sinks, night falls at handover
    const n = st.night;
    sun.position.set(-70 + f * 6, lerp(70, 26, ss(f / 3.4)), 60);
    sun.intensity = lerp(2.6, .05, n);
    sun.color.copy(sunDay).lerp(sunLow, ss(f / 3.2));
    hemi.intensity = lerp(.7, .08, n);
    scene.environmentIntensity = lerp(1, .16, n);
    street.intensity = lerp(0, 1200, n);
    renderer.toneMappingExposure = lerp(1, 1.15, n);
    scene.background.copy(BG); scene.fog.color.copy(BG);
  }

  let vw = 1, vh = 1;
  function resize() {
    const w = innerWidth, h = Math.max(innerHeight, document.documentElement.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // push the tower away from the text: right of centre on desktop, above the card on phones
    vw = w; vh = h;
    camera.updateProjectionMatrix(); needs = true;
  }
  addEventListener('resize', resize); resize();
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  let prev = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - prev) / 1000); prev = now;
    if (!running) return;
    Fs += (F - Fs) * (1 - Math.exp(-dt * (reduce ? 60 : 3.2)));
    if (Math.abs(F - Fs) < 1e-4) Fs = F;
    smx += (mx - smx) * (1 - Math.exp(-dt * 2)); smy += (my - smy) * (1 - Math.exp(-dt * 2));
    setUp(Fs);
    T.tick(now / 1000);
    renderer.render(scene, camera);
    api.onFrame?.(Fs);
  }
  requestAnimationFrame(frame);

  const api = {
    setF(f) { F = clamp(f, 0, 5); },
    jump(f) { F = Fs = clamp(f, 0, 5); },
    run(on) { running = on; canvas.style.visibility = on ? 'visible' : 'hidden'; },
    intro(now) { if (now || reduce) { introP = 1; return; } const t0 = performance.now(); const step = () => { introP = clamp((performance.now() - t0) / 2600); if (introP < 1) requestAnimationFrame(step); }; step(); },
    get f() { return Fs; },
    buildAt, tower: T,
  };
  return api;
}

// the little tower in the contact form: same parts, built to the number of levels picked
export async function initMini(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
  const tex = await loadTextures();
  const T = buildTower(tex, { lite: true });
  T.crane.visible = false;
  T.root.remove(T.crane);
  scene.add(T.root);
  scene.add(new THREE.HemisphereLight(0xcfd8e2, 0x2a2622, 1.1));
  const sun = new THREE.DirectionalLight(0xffe0c0, 2.6); sun.position.set(-40, 60, 50); scene.add(sun);
  const hdr = await new Promise(r => new RGBELoader().load('assets/tex/venice_sunset_1k.hdr', r, undefined, () => r(null)));
  if (hdr) { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(hdr).texture; hdr.dispose(); pm.dispose(); }
  let target = 6, cur = 0, type = 'Residential', visible = false, ang = .7;
  const size = () => { const r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  new ResizeObserver(size).observe(canvas); size();
  new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting)).observe(canvas);
  let prev = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - prev) / 1000); prev = now;
    if (!visible) return;
    cur += (target - cur) * (1 - Math.exp(-dt * 3));
    ang += dt * .18;
    const lv = Math.min(N, cur);
    Object.assign(T.state, { piles: 1, raft: 1, s: lv + .999, glass: type === 'Home' ? 0 : lv, lights: 0, crane: 0 });
    T.apply();
    const h = lv * FH, R = 46 + h * .9;
    camera.position.set(Math.cos(ang) * R, h * .55 + 22, Math.sin(ang) * R);
    camera.lookAt(0, h * .42, 0);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  return { set(levels, t) { target = Math.max(1, Math.min(N, levels)); if (t) type = t; } };
}
