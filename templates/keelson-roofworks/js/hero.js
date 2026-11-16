// The hero scene: renderer, sky, light and camera around the house. Scroll sets the target
// progress; the scene eases toward it. Storm grey at the start, a clear Gulf evening at the end.
import * as THREE from 'three';
import { buildHouse } from './house.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

// camera keys on the 0..1 ride: [p, azimuth deg (0 = front), elevation deg, distance, target y]
const KEYS = [
  [0, 38, 8, 35, 4.2],
  [.17, 30, 24, 31, 3.6],
  [.31, 20, 27, 29.5, 3.8],
  [.45, 8, 25, 28.5, 4.0],
  [.60, -6, 19, 27, 4.0],
  [.74, -20, 9, 23.5, 3.8],
  [.88, -30, 6.5, 33, 4.4],
  [1, -34, 6, 34, 4.5],
];
function camAt(p) {
  let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1], t = ss((p - a[0]) / (b[0] - a[0]));
  return [1, 2, 3, 4].map(k => lerp(a[k], b[k], t));
}

const SKY = {
  storm: { top: 0x39424c, hor: 0x77808a, bot: 0x2c3138, cloud: 0x2b3138, lit: 0x6d7782, sun: 0x000000, fog: 0x77808a },
  clear: { top: 0x1f3352, hor: 0xf0b48a, bot: 0x3a3330, cloud: 0x6a6f8a, lit: 0xf6a982, sun: 0xffb27a, fog: 0xf0b48a },
};

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(window.WebGL2RenderingContext && c.getContext('webgl2')); } catch { return false; }
}

