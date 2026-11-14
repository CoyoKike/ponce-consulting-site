// The heart. One anatomical model (Human Reference Atlas, CC BY 4.0, see CREDITS.md): heart chambers
// plus the aorta, pulmonary vessels, cardiac veins and the coronary arteries, merged in
// assets/models/heart.glb. assets/models/paths.json holds centre lines of the coronary arteries,
// measured from the same model.
//
// This file holds the shared pieces: tissue and vessel shading, the heartbeat (v4: ventricles squeeze,
// shorten and wring in the vertex shader, atria kick first, arteries swell with the pressure wave),
// the cardiac clock, blood cell and stent geometry, and the small views in the content sections
// ([data-view] slots, one renderer, scissored). The scroll ride itself is in journey.js.
import * as THREE from 'three';
import { GLTFLoader } from '../assets/vendor/GLTFLoader.js';
import { RoomEnvironment } from '../assets/vendor/RoomEnvironment.js';

const COL = {
  muscle: 0x5c0b10, aorta: 0xb0161d, pulmonary: 0x3a3e70, veins: 0x3a2142,
  coronary: 0xff3a20, dim: 0x2e1a1c, wire: 0xe8edf2, accent: 0xff3b2f,
};
const MM_PER_UNIT = 100; // model scaled so 1 unit = 0.1 m
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------------------------------------
export async function loadHeart() {
  const [gltf, paths] = await Promise.all([
    new Promise((res, rej) => new GLTFLoader().load('assets/models/heart.glb', res, undefined, rej)),
    fetch('assets/models/paths.json').then(r => r.json()),
  ]);
  return { gltf, paths, route: buildRoute(paths) };
}

function V(a) { return new THREE.Vector3(a[0], a[1], a[2]); }
function nearestIdx(arr, p) {
  let bi = 0, bd = Infinity;
  arr.forEach((q, i) => { const d = q.distanceToSquared(p); if (d < bd) { bd = d; bi = i; } });
  return bi;
}

// aorta (arch down to the root) > left main > LAD to the apex > PDA back along the bottom >
// right coronary back up to the root > short hop into the aorta again.
function buildRoute(P) {
  const aorta = P.aorta.map(V), lca = P.lca.map(V), lad = P.lad.map(V), pda = P.pda.map(V).reverse(), rca = P.rca.map(V);
  const j = nearestIdx(rca, pda[pda.length - 1]);
  const rcaBack = rca.slice(0, j + 1).reverse();
  const pts = [...aorta, ...lca.slice(1), ...lad.slice(1), ...pda, ...rcaBack, aorta[aorta.length - 1].clone(), aorta[aorta.length - 4].clone()];
  const clean = [pts[0]];
  for (const p of pts) if (p.distanceTo(clean[clean.length - 1]) > 0.035) clean.push(p);
  const curve = new THREE.CatmullRomCurve3(clean, false, 'centripetal');
  curve.arcLengthDivisions = 2000;
  const len = curve.getLength();
  const uAt = p => {
    let bu = 0, bd = Infinity;
    for (let i = 0; i <= 1000; i++) { const u = i / 1000; const d = curve.getPointAt(u).distanceToSquared(p); if (d < bd) { bd = d; bu = u; } }
    return bu;
  };
  const mid = a => a[Math.floor(a.length * .5)];
  const stops = [
    0,
    uAt(mid(aorta)),                        // 1 ascending aorta
    uAt(lca[lca.length - 1]),               // 2 left main, at the split
    uAt(lad[Math.floor(lad.length * .42)]), // 3 LAD, front wall
    uAt(lad[Math.floor(lad.length * .86)]), // 4 near the apex: the stent goes here
    uAt(rcaBack[Math.floor(rcaBack.length * .55)]), // 5 right coronary
    1,
  ];
  return { curve, len, lenMM: len * MM_PER_UNIT, stops, root: aorta[aorta.length - 1].clone() };
}

