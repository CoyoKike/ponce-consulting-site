// v4: the ride. Built to the standard of the Sun Stone section on ponceconsulting.org: one big 3D object
// lit like a product shot, the camera circling it and pushing in, text pinned to stops.
//
// F in [0, 6] is the scroll position: 0 hero, 1..5 the five service stops, 6 the way out.
//  · 0 → .7   the heart turns in a dark studio while the camera circles it and pushes in toward the aorta.
//  · .7       the aortic wall opens (a glowing ring) and the camera passes through into the lumen.
//  · 1        stop 1, inside the ascending aorta, looking down at the root and the two coronary openings.
//  · 2        stop 2, the left main splits: LAD ahead, circumflex opening to the side.
//  · 3        stop 3, down the LAD, side branches opening; the heart rate and flow climb (stress test).
//  · 4        stop 4, near the apex: a narrowing, and a stent opening it.
//  · 5        stop 5, back up the right coronary toward the aorta.
//  · 6        out of the aorta and pull back to the whole heart.
// Inside, the vessels are tubes built along centre lines measured from the same model (paths.json),
// their radius measured from the model's own vessel surfaces. Branches are real openings: each tube
// discards the part of its wall that lies inside the other tube, so you see into the side branch.
import * as THREE from 'three';
import { makeUniforms, makeMats, dress, lights, contraction, atrial, pressure, lubdub, tick, cellGeometry, stentGroup } from './heart.js';

