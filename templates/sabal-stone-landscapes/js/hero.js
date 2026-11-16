// Sabal & Stone: the hero yard. One lawn of GPU-swayed grass blades (a single instanced draw call),
// sabal palms, beds, a travertine patio and garden lights. Scroll drives four passes over the yard:
// the mower stripes it, the beds grow in, the patio is set, and the lights come on at dusk.
import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutBack = t => { const c = 1.5; return t <= 0 ? 0 : 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// seeded random so the yard is the same on every visit
let seed = 20261116;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rr = (a, b) => a + (b - a) * rnd();

let SOFT = false;
export function webglOK() {
  try {
    const c = document.createElement('canvas'); const g = c.getContext('webgl2');
    if (!g) return false;
    try { const ext = g.getExtension('WEBGL_debug_renderer_info'); SOFT = /swiftshader|llvmpipe|software/i.test(ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''); } catch (e) { /* ignore */ }
    g.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch (e) { return false; }
}

/* ---------------- yard layout (meters, y up, camera looks toward -z) ---------------- */
const BEDS = [
  { x: 7.2, z: -4.4, rx: 5.4, rz: 3.3, rot: 0.25 },     // palm bed, right
  { x: -8.6, z: -14.2, rx: 7.2, rz: 1.9, rot: 0.0 },    // along the back wall
  { x: 1.6, z: -12.6, rx: 2.6, rz: 1.5, rot: -0.2 },    // small island
];
const PATIO = { x0: -11.4, x1: -3.8, z0: -11.6, z1: -5.6 };
const PALMS = [
  { x: 6.0, z: -5.2, h: 6.9, lean: [0.25, -0.1] },
  { x: 8.9, z: -3.3, h: 5.1, lean: [0.35, 0.15] },
  { x: 9.8, z: -6.6, h: 8.2, lean: [-0.1, -0.2] },
  { x: -12.6, z: -14.4, h: 7.6, lean: [0.2, 0.1] },
];
const PATH_PTS = [[1.4, 13], [2.4, 7.5], [0.6, 2.2], [-2.0, -2.6], [-3.6, -6.4]];

function inBed(x, z, pad = 0) {
  for (const b of BEDS) {
    const c = Math.cos(-b.rot), s = Math.sin(-b.rot);
    const dx = x - b.x, dz = z - b.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    if ((lx * lx) / ((b.rx + pad) ** 2) + (lz * lz) / ((b.rz + pad) ** 2) < 1) return true;
  }
  return false;
}
const inPatio = (x, z, pad = 0) => x > PATIO.x0 - pad && x < PATIO.x1 + pad && z > PATIO.z0 - pad && z < PATIO.z1 + pad;

/* ---------------- shared GLSL: lamps, palm shadows, fog, mower bands ---------------- */
const LAMPS = 10, NPALM = PALMS.length;
const SHARED = /* glsl */`
uniform vec3 uLamp[${LAMPS}];
uniform float uLampAmt;
uniform vec3 uLampCol;
uniform vec4 uPalm[${NPALM}];
uniform vec2 uShDir;
uniform float uShLen, uShAmt;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uCut, uBands, uX0, uX1, uZ0, uZ1;
vec3 lamps(vec3 p){
  vec3 s = vec3(0.);
  if(uLampAmt < .001) return s;
  for(int i=0;i<${LAMPS};i++){ vec3 d = p - uLamp[i]; float dd = dot(d,d); s += 1.0/(1.0 + dd*1.6); }
  return s * uLampCol * uLampAmt;
}
float palmShadow(vec2 p){
  float sh = 0.;
  for(int i=0;i<${NPALM};i++){
    vec2 b = uPalm[i].xy; float H = uPalm[i].z; float R = uPalm[i].w;
    vec2 e = b + uShDir * H * uShLen;
    vec2 pa = p - b, ba = e - b;
    float h = clamp(dot(pa,ba)/dot(ba,ba), 0., 1.);
    float trunk = 1. - smoothstep(.06, .3, length(pa - ba*h));
    vec2 q = p - e; vec2 ax = uShDir; vec2 pe = vec2(-ax.y, ax.x);
    vec2 l = vec2(dot(q,ax)*.55, dot(q,pe));
    float crown = 1. - smoothstep(R*.35, R*1.15, length(l));
    sh = max(sh, max(trunk*.75, crown*(.8 + .2*sin(atan(l.y,l.x)*9.))));
  }
  return 1. - sh * uShAmt;
}
vec3 fogIt(vec3 col, vec3 wp){
  float d = length(wp - cameraPosition);
  float f = 1. - exp(-pow(uFogDensity*d, 2.));
  return mix(col, uFogColor, clamp(f,0.,1.));
}
// the mower: lane by lane, up one lane and back down the next
vec2 mowAt(vec2 p){
  float bw = (uX1-uX0)/uBands;
  float bi = clamp(floor((p.x-uX0)/bw), 0., uBands-1.);
  float along = clamp((p.y-uZ0)/(uZ1-uZ0), 0., 1.);
  if(mod(bi,2.) > .5) along = 1. - along;
  float k = uCut * (uBands + 1.);
  float cut = smoothstep(0., .06, k - bi - along);
  return vec2(cut, mod(bi,2.));
}
`;

const GRASS_VS = /* glsl */`
attribute vec4 aOff;     // x, z, rand, rand
attribute vec4 aPar;     // height, rotation, lean, width
uniform float uTime, uWind;
uniform vec3 uPointer;
uniform float uPointerAmt;
varying float vT;
varying vec3 vWorld;
varying vec2 vMow;
varying float vRand;
${SHARED}
void main(){
  vec3 base = vec3(aOff.x, 0., aOff.y);
  vMow = mowAt(base.xz);
  float cut = vMow.x;
  float t = position.y;
  float h = aPar.x * mix(1., .4 + .1*aOff.z, cut);
  float r = aPar.y;
  vec2 side = vec2(cos(r), sin(r));
  vec2 leanDir = vec2(-side.y, side.x);
  vec2 lane = vec2(0., vMow.y > .5 ? 1. : -1.);
  vec2 lean = mix(leanDir * aPar.z, lane * .42, cut);
  float g = sin(uTime*.7 + base.x*.09 + base.z*.05)*.5 + .5;
  float w = (sin(uTime*2.0 + base.x*.55 + base.z*.32 + aOff.w*6.283)*.45 + g*.9) * uWind * mix(1., .35, cut);
  vec2 off = (lean + normalize(vec2(-.85,.5)) * w) * h * t * t;
  vec2 d = base.xz - uPointer.xz;
  float pr = (1. - smoothstep(0., 2.3, length(d))) * uPointerAmt;
  off += normalize(d + 1e-4) * pr * h * t * t * 1.6;
  vec3 p = base + vec3(side.x*position.x*aPar.w, t*h, side.y*position.x*aPar.w);
  p.xz += off;
  p.y *= 1. - min(.45, length(off)/max(h, .01)*.35);
  vT = t; vRand = aOff.z; vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
}`;

const GRASS_FS = /* glsl */`
uniform vec3 uBase, uTip, uDry, uSunDir, uSunCol, uHemiSky, uHemiGround;
uniform float uSunI, uHemiI;
varying float vT;
varying vec3 vWorld;
varying vec2 vMow;
varying float vRand;
${SHARED}
void main(){
  vec3 col = mix(uBase, uTip, pow(vT, 1.2));
  col = mix(col, uDry, (1.-vMow.x) * smoothstep(.55, 1., vRand) * vT * .55);
  col *= .82 + .36*fract(vRand*7.13);
  float lane = vMow.y > .5 ? 1.32 : .74;
  col *= mix(1., lane, vMow.x);
  float sh = palmShadow(vWorld.xz);
  vec3 amb = mix(uHemiGround, uHemiSky, .35 + .65*vT) * uHemiI;
  vec3 V = normalize(vWorld - cameraPosition);
  float back = pow(max(dot(V, uSunDir), 0.), 5.) * vT * vT;
  vec3 lit = col * (amb + uSunCol * uSunI * (.45 + .55*vT) * sh) + uSunCol * uTip * back * uSunI * 1.4 * sh;
  lit += col * lamps(vWorld) * (1.6 + vT);
  lit = fogIt(lit, vWorld);
  gl_FragColor = vec4(lit, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const GROUND_VS = /* glsl */`
varying vec3 vWorld;
void main(){ vec4 w = modelMatrix * vec4(position,1.); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const GROUND_FS = /* glsl */`
uniform vec3 uBase, uTip, uSunCol, uHemiSky, uHemiGround;
uniform float uSunI, uHemiI;
varying vec3 vWorld;
${SHARED}
float hsh(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hsh(i), hsh(i+vec2(1,0)), f.x), mix(hsh(i+vec2(0,1)), hsh(i+vec2(1,1)), f.x), f.y); }
void main(){
  vec2 p = vWorld.xz;
  float n = vnoise(p*.35)*.6 + vnoise(p*1.7)*.4;
  vec3 col = mix(uBase*1.15, mix(uBase, uTip, .45), n);
  vec2 mw = mowAt(p);
  col *= mix(1., mw.y > .5 ? 1.3 : .76, mw.x);
  float sh = palmShadow(p);
  vec3 lit = col * (mix(uHemiGround, uHemiSky, .3) * uHemiI + uSunCol * uSunI * .5 * sh);
  lit += col * lamps(vWorld) * 1.5;
  lit = fogIt(lit, vWorld);
  gl_FragColor = vec4(lit, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const SKY_VS = /* glsl */`
varying vec3 vDir;
void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }`;
const SKY_FS = /* glsl */`
uniform vec3 uTop, uMid, uHorizon, uSunDir, uSunCol;
uniform float uSunI;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uMid, smoothstep(-.02, .16, h));
  col = mix(col, uTop, smoothstep(.12, .7, h));
  float s = max(dot(d, uSunDir), 0.);
  col += uSunCol * (pow(s, 6.) * .45 + pow(s, 60.) * .9 + smoothstep(.9985, .9995, s) * 4.) * uSunI;
  // a few long, soft streaks of cloud low on the horizon
  float band = sin(d.x*7. + d.z*3.) * sin(d.x*13. - d.z*5.);
  col = mix(col, uHorizon*1.12, smoothstep(.5, 1., band) * smoothstep(.22, .05, h) * smoothstep(0., .05, h) * .35);
  gl_FragColor = vec4(col, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/* ---------------- small geometry helpers ---------------- */
function paint(geo, fn) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3);
  const col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(col, p.getX(i), p.getY(i), p.getZ(i)); c.set([col.r, col.g, col.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
function merge(list) {
  list = list.map(g => (g.index ? g.toNonIndexed() : g));
  let n = 0; list.forEach(g => (n += g.attributes.position.count));
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3).fill(1);
  let o = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.color) col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeVertexNormals();
  return out;
}
function jitter(geo, amt) {
  const p = geo.attributes.position, seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(k)) seen.set(k, [rr(-amt, amt), rr(-amt, amt), rr(-amt, amt)]);
    const j = seen.get(k);
    p.setXYZ(i, p.getX(i) + j[0], p.getY(i) + j[1], p.getZ(i) + j[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

// a sabal frond: a pleated, split-tipped fan on a petiole, built along +z
function frondGeo(R, colA, colB) {
  const pos = [], cols = [];
  const n = 18, spread = Math.PI * 1.05, pet = 0.9;
  const ca = new THREE.Color(colA), cb = new THREE.Color(colB);
  const P = (a, r, up) => {
    const droop = -0.32 * r * r / R;
    const arch = -0.22 * Math.abs(Math.sin(a)) * r;
    return [Math.sin(a) * r * 0.9, droop + arch + up, pet + Math.cos(a) * r * 0.55 + r * 0.45];
  };
  for (let i = 0; i < n; i++) {
    const a0 = -spread / 2 + (spread * i) / n, a1 = a0 + spread / n, am = (a0 + a1) / 2;
    const fold = (i % 2 ? 1 : -1) * 0.07;
    const c0 = P(am, 0.12, 0), l = P(a0, R * 0.78, 0), rt = P(a1, R * 0.78, 0), tip = P(am, R, fold * 0.6), mid = P(am, R * 0.6, fold);
    const tri = (a, b, c, t) => { pos.push(...a, ...b, ...c); const cc = ca.clone().lerp(cb, t); for (let k = 0; k < 3; k++) cols.push(cc.r, cc.g, cc.b); };
    const shade = (i % 2) * 0.25 + rnd() * 0.15;
    tri(c0, l, mid, shade); tri(c0, mid, rt, shade + 0.1);
    tri(l, tip, mid, shade + 0.2); tri(mid, tip, rt, shade + 0.3);
  }
  // petiole
  const w = 0.03;
  const st = [[-w, 0, 0], [w, 0, 0], [0, w * 1.5, 0]], en = [[-w, 0, pet], [w, 0, pet], [0, w * 1.5, pet]];
  for (let k = 0; k < 3; k++) {
    const a = st[k], b = st[(k + 1) % 3], c = en[k], d = en[(k + 1) % 3];
    pos.push(...a, ...b, ...c, ...b, ...d, ...c);
    for (let m = 0; m < 6; m++) cols.push(cb.r * 0.8, cb.g * 0.75, cb.b * 0.6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  return g;
}

function barkTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#7d6b55'; x.fillRect(0, 0, 128, 256);
  for (let y = -16; y < 272; y += 16) {
    for (let i = 0; i < 128; i += 16) {
      const o = (y / 16) % 2 ? 8 : 0;
      x.fillStyle = `hsl(32, ${18 + rnd() * 10}%, ${30 + rnd() * 12}%)`;
      x.beginPath(); x.moveTo(i + o, y); x.lineTo(i + o + 8, y + 10); x.lineTo(i + o + 16, y); x.lineTo(i + o + 8, y + 4); x.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 5);
  return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,236,200,1)'); g.addColorStop(.18, 'rgba(255,196,120,.55)'); g.addColorStop(1, 'rgba(255,160,80,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------------- the scene ---------------- */
export function initHero(canvas, { reduce = false, isPhone = false } = {}) {
  if (!webglOK()) throw new Error('webgl2 unavailable');
  const soft = SOFT;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !soft, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(soft ? 1 : Math.min(devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(isPhone ? 52 : 38, 1, 0.1, 400);

  /* -- palettes: late afternoon to dusk -- */
  const DAY = {
    top: '#5a8dbf', mid: '#acc6d2', horizon: '#f7d3a1', sun: '#ffcb8a', fog: '#e9cfa6',
    hemiSky: '#e2ebe6', hemiGround: '#6f7d3c', sunI: 2.9, hemiI: 1.15, fogD: 0.022, exp: 1.12,
  };
  const DUSK = {
    top: '#141c36', mid: '#3a3f63', horizon: '#d07a55', sun: '#ff8a52', fog: '#3b3a55',
    hemiSky: '#5a6790', hemiGround: '#1c2416', sunI: 0.12, hemiI: 0.42, fogD: 0.024, exp: 1.08,
  };
  const C = k => [new THREE.Color(DAY[k]), new THREE.Color(DUSK[k])];
  const PAL = Object.fromEntries(['top', 'mid', 'horizon', 'sun', 'fog', 'hemiSky', 'hemiGround'].map(k => [k, C(k)]));

  const sunDir = new THREE.Vector3(32, 15, -42).normalize();
  const shDir = new THREE.Vector2(-sunDir.x, -sunDir.z).normalize();
  const shLen = Math.hypot(sunDir.x, sunDir.z) / sunDir.y * 0.7;

  const lampPos = [];
  const shared = {
    uLamp: { value: [] }, uLampAmt: { value: 0 }, uLampCol: { value: new THREE.Color('#ffb46b') },
    uPalm: { value: PALMS.map(p => new THREE.Vector4(p.x + p.lean[0] * p.h * 0.12, p.z + p.lean[1] * p.h * 0.12, p.h, 2.2)) },
    uShDir: { value: shDir }, uShLen: { value: shLen }, uShAmt: { value: 0.55 },
    uFogColor: { value: PAL.fog[0].clone() }, uFogDensity: { value: DAY.fogD },
    uCut: { value: 0 }, uBands: { value: 26 }, uX0: { value: -22 }, uX1: { value: 22 }, uZ0: { value: -17 }, uZ1: { value: 17 },
    uSunDir: { value: sunDir }, uSunCol: { value: PAL.sun[0].clone() }, uSunI: { value: DAY.sunI },
    uHemiSky: { value: PAL.hemiSky[0].clone() }, uHemiGround: { value: PAL.hemiGround[0].clone() }, uHemiI: { value: DAY.hemiI },
    uBase: { value: new THREE.Color('#1d3a14') }, uTip: { value: new THREE.Color('#7aa33c') }, uDry: { value: new THREE.Color('#b9a663') },
  };
  scene.fog = new THREE.FogExp2(PAL.fog[0].clone(), DAY.fogD);

  /* -- sky -- */
  const skyU = { uTop: { value: PAL.top[0].clone() }, uMid: { value: PAL.mid[0].clone() }, uHorizon: { value: PAL.horizon[0].clone() }, uSunDir: shared.uSunDir, uSunCol: shared.uSunCol, uSunI: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false }));
  sky.renderOrder = -1;
  scene.add(sky);

  /* -- lights for the standard materials -- */
  const hemi = new THREE.HemisphereLight(PAL.hemiSky[0], PAL.hemiGround[0], DAY.hemiI);
  const sun = new THREE.DirectionalLight(PAL.sun[0], DAY.sunI);
  sun.position.copy(sunDir).multiplyScalar(50);
  scene.add(hemi, sun);

  /* -- ground -- */
  const groundMat = new THREE.ShaderMaterial({ uniforms: shared, vertexShader: GROUND_VS, fragmentShader: GROUND_FS });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  /* -- grass: one instanced draw call -- */
  const COUNT = soft ? 16000 : isPhone ? 26000 : 72000;
  const blade = new THREE.InstancedBufferGeometry();
  {
    const ys = [0, 0.28, 0.55, 0.8], v = [];
    ys.forEach(y => { const w = Math.pow(1 - y, 0.75) * 0.5; v.push(-w, y, 0, w, y, 0); });
    v.push(0, 1, 0);
    const idx = [];
    for (let i = 0; i < ys.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const L = (ys.length - 1) * 2; idx.push(L, L + 1, L + 2);
    blade.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    blade.setIndex(idx);
  }
  const off = new Float32Array(COUNT * 4), par = new Float32Array(COUNT * 4);
  let n = 0, guard = 0;
  while (n < COUNT && guard++ < COUNT * 4) {
    // denser toward the middle of the yard, where the camera spends its time
    const x = rr(-22, 22) * (0.55 + 0.45 * rnd()), z = rr(-16.5, 16);
    if (inBed(x, z, 0.08) || inPatio(x, z, 0.12)) continue;
    off.set([x, z, rnd(), rnd()], n * 4);
    par.set([rr(0.26, 0.5), rr(0, Math.PI), rr(0.05, 0.4), rr(0.06, 0.1)], n * 4);
    n++;
  }
  blade.instanceCount = n;
  blade.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
  blade.setAttribute('aPar', new THREE.InstancedBufferAttribute(par, 4));
  const grassU = Object.assign({}, shared, { uTime: { value: 0 }, uWind: { value: reduce ? 0 : 1 }, uPointer: { value: new THREE.Vector3(999, 0, 999) }, uPointerAmt: { value: 0 } });
  const grass = new THREE.Mesh(blade, new THREE.ShaderMaterial({ uniforms: grassU, vertexShader: GRASS_VS, fragmentShader: GRASS_FS, side: THREE.DoubleSide }));
  grass.frustumCulled = false;
  scene.add(grass);

  /* -- beds: bare sand that fills with mulch -- */
  const mulchMat = new THREE.MeshStandardMaterial({ color: '#c9b48c', roughness: 1, flatShading: true });
  const sandC = new THREE.Color('#c2ab82'), mulchC = new THREE.Color('#4a2f1f');
  for (const b of BEDS) {
    const g = new THREE.CircleGeometry(1, 48);
    const p = g.attributes.position;
    for (let i = 1; i < p.count; i++) { const k = 1 + Math.sin(i * 0.7) * 0.03 + rr(-0.02, 0.02); p.setXY(i, p.getX(i) * k, p.getY(i) * k); }
    const m = new THREE.Mesh(g, mulchMat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = b.rot; m.scale.set(b.rx, b.rz, 1); m.position.set(b.x, 0.03, b.z);
    scene.add(m);
  }

  /* -- natural stone border around the beds -- */
  const rockGeo = jitter(new THREE.DodecahedronGeometry(0.17, 0), 0.04);
  const rockPts = [];
  for (const b of BEDS) {
    const per = Math.PI * (b.rx + b.rz);
    const k = Math.floor(per / 0.3);
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2;
      const lx = Math.cos(a) * (b.rx + 0.05), lz = Math.sin(a) * (b.rz + 0.05);
      const c = Math.cos(b.rot), s = Math.sin(b.rot);
      rockPts.push([b.x + lx * c - lz * s, b.z + lx * s + lz * c, rr(0.8, 1.25), rnd() * 6.28]);
    }
  }
  const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: '#b8ab95', roughness: 0.95, flatShading: true }), rockPts.length);
  const tmpC = new THREE.Color();
  rockPts.forEach((r, i) => { tmpC.setHSL(0.09, 0.12 + rnd() * 0.08, 0.55 + rnd() * 0.15); rocks.setColorAt(i, tmpC); });
  scene.add(rocks);

  /* -- stepping stone path -- */
  const curve = new THREE.CatmullRomCurve3(PATH_PTS.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const stoneGeo = jitter(new THREE.CylinderGeometry(0.42, 0.45, 0.08, 7, 1), 0.05);
  const STONES = 22;
  const stones = new THREE.InstancedMesh(stoneGeo, new THREE.MeshStandardMaterial({ color: '#f2e8d6', roughness: 0.9, flatShading: true }), STONES);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
  for (let i = 0; i < STONES; i++) {
    const p = curve.getPointAt(i / (STONES - 1));
    P.set(p.x + rr(-0.12, 0.12), 0.04, p.z); Q.setFromEuler(E.set(0, rnd() * 6.28, 0)); S.set(rr(0.9, 1.25), 1, rr(0.75, 1));
    stones.setMatrixAt(i, M.compose(P, Q, S));
    tmpC.setHSL(0.1, 0.14, 0.62 + rnd() * 0.12); stones.setColorAt(i, tmpC);
  }
  scene.add(stones);

  /* -- patio: sand base, travertine set in a sweep -- */
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(PATIO.x1 - PATIO.x0 + 0.3, PATIO.z1 - PATIO.z0 + 0.3), new THREE.MeshStandardMaterial({ color: '#cdb995', roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set((PATIO.x0 + PATIO.x1) / 2, 0.015, (PATIO.z0 + PATIO.z1) / 2);
  scene.add(sand);
  const pitch = 0.62, pavers = [];
  for (let x = PATIO.x0 + pitch / 2; x < PATIO.x1; x += pitch) for (let z = PATIO.z0 + pitch / 2; z < PATIO.z1; z += pitch) pavers.push([x, z, rnd()]);
  const paverMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.585, 0.07, 0.585), new THREE.MeshStandardMaterial({ color: '#efe4d0', roughness: 0.75 }), pavers.length);
  pavers.forEach((pv, i) => { tmpC.setHSL(0.1, 0.25 + pv[2] * 0.15, 0.78 + pv[2] * 0.08); paverMesh.setColorAt(i, tmpC); });
  scene.add(paverMesh);
  const pdx = PATIO.x1 - PATIO.x0, pdz = PATIO.z1 - PATIO.z0;
  function setPavers(s) {
    pavers.forEach(([x, z, r], i) => {
      const order = ((x - PATIO.x0) / pdx) * 0.55 + ((PATIO.z1 - z) / pdz) * 0.45;
      const t = clamp((s * 1.35 - order * 0.9 - r * 0.08) / 0.3);
      const e = 1 - Math.pow(1 - t, 3);
      P.set(x, 0.035 + (1 - e) * 0.9, z);
      Q.setFromEuler(E.set((1 - e) * 0.4, (1 - e) * 0.6, 0));
      const sc = t <= 0 ? 0.0001 : 0.4 + 0.6 * e;
      S.set(sc, sc, sc);
      paverMesh.setMatrixAt(i, M.compose(P, Q, S));
    });
    paverMesh.instanceMatrix.needsUpdate = true;
  }

  /* -- garden wall and the tree line beyond -- */
  // a clipped podocarpus hedge along the back
  const hedgeGeo = jitter(new THREE.BoxGeometry(40, 1.7, 1.1, 60, 3, 2), 0.07);
  const hedge = new THREE.Mesh(hedgeGeo, new THREE.MeshStandardMaterial({ color: '#45663a', roughness: 1, flatShading: true }));
  hedge.position.set(-2, 0.85, -16.8);
  scene.add(hedge);



  /* -- sabal palms -- */
  const bark = barkTexture();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: bark, roughness: 0.95 });
  const frondMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide, flatShading: true });
  const fronds = [];
  const frondGeos = [frondGeo(1.25, '#4b6a34', '#7d9547'), frondGeo(1.1, '#56713a', '#8c9a4c'), frondGeo(1.2, '#6c7a3c', '#a59a55')];
  const addPalm = (pl, far = false) => {
    const g = new THREE.Group();
    const top = new THREE.Vector3(pl.lean[0] * pl.h * 0.25, pl.h, pl.lean[1] * pl.h * 0.25);
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(top.x * 0.2, pl.h * 0.4, top.z * 0.2), top]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(c, 12, 0.19, 8), trunkMat);
    g.add(trunk);
    const crown = new THREE.Group(); crown.position.copy(top); g.add(crown);
    const boot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshStandardMaterial({ color: '#6b5a3e', roughness: 1, flatShading: true }));
    boot.scale.set(1, 1.3, 1); crown.add(boot);
    const N = far ? 10 : 15;
    for (let i = 0; i < N; i++) {
      const yaw = i * 2.39996 + rnd() * 0.3;
      const age = i / (N - 1);                  // 0 = young, upright; 1 = old, drooping
      const pivot = new THREE.Group();
      pivot.rotation.y = yaw;
      const arm = new THREE.Group();
      const pitch0 = lerp(-1.05, 0.35, age) + rr(-0.12, 0.12);
      arm.rotation.x = pitch0;
      const f = new THREE.Mesh(frondGeos[age > 0.75 ? 2 : (i % 2)], frondMat);
      const s = lerp(1.05, 0.92, age) * rr(0.92, 1.08);
      f.scale.setScalar(s);
      f.rotation.z = rr(-0.25, 0.25);
      arm.add(f); pivot.add(arm); crown.add(pivot);
      fronds.push({ arm, base: pitch0, ph: rnd() * 6.28, amp: 0.035 + age * 0.05 });
    }
    g.position.set(pl.x, 0, pl.z);
    scene.add(g);
    return g;
  };
  PALMS.forEach(p => addPalm(p));
  // a few more sabals beyond the wall, softened by the fog
  [[-22, -26, 9], [14, -24, 10], [20, -30, 11], [16, -34, 9.5], [27, -22, 8], [-34, -34, 10.5], [-30, -42, 12], [22, -46, 11], [34, -38, 12.5], [-28, -50, 13], [24, -56, 13]].forEach(([x, z, h]) => addPalm({ x, z, h, lean: [rr(-0.2, 0.2), rr(-0.2, 0.2)] }, true));

  /* -- plants that grow in: coontie, muhly grass, firebush, seasonal color -- */
  const growers = [];
  const addGrow = (geo, mat, spots) => {
    const im = new THREE.InstancedMesh(geo, mat, spots.length);
    spots.forEach((s, i) => { if (s.c) { im.setColorAt(i, s.c); } });
    scene.add(im);
    growers.push({ im, spots });
  };
  const bedSpot = (b, u, v) => {
    const lx = u * b.rx * 0.82, lz = v * b.rz * 0.8, c = Math.cos(b.rot), s = Math.sin(b.rot);
    return [b.x + lx * c - lz * s, b.z + lx * s + lz * c];
  };
  const coonGeo = (() => {
    const parts = [];
    for (let i = 0; i < 11; i++) {
      const g = new THREE.ConeGeometry(0.07, 0.75, 4, 1);
      g.translate(0, 0.37, 0); g.rotateZ(rr(0.5, 1.0)); g.rotateY((i / 11) * 6.28 + rr(-0.2, 0.2));
      parts.push(paint(g, (c, x, y) => c.set('#2c4a1e').lerp(new THREE.Color('#4f7a2c'), clamp(y / 0.6))));
    }
    return merge(parts);
  })();
  const muhlyGeo = (() => {
    const parts = [];
    for (let i = 0; i < 46; i++) {
      const h = rr(0.55, 1.0);
      const g = new THREE.ConeGeometry(0.03, h, 3, 1);
      g.translate(0, h / 2, 0); g.rotateZ(rr(0.05, 0.75)); g.rotateY(rnd() * 6.28);
      parts.push(paint(g, (c, x, y) => c.set('#56653a').lerp(new THREE.Color(i % 3 ? '#e09ac0' : '#c77aa6'), smooth(0.12, 0.45, y))));
    }
    return merge(parts);
  })();
  const fireGeo = (() => {
    const bush = jitter(new THREE.IcosahedronGeometry(0.55, 1), 0.08);
    bush.scale(1, 1.15, 1); bush.translate(0, 0.55, 0);
    const parts = [paint(bush, (c, x, y) => c.set('#2e4a20').lerp(new THREE.Color('#47662b'), clamp(y)))];
    for (let i = 0; i < 22; i++) {
      const g = new THREE.IcosahedronGeometry(0.045, 0); g.scale(1, 1.8, 1); const a = rnd() * 6.28, el = rr(-0.1, 1.3);
      g.translate(Math.cos(a) * 0.55 * Math.cos(el * 0.6), 0.55 + Math.sin(el) * 0.6, Math.sin(a) * 0.55 * Math.cos(el * 0.6));
      parts.push(paint(g, c => c.set('#e2552b')));
    }
    return merge(parts);
  })();
  const flowerGeo = (() => {
    const parts = [];
    const leaf = jitter(new THREE.IcosahedronGeometry(0.22, 0), 0.04); leaf.scale(1.2, 0.6, 1.2); leaf.translate(0, 0.12, 0);
    parts.push(paint(leaf, c => c.set('#3d6127')));
    for (let i = 0; i < 9; i++) {
      const g = new THREE.IcosahedronGeometry(0.05, 0); const a = rnd() * 6.28, r = rr(0, 0.2);
      g.translate(Math.cos(a) * r, 0.22 + rr(0, 0.05), Math.sin(a) * r); parts.push(g);
    }
    return merge(parts);
  })();
  const plantMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true });
  const spots = { coon: [], muhly: [], fire: [], flower: [] };
  const B0 = BEDS[0], B1 = BEDS[1], B2 = BEDS[2];
  const place = (list, b, pts, d0) => pts.forEach(([u, v], i) => { const [x, z] = bedSpot(b, u, v); list.push({ x, z, s: rr(0.85, 1.2), r: rnd() * 6.28, d: d0 + i * 0.05 + rnd() * 0.08 }); });
  place(spots.fire, B0, [[-0.1, -0.5], [0.55, -0.35], [0.85, 0.15]], 0.05);
  place(spots.muhly, B0, [[-0.75, 0.35], [-0.45, 0.65], [-0.1, 0.55], [0.3, 0.7], [0.62, 0.55]], 0.15);
  place(spots.coon, B0, [[-0.8, -0.15], [-0.45, 0.05], [0.3, 0.1], [0.1, -0.9]], 0.3);
  place(spots.flower, B0, [[-0.92, 0.5], [-0.65, 0.88], [-0.25, 0.9], [0.15, 0.95], [0.5, 0.9], [0.85, 0.6]], 0.45);
  place(spots.fire, B1, [[-0.9, -0.2], [-0.15, -0.3], [0.55, -0.2], [0.95, -0.1]], 0.1);
  place(spots.muhly, B1, [[-0.6, 0.3], [-0.3, 0.4], [0.1, 0.4], [0.35, 0.35], [0.75, 0.35]], 0.25);
  place(spots.coon, B1, [[-0.75, 0.5], [0.25, -0.1], [0.85, 0.4]], 0.35);
  place(spots.coon, B2, [[-0.5, 0.3], [0.5, 0.1]], 0.2);
  place(spots.muhly, B2, [[0.1, -0.4]], 0.3);
  place(spots.flower, B2, [[-0.6, 0.85], [0, 0.95], [0.6, 0.8]], 0.5);
  const fc = ['#d8467a', '#f4efe6', '#c04a9a', '#f0f0f0'];
  spots.flower.forEach((s, i) => (s.c = new THREE.Color(fc[i % fc.length])));
  addGrow(coonGeo, plantMat, spots.coon);
  addGrow(muhlyGeo, plantMat, spots.muhly);
  addGrow(fireGeo, plantMat, spots.fire);
  const flowerMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, flatShading: true });
  addGrow(flowerGeo, flowerMat, spots.flower);
  function setGrow(s) {
    for (const { im, spots: sp } of growers) {
      sp.forEach((p, i) => {
        const t = clamp((s - p.d) / 0.42);
        const k = Math.max(0.0001, easeOutBack(t)) * p.s;
        P.set(p.x, 0.02, p.z); Q.setFromEuler(E.set(0, p.r + (1 - t) * 0.8, 0)); S.set(k, k, k);
        im.setMatrixAt(i, M.compose(P, Q, S));
      });
      im.instanceMatrix.needsUpdate = true;
    }
    mulchMat.color.copy(sandC).lerp(mulchC, smooth(0, 0.5, s));
  }

  /* -- garden lights: path lights, palm uplights, café string over the patio -- */
  const glowTex = glowTexture();
  const glows = [];
  const addGlow = (x, y, z, size) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sp.position.set(x, y, z); sp.scale.setScalar(size); scene.add(sp); glows.push(sp); return sp;
  };
  const postMat = new THREE.MeshStandardMaterial({ color: '#6b5640', roughness: 0.5, metalness: 0.35 });
  const headMat = new THREE.MeshStandardMaterial({ color: '#8a7458', emissive: new THREE.Color('#ffc27a'), emissiveIntensity: 0, roughness: 0.4 });
  const postGeo = new THREE.CylinderGeometry(0.018, 0.025, 0.42, 6); postGeo.translate(0, 0.21, 0);
  const headGeo = new THREE.CylinderGeometry(0.05, 0.085, 0.045, 10); headGeo.translate(0, 0.44, 0);
  for (let i = 0; i < 6; i++) {
    const t = 0.06 + i * 0.16, p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const sd = i % 2 ? 0.95 : -0.95;
    const x = p.x - tan.z * sd, z = p.z + tan.x * sd;
    const post = new THREE.Mesh(postGeo, postMat), head = new THREE.Mesh(headGeo, headMat);
    post.position.set(x, 0, z); head.position.set(x, 0, z); scene.add(post, head);
    lampPos.push(new THREE.Vector3(x, 0.4, z));
    addGlow(x, 0.42, z, 0.8);
  }
  const uplights = [];
  [0, 2, 3].forEach(k => {
    const p = PALMS[k];
    const x = p.x + shDir.x * -0.7, z = p.z + 0.7;
    lampPos.push(new THREE.Vector3(x, 0.15, z));
    const L = new THREE.PointLight('#ffb36b', 0, 11, 1.6);
    L.position.set(x, 0.4, z); scene.add(L); uplights.push(L);
    addGlow(x, 0.12, z, 0.6);
  });
  // café string lights
  const posts = [[PATIO.x0 + 0.1, PATIO.z1 + 0.1], [PATIO.x1 - 0.1, PATIO.z1 + 0.1], [PATIO.x1 - 0.1, PATIO.z0 - 0.1], [PATIO.x0 + 0.1, PATIO.z0 - 0.1]];
  const tallGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.8, 6); tallGeo.translate(0, 1.4, 0);
  posts.forEach(([x, z]) => { const m = new THREE.Mesh(tallGeo, postMat); m.position.set(x, 0, z); scene.add(m); });
  const bulbs = [];
  const strings = [[0, 2], [1, 3], [0, 1]];
  const lineMat = new THREE.LineBasicMaterial({ color: '#2a241e' });
  strings.forEach(([a, b]) => {
    const A = new THREE.Vector3(posts[a][0], 2.75, posts[a][1]), Bv = new THREE.Vector3(posts[b][0], 2.75, posts[b][1]);
    const pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24; const p = A.clone().lerp(Bv, t); p.y -= Math.sin(t * Math.PI) * 0.55; pts.push(p); if (i % 2 && i < 24) bulbs.push(p.clone().setY(p.y - 0.06)); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  });
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#4a4036', emissive: new THREE.Color('#ffd49a'), emissiveIntensity: 0 });
  const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), bulbMat, bulbs.length);
  bulbs.forEach((b, i) => { bulbMesh.setMatrixAt(i, M.compose(b, Q.identity(), S.set(1, 1, 1))); addGlow(b.x, b.y, b.z, 0.5); });
  scene.add(bulbMesh);
  const patioLamp = new THREE.PointLight('#ffc98a', 0, 9, 1.4);
  patioLamp.position.set((PATIO.x0 + PATIO.x1) / 2, 2.2, (PATIO.z0 + PATIO.z1) / 2);
  scene.add(patioLamp);
  lampPos.push(new THREE.Vector3(patioLamp.position.x, 1.6, patioLamp.position.z));
  while (lampPos.length < LAMPS) lampPos.push(new THREE.Vector3(0, -50, 0));
  shared.uLamp.value = lampPos.slice(0, LAMPS);

  /* -- camera path -- */
  const CAM = [
    [[-1.0, 1.55, 14.5], [3.2, 2.3, -4]],     // hero: low over the long grass, palms to the right
    [[3.5, 5.6, 12.5], [0.5, 0.0, -2.0]],     // up high as the mower stripes it
    [[12.5, 2.6, 4.2], [6.5, 1.2, -5.5]],     // down to the palm bed as it grows in
    [[0.2, 4.4, 2.6], [-7.6, 0.0, -9.2]],    // over the patio as the stone is set
    [[4.5, 1.9, 12.8], [-2.0, 2.4, -6.0]],    // back out wide at dusk
  ];
  const camPos = new THREE.CatmullRomCurve3(CAM.map(c => new THREE.Vector3(...c[0])), false, 'centripetal');
  const camLook = new THREE.CatmullRomCurve3(CAM.map(c => new THREE.Vector3(...c[1])), false, 'centripetal');
  const look = new THREE.Vector3(), pos = new THREE.Vector3();

  /* -- state -- */
  let target = 0, prog = 0, introT = reduce ? 1 : 0, running = false, visible = true, raf = 0, last = performance.now();
  const stage = { cut: -1, grow: -1, set: -1, dusk: -1 };
  const pointer = new THREE.Vector3(999, 0, 999), ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2();
  let pointerAmt = 0, lastMove = 0;
  const parallax = new THREE.Vector2(), parallaxT = new THREE.Vector2();

  function stages(p) {
    return { cut: smooth(0.04, 0.27, p), grow: smooth(0.28, 0.5, p), set: smooth(0.5, 0.72, p), dusk: smooth(0.74, 0.95, p) };
  }
  function apply(p) {
    // reduced motion: one still frame of the finished yard, from the opening viewpoint
    const s = reduce ? { cut: 1, grow: 1, set: 1, dusk: 0 } : stages(p);
    if (reduce) p = 0.0;
    if (Math.abs(s.cut - stage.cut) > 1e-4) { shared.uCut.value = s.cut; stage.cut = s.cut; }
    if (Math.abs(s.grow - stage.grow) > 1e-4) { setGrow(s.grow); stage.grow = s.grow; }
    if (Math.abs(s.set - stage.set) > 1e-4) { setPavers(s.set); stage.set = s.set; }
    if (Math.abs(s.dusk - stage.dusk) > 1e-4) {
      const d = s.dusk; stage.dusk = d;
      for (const k of ['top', 'mid', 'horizon']) skyU['u' + k[0].toUpperCase() + k.slice(1)].value.copy(PAL[k][0]).lerp(PAL[k][1], d);
      shared.uSunCol.value.copy(PAL.sun[0]).lerp(PAL.sun[1], d);
      shared.uHemiSky.value.copy(PAL.hemiSky[0]).lerp(PAL.hemiSky[1], d);
      shared.uHemiGround.value.copy(PAL.hemiGround[0]).lerp(PAL.hemiGround[1], d);
      shared.uFogColor.value.copy(PAL.fog[0]).lerp(PAL.fog[1], d);
      scene.fog.color.copy(shared.uFogColor.value);
      shared.uFogDensity.value = scene.fog.density = lerp(DAY.fogD, DUSK.fogD, d);
      shared.uSunI.value = lerp(DAY.sunI, DUSK.sunI, d);
      shared.uHemiI.value = lerp(DAY.hemiI, DUSK.hemiI, d);
      shared.uShAmt.value = 0.55 * (1 - d);
      skyU.uSunI.value = 1 - d * 0.6;
      sun.color.copy(shared.uSunCol.value); sun.intensity = shared.uSunI.value;
      hemi.color.copy(shared.uHemiSky.value); hemi.groundColor.copy(shared.uHemiGround.value); hemi.intensity = shared.uHemiI.value;
      renderer.toneMappingExposure = lerp(DAY.exp, DUSK.exp, d);
      const on = smooth(0.35, 1, d);
      shared.uLampAmt.value = on * 0.9;
      headMat.emissiveIntensity = on * 3; bulbMat.emissiveIntensity = on * 4;
      uplights.forEach(L => (L.intensity = on * 14));
      patioLamp.intensity = on * 8;
      glows.forEach(g => (g.material.opacity = on));
    }
    // camera
    const u = clamp(p);
    camPos.getPoint(u, pos); camLook.getPoint(u, look);
    const ie = 1 - Math.pow(1 - introT, 3);
    pos.y += (1 - ie) * 1.6; pos.z += (1 - ie) * 3.5;
    pos.x += parallax.x * 0.35; pos.y += parallax.y * 0.18;
    camera.position.copy(pos); camera.lookAt(look);
  }

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 54 : 38;
    camera.updateProjectionMatrix();
    if (!running) frame(performance.now(), true);
  }

  // software GL (no GPU): draw only when the scroll position changes, a few times a second at most
  let drawn = -1, timer = 0;
  function softTick() {
    if (!running) return;
    if (Math.abs(target - drawn) > 0.0005) { prog = target; introT = 1; apply(prog); renderer.render(scene, camera); drawn = prog; }
    timer = setTimeout(softTick, 250);
  }

  function frame(now, once) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (soft) { prog = target; introT = 1; apply(prog); renderer.render(scene, camera); drawn = prog; return; }
    if (!reduce) {
      prog += (target - prog) * Math.min(1, dt * 4.5);
      introT = Math.min(1, introT + dt / 2.6);
      grassU.uTime.value += dt;
      parallax.lerp(parallaxT, Math.min(1, dt * 2.5));
      if (now - lastMove > 900) pointerAmt = Math.max(0, pointerAmt - dt * 0.8);
      grassU.uPointerAmt.value = pointerAmt;
      grassU.uPointer.value.lerp(pointer, Math.min(1, dt * 6));
      const t = grassU.uTime.value;
      for (const f of fronds) f.arm.rotation.x = f.base + Math.sin(t * 1.25 + f.ph) * f.amp + Math.sin(t * 0.45 + f.ph * 0.5) * f.amp * 0.6;
    } else prog = target;
    apply(prog);
    renderer.render(scene, camera);
    if (!once && running) raf = requestAnimationFrame(t => frame(t));
  }

  function start() {
    if (running || reduce) return; running = true; last = performance.now();
    if (soft) { timer = setTimeout(softTick, 60); return; }
    raf = requestAnimationFrame(t => frame(t));
  }
  function stop() { running = false; cancelAnimationFrame(raf); clearTimeout(timer); }
  const sync = () => (visible && !document.hidden ? start() : stop());

  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; sync(); }, { rootMargin: '80px' });
  io.observe(canvas);
  document.addEventListener('visibilitychange', sync);
  addEventListener('resize', resize);

  if (!reduce) {
    addEventListener('pointermove', e => {
      if (!running) return;
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      parallaxT.set(ndc.x, ndc.y);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, P)) { pointer.copy(P); pointerAmt = Math.min(1, pointerAmt + 0.25); lastMove = performance.now(); }
    }, { passive: true });
  }

  resize();
  apply(target);
  if (reduce) frame(performance.now(), true);
  else sync();

  return {
    setProgress(p) { target = clamp(p); if (reduce) frame(performance.now(), true); },
    renderOnce() { frame(performance.now(), true); },
    jump(p) { target = prog = clamp(p); introT = 1; frame(performance.now(), true); },
    get soft() { return soft; },
    scene, renderer, camera,
  };
}