export function initHero(canvas, { still = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const phoneish = () => innerWidth < 760;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x6f7882, 48, 175);
  const camera = new THREE.PerspectiveCamera(34, 1, .3, 1200);

  /* ---------- sky dome with drifting cloud deck ---------- */
  const C = k => new THREE.Color(k);
  const skyU = {
    uTop: { value: C(SKY.storm.top) }, uHor: { value: C(SKY.storm.hor) }, uBot: { value: C(SKY.storm.bot) },
    uCloud: { value: C(SKY.storm.cloud) }, uLit: { value: C(SKY.storm.lit) }, uSunCol: { value: C(0) },
    uSunDir: { value: new THREE.Vector3(.55, .07, -.83).normalize() }, uCover: { value: .85 }, uT: { value: 0 },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 40, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 uTop, uHor, uBot, uCloud, uLit, uSunCol, uSunDir; uniform float uCover, uT; varying vec3 vD;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * n2(p); p = p * 2.03 + 3.1; a *= .5; } return v; }
      void main(){
        vec3 d = normalize(vD); float h = d.y;
        vec3 col = mix(uHor, uTop, smoothstep(-.02, .5, h));
        col = mix(col, uBot, smoothstep(0., -.2, h));
        float s = max(dot(d, normalize(uSunDir)), 0.);
        col += uSunCol * (pow(s, 4.) * .35 + pow(s, 60.) * .9);
        if (h > -.01) {
          vec2 uv = d.xz / (h + .16) * 1.6 + vec2(uT * .012, uT * .004);
          float c = fbm(uv) * .75 + fbm(uv * 2.7 + 9.) * .25;
          float cov = smoothstep(1. - uCover, 1.12 - uCover * .7, c) * smoothstep(-.01, .12, h);
          vec3 cc = mix(uCloud, uLit, clamp(c * 1.2 - .25 + pow(s, 3.) * .6, 0., 1.));
          col = mix(col, cc, cov * .92);
        }
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);

  // soft studio-ish environment so metal, glass and membrane pick up some reflection
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(vec3(.25,.24,.23), vec3(1.05,1.0,.96), smoothstep(-.2, .6, h)), 1.); }' })));
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(envScene, .04).texture; pm.dispose();

  /* ---------- light ---------- */
  const hemi = new THREE.HemisphereLight(0x9aa4ae, 0x3d4238, 1.2);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  const sm = phoneish() ? 1024 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 14, bottom: -14, near: 1, far: 90 });
  sun.shadow.bias = -.0003; sun.shadow.normalBias = .03; sun.shadow.radius = 4;
  scene.add(hemi, sun, sun.target);

  const H = buildHouse(renderer, { lite: phoneish() });
  scene.add(H.root);

  /* ---------- size ---------- */
  let vw = 1, vh = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    vw = Math.max(1, r.width); vh = Math.max(1, r.height);
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
    dirty = true;
  }

  /* ---------- per-frame setup ---------- */
  const cs = new THREE.Color(), cc = new THREE.Color();
  const sunStorm = new THREE.Vector3(-.25, 1, .35).normalize(), sunEve = new THREE.Vector3(-.8, .3, .56).normalize(), sd = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  let mx = 0, my = 0, smx = 0, smy = 0;
  function setup(p) {
    const clear = ss((p - .46) / .44);
    const S = SKY.storm, E = SKY.clear;
    const mixC = (u, a, b) => u.value.copy(cs.set(a)).lerp(cc.set(b), clear);
    mixC(skyU.uTop, S.top, E.top); mixC(skyU.uHor, S.hor, E.hor); mixC(skyU.uBot, S.bot, E.bot);
    mixC(skyU.uCloud, S.cloud, E.cloud); mixC(skyU.uLit, S.lit, E.lit); mixC(skyU.uSunCol, S.sun, E.sun);
    skyU.uCover.value = lerp(.9, .5, clear);
    scene.fog.color.copy(cs.set(S.fog)).lerp(cc.set(E.fog), clear);
    scene.fog.near = lerp(34, 40, clear); scene.fog.far = lerp(140, 175, clear);

    sd.copy(sunStorm).lerp(sunEve, clear).normalize();
    sun.position.copy(sd).multiplyScalar(45); sun.target.position.set(0, 0, 0);
    sun.color.copy(cs.set(0xc7d0da)).lerp(cc.set(0xffc596), clear);
    sun.intensity = lerp(.55, 3.6, clear);
    hemi.color.copy(cs.set(0x9aa4ae)).lerp(cc.set(0xa9b9d6), clear);
    hemi.groundColor.copy(cs.set(0x3a3f37)).lerp(cc.set(0x5b4636), clear);
    hemi.intensity = lerp(1.35, .62, clear);
    scene.environmentIntensity = lerp(.55, .5, clear);
    renderer.toneMappingExposure = lerp(.95, 1.08, clear);

    // camera: orbit keys + a little pointer parallax
    const [az0, el0, dist0, ty] = camAt(p);
    const phone = vw / vh < .8;
    const az = (az0 + smx * 2.2) * Math.PI / 180, el = (el0 - smy * 1.6) * Math.PI / 180;
    const dist = dist0 * (phone ? 2.1 : vw / vh < 1.25 ? 1.25 : 1);
    tgt.set(0, ty, 0);
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, ty + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(tgt);
    // keep the house clear of the copy: right of centre on wide screens, up top on phones
    if (phone) camera.setViewOffset(vw, vh, 0, vh * lerp(.33, .25, ss(p)), vw, vh);
    else camera.setViewOffset(vw, vh, -vw * .19, vh * .02, vw, vh);
    camera.updateProjectionMatrix();
  }

  /* ---------- loop: render when something changes; rain and palms tick at an ambient rate ---------- */
  renderer.shadowMap.autoUpdate = false;
  let P = 0, Ps = -1, visible = true, dirty = true, prev = performance.now(), t0 = performance.now(), lastDraw = 0, slow = 0;
  function draw(now, p) {
    const t = (now - t0) / 1000;
    skyU.uT.value = t;
    setup(p); H.apply(p, t);
    renderer.render(scene, camera);
    lastDraw = now;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const gap = now - prev, dt = Math.min(.25, gap / 1000); prev = now;
    slow = slow * .9 + (gap > 90 ? 1 : 0) * .1;          // a struggling GPU (or software GL): back off
    if (!visible || document.hidden) return;
    const moving = Math.abs(P - Ps) > 1e-4;
    if (moving) { Ps = Ps < 0 || slow > .5 ? P : Ps + (P - Ps) * (1 - Math.exp(-dt * 4.5)); if (Math.abs(P - Ps) < 1e-4) Ps = P; renderer.shadowMap.needsUpdate = true; }
    const pm = Math.abs(mx - smx) + Math.abs(my - smy) > 1e-3;
    smx += (mx - smx) * (1 - Math.exp(-dt * 2)); smy += (my - smy) * (1 - Math.exp(-dt * 2));
    const ambient = now - lastDraw > (slow > .5 ? 4000 : Ps < .55 ? 33 : 66);
    if (moving || pm || dirty || ambient) { if (dirty) renderer.shadowMap.needsUpdate = true; dirty = false; draw(now, Ps); }
  }
  function renderStill() { renderer.shadowMap.needsUpdate = true; draw(performance.now(), P); }

  const api = {
    set(p) { P = clamp(p); },
    jump(p) { P = Ps = clamp(p); dirty = true; if (still) renderStill(); },
    visible(v) { visible = v; if (v) dirty = true; },
    pointer(x, y) { mx = x; my = y; },
  };
  new ResizeObserver(() => { resize(); if (still) renderStill(); }).observe(canvas);
  resize();
  if (still) renderStill(); else requestAnimationFrame(frame);
  return api;
}