const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const s5 = x => { x = clamp(x, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
const V = a => new THREE.Vector3(a[0], a[1], a[2]);
const MM_PER_UNIT = 100;

// ---------------------------------------------------------------------------------------------
// a tube with a radius that changes along it; uv.x = distance along (model units), uv.y = around (0..1)
function tubeGeo(curve, radiusAt, { seg = 400, rad = 48, sten = null } = {}) {
  const len = curve.getLength();
  const fr = curve.computeFrenetFrames(seg, false);
  const pos = [], nor = [], uv = [], rr = [], st = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg; curve.getPointAt(u, P);
    const r = radiusAt(u), sv = sten ? sten(u * len) : 0;
    for (let j = 0; j <= rad; j++) {
      const a = j / rad * Math.PI * 2;
      N.copy(fr.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(fr.binormals[i], Math.sin(a)).normalize();
      pos.push(P.x + N.x * r, P.y + N.y * r, P.z + N.z * r);
      nor.push(N.x, N.y, N.z); uv.push(u * len, j / rad); rr.push(r); st.push(sv);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) {
    const a = i * (rad + 1) + j, b = a + rad + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('rad', new THREE.Float32BufferAttribute(rr, 1));
  g.setAttribute('sten', new THREE.Float32BufferAttribute(st, 1));
  g.setIndex(idx);
  return g;
}

// the inner wall: wet, deep red endothelium lit by a lamp at the camera, with a pressure wave running
// along it, fog into the dark ahead, and holes where branches leave.
const MAXCUT = 10;
function wallMaterial(shared) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      ...shared,
      uCo: { value: Array.from({ length: MAXCUT }, () => new THREE.Vector4()) },
      uCd: { value: Array.from({ length: MAXCUT }, () => new THREE.Vector4()) },
      uNC: { value: 0 },
      uTone: { value: 1 }, uClip: { value: new THREE.Vector4(0, 0, 0, 99) },
    },
    vertexShader: `
      attribute float rad; attribute float sten;
      uniform float uFlow, uPulse, uBeatK, uOpen, uTime;
      varying vec3 vW, vN, vM; varying vec2 vUv; varying float vSt, vRad;
      void main(){
        // a pressure wave runs along the vessel on every beat; the wall swells as it passes
        float wave = pow(.5 + .5 * sin(uv.x * 9. - uFlow * 6.2831853), 5.);
        float narrow = sten * (1. - uOpen);
        float k = (1. + uBeatK * (.035 * uPulse + .03 * wave)) * (1. - .58 * narrow);
        vec3 p = position + normal * rad * (k - 1.);
        vM = p; vUv = uv; vSt = narrow; vRad = rad;
        vec4 w = modelMatrix * vec4(p, 1.);
        vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform vec3 uCam, uGlow, uLampUp; uniform float uFog, uTime, uFlow, uTone, uBeat;
      uniform vec4 uCo[${MAXCUT}]; uniform vec4 uCd[${MAXCUT}]; uniform int uNC; uniform vec4 uClip; uniform float uBurn;
      varying vec3 vW, vN, vM; varying vec2 vUv; varying float vSt, vRad;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fb(vec2 p){ return .5 * n2(p) + .27 * n2(p * 2.1 + 3.1) + .15 * n2(p * 4.3 + 7.7) + .08 * n2(p * 8.9); }
      void main(){
        // branch openings: drop the wall that lies inside another tube; light the lip around it
        float clipE = uClip.w - distance(vM, uClip.xyz);
        if (clipE < 0.) discard;   // seen from outside: only the lumen behind the door; on the way out, the walls burn away
        float lip = 0.;
        for (int i = 0; i < ${MAXCUT}; i++) {
          if (i >= uNC) break;
          vec3 q = vM - uCo[i].xyz; float t = dot(q, uCd[i].xyz);
          if (t > 0. && t < uCd[i].w) {
            float e = length(q - uCd[i].xyz * t) - uCo[i].w;
            if (e < 0.) discard;
            lip = max(lip, smoothstep(uCo[i].w * .35, 0., e));
          }
        }
        // wall relief: broad soft folds running with the flow and a faint fine grain; seam-free around the tube
        float ang = vUv.y * 6.2831853;
        vec2 cyl = vec2(cos(ang), sin(ang));
        float Lx = vUv.x / max(vRad, .004);
        float f1 = fb(vec2(Lx * .45, 0.) + cyl * .55);
        float f2 = n2(vec2(Lx * 1.6, 3.) + cyl * 7.);
        float hgt = f1 * .85 + f2 * .15;
        vec3 N = -normalize(vN);
        vec3 dpx = dFdx(vW), dpy = dFdy(vW);
        float hx = dFdx(hgt), hy = dFdy(hgt);
        vec3 r1 = cross(dpy, N), r2 = cross(N, dpx); float det = dot(dpx, r1);
        N = normalize(abs(det) * N - sign(det) * (hx * r1 + hy * r2) * .35);
        vec3 V = normalize(uCam - vW); float dist = length(uCam - vW);
        // colour: deep red wall, a little paler on the folds, waxy yellow where plaque narrows it
        vec3 deep = vec3(.26, .012, .022), pale = vec3(.62, .07, .07);
        vec3 alb = mix(deep, pale, smoothstep(.25, .8, hgt));
        alb = mix(alb, vec3(.86, .6, .32), smoothstep(.05, .5, vSt) * (.6 + .4 * f2));
        // lamp just above the camera (endoscope light), falling off with distance
        vec3 Lp = uCam + uLampUp * vRad * .5; vec3 Ld = normalize(Lp - vW);
        float att = 1. / (1. + pow(dist / (vRad * 3.5), 2.));
        float dif = clamp((dot(N, Ld) + .2) / 1.2, 0., 1.);
        vec3 Hh = normalize(Ld + V);
        float spec = pow(max(dot(N, Hh), 0.), 90.) * 1.1 + pow(max(dot(N, Hh), 0.), 16.) * .06;
        float fr = pow(1. - max(dot(N, V), 0.), 3.);
        vec3 col = alb * dif * att * .75 + vec3(1., .82, .76) * spec * att * .8;
        col += alb * vec3(1., .28, .22) * fr * .3 * att;                   // light glowing through the wet wall
        // a warm red glow further down the vessel, so the tunnel has depth
        vec3 G = uGlow - vW; float gd = length(G);
        col += alb * vec3(1., .22, .15) * max(dot(N, G / gd), 0.) * .45 / (1. + gd * gd / (vRad * vRad * 40.));
        // the pressure wave lights up faintly as it passes
        float wave = pow(.5 + .5 * sin(vUv.x * 9. - uFlow * 6.2831853), 5.);
        col += vec3(.45, .04, .03) * wave * .18 * att;
        col += vec3(1., .5, .4) * lip * att * .35;
        col += vec3(1., .45, .15) * smoothstep(uClip.w * .15, 0., clipE) * step(uClip.w, 50.) * 2.2 * uBurn;
        // fog: the vessel fades into dark blood ahead
        float fog = 1. - exp(-pow(dist / (vRad * uFog), 1.5));
        col = mix(col, vec3(.03, .002, .005), fog);
        gl_FragColor = vec4(col * uTone, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

// ---------------------------------------------------------------------------------------------
export function initJourney(canvas, data, { reduce }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 900 ? 2 : 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .0006, 60);
  const L = lights(scene, renderer);
  // product shot: a warm key from above left, a strong rim behind to draw the silhouette, a low red kicker
  L.key.intensity = 3.2; L.key.position.set(-2.2, 3.2, 3.4);
  L.rim.intensity = 4.2; L.rim.color.set(0xffd2c4); L.rim.position.set(2.6, 1.8, -3.2);
  const rim2 = new THREE.DirectionalLight(0xff6a50, 2.2); rim2.position.set(-3, -.6, -2.4); scene.add(rim2);
  const kick = new THREE.PointLight(0xff3020, 3, 6, 1.6); scene.add(kick);

  const U = makeUniforms();
  const mats = makeMats(U);
  mats.aorta.side = THREE.DoubleSide;   // the door's edge shows wall, never a gap
  const heart = new THREE.Group(); scene.add(heart);
  const model = data.gltf.scene.clone(true);
  heart.add(model);
  dress(model, mats);
  model.updateMatrixWorld(true);

  // centre of the muscle; the valve plane sits where the atria meet the ventricles
  const box = new THREE.Box3(), boxA = new THREE.Box3(), boxV = new THREE.Box3();
  model.traverse(o => {
    if (!o.isMesh || o.userData.group !== 'muscle') return;
    box.expandByObject(o);
    if (/atrium/.test(o.userData.part)) boxA.expandByObject(o); else boxV.expandByObject(o);
  });
  const C = box.getCenter(new THREE.Vector3());
  U.uAV.value = (boxA.min.y + boxV.max.y) / 2 - .04;

  // ---------------- vessels, measured from the model ----------------
  const P = data.paths;
  const verts = g => { const out = []; model.traverse(o => {
    if (!o.isMesh || o.userData.group !== g) return;
    const p = o.geometry.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 2) out.push(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).clone());
  }); return out; };
  const aVerts = verts('aorta'), cVerts = verts('coronary');
  const radAt = (vs, p, max, fallback) => {
    const d = []; for (const q of vs) { const x = q.distanceTo(p); if (x < max) d.push(x); }
    if (d.length < 6) return fallback; d.sort((a, b) => a - b); return d[Math.floor(d.length * .05)];
  };
  const smooth = (arr, k = 3) => arr.map((_, i) => { let s = 0, n = 0; for (let j = -k; j <= k; j++) { const x = arr[clamp(i + j, 0, arr.length - 1)]; s += x; n++; } return s / n; });
  const nearestIdx = (arr, p) => { let bi = 0, bd = Infinity; arr.forEach((q, i) => { const d = q.distanceToSquared(p); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const dedupe = (pts, min) => { const o = [pts[0]]; for (const p of pts) if (p.distanceTo(o[o.length - 1]) > min) o.push(p); return o; };

  // aorta: centre line of the ascending aorta measured from its own mesh (slices by height), top to root,
  // carried on upward toward the arch so the tunnel continues above you
  let A = [];
  model.traverse(o => {
    if (!o.isMesh || !/ascending_aorta/.test(o.userData.part)) return;
    const p = o.geometry.attributes.position, v = new THREE.Vector3(), pts = [];
    for (let i = 0; i < p.count; i++) pts.push(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).clone());
    let mn = 9, mx = -9; pts.forEach(q => { mn = Math.min(mn, q.y); mx = Math.max(mx, q.y); });
    const NB = 10, bins = Array.from({ length: NB }, () => []);
    pts.forEach(q => bins[Math.min(NB - 1, Math.floor((q.y - mn) / (mx - mn) * NB))].push(q));
    A = bins.slice(1, 9).map(b => b.reduce((s, q) => s.add(q), new THREE.Vector3()).divideScalar(b.length)).reverse();
  });
  { const sx = smooth(A.map(p => p.x), 1), sz = smooth(A.map(p => p.z), 1); A = A.map((p, i) => new THREE.Vector3(sx[i], p.y, sz[i])); }
  { const t0 = A[0].clone().sub(A[2]).normalize(), t1 = A[A.length - 1].clone().sub(A[A.length - 3]).normalize();
    A = [A[0].clone().addScaledVector(t0, .45), A[0].clone().addScaledVector(t0, .2), ...A, A[A.length - 1].clone().addScaledVector(t1, .04)]; }
  A = dedupe(A, .02);
  const aCurve = new THREE.CatmullRomCurve3(A, false, 'centripetal');
  const aLen = aCurve.getLength();
  const aR = smooth(Array.from({ length: 61 }, (_, i) => radAt(aVerts, aCurve.getPointAt(i / 60), .3, .1)), 4).map(r => clamp(r, .06, .12) * .9);
  const aRadius = u => { const x = clamp(u, 0, 1) * 60, i = Math.floor(x), f = x - i; return lerp(aR[i], aR[Math.min(60, i + 1)], f); };
  const aU = p => { let bu = 0, bd = Infinity; for (let i = 0; i <= 600; i++) { const d = aCurve.getPointAt(i / 600).distanceToSquared(p); if (d < bd) { bd = d; bu = i / 600; } } return bu; };

  // the coronary loop: left ostium > left main > LAD > round the apex > PDA > right coronary > right ostium
  const lca = P.lca.map(V), lad = P.lad.map(V), pda = P.pda.map(V).reverse(), rca = P.rca.map(V);
  const jR = nearestIdx(rca, pda[pda.length - 1]);
  const rcaBack = rca.slice(0, jR + 1).reverse();
  const aUy = y => { let bu = 0, bd = Infinity; for (let i = 0; i <= 600; i++) { const d = Math.abs(aCurve.getPointAt(i / 600).y - y); if (d < bd) { bd = d; bu = i / 600; } } return bu; };
  const uL = aUy(.345), uR = aUy(.3);
  const aL = aCurve.getPointAt(uL), aRt = aCurve.getPointAt(uR);
  const K0 = dedupe([aL, ...lca, ...lad.slice(1), ...pda, ...rcaBack, aRt], .012);
  // the measured centre line has a few kinks (where the left main leaves the aorta, at the apex, at the
  // right ostium) that bend tighter than the vessel is wide; a tube there folds its wall across the
  // lumen. Resample it evenly and relax only the tight spots until every bend is wider than the vessel.
  const K = (() => {
    const c0 = new THREE.CatmullRomCurve3(K0, false, 'centripetal'), sp = .006;
    const n = Math.ceil(c0.getLength() / sp), p = Array.from({ length: n + 1 }, (_, i) => c0.getPointAt(i / n));
    const RC = .05, a = new THREE.Vector3(), b = new THREE.Vector3(), m = new THREE.Vector3();
    const circ = i => { a.subVectors(p[i - 1], p[i]); b.subVectors(p[i + 1], p[i]); const c = p[i - 1].distanceTo(p[i + 1]);
      const s = a.clone().cross(b).length(); return s < 1e-12 ? 1e9 : a.length() * b.length() * c / (2 * s); };
    for (let pass = 0; pass < 400; pass++) {
      let tight = 0;
      for (let i = 2; i < n - 1; i++) if (circ(i) < RC) {
        tight++;
        for (let j = i - 1; j <= i + 1; j++) { m.addVectors(p[j - 1], p[j + 1]).multiplyScalar(.5); p[j].lerp(m, j === i ? .5 : .25); }
      }
      if (!tight) break;
    }
    return p.filter((q, i) => i % 2 === 0 || i === n);
  })();
  const kCurve = new THREE.CatmullRomCurve3(K, false, 'centripetal');
  kCurve.arcLengthDivisions = 3000;
  const kLen = kCurve.getLength();
  const KS = 240;
  const kR = smooth(Array.from({ length: KS + 1 }, (_, i) => radAt(cVerts, kCurve.getPointAt(i / KS), .07, .022)), 6).map(r => clamp(r * .9, .011, .04));
  const kRadius = u => { const x = clamp(u, 0, 1) * KS, i = Math.floor(x), f = x - i; return lerp(kR[i], kR[Math.min(KS, i + 1)], f); };
  const kU = p => { let bu = 0, bd = Infinity; for (let i = 0; i <= 2000; i++) { const d = kCurve.getPointAt(i / 2000).distanceToSquared(p); if (d < bd) { bd = d; bu = i / 2000; } } return bu; };

  // where things sit along the loop
  const kLCAend = kU(lca[lca.length - 1]);
  const kLADmid = kU(lad[Math.floor(lad.length * .45)]);
  const kSten = kU(lad[Math.floor(lad.length * .8)]);
  const kRCAmid = kU(rcaBack[Math.floor(rcaBack.length * .5)]);
  const kDiag = kU(P.diag.map(V)[0]);

  // ---------------- interior meshes ----------------
  const shared = {
    uFlow: { value: 0 }, uPulse: { value: 0 }, uBeatK: { value: reduce ? 0 : 1 }, uOpen: { value: 0 }, uTime: { value: 0 },
    uCam: { value: new THREE.Vector3() }, uLampUp: { value: new THREE.Vector3(0, 1, 0) }, uGlow: { value: new THREE.Vector3() }, uFog: { value: 9 }, uBeat: { value: 0 }, uBurn: { value: 1 },
  };
  const inside = new THREE.Group(); heart.add(inside);
  const tubes = [];
  const addTube = (curve, radius, opts = {}) => {
    const mat = wallMaterial(shared);
    const m = new THREE.Mesh(tubeGeo(curve, radius, opts), mat);
    m.frustumCulled = false; inside.add(m);
    const t = { mesh: m, mat, cuts: [], curve, radius };
    tubes.push(t); return t;
  };
  const cut = (t, o, d, r, len) => { const i = t.cuts.length; t.mat.uniforms.uCo.value[i].set(o.x, o.y, o.z, r); t.mat.uniforms.uCd.value[i].set(d.x, d.y, d.z, len); t.cuts.push(1); t.mat.uniforms.uNC.value = t.cuts.length; };

  const STEN_S = kSten * kLen;
  const aorta = addTube(aCurve, aRadius, { seg: 260, rad: 72 });
  const loopT = addTube(kCurve, kRadius, { seg: 1600, rad: 40, sten: s => Math.exp(-Math.pow((s - STEN_S) / .035, 2)) });

  // a side branch: a short tube leaving the loop at loop position u, along points pts
  const branch = (pts, r0, r1, uOn) => {
    const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const t = addTube(c, u => lerp(r0, r1, u), { seg: 120, rad: 32 });
    const O = kCurve.getPointAt(uOn), Tn = kCurve.getTangentAt(uOn), Rr = kRadius(uOn);
    // the branch's wall inside the loop's lumen goes; the loop's wall inside the branch goes
    cut(t, O.clone().addScaledVector(Tn, -Rr * 3), Tn, Rr * .97, Rr * 6);
    const d0 = c.getTangentAt(0), o0 = c.getPointAt(0);
    cut(loopT, o0, d0, r0 * .96, c.getLength() * .5);
    return t;
  };
  // circumflex: leaves the end of the left main, swinging back along the groove
  {
    const B = kCurve.getPointAt(kLCAend), tl = kCurve.getTangentAt(Math.max(0, kLCAend - .01)), td = kCurve.getTangentAt(Math.min(1, kLCAend + .02));
    const side = tl.clone().multiplyScalar(2).sub(td).normalize();
    const down = new THREE.Vector3(0, -1, 0);
    const r0 = kRadius(kLCAend) * .85;
    const pts = [B.clone()]; for (let i = 1; i <= 6; i++) pts.push(B.clone().addScaledVector(side, .045 * i).addScaledVector(down, .012 * i * i));
    branch(pts, r0, r0 * .7, kLCAend);
  }
  // diagonal branch off the LAD
  { const G = P.diag.map(V); const r0 = kRadius(kDiag) * .8; branch([kCurve.getPointAt(kDiag), ...G.slice(1)], r0, r0 * .6, kDiag); }
  // the right coronary carries on past the crux
  { const rest = rca.slice(jR); if (rest.length > 3) { const r0 = kRadius(.97) * .9; branch(rest, r0, r0 * .7, kU(rest[0])); } }

  // the aortic valve closes the root: three cusps that part on every beat
  const valveU = { ...shared, uOpenV: { value: 0 }, uR: { value: aRadius(1) } };
  const valve = new THREE.Mesh(new THREE.CircleGeometry(aRadius(1) * 1.02, 96), new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: valveU,
    vertexShader: `varying vec3 vW; varying vec2 vP; void main(){ vP = position.xy; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform vec3 uCam, uLampUp; uniform float uOpenV, uR, uFog; varying vec3 vW; varying vec2 vP;
      void main(){
        float r = length(vP) / uR, th = atan(vP.y, vP.x);
        // three cusps: each sags toward the centre; seams between them part when the valve opens
        float s3 = cos(3. * (th - .5236));
        float seam = abs(sin(1.5 * (th - .5236)));
        float orifice = uOpenV * (.62 + .2 * s3);
        float gap = smoothstep(.0, .05 + .3 * uOpenV, seam * r * 3.) ;
        float hole = 1. - smoothstep(orifice - .05, orifice + .02, r);
        float sag = 1. - r * r;
        vec3 leaf = mix(vec3(.62, .2, .2), vec3(.85, .45, .4), sag * .6) * (.75 + .25 * sin(th * 24. + r * 6.) * (1. - r));
        vec3 col = mix(vec3(.05, .004, .008), leaf, gap * (1. - hole));
        float dist = length(uCam - vW);
        float att = 1. / (1. + pow(dist / (uR * 5.), 2.));
        col *= att * 1.8;
        col = mix(col, vec3(.03, .002, .005), 1. - exp(-pow(dist / (uR * 1.3 * uFog / 7.), 1.5)));
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  valve.position.copy(aCurve.getPointAt(1));
  valve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), aCurve.getTangentAt(1).negate());
  inside.add(valve);

  // aorta and loop meet at both ostia
  const ostium = (uk, ua, flip) => {
    // the aortic wall opens along the artery's own curve as it leaves (it bends right away, so one
    // straight cut would leave a slab of aortic wall across the lumen): walk out along the artery
    // until well clear of the aorta and cut a short chain of cylinders that follows it
    const du = .002 / kLen * 2, pts = [];
    for (let j = 0; j < 400; j++) {
      const uu = clamp(uk + (flip ? -1 : 1) * j * du, 0, 1), q = kCurve.getPointAt(uu);
      pts.push(q);
      const ax = aCurve.getPointAt(aU(q));
      if (q.distanceTo(ax) > aRadius(aU(q)) * 1.5 && j > 3) break;
    }
    const nSeg = 3, per = Math.max(1, Math.ceil((pts.length - 1) / nSeg));
    for (let a = 0; a < pts.length - 1; a += per) {
      const b = Math.min(pts.length - 1, a + per), P0 = pts[a], P1 = pts[b];
      const d = P1.clone().sub(P0), len = d.length(); d.normalize();
      const r = Math.max(kRadius(kU(P0)), kRadius(kU(P1)));
      cut(aorta, P0.clone().addScaledVector(d, -.015), d, r * .98, len + .03);
    }
    const T = aCurve.getTangentAt(ua), ar = aRadius(ua), AO = aCurve.getPointAt(ua).addScaledVector(T, -ar * .9);
    cut(loopT, AO, T, ar * .98, ar * 1.8);
  };
  ostium(0, uL, false);
  ostium(1, uR, true);

  // ---------------- the door in: a point on the outer aortic wall ----------------
  const uE = aUy(.5);                                 // half way up the ascending aorta, its front face is clear
  const Ec = aCurve.getPointAt(uE), Et = aCurve.getTangentAt(uE);
  let En = new THREE.Vector3(.37, .24, .9).normalize(); En.addScaledVector(Et, -En.dot(Et)).normalize();
  const rE = radAt(aVerts, Ec, .3, .1);
  const Esurf = Ec.clone().addScaledVector(En, rE);
  const holeR = rE * .8;
  cut(aorta, Ec.clone().addScaledVector(En, rE * 3), En.clone().negate(), holeR * .92, rE * 2.6);

  // ---------------- the door out: a point on the right coronary a little past stop 5 ----------------
  // the way out is the way in played backwards: the camera backs out through the artery's outer wall,
  // looking back into it, and pulls away to the whole heart. Nothing else is cut open.
  // The right coronary runs in the groove under the right atrium, so 'straight away from the centre'
  // runs into the atrium a few cm out. The exit point and direction were measured by ray casting
  // against the model (runs\t290\v6\dirs2.js): 6 mm past stop 5, up and toward the front, every ray
  // in a 25 degree cone around it leaves the heart without touching anything.
  const kX = Math.min(.95, kRCAmid + .06 / kLen);
  const X0 = kCurve.getPointAt(kX), Xt = kCurve.getTangentAt(kX);
  const Xn = new THREE.Vector3(-.47, .70, .54); Xn.addScaledVector(Xt, -Xn.dot(Xt)).normalize();
  const rXo = Math.max(radAt(cVerts, X0, .07, .03), kRadius(kX) * 1.15);              // outer wall of the artery
  const Xsurf = X0.clone().addScaledVector(Xn, rXo);
  const holeX = rXo * .9;
  cut(loopT, X0.clone().addScaledVector(Xn, kRadius(kX) * 4), Xn.clone().negate(), kRadius(kX) * .85, kRadius(kX) * 3.2);

  // ---------------- the camera path: one spline, outside to inside and back out ----------------
  const out = (az, el, d) => C.clone().add(new THREE.Vector3(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d));
  const aPts = (u0, u1, n) => Array.from({ length: n + 1 }, (_, i) => aCurve.getPointAt(lerp(u0, u1, i / n)));
  const kPts = n => Array.from({ length: n + 1 }, (_, i) => kCurve.getPointAt(i / n));
  const entry = [
    out(.15, .1, 4.2), out(-.25, .3, 3.4), out(-.1, .55, 2.6),
    Esurf.clone().addScaledVector(En, 1.5), Esurf.clone().addScaledVector(En, 1.0),
    Esurf.clone().addScaledVector(En, .45), Esurf.clone().addScaledVector(En, .15),
    Ec.clone().addScaledVector(En, rE * .35).addScaledVector(Et, .02),
  ];
  const downA = aPts(uE + .04, uL - .01, 10);
  const loopP = kPts(220).slice(1).filter((_, i, a) => (i + 1) / 220 < kX - .004);
  const finalP = C.clone().add(new THREE.Vector3(.9, .45, 4.4));
  // the crane out swings round the heart on a sphere, so it never skims the muscle
  const crane = [.3, .55, .8].map(t => {
    const a = Xsurf.clone().addScaledVector(Xn, .7).sub(C), b = finalP.clone().sub(C);
    const q = new THREE.Quaternion().setFromUnitVectors(a.clone().normalize(), b.clone().normalize());
    const d = a.clone().normalize().applyQuaternion(new THREE.Quaternion().slerp(q, t));
    return C.clone().addScaledVector(d, lerp(a.length(), b.length(), t));
  });
  const exit = [
    X0.clone().addScaledVector(Xt, -.004),
    X0.clone().addScaledVector(Xn, kRadius(kX) * .35),
    Xsurf.clone().addScaledVector(Xn, .05),
    Xsurf.clone().addScaledVector(Xn, .25),
    Xsurf.clone().addScaledVector(Xn, .7),
    ...crane,
    finalP,
  ];
  const all = dedupe([...entry, ...downA, ...loopP, ...exit], .004);
  const route = new THREE.CatmullRomCurve3(all, false, 'centripetal');
  route.arcLengthDivisions = 6000;
  const rLen = route.getLength();
  const NS = 3000;
  // route samples: point, tangent and a parallel transported 'up', so the ride never flips
  const RS = { p: [], t: [], up: [] };
  {
    let up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i <= NS; i++) {
      const u = i / NS, p = route.getPointAt(u), t = route.getTangentAt(u);
      if (i) { const q = new THREE.Quaternion().setFromUnitVectors(RS.t[i - 1], t); up = up.clone().applyQuaternion(q); }
      up.addScaledVector(t, -up.dot(t)).normalize();
      RS.p.push(p); RS.t.push(t); RS.up.push(up.clone());
    }
  }
  const rIdx = u => clamp(Math.round(u * NS), 0, NS);
  const rUof = (p, a = 0, b = 1) => { let bu = 0, bd = Infinity; for (let i = rIdx(a); i <= rIdx(b); i++) { const d = RS.p[i].distanceToSquared(p); if (d < bd) { bd = d; bu = i / NS; } } return bu; };
  const rL0 = rUof(kCurve.getPointAt(.012));
  const rE_in = rUof(Ec.clone().addScaledVector(En, rE * .35).addScaledVector(Et, .02), 0, rL0);
  const rE_wall = rUof(Esurf, 0, rL0);
  const valveP = aCurve.getPointAt(.97);
  const rR1 = rUof(X0, rL0, 1);                       // end of the ride inside the coronaries
  const rEcUp = rR1;
  // the way out crosses the artery wall at Xsurf; rX_in is the last point on the artery's axis
  const rXw = rUof(Xsurf, rR1, 1);
  const rX_in = rUof(X0.clone().addScaledVector(Xn, kRadius(kX) * .35), rR1, 1);
  const ru = p => { let bu = 0, bd = Infinity; for (let i = rIdx(rL0); i <= rIdx(rR1); i++) { const d = RS.p[i].distanceToSquared(p); if (d < bd) { bd = d; bu = i / NS; } } return bu; };
  // stop positions on the route
  const S1 = rUof(aCurve.getPointAt(lerp(uE, uL, .45)), 0, rL0);
  const S2 = ru(kCurve.getPointAt(Math.max(0, kLCAend - .012)));
  const S3 = ru(kCurve.getPointAt(kLADmid));
  const S4 = ru(kCurve.getPointAt(kSten - .085 / kLen));
  const S5 = ru(kCurve.getPointAt(kRCAmid));
  // F knots → route position
  const rD1 = rUof(Esurf.clone().addScaledVector(En, 1.5), 0, rL0);
  const FK = [0, .5, .74, 1, 2, 3, 4, 5, 5.62, 6];
  const RK = [0, rD1, rE_in, S1, S2, S3, S4, S5, rXw + .004, 1];
  // the way out (F 5 > 6) is one move: leave stop 5 from rest, slide through the wall, then pull back
  // with the distance growing by the same ratio every step (it reads as a steady zoom out, never a whip)
  // and settle on the whole heart
  const outA = Math.max(1e-4, (rXw - S5) * rLen) + .05, outB = (1 - S5) * rLen, XA = .45;   // + .05: clear of the surface before the slow pull back
  const outL = Math.log(outB / outA), outP = Math.max(1.5, 2 * outL * XA / (1 - XA));
  const fOut = x => {
    const s = x < XA ? outA * Math.pow(x / XA, outP)
      : outA * Math.exp(outL * (1 - Math.pow(1 - (x - XA) / (1 - XA), 2)));
    return S5 + s / rLen;
  };
  // the moment the camera passes through the artery wall (in F past 5): there the picture sinks into
  // deep red for an instant, like pushing through tissue, and opens onto the heart outside
  const xCross = XA * Math.pow(((rXw - S5) * rLen) / outA, 1 / outP);
  const veil = document.createElement('div'); veil.className = 'heart-veil'; canvas.after(veil);
  let veilO = -1;
  const fToR = f => {
    f = clamp(f, 0, 6);
    if (f >= 5) return Math.min(1, fOut(f - 5));
    let i = 0; while (i < FK.length - 2 && f > FK[i + 1]) i++;
    const x = (f - FK[i]) / (FK[i + 1] - FK[i]);
    // between stops the camera eases out of one and into the next, with a short rest at each stop
    const stopToStop = i >= 3 && i <= 6;
    // segment 1 (door view > through the wall) starts gently and keeps its speed into the lumen
    // the way out mirrors it: leave stop 5 gently and speed up through the artery wall (segment 7), then
    // carry that speed out and ease into the whole heart (segment 8), so the wall crossing never lingers
    const e = stopToStop ? .5 - .5 * Math.cos(Math.PI * clamp((x - .1) / .82, 0, 1)) : i === 1 ? x * x * (3 - 2 * x) * .6 + x * .4 : i === 2 ? x * (2 - x)
      : i === 7 ? (x < .14 ? 0 : Math.pow((x - .14) / .86, 2.2)) : i === 8 ? 1 - Math.pow(1 - x, 2.6) : s5(x);
    return lerp(RK[i], RK[i + 1], e);
  };
  const insideAmt = u => sstep(rE_wall - .004, rE_in, u) * (1 - sstep(rX_in, rXw + .004, u));

  // ---------------- blood: cells and plasma streaming through ----------------
  const rStart = rE_in - .01, rEnd = rXw;
  const radiusAtR = (() => {   // vessel radius along the route (aorta or loop)
    const arr = new Float32Array(NS + 1);
    for (let i = 0; i <= NS; i++) {
      const u = i / NS;
      if (u >= rL0 && u <= rR1) { arr[i] = kRadius(kU(RS.p[i])); }
      else arr[i] = aRadius(aU(RS.p[i]));
    }
    return u => arr[rIdx(u)];
  })();
  // blood direction relative to the route: up the aorta, out along the left coronary, toward us elsewhere
  const rLADend = ru(kCurve.getPointAt(kU(lad[lad.length - 1])));
  const flowDir = u => (u < rL0 ? -1 : u < rLADend ? 1 : u < rR1 ? -1 : 1);
  const NCELL = 160;
  const cellMat = new THREE.MeshPhysicalMaterial({ color: 0xa50f18, roughness: .32, clearcoat: .7, clearcoatRoughness: .2, sheen: .7, sheenColor: new THREE.Color(0xff8070), emissive: 0x2a0202 });
  const cells = new THREE.InstancedMesh(cellGeometry(), cellMat, NCELL);
  cells.frustumCulled = false; heart.add(cells);
  const cellD = Array.from({ length: NCELL }, () => ({ b: Math.random(), a: Math.random() * Math.PI * 2, r: .28 + Math.pow(Math.random(), .7) * .55, sp: .75 + Math.random() * .5, ax: new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(), rot: Math.random() * 6, size: .8 + Math.random() * .45, wob: Math.random() * 6 }));
  const NDUST = 900;
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NDUST * 3), 3));
  const dustTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,230,220,1)'); g.addColorStop(.3, 'rgba(255,130,110,.5)'); g.addColorStop(1, 'rgba(255,60,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const dustMat = new THREE.PointsMaterial({ size: .004, map: dustTex, color: 0xff7a66, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; heart.add(dust);
  const dustD = Array.from({ length: NDUST }, () => ({ b: Math.random(), a: Math.random() * Math.PI * 2, r: Math.sqrt(Math.random()) * .9, sp: .6 + Math.random() * .8 }));

  // ---------------- the stent at stop 4 ----------------
  const stU = kSten, stP = kCurve.getPointAt(stU), stT = kCurve.getTangentAt(stU), stR = kRadius(stU);
  const stent = stentGroup(new THREE.MeshStandardMaterial({ color: 0xe6ecf2, metalness: 1, roughness: .18, envMapIntensity: 1.6 }));
  const stentPivot = new THREE.Group(); heart.add(stentPivot);
  stentPivot.position.copy(stP); stentPivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), stT);
  stentPivot.add(stent);
  const balloon = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1, 8, 24), new THREE.MeshPhysicalMaterial({ color: 0xcfe9ff, transparent: true, opacity: .32, roughness: .08, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }));
  balloon.rotation.x = Math.PI / 2; stentPivot.add(balloon);
  const ST_LEN = .075;
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: .9, roughness: .25 });
  const guide = new THREE.Mesh(new THREE.CylinderGeometry(.0007, .0007, .12, 8), wireMat); guide.rotation.x = Math.PI / 2; stentPivot.add(guide);

  // ---------------- frame ----------------
  const isPh = () => innerWidth < 900;
  let F = 0, Fs = 0, pointer = { x: 0, y: 0 }, ps = { x: 0, y: 0 }, introT = reduce ? 1 : 0, running = true;
  const live = { bpm: 64, ph: 0, lub: 0, stent: 0, scan: 0 };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), dummy = new THREE.Object3D(), look = new THREE.Vector3(), up = new THREE.Vector3();
  let t0 = performance.now(), flowPos = 0, lastNow = t0, holeOpen = 0;
  const Cw = new THREE.Vector3(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion();

  function frame(now) {
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - lastNow) / 1000); lastNow = now;
    if (Math.abs(F - Fs) > 1.2) Fs = F;                     // after a jump (menu link) don't replay the whole ride
    Fs += (F - Fs) * (reduce ? 1 : 1 - Math.exp(-dt * 2.6));
    ps.x += (pointer.x - ps.x) * .05; ps.y += (pointer.y - ps.y) * .05;
    const ph = isPh();

    // the beat: rate climbs at the stress test stop and settles after
    const bpmT = 64 + 64 * sstep(2.5, 2.95, Fs) * (1 - sstep(3.35, 3.8, Fs));
    const ck = tick(now, bpmT, reduce);
    const con = reduce ? 0 : contraction(ck.ph), atr = reduce ? 0 : atrial(ck.ph), prs = reduce ? 0 : pressure(ck.ph);
    live.bpm = ck.bpm; live.ph = ck.ph; live.lub = reduce ? 0 : lubdub(ck.ph);

    const u = fToR(Fs);
    const k = insideAmt(u);
    const deep = k > .999;

    // the heart turns slowly in the studio light while you are outside; still once you go in
    const outsideK = 1 - sstep(rE_wall - .05, rE_wall, u) * (1 - sstep(rXw, rXw + .05, u));
    // outside, the heart turns on its own centre (a slow studio turn, a little with the pointer)
    const turnK = reduce ? 0 : (1 - sstep(.3, .52, Fs)) + sstep(5.75, 6, Fs);
    const yaw = turnK * (Math.sin(t * .22) * .32 + ps.x * .3 + (Fs > 5 ? (Fs - 5.75) * 1.2 : -.15 + .5 * introT));
    heart.rotation.set(turnK * ps.y * .1, yaw, 0);
    heart.position.copy(C).sub(C.clone().applyEuler(heart.rotation));
    heart.scale.setScalar(1);
    model.visible = !deep;
    // on the way out: how far the camera has risen out of the right coronary, along the exit direction
    const hX = Fs > 5 ? RS.p[rIdx(u)].clone().sub(X0).dot(Xn) : 0;
    const shut = Fs > 5 ? sstep(rXo * 1.15, rXo * 1.7, hX) : 0;   // the opening closes once you are through
    inside.visible = u > rE_wall - .09 && u < rXw + .06 && shut < .999;
    heart.updateMatrixWorld(true);

    // camera on the route; outside it looks at the heart, inside it looks down the vessel
    const i = rIdx(u);
    const P0 = RS.p[i];
    camera.position.copy(P0);
    const aheadU = clamp(u + (deep ? .006 : .004), 0, 1);
    const ahead = route.getPointAt(aheadU);
    // inside, aim at the average of a few points further down the vessel, so the view turns
    // into a bend early and gently instead of snapping round it
    if (k > 0) {
      tmp2.copy(ahead);
      for (const d of [.009, .013]) tmp2.add(route.getPointAt(clamp(u + d, 0, 1)));
      ahead.lerp(tmp2.multiplyScalar(1 / 3), k);
    }
    // outside: the target is the heart's centre, moving to the door as you approach and away as you leave
    const toDoor = sstep(.2, .5, Fs);
    const outLook = C.clone().lerp(Esurf, clamp(toDoor, 0, 1));
    // on the way out you leave through the door like the end of a tunnel, then turn back to the heart
    const lookIn = sstep(rE_wall - .03, rE_in, u) * (1 - sstep(rXw - .004, rXw + .04, u));
    // on the way out the camera keeps facing forward (up the aorta and out through the door); the turn
    // back to the heart is done below as a smooth rotation, not by moving the target through the camera
    const exiting = u > rR1 - .006;
    look.lerpVectors(outLook, ahead, exiting ? 1 : lookIn);
    if (exiting) {
            // keep looking down the artery while sliding sideways out through the opening in its wall
      // (the tunnel stays in view, the wall's edge sweeps past), then turn to the heart
      // once through the wall, look back down at the artery you came out of while rising away from
      // it, then let the whole heart come into frame (every point on the way has clear space around it)
      const dOut = Math.max(0, hX);
      // climbing out: the view tilts up toward the opening like leaving through a hatch, then looks
      // back down at the artery from above
      tmp.copy(X0).addScaledVector(Xt, .1).addScaledVector(Xn, .07 * sstep(.28, .4, Fs - 5))
        .lerp(X0, s5(clamp((dOut - rXo * 1.5) / .1, 0, 1)));
      look.copy(tmp).lerp(C, s5(clamp((dOut - .1) / .45, 0, 1)));
    }
    // stop 1: look down at the aortic valve opening and closing, the two coronary openings beside it
    look.lerp(valveP, .5 * sstep(.76, .95, Fs) * (1 - sstep(1.12, 1.45, Fs)));
    // after the last stop: out of the right coronary into the aortic root, turn to face the valve and
    // rise backwards up the aorta and out through the door, pulling back to the whole heart
    // subtle hand held drift: never a still frame
    if (!reduce) {
      const R = deep ? radiusAtR(u) : Math.min(.12, camera.position.distanceTo(look) * .1);
      look.addScaledVector(RS.up[i], Math.sin(t * .6) * R * .15 + -ps.y * R * .25);
      tmp.crossVectors(RS.t[i], RS.up[i]).normalize();
      look.addScaledVector(tmp, Math.cos(t * .45) * R * .15 + ps.x * R * .3);
    }
    up.set(0, 1, 0).lerp(RS.up[i], lookIn).normalize();
    camera.up.copy(up);
    camera.lookAt(look);
    // a slow roll while travelling makes the ride feel like a ride
    const seg = Math.min(5, Math.floor(clamp(Fs, 0, 5.999))), segX = Fs - seg;
    const travel = seg >= 1 && seg <= 4 ? Math.sin(Math.PI * clamp((segX - .1) / .82, 0, 1)) : 0;
    if (!reduce) camera.rotateZ(travel * .14 * Math.sin(u * 40));
    // outside on the way out the lens widens with closeness, so the heart always fits the frame
    const dC = camera.position.distanceTo(C), fitFov = Math.min(74, 2 * Math.atan((ph ? 1.35 : 1.1) / dC) * 180 / Math.PI);
    const outFov = Fs > 5 ? Math.max(ph ? 40 : 30, fitFov) : (ph ? 40 : 30);
    camera.fov = lerp(outFov, ph ? 82 : 72, lookIn) + travel * 6;
    camera.near = lerp(.02, .0006, sstep(rE_wall - .1, rE_wall, u) * (1 - sstep(rXw, rXw + .1, u)));
    const W = innerWidth, H = innerHeight;
    // composition: on desktop the subject sits right of the text column; on phones above the text panel
    const heroK = 1 - sstep(.05, .5, Fs), endK = sstep(5.7, 6, Fs);
    const ox = ph ? 0 : (-.2 * heroK - .1 * (1 - heroK)) * W;
    const oy = ph ? lerp(lerp(.16, .22, lookIn) * (1 - heroK) + .1 * heroK, -.04, sstep(5.55, 5.9, Fs)) * H : 0;
    camera.setViewOffset(W, H, ox, oy, W, H);
    camera.updateProjectionMatrix();

    // the door: the aortic wall opens as you arrive and again as you leave
    const hOpen = sstep(.44, .64, Fs) * (1 - sstep(.72, .79, Fs));
    // on the way out the walls burn away around you: the outer aorta opens around the camera,
    // the inner walls dissolve from your end down toward the valve
    // on the way out the same door opens again as you reach it and closes once you are clear
    const hOut = Fs > 5 ? sstep(.33, .39, Fs - 5) * (1 - shut) : 0;
    const door = Math.max(hOpen, hOut);
    if (Fs < 3) U.uHole.value.set(Esurf.x, Esurf.y, Esurf.z, holeR * hOpen * 1.1);
    else if (Fs > 5.2 && Fs < 5.7) {
      // passing through the artery wall: the outer skin opens only right around the camera, so no piece
      // of it is ever inches from the lens; it closes beneath you as soon as you are through
      U.uHole.value.set(P0.x, P0.y, P0.z, rXo * 2.4 * (1 - sstep(rXo * .9, rXo * 1.5, hX)));
    } else U.uHole.value.set(0, 0, 0, 0);
    U.uHoleGlow.value = Fs < 3 ? 1 : 0;
    shared.uBurn.value = Fs < 3 ? 1 : 0;   // the way out: a plain opening, no glowing rim
    model.visible = !deep || door > .01;
    // the interior door cut only exists while the door is open
    aorta.mat.uniforms.uNC.value = hOpen > .01 ? aorta.cuts.length : aorta.cuts.length - 1;
    loopT.mat.uniforms.uNC.value = hOut > .01 ? loopT.cuts.length : loopT.cuts.length - 1;

    // exterior shader inputs
    U.uToModel.value.copy(model.matrixWorld).invert();
    U.uCw.value.copy(C).applyMatrix4(heart.matrixWorld);
    U.uCon.value = con; U.uAtr.value = atr; U.uPulse.value = prs;
    U.uFlow.value = ck.flow; U.uBeat.value = live.lub; U.uFlowAmt.value = reduce ? .2 : .55;
    kick.position.copy(C).add(new THREE.Vector3(Math.sin(t * .3) * 1.2, -1, 1.1));

    // interior shader inputs
    valveU.uOpenV.value = reduce ? 0 : con;
    valve.visible = Fs < 2.6;
    shared.uFlow.value = ck.flow; shared.uPulse.value = prs; shared.uTime.value = t; shared.uBeat.value = live.lub;
    shared.uCam.value.copy(camera.position); shared.uLampUp.value.copy(camera.up);
    shared.uGlow.value.copy(route.getPointAt(clamp(u + .03, 0, 1)));
    shared.uFog.value = deep ? 7 : 30;
    if (Fs < 3) tubes.forEach(tb => tb.mat.uniforms.uClip.value.set(Ec.x, Ec.y, Ec.z, deep ? 99 : rE * 3.5));
    else tubes.forEach(tb => tb.mat.uniforms.uClip.value.set(X0.x, X0.y, X0.z, deep ? 99 : rXo * 4));

    // the stent opens as you arrive at stop 4: balloon inflates, struts expand, balloon goes down
    const a4 = clamp((Fs - 3.62) / .4, 0, 1);
    const open = reduce ? (Fs > 3.5 ? 1 : 0) : sstep(.05, .7, a4);
    const bal = reduce ? 0 : sstep(0, .45, a4) * (1 - sstep(.65, 1, a4));
    live.stent = open; shared.uOpen.value = open;
    stentPivot.visible = inside.visible && Fs > 3.2 && Fs < 4.9;
    const sr = stR * lerp(.4, 1.0, open);
    stent.scale.set(sr, sr, ST_LEN);
    balloon.visible = bal > .01;
    const br = stR * lerp(.3, .93, bal);
    balloon.scale.set(br, ST_LEN * .6 / 2, br);
    guide.visible = Fs < 4.25;

    // blood
    const flowSpeed = (.35 + 2.4 * con) * ck.bpm / 64;
    flowPos += reduce ? 0 : dt * flowSpeed;
    const showB = reduce ? 0 : sstep(rE_wall, rE_in, u) * (1 - sstep(rXw - .01, rXw, u));
    cells.visible = showB > .01;
    if (cells.visible) {
      const Rc = radiusAtR(u), win = clamp(Rc * 40, .25, 1.6) / rLen, back = win * .12;
      const fd = flowDir(u);
      cellD.forEach((c, n) => {
        let uu = (c.b * win + fd * flowPos * c.sp * Rc * 2.2 / rLen) % win; if (uu < 0) uu += win;
        uu = clamp(u - back + uu, rStart, rEnd);
        const j = rIdx(uu), Rr = radiusAtR(uu);
        tmp2.crossVectors(RS.t[j], RS.up[j]);
        const a = c.a + Math.sin(t * .4 + c.wob) * .3;
        dummy.position.copy(RS.p[j]).addScaledVector(RS.up[j], Math.cos(a) * c.r * Rr).addScaledVector(tmp2, Math.sin(a) * c.r * Rr);
        dummy.quaternion.setFromAxisAngle(c.ax, c.rot + t * c.sp * 1.4);
        dummy.scale.setScalar(Rr * .055 * c.size * showB);
        dummy.updateMatrix(); cells.setMatrixAt(n, dummy.matrix);
      });
      cells.instanceMatrix.needsUpdate = true;
    }
    dust.visible = showB > .01;
    if (dust.visible) {
      const Rc = radiusAtR(u), win = clamp(Rc * 30, .2, 1.2) / rLen, back = win * .1, fd = flowDir(u);
      const arr = dustGeo.attributes.position.array;
      dustD.forEach((d, n) => {
        let uu = (d.b * win + fd * flowPos * d.sp * Rc * 3 / rLen) % win; if (uu < 0) uu += win;
        uu = clamp(u - back + uu, rStart, rEnd);
        const j = rIdx(uu), Rr = radiusAtR(uu);
        tmp2.crossVectors(RS.t[j], RS.up[j]);
        tmp.copy(RS.p[j]).addScaledVector(RS.up[j], Math.cos(d.a) * d.r * Rr).addScaledVector(tmp2, Math.sin(d.a) * d.r * Rr);
        arr[n * 3] = tmp.x; arr[n * 3 + 1] = tmp.y; arr[n * 3 + 2] = tmp.z;
      });
      dustGeo.attributes.position.needsUpdate = true;
      dustMat.size = Rc * .09;
      dustMat.opacity = .7 * showB;
    }

    // while sliding out through the artery wall the outer vessel is inches from the lens; hold the
    // exposure down so it stays deep red instead of washing out pale, then bring it back
    const crossK = Fs > 5 ? sstep(rR1, rX_in, u) * (1 - sstep(rXw + .02, rXw + .12, u)) : 0;
    renderer.toneMappingExposure = 1.15 - .45 * crossK;
    const vX = Fs - 5 - xCross, vK = Fs > 5 && !reduce ? 1 - (vX < 0 ? sstep(.03, .06, -vX) : sstep(.018, .048, vX)) : 0;
    if (Math.abs(vK - veilO) > .002) { veil.style.opacity = vK.toFixed(3); veilO = vK; }
    renderer.render(scene, camera);
    // the little route map shows progress through the vessels
    const prog = clamp((u - rE_in) / (rXw - rE_in), 0, 1);
    api.onFrame?.({ i: seg }, prog, live, Fs);
  }
  // after leaving the section, keep drawing until the eased camera has caught up with the scroll
  function loop(now) { if (running || Math.abs(F - Fs) > .002) frame(now); requestAnimationFrame(loop); }
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  if (!reduce) addEventListener('pointermove', e => { pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  requestAnimationFrame(loop);

  // the route map: the vessel part of the route, from the door to the way out
  const mapPts = [];
  for (let n = 0; n <= 240; n++) mapPts.push(route.getPointAt(lerp(rE_in, rXw, n / 240)));
  const mapStops = [S1, S2, S3, S4, S5].map(s => (s - rE_in) / (rXw - rE_in));
  const api = {
    setF(f) { F = f; },
    jump(f) { F = Fs = f; },
    intro(now) { if (now || reduce) { introT = 1; return; } window.gsap?.to({ v: 0 }, { v: 1, duration: 2.4, ease: 'expo.out', onUpdate() { introT = this.targets()[0].v; } }); },
    run(on) { running = on; },
    stops: [0, ...mapStops, 1],
    lenMM: (rXw - rE_in) * rLen * MM_PER_UNIT,
    live,
    project(p) { return mapPts[Math.round(clamp(p, 0, 1) * 240)].clone().sub(C); },
    onFrame: null,
    debug: { xCross, rX_in, rEcUp, tubes, cells, dust, valve, fToR, kCurve, kRadius, aRadius, kU, rL0, rR1, route, RS, rE_wall, rE_in, rXw, S: [S1, S2, S3, S4, S5], C, Esurf, aLen, kLen, model, aCurve, aU, A0: V(P.aorta[0]), A1: V(P.aorta[P.aorta.length - 1]) },
  };
  return api;
}