// ---------------------------------------------------------------------------------------------
// tissue + vessel shading, injected into MeshPhysicalMaterial
const GLSL_NOISE = `
float lh(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float ln(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(lh(i), lh(i + vec3(1,0,0)), f.x), mix(lh(i + vec3(0,1,0)), lh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(lh(i + vec3(0,0,1)), lh(i + vec3(1,0,1)), f.x), mix(lh(i + vec3(0,1,1)), lh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float lf(vec3 p){ return .55 * ln(p) + .28 * ln(p * 2.03 + 7.1) + .17 * ln(p * 4.11 + 3.7); }
`;
export function makeUniforms() {
  return {
    uToModel: { value: new THREE.Matrix4() }, uFlow: { value: 0 }, uFlowAmt: { value: 1 }, uBeat: { value: 0 },
    uRoot: { value: new THREE.Vector3() }, uTip: { value: new THREE.Vector3(99, 99, 99) }, uWin: { value: 0 },
    uScan: { value: new THREE.Vector2(0, 0) },
    // v4 heartbeat in the vertex shader: ventricles squeeze and twist, atria kick, arteries swell
    uCon: { value: 0 }, uAtr: { value: 0 }, uPulse: { value: 0 }, uAV: { value: 0 }, uCw: { value: new THREE.Vector3() },
    uHole: { value: new THREE.Vector4(0, 0, 0, 0) }, uHoleGlow: { value: 1 },
  };
}
function hook(shader) {
  Object.assign(shader.uniforms, this.userData.U);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform mat4 uToModel;\nuniform float uCon, uAtr, uPulse, uAV;\nuniform vec3 uCw;\nvarying vec3 vMP;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMP = (uToModel * modelMatrix * vec4(transformed, 1.)).xyz;')
    .replace('#include <project_vertex>', `
vec4 lW = modelMatrix * vec4(transformed, 1.);
#ifdef BEAT
  { // ventricles (below the valve plane) squeeze toward the centre, shorten and wring; atria kick just before
    float lV = smoothstep(uAV + .05, uAV - .32, vMP.y), lA = smoothstep(uAV - .05, uAV + .14, vMP.y);
    vec3 lR = lW.xyz - uCw;
    lR *= 1. - .085 * uCon * lV - .05 * uAtr * lA;
    lR.y += .045 * uCon * lV * smoothstep(uAV, uAV - .5, vMP.y);
    float lTw = .16 * uCon * lV * (uAV - vMP.y), lc = cos(lTw), ls = sin(lTw);
    lR.xz = mat2(lc, -ls, ls, lc) * lR.xz;
    lW.xyz = uCw + lR; }
#endif
#ifdef PULSE
  lW.xyz += normalize(mat3(modelMatrix) * objectNormal) * uPulse * PULSE;
#endif
vec4 mvPosition = viewMatrix * lW;
gl_Position = projectionMatrix * mvPosition;`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
uniform float uFlow, uFlowAmt, uBeat, uWin; uniform vec3 uRoot, uTip; uniform vec2 uScan; uniform vec4 uHole; uniform float uHoleGlow; varying vec3 vMP;
${GLSL_NOISE}`)
    .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
#ifdef HOLE
float lHd = uHole.w > 0. ? distance(vMP, uHole.xyz) : 9.;
if (lHd < uHole.w) discard;
#endif`)
    .replace('#include <color_fragment>', `#include <color_fragment>
float lFr = pow(1. - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.2);
#ifdef TISSUE
  float lN = lf(vMP * 9.);
  float lFib = ln(vec3(vMP.x * 22., vMP.y * 60., vMP.z * 22.));
  diffuseColor.rgb *= mix(.66, 1.22, lN) * mix(.9, 1.06, lFib);
#endif
#ifdef VESSEL
  float lWd = distance(vMP, uTip);
  diffuseColor.a *= mix(1., .16 + .55 * lFr, uWin * (1. - smoothstep(.06, .19, lWd)));
#endif`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
#ifdef TISSUE
  { vec3 lp = -vViewPosition; float lH = lf(vMP * 26.) * .6 + ln(vec3(vMP.x * 30., vMP.y * 80., vMP.z * 30.)) * .4;
    vec3 lsx = dFdx(lp), lsy = dFdy(lp); float lhx = dFdx(lH), lhy = dFdy(lH);
    vec3 lr1 = cross(lsy, normal), lr2 = cross(normal, lsx); float ldet = dot(lsx, lr1);
    vec3 lg = sign(ldet) * (lhx * lr1 + lhy * lr2) * .0032; normal = normalize(abs(ldet) * normal - lg); }
#endif`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
#ifdef TISSUE
  totalEmissiveRadiance += vec3(.5, .035, .03) * lFr * .6 + vec3(.3, .02, .02) * uBeat * .22;
  float lSc = exp(-pow((vMP.y - uScan.x) / .016, 2.)) * uScan.y;
  float lScT = smoothstep(uScan.x + .25, uScan.x, vMP.y) * step(vMP.y, uScan.x) * uScan.y;
  totalEmissiveRadiance += vec3(.8, .92, .95) * lSc * .75 + vec3(.2, .05, .05) * lScT * .35;
#endif
#ifdef VESSEL
  float lD = distance(vMP, uRoot);
  float lWave = pow(.5 + .5 * sin(lD * 48. - uFlow * 6.2831), 10.);
  totalEmissiveRadiance += vec3(1., .2, .13) * lWave * uFlowAmt * .85 + vec3(.45, .03, .02) * lFr * .55;
#endif
#ifdef HOLE
  totalEmissiveRadiance += vec3(1., .32, .18) * smoothstep(uHole.w * 1.35, uHole.w, lHd) * step(.0001, uHole.w) * 1.6 * uHoleGlow;
#endif`);
}
export function makeMats(U) {
  const base = { roughness: .36, metalness: 0, clearcoat: .8, clearcoatRoughness: .18, sheen: .3, sheenRoughness: .4, sheenColor: new THREE.Color(0xff6253) };
  const mk = (color, defs, o = {}) => {
    const m = new THREE.MeshPhysicalMaterial({ color, ...base, ...o });
    m.defines = { ...m.defines, ...defs }; m.userData.U = U; m.onBeforeCompile = hook;
    return m;
  };
  return {
    muscle: mk(COL.muscle, { TISSUE: '', BEAT: '' }),
    aorta: mk(COL.aorta, { VESSEL: '', PULSE: '.006', HOLE: '' }, { transparent: true, opacity: 1 }),
    pulmonary: mk(COL.pulmonary, { PULSE: '.004' }, { roughness: .4, sheenColor: new THREE.Color(0x8090ff) }),
    veins: mk(COL.veins, { BEAT: '' }, { roughness: .42 }),
    coronary: mk(COL.coronary, { VESSEL: '', BEAT: '', PULSE: '.0025', HOLE: '' }, { transparent: true, opacity: 1, emissive: new THREE.Color(0x6a0b04) }),
  };
}

// clone keeping the custom shader (Material.copy drops our defines and hook)
export function cloneMat(m) { const c = m.clone(); c.defines = { ...m.defines }; c.onBeforeCompile = hook; c.userData.U = m.userData.U; return c; }

export function dress(root, mats) {
  const parts = {};
  root.traverse(o => {
    if (!o.isMesh) return;
    const group = o.material?.name || 'muscle', name = o.name;
    o.material = mats[group] || mats.muscle;
    o.renderOrder = o.material.transparent ? 2 : 0;
    o.userData.group = group; o.userData.part = name;
    (parts[group] ||= []).push(o);
  });
  return parts;
}

export function lights(scene, renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .5;
  const key = new THREE.DirectionalLight(0xfff0e6, 2.6); key.position.set(2.5, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc2b8, 2.2); rim.position.set(-3, 1.5, -3); scene.add(rim);
  const low = new THREE.DirectionalLight(0xff2a1a, .9); low.position.set(0, -4, 1); scene.add(low);
  const fill = new THREE.HemisphereLight(0x402020, 0x100506, .6); scene.add(fill);
  return { key, rim };
}

// the cardiac cycle. ph in [0, 1): QRS at ~.04, the ventricles squeeze until ~.35, then fill.
// systole: a quick squeeze (ease out), a short hold, then a slower relax (ease in out)
export function contraction(ph) {
  const up = 1 - Math.pow(1 - clamp((ph - .03) / .15, 0, 1), 3);
  const dn = .5 - .5 * Math.cos(Math.PI * clamp((ph - .3) / .26, 0, 1));
  return up * (1 - dn);
}
// the atria squeeze just before the ventricles (late diastole)
export function atrial(ph) { const x = clamp((ph - .8) / .17, 0, 1); return Math.pow(Math.sin(Math.PI * x), 2); }
// arterial pressure wave: rises as blood is ejected, falls off slowly
export function pressure(ph) { return sstep(.05, .2, ph) * (1 - sstep(.28, .8, ph)); }
export function lubdub(ph) { const b = x => Math.exp(-Math.pow(x / .045, 2)); return b(ph - .07) + .55 * b(ph - .3); }
export function ecg(ph) {
  const g = (m, s, a) => a * Math.exp(-Math.pow((ph - m) / s, 2)) + a * Math.exp(-Math.pow((ph - 1 - m) / s, 2));
  return g(.9, .028, .13) + g(.028, .007, -.12) + g(.042, .008, 1) + g(.058, .007, -.28) + g(.3, .045, .26);
}
// shared clock so both canvases beat together
export const clock = { ph: 0, flow: 0, bpm: 64, last: 0 };
export function tick(now, bpmTarget, reduce) {
  const dt = Math.min(.05, clock.last ? (now - clock.last) / 1000 : 0); clock.last = now;
  if (bpmTarget != null) clock.bpm += (bpmTarget - clock.bpm) * Math.min(1, dt * 1.6);
  if (reduce) return clock;
  clock.ph = (clock.ph + dt * clock.bpm / 60) % 1;
  clock.flow += dt * clock.bpm / 60 * (.35 + 2.6 * contraction(clock.ph));
  return clock;
}

// radial map: for every direction from the centre, how far out the model reaches
export function radialMap(model, C) {
  const NT = 64, NP = 32, R = new Float32Array(NT * NP);
  const v = new THREE.Vector3();
  const bin = d => {
    const th = Math.atan2(d.z, d.x), ph = Math.acos(clamp(d.y, -1, 1));
    return [Math.floor((th + Math.PI) / (2 * Math.PI) * NT) % NT, Math.min(NP - 1, Math.floor(ph / Math.PI * NP))];
  };
  model.updateMatrixWorld(true);
  model.traverse(o => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position, m = o.matrixWorld;
    for (let i = 0; i < p.count; i += 2) {
      v.fromBufferAttribute(p, i).applyMatrix4(m).sub(C);
      const r = v.length(); v.divideScalar(r);
      const [a, b] = bin(v); if (r > R[b * NT + a]) R[b * NT + a] = r;
    }
  });
  // dilate twice so gaps between sampled vertices are covered
  for (let pass = 0; pass < 2; pass++) {
    const S = R.slice();
    for (let b = 0; b < NP; b++) for (let a = 0; a < NT; a++) {
      let mx = S[b * NT + a];
      for (let db = -1; db <= 1; db++) for (let da = -1; da <= 1; da++) {
        const bb = clamp(b + db, 0, NP - 1), aa = (a + da + NT) % NT; mx = Math.max(mx, S[bb * NT + aa]);
      }
      R[b * NT + a] = mx;
    }
  }
  return d => { const [a, b] = bin(d); return R[b * NT + a]; };
}

