// The walk home. One camera strolls up a Beacon Hill lane at dusk. At each listing it turns to the
// house and the windows come on; night falls as you go, the gas lamps warm up, leaves drift down,
// and at the end a front door swings open into warm light.
import * as THREE from 'three';
import { RGBELoader } from '../assets/vendor/RGBELoader.js';
import { buildStreet, loadTextures, FACADE, MAXH } from './street.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
export const STOPS = 6;   // 0 hero, 1-4 homes, 5 the door; f runs 0..6, the last step opens it

export async function initRide(canvas, { reduce, isPhone, onProgress }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isPhone ? 1.6 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(isPhone ? 58 : 42, 1, .1, 700);

  let loaded = 0;
  const tick = () => onProgress?.(++loaded / 2);
  const [tex, hdr] = await Promise.all([
    loadTextures().then(t => { tick(); return t; }),
    new Promise(r => new RGBELoader().load('assets/tex/venice_sunset_1k.hdr', h => { tick(); r(h); }, undefined, () => { tick(); r(null); })),
  ]);
  if (hdr) {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromEquirectangular(hdr).texture;
    hdr.dispose(); pm.dispose();
  }

  const S = buildStreet(tex, { isPhone });
  scene.add(S.root);

  /* ---------- sky: dusk to night, with stars ---------- */
  const skyU = { uNight: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float uNight; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      void main(){
        float y = clamp(vP.y, -.1, 1.);
        vec3 hzD = vec3(1., .58, .38), midD = vec3(.62, .45, .58), topD = vec3(.18, .25, .45);
        vec3 hzN = vec3(.16, .17, .27), midN = vec3(.06, .08, .16), topN = vec3(.015, .02, .05);
        vec3 hz = mix(hzD, hzN, uNight), md = mix(midD, midN, uNight), tp = mix(topD, topN, uNight);
        vec3 c = mix(hz, md, smoothstep(0., .18, y));
        c = mix(c, tp, smoothstep(.15, .7, y));
        // the last of the sun, low over the hill
        float sun = pow(max(dot(vP, normalize(vec3(.15, .06, -1.))), 0.), 24.);
        c += vec3(1., .55, .25) * sun * (1. - uNight) * .9;
        vec3 q = floor(vP * 260.);
        float st = step(.9965, h(q)) * smoothstep(.12, .5, y) * uNight;
        c += st * (.6 + .4 * sin(h(q + 1.) * 40.));
        gl_FragColor = vec4(c, 1.);
      }`,
  }));
  scene.add(sky);
  scene.fog = new THREE.Fog(0xc98a72, 30, 210);
  const fogD = new THREE.Color(0xd9957a), fogN = new THREE.Color(0x151826);

  /* ---------- light ---------- */
  const sun = new THREE.DirectionalLight(0xffb98a, 1.6);
  sun.position.set(20, 22, -120); sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0x9fb2d6, 0x3b2a22, .55);
  scene.add(hemi);
  // real light only from the lamps that matter; the rest glow
  const big = S.lampSpots.filter(l => !l.small);
  const near = S.lampSpots.filter(l => l.small && S.feat.some(f => Math.abs(l.pos.z - f.zc) < 6 && Math.sign(l.pos.x) === f.side));
  const lights = [...big.slice(0, isPhone ? 6 : 10), ...near].map(l => {
    const p = new THREE.PointLight(0xffa955, 0, l.small ? 7 : 16, 1.6);
    p.position.copy(l.pos); p.userData.small = l.small; scene.add(p); return p;
  });
  const doorLight = new THREE.PointLight(0xffc27a, 0, 12, 1.4);
  const E = S.feat[4];
  const doorWorld = new THREE.Vector3(E.doorX, 2.2, 1.2).applyMatrix4(E.base);
  doorLight.position.copy(doorWorld); scene.add(doorLight);

  // glow halos on every lamp
  const haloTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(.18, 'rgba(255,180,100,.55)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const haloMat = new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  S.lampSpots.forEach(l => { const s = new THREE.Sprite(haloMat); s.position.copy(l.pos); s.scale.setScalar(l.small ? 1.3 : 2.8); scene.add(s); });

  /* ---------- falling leaves around the camera ---------- */
  const nLeaf = reduce ? 0 : isPhone ? 50 : 110;
  const leaf = new THREE.InstancedMesh(new THREE.PlaneGeometry(.075, .05), new THREE.MeshStandardMaterial({ roughness: .8, side: THREE.DoubleSide }), Math.max(1, nLeaf));
  leaf.frustumCulled = false;
  const LS = [];
  const C = new THREE.Color();
  for (let i = 0; i < nLeaf; i++) {
    LS.push({ x: (Math.random() - .5) * 12, y: Math.random() * 9, z: -6 - Math.random() * 30, s: .4 + Math.random() * .6, r: Math.random() * 6, w: .6 + Math.random() * 1.4, p: Math.random() * 6 });
    leaf.setColorAt(i, C.set(S.LEAF[i % S.LEAF.length]).multiplyScalar(.55));
  }
  if (nLeaf) scene.add(leaf);
  const LM = new THREE.Matrix4(), LQ = new THREE.Quaternion(), LE = new THREE.Euler(), LP = new THREE.Vector3(), LSc = new THREE.Vector3();

  /* ---------- the route ---------- */
  // each stop: where the camera stands and what it looks at, built from the house it visits
  const face = (h, back, side = 0, up = 5.4, eyeH = 1.75) => {
    const zf = h.zc, x = h.side * FACADE;
    return [new THREE.Vector3(-h.side * back + side, eyeH, zf + 10.5), new THREE.Vector3(x, up, zf + .2)];
  };
  const F = S.feat;
  const keys = [
    [new THREE.Vector3(-.9, 1.7, 26), new THREE.Vector3(.4, 6.5, -120)],
    face(F[0], 4.3), face(F[1], 4.3), face(F[2], 4.3), face(F[3], 4.3),
    [new THREE.Vector3(E.side * 1.2, 1.9, new THREE.Vector3(E.doorX, 0, 0).applyMatrix4(E.base).z), new THREE.Vector3(E.side * FACADE, 2.3, new THREE.Vector3(E.doorX, 0, 0).applyMatrix4(E.base).z)],
  ];
  if (isPhone) keys.slice(1, 5).forEach(k => { k[0].z += 3.2; k[0].x -= Math.sign(k[1].x) * .6; });
  // walk the lane between stops instead of cutting across it
  const posC = new THREE.CatmullRomCurve3(keys.map(k => k[0]), false, 'centripetal');
  const tgtC = new THREE.CatmullRomCurve3(keys.map(k => k[1]), false, 'centripetal');
  const last = keys.length - 1;
  const doorZ = keys[5][1].z;

  let Fv = 0, Fs = 0, running = true, mx = 0, my = 0, smx = 0, smy = 0, introP = reduce ? 1 : 0;
  const cv = new THREE.Vector3(), tg = new THREE.Vector3(), ahead = new THREE.Vector3();
  let vw = 1, vh = 1;
  const houseL = S.mats.win.userData.lights;

  function setUp(f, t) {
    const fw = Math.min(f, last);
    const i = Math.min(last - 1, Math.floor(fw)), fr = fw - i;
    const e = ss(clamp((fr - .1) / .8));
    const u = (i + e) / last;
    posC.getPoint(u, cv); tgtC.getPoint(u, tg);
    // a gentle step in the walk, only while moving; between houses you look up the lane
    const moving = Math.sin(Math.PI * e) * (fr > .1 && fr < .9 ? 1 : 0);
    const look = i === 0 ? 0 : moving;
    ahead.set(cv.x * .3, 3.2, cv.z - 45);
    tg.lerp(ahead, look * .85);
    cv.y += Math.sin(t * 7.5) * .025 * moving;
    // the last step: through the door
    const open = ss((f - 5.05) / .55), into = ss((f - 5.3) / .7);
    cv.x = lerp(cv.x, E.side * (FACADE - .2), into * .92);
    cv.y = lerp(cv.y, 2.0, into);
    cv.z = lerp(cv.z, doorZ, into);
    // the mouse turns your head a little
    tg.x += smx * 1.6; tg.y -= smy * 1;
    const ip = 1 - Math.pow(1 - introP, 3);
    cv.y += (1 - ip) * 2.5; cv.z += (1 - ip) * 9;
    camera.position.copy(cv); camera.lookAt(tg);

    // keep the house clear of the card: card left on right-side houses, right on left ones
    const stop = Math.round(fw), near = 1 - ss((Math.abs(fw - stop) - .15) / .3);
    const side = stop >= 1 && stop <= 4 ? F[stop - 1].side : 0;
    if (isPhone) camera.setViewOffset(vw, vh, 0, vh * .16 * near * (side ? 1 : 0), vw, vh);
    else camera.setViewOffset(vw, vh, -vw * .17 * side * near, 0, vw, vh);
    camera.updateProjectionMatrix();

    // night falls over the walk
    const n = ss(f / 4.6);
    skyU.uNight.value = n;
    scene.fog.color.copy(fogD).lerp(fogN, n);
    sun.intensity = lerp(1.6, 0, ss(f / 3));
    hemi.intensity = lerp(.55, .07, n);
    scene.environmentIntensity = lerp(.75, .08, n);
    const lamp = ss((f - .2) / 1.4);
    S.mats.lamp.emissiveIntensity = lerp(.4, 5, lamp);
    haloMat.opacity = lerp(.15, .95, lamp);
    lights.forEach(l => { l.intensity = (l.userData.small ? 5 : 22) * lamp * (.94 + .06 * Math.sin(t * 9 + l.position.z)); });
    renderer.toneMappingExposure = lerp(1.05, 1.15, n);

    // windows: the street comes on with the dark; each home lights up as you reach it
    for (let h = 0; h < MAXH; h++) houseL[h] = lerp(.08, .8, ss((f - .4) / 3.6));
    houseL[MAXH - 1] = .3 + n * .5;
    F.forEach((h, k) => { houseL[h.idx] = Math.max(houseL[h.idx] * .4, ss((f - (k + 1) + .45) / .35)); });
    // the door
    E.door.hinge.rotation.y = open * 1.75;
    doorLight.intensity = open * 14;
  }

  function resize() {
    const w = innerWidth, h = Math.max(innerHeight, document.documentElement.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; vw = w; vh = h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  let prev = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - prev) / 1000); prev = now;
    if (!running) return;
    Fs += (Fv - Fs) * (1 - Math.exp(-dt * (reduce ? 60 : 3.4)));
    if (Math.abs(Fv - Fs) < 1e-4) Fs = Fv;
    smx += (mx - smx) * (1 - Math.exp(-dt * 2)); smy += (my - smy) * (1 - Math.exp(-dt * 2));
    const t = now / 1000;
    setUp(Fs, t);
    for (let i = 0; i < nLeaf; i++) {
      const L = LS[i];
      L.y -= dt * L.s; L.r += dt * L.w;
      const wx = Math.sin(t * .8 + L.p) * .6;
      if (L.y < 0) { L.y = 7 + Math.random() * 3; L.x = (Math.random() - .5) * 12; L.z = -6 - Math.random() * 30; }
      LP.set(camera.position.x + L.x + wx, L.y, camera.position.z + L.z - 2);
      LE.set(L.r, L.r * .7, L.r * .3); LQ.setFromEuler(LE); LSc.setScalar(1);
      LM.compose(LP, LQ, LSc); leaf.setMatrixAt(i, LM);
    }
    if (nLeaf) leaf.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
    api.onFrame?.(Fs);
  }
  requestAnimationFrame(frame);

  const api = {
    setF(f) { Fv = clamp(f, 0, STOPS); },
    jump(f) { Fv = Fs = clamp(f, 0, STOPS); },
    run(on) { running = on; canvas.style.visibility = on ? 'visible' : 'hidden'; },
    intro() { if (reduce) { introP = 1; return; } const t0 = performance.now(); const step = () => { introP = clamp((performance.now() - t0) / 2800); if (introP < 1) requestAnimationFrame(step); }; step(); },
    get f() { return Fs; },
  };
  return api;
}