// red blood cell: a biconcave disc (Evans and Fung profile), turned on a lathe
export function cellGeometry() {
  const pts = [];
  const h = r => Math.sqrt(Math.max(0, 1 - r * r)) * (.207 + 2.003 * r * r - 1.123 * r ** 4) * .5;
  for (let i = 0; i <= 14; i++) { const r = i / 14; pts.push(new THREE.Vector2(r * .999, h(r))); }
  for (let i = 14; i >= 0; i--) { const r = i / 14; pts.push(new THREE.Vector2(r * .999, -h(r))); }
  const g = new THREE.LatheGeometry(pts, 22); g.computeVertexNormals();
  return g;
}

// a stent: zig-zag rings joined by short links, a unit cylinder along +Z (radius 1, length 1)
export function stentGroup(mat) {
  const g = new THREE.Group();
  const RINGS = 7, CROWNS = 9, amp = .055, wire = .028;
  for (let r = 0; r < RINGS; r++) {
    const z0 = -.5 + (r + .5) / RINGS;
    const path = new THREE.CurvePath();
    const P = k => { const a = k / (CROWNS * 2) * Math.PI * 2 + (r % 2) * Math.PI / CROWNS; return new THREE.Vector3(Math.cos(a), Math.sin(a), z0 + (k % 2 ? amp : -amp)); };
    for (let k = 0; k < CROWNS * 2; k++) path.add(new THREE.LineCurve3(P(k), P(k + 1)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, CROWNS * 8, wire, 5, true), mat));
    if (r < RINGS - 1) for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + .3, z1 = z0 + amp, z2 = z0 + 1 / RINGS - amp;
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(Math.cos(a), Math.sin(a), z1), new THREE.Vector3(Math.cos(a), Math.sin(a), z2)), 2, wire, 5, false), mat));
    }
  }
  return g;
}

// the journey (hero + ride through the vessels) lives in journey.js

// ---------------------------------------------------------------------------------------------
// front canvas: small views in the sections. One renderer, one scene, scissored into each slot.
const VIEWS = {
  whole:    { cam: [1.2, .5, 3.1], look: [0, -.05, 0], spin: .18, hi: [] },
  attack:   { cam: [.9, .35, 2.5], look: [.1, -.1, 0], spin: .1, hi: ['coronary'] },
  pressure: { cam: [-1.6, 1.1, 2.1], look: [-.15, .35, 0], spin: .08, hi: ['aorta'] },
  stent:    { cam: [1.4, .2, 1.6], look: [.35, -.1, .2], spin: .06, hi: ['lad'] },
  rhythm:   { cam: [-1.3, .9, 2.2], look: [-.1, .25, 0], spin: .1, hi: ['atria'], afib: true },
  form:     { cam: [.9, .4, 3], look: [0, -.05, 0], spin: .14, hi: [] },
};
const REASON = {
  consult: { hi: ['aorta'], cam: [-1.5, 1, 2.2], look: [-.15, .35, 0], label: 'Ascending aorta · Consultation' },
  echo: { hi: ['lca'], cam: [.4, 1.3, 2.3], look: [0, .3, 0], label: 'Left main · Echocardiogram' },
  stress: { hi: ['lad'], cam: [1.4, .3, 2], look: [.3, 0, .2], label: 'Left anterior descending · Stress test' },
  cath: { hi: ['coronary'], cam: [1.3, -.6, 2.1], look: [.3, -.3, .2], label: 'Apex · Cath follow up' },
  prevent: { hi: ['rca'], cam: [-1.7, -.1, 1.9], look: [-.2, 0, .1], label: 'Right coronary · Prevention' },
};

export function initSlots(canvas, data, { reduce }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.setScissorTest(true);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;
  const scene = new THREE.Scene();
  lights(scene, renderer);
  const U = makeUniforms();
  U.uRoot.value.copy(data.route.root);
  const mats = makeMats(U);
  const mesh = {};
  const heart = new THREE.Group(); scene.add(heart);
  const beatG = new THREE.Group(); heart.add(beatG);
  const inner = new THREE.Group(); beatG.add(inner);
  const model = data.gltf.scene.clone(true); inner.add(model);
  dress(model, mats);
  const box = new THREE.Box3();
  model.updateMatrixWorld(true);
  model.traverse(o => { if (o.isMesh && o.userData.group === 'muscle') box.expandByObject(o); });
  const C = box.getCenter(new THREE.Vector3());
  beatG.position.copy(C); inner.position.copy(C).negate();
  const bA = new THREE.Box3(), bV = new THREE.Box3();
  model.traverse(o => { if (o.isMesh && o.userData.group === 'muscle') (/atrium/.test(o.userData.part) ? bA : bV).expandByObject(o); });
  const AV = (bA.min.y + bV.max.y) / 2 - .04;
  // per part materials so a view can light up one artery or the atria
  model.traverse(o => { if (o.isMesh) { o.material = cloneMat(o.material); mesh[o.userData.part] = o; } });
  const tags = o => {
    const p = o.userData.part, g = o.userData.group, t = [g];
    if (/left_coronary|left_anterior|diagonal|left_marginal/.test(p)) t.push('left');
    if (p === 'left_coronary_artery') t.push('lca');
    if (/left_anterior_descending|diagonal_branch_of_anterior/.test(p)) t.push('lad');
    if (/right_coronary|right_marginal|right_posterior/.test(p)) t.push('rca');
    if (/atrium/.test(p)) t.push('atria');
    return t;
  };
  const all = Object.values(mesh);
  all.forEach(o => { o.userData.s0 = o.scale.x; o.userData.tags = tags(o); o.userData.base = o.material.color.getHex(); o.userData.op = o.material.opacity; o.userData.em = o.material.emissive.getHex(); });

  const camera = new THREE.PerspectiveCamera(30, 1, .01, 30);
  const slots = [...document.querySelectorAll('[data-view]')];
  const state = new Map(slots.map(el => [el, { yaw: 0, cam: new THREE.Vector3(...VIEWS[el.dataset.view].cam), look: new THREE.Vector3(...VIEWS[el.dataset.view].look), hover: 0, press: 0 }]));
  let formReason = null;
  slots.forEach(el => {
    const card = el.closest('.card, .doctor__media, .request__side') || el;
    card.addEventListener('pointerenter', () => state.get(el).hoverOn = true);
    card.addEventListener('pointerleave', () => state.get(el).hoverOn = false);
    card.addEventListener('focusin', () => state.get(el).hoverOn = true);
    card.addEventListener('focusout', () => state.get(el).hoverOn = false);
    card.addEventListener('pointerdown', () => state.get(el).press = 1);
  });

  const cHi = new THREE.Color(0xff4a36), cDim = new THREE.Color(COL.dim), tc = new THREE.Color();
  function paint(hi, k) {
    all.forEach(o => {
      const on = hi.some(h => o.userData.tags.includes(h));
      tc.setHex(o.userData.base);
      if (hi.length) {
        if (on) tc.lerp(cHi, k * .6);
        else tc.lerp(cDim, o.userData.group === 'coronary' ? k * .8 : k * .5);
      }
      o.material.color.copy(tc);
      o.material.emissive.setHex(o.userData.em);
      if (on && hi.length) o.material.emissive.lerp(cHi, .35 * k);
      o.material.opacity = on && hi.length ? Math.min(1, o.userData.op + .2 * k) : o.userData.op;
    });
  }

  let t0 = performance.now();
  const io = new IntersectionObserver(es => es.forEach(e => state.get(e.target).vis = e.isIntersecting), { rootMargin: '10% 0px' });
  slots.forEach(el => io.observe(el));

  function frame(now) {
    const t = (now - t0) / 1000;
    const ck = tick(now, null, reduce);
    const con = reduce ? 0 : contraction(ck.ph);
    U.uCon.value = con; U.uAtr.value = reduce ? 0 : atrial(ck.ph); U.uPulse.value = reduce ? 0 : pressure(ck.ph); U.uAV.value = AV;
    U.uFlow.value = ck.flow; U.uBeat.value = reduce ? 0 : lubdub(ck.ph); U.uFlowAmt.value = reduce ? .25 : .8;
    const W = innerWidth, H = innerHeight;
    renderer.setScissor(0, 0, W, H); renderer.setViewport(0, 0, W, H); renderer.clear();
    let any = false;
    for (const el of slots) {
      const st = state.get(el);
      if (!st.vis) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.width < 2) continue;
      const op = parseFloat(getComputedStyle(el.closest('.card, .doctor__media, .request__side') || el).opacity || 1);
      if (op < .05) continue;
      any = true;
      let view = VIEWS[el.dataset.view];
      let hi = view.hi;
      if (el.dataset.view === 'form' && formReason) { view = { ...view, ...REASON[formReason] }; hi = REASON[formReason].hi; }
      st.hover += ((st.hoverOn ? 1 : 0) - st.hover) * .08;
      st.press *= .9;
      st.cam.lerp(new THREE.Vector3(...view.cam), .06); st.look.lerp(new THREE.Vector3(...view.look), .06);
      st.yaw += (reduce ? 0 : view.spin * (1 + st.hover * 2.5)) / 60;
      const k = el.dataset.view === 'whole' || (el.dataset.view === 'form' && !formReason) ? 0 : (.55 + .45 * st.hover);
      paint(hi, k);
      all.forEach(o => o.scale.setScalar(o.userData.s0));
      // atrial fibrillation: the upper chambers quiver out of step
      if (view.afib && !reduce) all.forEach(o => { if (o.userData.tags.includes('atria')) o.scale.setScalar(o.userData.s0 * (1 + .008 * Math.sin(t * 31 + o.id) + .005 * Math.sin(t * 47))); });
      heart.scale.setScalar(1 - st.press * .06);
      heart.rotation.y = Math.sin(st.yaw) * .55;
      heart.updateMatrixWorld(true);
      U.uToModel.value.copy(model.matrixWorld).invert();
      U.uCw.value.copy(C).applyMatrix4(inner.matrixWorld);
      camera.position.copy(st.cam); camera.lookAt(st.look);
      camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
      const x = r.left, y = H - r.bottom;
      renderer.setViewport(x, y, r.width, r.height); renderer.setScissor(x, y, r.width, r.height);
      renderer.render(scene, camera);
    }
  }
  function loop(now) { frame(now); requestAnimationFrame(loop); }
  const resize = () => renderer.setSize(innerWidth, innerHeight, false);
  addEventListener('resize', resize); resize();
  renderer.compile(scene, camera);
  requestAnimationFrame(loop);
  return {
    setReason(r) { formReason = r; return r ? REASON[r].label : ''; },
  };
}
