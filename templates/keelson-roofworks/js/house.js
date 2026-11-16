// Keelson Roofworks: a Florida ranch house whose hip roof goes on as you scroll.
// Bare block walls in a storm -> trusses -> plywood deck -> peel-and-stick underlayment ->
// shingles course by course -> drip edge, gutters, hip and ridge caps -> the sky clears to a Gulf evening.
// Deck, underlayment and shingles are single merged meshes animated in the shader (one draw call each);
// trusses and caps are instanced. setProgress(p) drives everything from 0 to 1.
import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const outC = x => 1 - Math.pow(1 - clamp(x), 3);

/* ---------- the house in meters ---------- */
const K = 5 / 12;                       // 5/12 pitch
const HW = 8, HD = 5;                   // half footprint of the walls
const SLAB = .3, WALL = 3, Y0 = SLAB + WALL;
const OH = .55, EX = HW + OH, EZ = HD + OH;
const C = Math.sqrt(1 + K * K);
const YH = Y0 + .22;                    // top of the truss heel over the wall
const YE = YH - OH * K;                 // eave line
const YR = YH + HD * K;                 // ridge
const RX = HW - HD;                     // half ridge length
const LR = EZ * C;                      // slope length eave to ridge
const roofY = (x, z) => YH + K * Math.min(HD - Math.abs(z), HW - Math.abs(x));

/* stage windows on the 0..1 scroll, shared with the captions */
export const STAGES = [[.10, .24], [.24, .38], [.38, .52], [.52, .68], [.68, .80], [.80, .95]];
const st = (p, i, len = .86) => { const [a, b] = STAGES[i]; return clamp((p - a) / ((b - a) * len)); };

const V3 = THREE.Vector3;
const UP = new V3(0, 1, 0);

/* ---------- small canvas textures (no image downloads) ---------- */
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

/* ---------- geometry builder: flat-shaded triangles with per-piece attributes ---------- */
class Builder {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.o = []; this.pv = []; this.u = []; }
  tri(a, b, c, col, ord, piv, us = [0, 0, 0], uvs = null) {
    const n = new V3().subVectors(b, a).cross(new V3().subVectors(c, a));
    if (n.lengthSq() < 1e-12) return;
    n.normalize();
    [a, b, c].forEach((v, i) => {
      this.p.push(v.x, v.y, v.z); this.n.push(n.x, n.y, n.z); this.c.push(col.r, col.g, col.b);
      this.o.push(ord); this.pv.push(piv.x, piv.y, piv.z); this.u.push(us[i]);
      const t = uvs ? uvs[i] : [0, 0]; this.uv.push(t[0], t[1]);
    });
  }
  geo() {
    const g = new THREE.BufferGeometry(), F = THREE.Float32BufferAttribute;
    g.setAttribute('position', new F(this.p, 3)); g.setAttribute('normal', new F(this.n, 3));
    g.setAttribute('color', new F(this.c, 3)); g.setAttribute('uv', new F(this.uv, 2));
    g.setAttribute('aOrder', new F(this.o, 1)); g.setAttribute('aPivot', new F(this.pv, 3)); g.setAttribute('aU', new F(this.u, 1));
    g.computeBoundingSphere();
    return g;
  }
}

/* a roof face: origin on the eave, u along the eave, v up the slope, n out of the roof */
function face(o, u, v, poly) {
  const n = new V3().crossVectors(u, v).normalize();
  return { o, u, v, n, poly, pt(U, V, h) { return new V3().copy(o).addScaledVector(u, U).addScaledVector(v, V).addScaledVector(n, h); } };
}
const trap = [[-EX, 0], [EX, 0], [RX, LR], [-RX, LR]];
const tri3 = [[-EZ, 0], [EZ, 0], [0, LR]];
const FACES = [
  face(new V3(0, YE, EZ), new V3(1, 0, 0), new V3(0, K, -1).divideScalar(C), trap),
  face(new V3(0, YE, -EZ), new V3(-1, 0, 0), new V3(0, K, 1).divideScalar(C), trap),
  face(new V3(EX, YE, 0), new V3(0, 0, -1), new V3(-1, K, 0).divideScalar(C), tri3),
  face(new V3(-EX, YE, 0), new V3(0, 0, 1), new V3(1, K, 0).divideScalar(C), tri3),
];

// Sutherland-Hodgman: clip a polygon to a convex CCW polygon
function clipPoly(subject, clip) {
  let out = subject;
  for (let i = 0; i < clip.length && out.length; i++) {
    const A = clip[i], B = clip[(i + 1) % clip.length], inp = out; out = [];
    const side = P => (B[0] - A[0]) * (P[1] - A[1]) - (B[1] - A[1]) * (P[0] - A[0]);
    for (let j = 0; j < inp.length; j++) {
      const P = inp[j], Q = inp[(j + 1) % inp.length], sp = side(P), sq = side(Q);
      if (sp >= 0) out.push(P);
      if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
    }
  }
  return out;
}
const area = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };

// one piece (plywood sheet, membrane strip, shingle tab): clipped to the face, extruded off it
function piece(b, f, rect, hBase, hTop, col, ord, opt = {}) {
  const poly = clipPoly([[rect[0], rect[2]], [rect[1], rect[2]], [rect[1], rect[3]], [rect[0], rect[3]]], f.poly);
  if (poly.length < 3 || area(poly) < 2e-3) return;
  let cu = 0, cv = 0; poly.forEach(p => { cu += p[0]; cv += p[1]; }); cu /= poly.length; cv /= poly.length;
  const piv = f.pt(cu, cv, hBase);
  const Bv = poly.map(p => f.pt(p[0], p[1], hBase));
  const Tv = poly.map(p => f.pt(p[0], p[1], hTop(p[0], p[1])));
  const umin = f.poly[0][0], umax = f.poly[1][0];
  const au = poly.map(p => (p[0] - umin) / (umax - umin));
  const uv = poly.map(p => opt.uv ? opt.uv(p[0], p[1]) : [0, 0]);
  for (let i = 1; i < poly.length - 1; i++) b.tri(Tv[0], Tv[i], Tv[i + 1], col, ord, piv, [au[0], au[i], au[i + 1]], [uv[0], uv[i], uv[i + 1]]);
  if (opt.sides === false) return;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    b.tri(Bv[i], Bv[j], Tv[j], col, ord, piv); b.tri(Bv[i], Tv[j], Tv[i], col, ord, piv);
  }
}

// shader patch: pieces drop into place in order (drop) or unroll along the strip (roll)
function animMat(mat, kind, castShadow) {
  const U = { uProg: { value: 0 }, uCount: { value: 1 }, uDrop: { value: new V3(0, 2.2, 0) } };
  const vert = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aOrder; attribute vec3 aPivot; attribute float aU;
        uniform float uProg; uniform float uCount; uniform vec3 uDrop;
        varying float vAU; varying float vAR;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float aR = uProg * uCount - aOrder; vAU = aU; vAR = aR;
        ${kind === 'drop' ? `
        float aE = clamp(aR * 1.6, 0.0, 1.0); aE = 1.0 - pow(1.0 - aE, 3.0);
        if (aR <= 0.0) transformed = aPivot;
        else transformed = aPivot + (transformed - aPivot) * (0.75 + 0.25 * aE) + uDrop * (1.0 - aE) * (1.0 - aE);` : ''}`);
    if (kind === 'roll') sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vAU; varying float vAR;`)
      .replace('void main() {', `void main() {
        if (vAR <= 0.0 || vAU > clamp(vAR * 1.15, 0.0, 1.0)) discard;`);
  };
  mat.onBeforeCompile = vert;
  mat.customProgramCacheKey = () => 'anim-' + kind;
  let depth = null;
  if (castShadow) {
    depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    depth.onBeforeCompile = vert;
    depth.customProgramCacheKey = () => 'animd-' + kind;
  }
  return { mat, depth, U };
}

/* ---------- merge plain geometries (walls, frames, trim) ---------- */
function merge(list) {
  const pos = [], nor = [];
  list.forEach(g => {
    const n = g.index ? g.toNonIndexed() : g;
    pos.push(...n.attributes.position.array); nor.push(...n.attributes.normal.array);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.computeBoundingSphere();
  return g;
}
const boxAt = (sx, sy, sz, x, y, z, ry = 0) => { const g = new THREE.BoxGeometry(sx, sy, sz); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };

/* ======================================================================== */
export function buildHouse(renderer, { lite = false } = {}) {
  const root = new THREE.Group();
  const anim = {};

  /* ---------- materials ---------- */
  const stucco = new THREE.MeshStandardMaterial({ color: 0xf1e9dc, roughness: .92 });
  const stuccoIn = new THREE.MeshStandardMaterial({ color: 0xd8cfbf, roughness: .95 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xb9b3a8, roughness: .95 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xf6f3ec, roughness: .55 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xe9e7e1, roughness: .32, metalness: .55 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x223040, roughness: .05, metalness: .55, envMapIntensity: 1.4 });
  const door = new THREE.MeshStandardMaterial({ color: 0x2f5a5d, roughness: .45 });

  /* ---------- ground, slab, drive ---------- */
  const groundTex = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#7a7d66'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = rnd(); x.fillStyle = `rgba(${50 + v * 60 | 0},${58 + v * 55 | 0},${40 + v * 30 | 0},${.16 + v * .2})`; x.fillRect(rnd() * w, rnd() * h, 2, 2); }
  });
  groundTex.repeat.set(150, 150);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(420, 64), new THREE.MeshStandardMaterial({ color: 0x9a9d78, map: groundTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);

  // soft contact shadow so the house sits down on the lawn whatever the light
  const blob = canvasTex(256, 256, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(.55, 'rgba(0,0,0,.32)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }, false);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false, opacity: .9 }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = .015; contact.renderOrder = 1; root.add(contact);

  const slab = new THREE.Mesh(boxAt(2 * HW + .5, SLAB, 2 * HD + .5, 0, SLAB / 2, 0), concrete);
  slab.receiveShadow = slab.castShadow = true; root.add(slab);
  const drive = new THREE.Mesh(merge([boxAt(5.6, .06, 10, 4.6, .03, HD + 5.2), boxAt(1.2, .05, 4.4, -.4, .025, HD + 2.4), boxAt(4.2, .05, 1.2, 1.5, .025, HD + 4)]), concrete);
  drive.receiveShadow = true; root.add(drive);

  /* ---------- block walls with openings ---------- */
  const T = .24;
  // openings along each wall: [center, width, sill, height]
  const OPEN = {
    front: [[-5.4, 1.7, .95, 1.55], [-2.6, 1.2, .95, 1.55], [-.4, 1.05, 0, 2.35], [4.6, 5.2, 0, 2.45]],
    back: [[-5.8, 1.6, .95, 1.55], [-1.6, 3.2, 0, 2.35], [3, 1.6, .95, 1.55], [5.8, 1.1, 1.3, 1.1]],
    right: [[-2.2, 1.2, .95, 1.4]],
    left: [[-2.4, 1.6, .95, 1.55], [2.4, 1.6, .95, 1.55]],
  };
  const wallParts = [], frameParts = [], glassParts = [], doorParts = [], garageParts = [];
  // len: wall length along its axis; place(x along, y, offset into the wall) -> world
  function wall(len, openings, toWorld) {
    const ops = [...openings].sort((a, b) => a[0] - b[0]);
    let x = -len / 2;
    const seg = (x0, x1, y0, y1) => { if (x1 - x0 < .01 || y1 - y0 < .01) return; wallParts.push(toWorld(x0, x1, y0 + SLAB, y1 + SLAB, 0, T)); };
    ops.forEach(([c, w, s, h]) => {
      const a = c - w / 2, b2 = c + w / 2;
      seg(x, a, 0, WALL); seg(a, b2, 0, s); seg(a, b2, s + h, WALL); x = b2;
      // frame, glass or door in the opening
      const fr = .07;
      if (s > 0 || w < 4) {
        frameParts.push(toWorld(a, b2, s + SLAB, s + SLAB + fr, .02, .14), toWorld(a, b2, s + h + SLAB - fr, s + h + SLAB, .02, .14),
          toWorld(a, a + fr, s + SLAB, s + h + SLAB, .02, .14), toWorld(b2 - fr, b2, s + SLAB, s + h + SLAB, .02, .14));
        if (w > 1.4) frameParts.push(toWorld(c - .025, c + .025, s + SLAB, s + h + SLAB, .03, .1));
        if (s > 0) frameParts.push(toWorld(a - .08, b2 + .08, s + SLAB - .07, s + SLAB, -.06, .14));
        if (s === 0 && w < 1.5) doorParts.push(toWorld(a + fr, b2 - fr, SLAB, s + h + SLAB - fr, .05, .06));
        else glassParts.push(toWorld(a + fr, b2 - fr, s + SLAB + fr, s + h + SLAB - fr, .08, .02));
      } else {
        garageParts.push(toWorld(a, b2, SLAB, s + h + SLAB, .06, .08));
        for (let k = 1; k < 4; k++) frameParts.push(toWorld(a + .05, b2 - .05, SLAB + k * h / 4 - .015, SLAB + k * h / 4 + .015, .02, .02));
      }
    });
    seg(x, len / 2, 0, WALL);
  }
  // each wall maps (along0, along1, y0, y1, inset from the outer face, depth) to a box
  wall(2 * HW, OPEN.front, (a, b, y0, y1, i, d) => boxAt(b - a, y1 - y0, d, (a + b) / 2, (y0 + y1) / 2, HD - i - d / 2));
  wall(2 * HW, OPEN.back, (a, b, y0, y1, i, d) => boxAt(b - a, y1 - y0, d, -(a + b) / 2, (y0 + y1) / 2, -HD + i + d / 2));
  wall(2 * HD - 2 * T, OPEN.right, (a, b, y0, y1, i, d) => boxAt(d, y1 - y0, b - a, HW - i - d / 2, (y0 + y1) / 2, -(a + b) / 2));
  wall(2 * HD - 2 * T, OPEN.left, (a, b, y0, y1, i, d) => boxAt(d, y1 - y0, b - a, -HW + i + d / 2, (y0 + y1) / 2, (a + b) / 2));
  const walls = new THREE.Mesh(merge(wallParts), stucco);
  walls.castShadow = walls.receiveShadow = true; root.add(walls);
  // interior partitions: what you see from above before the trusses go on
  const inner = new THREE.Mesh(merge([boxAt(.14, WALL, 2 * HD - .5, 2, SLAB + WALL / 2, 0), boxAt(.14, WALL, 6, -2.2, SLAB + WALL / 2, -1.8),
    boxAt(5.6, WALL, .14, -5, SLAB + WALL / 2, -.6), boxAt(3.8, WALL, .14, -.1, SLAB + WALL / 2, 1.2)]), stuccoIn);
  inner.castShadow = inner.receiveShadow = true; root.add(inner);
  // bond beam: the concrete band on top of the block that the truss straps tie into
  const beam = new THREE.Mesh(merge([boxAt(2 * HW, .2, T + .02, 0, Y0 - .1, HD - T / 2), boxAt(2 * HW, .2, T + .02, 0, Y0 - .1, -HD + T / 2),
    boxAt(T + .02, .2, 2 * HD, HW - T / 2, Y0 - .1, 0), boxAt(T + .02, .2, 2 * HD, -HW + T / 2, Y0 - .1, 0)]), new THREE.MeshStandardMaterial({ color: 0xd9d0c0, roughness: .9 }));
  beam.castShadow = true; root.add(beam);
  const frames = new THREE.Mesh(merge(frameParts), trim); frames.castShadow = true; root.add(frames);
  root.add(new THREE.Mesh(merge(glassParts), glass));
  root.add(new THREE.Mesh(merge(doorParts), door));
  const garage = new THREE.Mesh(merge(garageParts), trim); garage.receiveShadow = true; root.add(garage);

  /* ---------- trusses, hip rafters, jacks: instanced lumber ---------- */
  const members = [];
  const mem = (a, b, t, ord) => members.push({ a, b, t, ord });
  const dn = .09;   // top chords sit just under the deck
  const ordX = x => clamp((x + EX) / (2 * EX));
  for (let x = -HW + .3; x <= HW - .29; x += .61) {
    const zf = Math.max(0, Math.abs(x) - RX);   // flat top on the hip-set trusses
    const top = z => new V3(x, roofY(x, z) - dn, z);
    const o = ordX(x);
    mem(top(-EZ), top(-zf), .07, o); mem(top(zf), top(EZ), .07, o);
    if (zf > .02) mem(top(-zf), top(zf), .07, o);
    mem(new V3(x, Y0 + .04, -HD), new V3(x, Y0 + .04, HD), .07, o);
    const web = (z0, z1) => { const tz = top(z1); if (tz.y - Y0 > .3) mem(new V3(x, Y0 + .04, z0), tz, .05, o); };
    web(0, 0); web(-2.5, -1.25); web(2.5, 1.25); web(-2.5, -3.75); web(2.5, 3.75);
  }
  // hip rafters and the jacks on the two ends
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => mem(new V3(sx * EX, YE - dn, sz * EZ), new V3(sx * RX, YR - dn, 0), .09, sx < 0 ? .02 : .98)));
  mem(new V3(-RX, YR - dn, 0), new V3(RX, YR - dn, 0), .1, .5);
  for (let z = -HD + .3; z <= HD - .29; z += .61) [-1, 1].forEach(sx => {
    const xi = RX + Math.abs(z);
    mem(new V3(sx * EX, roofY(EX, z) - dn, z), new V3(sx * xi, roofY(xi, z) - dn, z), .06, sx < 0 ? .03 : .97);
  });
  const wood = new THREE.MeshStandardMaterial({ color: 0xd8b98a, roughness: .78 });
  const box1 = new THREE.BoxGeometry(1, 1, 1);
  const truss = new THREE.InstancedMesh(box1, wood, members.length);
  truss.castShadow = truss.receiveShadow = true; truss.frustumCulled = false; root.add(truss);
  const tcol = new THREE.Color();
  const tBase = members.map((m, i) => {
    const d = new V3().subVectors(m.b, m.a), L = d.length(); d.normalize();
    truss.setColorAt(i, tcol.setHSL(.09, .42, .62 + (rnd() - .5) * .08));
    return { p: new V3().addVectors(m.a, m.b).multiplyScalar(.5), q: new THREE.Quaternion().setFromUnitVectors(UP, d), s: new V3(m.t, L, m.t * 1.6), ord: m.ord };
  });
  const M = new THREE.Matrix4(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0), TP = new V3();
  function setTruss(P) {
    tBase.forEach((m, i) => {
      const lp = clamp((P - m.ord * .78) / .22);
      if (lp <= 0) { truss.setMatrixAt(i, ZERO); return; }
      const e = outC(lp);
      TP.copy(m.p); TP.y += (1 - e) * 3.2;
      truss.setMatrixAt(i, M.compose(TP, m.q, m.s));
    });
    truss.instanceMatrix.needsUpdate = true;
  }

  /* ---------- fascia and soffit, with the deck ---------- */
  const fasciaG = merge([
    boxAt(2 * EX + .08, .24, .05, 0, YE - .1, EZ + .02), boxAt(2 * EX + .08, .24, .05, 0, YE - .1, -EZ - .02),
    boxAt(.05, .24, 2 * EZ + .08, EX + .02, YE - .1, 0), boxAt(.05, .24, 2 * EZ + .08, -EX - .02, YE - .1, 0)]);
  const soffitShape = new THREE.Shape([new THREE.Vector2(-EX, -EZ), new THREE.Vector2(EX, -EZ), new THREE.Vector2(EX, EZ), new THREE.Vector2(-EX, EZ)]);
  soffitShape.holes.push(new THREE.Path([new THREE.Vector2(-HW, -HD), new THREE.Vector2(-HW, HD), new THREE.Vector2(HW, HD), new THREE.Vector2(HW, -HD)]));
  const soffitG = new THREE.ShapeGeometry(soffitShape); soffitG.rotateX(Math.PI / 2); soffitG.translate(0, YE - .2, 0);
  const fascia = new THREE.Group();
  const fm = new THREE.Mesh(fasciaG, trim); fm.castShadow = true;
  const sm = new THREE.Mesh(soffitG, trim);
  fascia.add(fm, sm); root.add(fascia);

  /* ---------- plywood deck: 4x8 sheets, staggered, row by row ---------- */
  const plyTex = canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = '#d9b47e'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(${120 + rnd() * 40 | 0},${80 + rnd() * 30 | 0},40,${.08 + rnd() * .14})`; x.lineWidth = 1 + rnd() * 2; const y = rnd() * h; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * .3, y + (rnd() - .5) * 14, w * .7, y + (rnd() - .5) * 14, w, y + (rnd() - .5) * 8); x.stroke(); }
    x.strokeStyle = 'rgba(70,50,30,.5)'; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2);
    x.fillStyle = 'rgba(60,50,40,.35)'; for (let i = 1; i < 8; i++) x.fillRect(i * w / 8, 6, 2, 2);
  }, false);
  const deckB = new Builder();
  let deckMax = 0;
  const pc = new THREE.Color();
  FACES.forEach((f, fi) => {
    const umin = f.poly[0][0], umax = f.poly[1][0];
    for (let r = 0, v = 0; v < LR; r++, v += 1.22) {
      const off = (r % 2) * 1.22 + fi * .37;
      for (let u = umin - off; u < umax; u += 2.44) {
        const ord = r + clamp((u - umin) / (umax - umin)) * .8;
        deckMax = Math.max(deckMax, ord);
        pc.setRGB(1, 1, 1).multiplyScalar(.9 + rnd() * .14);
        const u0 = u, v0 = v;
        piece(deckB, f, [u + .006, u + 2.434, v + .006, v + 1.214], 0, () => .035, pc, ord, { uv: (U, V) => [(U - u0) / 2.44, (V - v0) / 1.22] });
      }
    }
  });
  const deckA = animMat(new THREE.MeshStandardMaterial({ vertexColors: true, map: plyTex, roughness: .82 }), 'drop', true);
  deckA.U.uCount.value = deckMax + .7; deckA.U.uDrop.value.set(0, 1.6, 0);
  const deck = new THREE.Mesh(deckB.geo(), deckA.mat); deck.customDepthMaterial = deckA.depth;
  deck.castShadow = deck.receiveShadow = true; deck.frustumCulled = false; root.add(deck);

  /* ---------- peel-and-stick underlayment: strips rolled out along each slope ---------- */
  const memTex = canvasTex(512, 64, (x, w, h) => {
    x.fillStyle = '#39434d'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${rnd() * .04})`; x.fillRect(rnd() * w, rnd() * h, 2, 1); }
    x.fillStyle = 'rgba(230,236,240,.35)'; x.fillRect(0, 7, w, 1.5);
    x.fillStyle = 'rgba(230,236,240,.18)'; for (let i = 0; i < w; i += 64) x.fillRect(i + 10, h - 16, 26, 2);
  });
  const memB = new THREE.Color(1, 1, 1);
  const ulB = new Builder();
  let ulMax = 0;
  FACES.forEach(f => {
    const umin = f.poly[0][0], umax = f.poly[1][0];
    for (let r = 0, v = 0; v < LR; r++, v += .9) {
      ulMax = Math.max(ulMax, r);
      const v0 = v;
      piece(ulB, f, [umin - .05, umax + .05, v - .02, v + .98], 0, () => .04 + r * .0002, memB, r, { sides: false, uv: (U, V) => [U / 3, (V - v0) / 1.0] });
    }
  });
  const ulA = animMat(new THREE.MeshStandardMaterial({ vertexColors: true, map: memTex, roughness: .48, metalness: .05 }), 'roll', false);
  ulA.U.uCount.value = ulMax + 1.05;
  const under = new THREE.Mesh(ulB.geo(), ulA.mat); under.receiveShadow = true; under.frustumCulled = false; root.add(under);

  /* ---------- architectural shingles: one course after another, eave to ridge ---------- */
  const granTex = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#d9d9d9'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 4200; i++) { const v = 150 + rnd() * 105 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(rnd() * w, rnd() * h, 1.4, 1.4); }
  });
  const SHC = [0x5a5f64, 0x565b60, 0x60656a, 0x52575c, 0x5d5b58, 0x63676b].map(h => new THREE.Color(h));
  const shB = new Builder();
  const EXP = .2, TAB = .44, TH = .028;
  let shMax = 0;
  FACES.forEach(f => {
    const umin = f.poly[0][0], umax = f.poly[1][0];
    for (let k = 0, v = -.03; v < LR - .05; k++, v += EXP) {
      let u = umin - .02 - rnd() * .3;
      while (u < umax) {
        const w = .28 + rnd() * .3;
        const ord = k + clamp((u - umin) / (umax - umin)) * .9;
        shMax = Math.max(shMax, ord);
        const v0 = v, v1 = v + TAB, base = .046;
        const tab = rnd() < .18 ? TH * 1.5 : TH;
        pc.copy(SHC[(rnd() * SHC.length) | 0]).multiplyScalar(.94 + rnd() * .1);
        piece(shB, f, [u, u + w - .012, v0, v1], base, (U, V) => base + tab * (1 - (V - v0) / (v1 - v0)) + k * .0004, pc, ord, { uv: (U, V) => [U * .8, V * .8] });
        u += w;
      }
    }
  });
  const shA = animMat(new THREE.MeshStandardMaterial({ vertexColors: true, map: granTex, roughness: .93 }), 'drop', true);
  shA.U.uCount.value = shMax + .7; shA.U.uDrop.value.set(0, .9, 0);
  const shingles = new THREE.Mesh(shB.geo(), shA.mat); shingles.customDepthMaterial = shA.depth;
  shingles.castShadow = shingles.receiveShadow = true; shingles.frustumCulled = false; root.add(shingles);

  /* ---------- hip and ridge caps ---------- */
  const capG = (() => {
    const a = Math.atan(K) * .9, wgt = .2;
    const w1 = new THREE.BoxGeometry(.34, .03, wgt); w1.translate(0, 0, wgt / 2); w1.rotateX(a);
    const w2 = new THREE.BoxGeometry(.34, .03, wgt); w2.translate(0, 0, -wgt / 2); w2.rotateX(-a);
    return merge([w1, w2]);
  })();
  const caps = [];
  const nF = FACES.map(f => f.n);
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
    const a = new V3(sx * EX, YE + .09, sz * EZ), b = new V3(sx * RX, YR + .09, 0);
    const d = new V3().subVectors(b, a); const L = d.length(); d.normalize();
    const nn = new V3().addVectors(nF[sz > 0 ? 0 : 1], nF[sx > 0 ? 2 : 3]).normalize();
    for (let s = .1; s < L; s += .3) caps.push({ p: new V3().copy(a).addScaledVector(d, s), d: d.clone(), n: nn, ord: s / L * .7 });
  }));
  for (let x = -RX; x <= RX + .01; x += .3) caps.push({ p: new V3(x, YR + .1, 0), d: new V3(1, 0, 0), n: UP, ord: .7 + (1 - Math.abs(x) / RX) * .3 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x4e5357, map: granTex, roughness: .9 });
  const capMesh = new THREE.InstancedMesh(capG, capMat, caps.length);
  capMesh.castShadow = true; capMesh.frustumCulled = false; root.add(capMesh);
  const capBase = caps.map(c => {
    const X = c.d, Z = new V3().crossVectors(X, c.n).normalize(), Y = new V3().crossVectors(Z, X);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    return { p: c.p, q, ord: c.ord };
  });
  const ONE = new V3(1, 1, 1);
  function setCaps(P) {
    capBase.forEach((c, i) => {
      const lp = clamp((P - c.ord * .8) / .2);
      if (lp <= 0) { capMesh.setMatrixAt(i, ZERO); return; }
      const e = outC(lp); TP.copy(c.p); TP.y += (1 - e) * .8;
      capMesh.setMatrixAt(i, M.compose(TP, c.q, ONE));
    });
    capMesh.instanceMatrix.needsUpdate = true;
  }

  /* ---------- drip edge, gutters, downspouts ---------- */
  const edges = [];
  const edge = (len, mk) => { const m = new THREE.Mesh(mk(), metal); m.castShadow = true; root.add(m); edges.push({ m, len }); return m; };
  const dripF = edge(2 * EX, () => boxAt(1, .07, .06, 0, 0, 0)); dripF.position.set(0, YE + .02, EZ + .05);
  const dripB = edge(2 * EX, () => boxAt(1, .07, .06, 0, 0, 0)); dripB.position.set(0, YE + .02, -EZ - .05);
  const dripR = edge(2 * EZ, () => boxAt(.06, .07, 1, 0, 0, 0)); dripR.position.set(EX + .05, YE + .02, 0);
  const dripL = edge(2 * EZ, () => boxAt(.06, .07, 1, 0, 0, 0)); dripL.position.set(-EX - .05, YE + .02, 0);
  const gutG = () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(.16, 0); s.lineTo(.2, .16); s.lineTo(.18, .16); s.lineTo(.145, .02); s.lineTo(.015, .02); s.lineTo(.0, .16); s.lineTo(-.02, .16); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -.5); g.rotateY(Math.PI / 2); return g; };
  const gutF = edge(2 * EX, gutG); gutF.position.set(0, YE - .22, EZ + .2); gutF.rotation.y = Math.PI;
  const gutB = edge(2 * EX, gutG); gutB.position.set(0, YE - .22, -EZ - .2);
  const spouts = new THREE.Mesh(merge([boxAt(.09, YE - .2, .07, -EX + .3, (YE - .2) / 2, EZ + .2), boxAt(.09, YE - .2, .07, EX - .3, (YE - .2) / 2, EZ + .2),
    boxAt(.09, YE - .2, .07, -EX + .3, (YE - .2) / 2, -EZ - .2), boxAt(.09, YE - .2, .07, EX - .3, (YE - .2) / 2, -EZ - .2)]), metal);
  spouts.castShadow = true; root.add(spouts);
  function setEdges(P) {
    edges.forEach((e, i) => {
      const lp = ss(clamp((P - i * .06) / .55));
      e.m.visible = lp > .002;
      if (e.m === dripR || e.m === dripL) e.m.scale.set(1, 1, Math.max(.001, lp * e.len));
      else e.m.scale.set(Math.max(.001, lp * e.len), 1, 1);
    });
    spouts.visible = P > .55; spouts.scale.y = ss((P - .55) / .3) || .001; spouts.position.y = 0;
  }

  /* ---------- palms and shrubs ---------- */
  const frondTex = canvasTex(256, 64, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.strokeStyle = '#6e7b44'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
    for (let i = 6; i < w - 4; i += 5) {
      const L = (h / 2 - 2) * Math.sin(Math.PI * Math.min(1, (i / w) * 1.15)) * (.75 + rnd() * .25);
      x.strokeStyle = `rgb(${70 + rnd() * 30 | 0},${100 + rnd() * 30 | 0},${50 + rnd() * 20 | 0})`; x.lineWidth = 2.2;
      x.beginPath(); x.moveTo(i, h / 2); x.lineTo(i + 10, h / 2 - L); x.moveTo(i, h / 2); x.lineTo(i + 10, h / 2 + L); x.stroke();
    }
  }, false);
  const frondMat = new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: .5, side: THREE.DoubleSide, roughness: .8, color: 0xc9d6b0 });
  const frondG = (() => {
    const g = new THREE.PlaneGeometry(3.2, 1.1, 12, 2); g.translate(1.5, 0, 0); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, -Math.pow(x / 3.2, 2) * 1.6 + x * .3 - Math.abs(z) * .4); }
    g.computeVertexNormals(); return g;
  })();
  const bark = new THREE.MeshStandardMaterial({ color: 0x8f877a, roughness: 1 });
  const palms = [];
  [[-13.2, 3.2, 7.6, .2], [12.2, -6.6, 9.2, 2.1], [-12.4, -6.4, 6.2, 4], [11.6, 8.8, 6.8, 5.2],
   [-30, -24, 8.5, 1], [26, -30, 10.5, 2], [40, -8, 8, 3], [-42, 4, 9.5, 4], [-20, -44, 8.2, 5], [44, -30, 9.8, 6], [8, -52, 11, 1.4], [-48, -26, 7.4, .7]].forEach(([x, z, h, rot], i) => {
    if (lite && i > 5) return;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    const lean = .6 + i * .15;
    const curve = new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(lean * .2, h * .35, 0), new V3(lean * .7, h * .7, 0), new V3(lean, h, 0)]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, .19, 8), bark); trunk.castShadow = true; g.add(trunk);
    const crown = new THREE.Group(); crown.position.set(lean, h, 0); g.add(crown);
    const n = 16;
    for (let k = 0; k < n; k++) {
      const f = new THREE.Mesh(frondG, frondMat); f.castShadow = true;
      f.rotation.set(0, k / n * Math.PI * 2 + rnd() * .3, (rnd() - .35) * .5);
      f.scale.setScalar(.85 + rnd() * .35); crown.add(f);
    }
    root.add(g); palms.push({ crown, ph: i * 1.7 });
  });
  const shrubG = new THREE.IcosahedronGeometry(.5, 2);
  const shrubs = new THREE.InstancedMesh(shrubG, new THREE.MeshStandardMaterial({ color: 0x47573a, roughness: 1 }), 14);
  for (let i = 0; i < 14; i++) {
    const x = i < 7 ? -7.6 + i * .95 : -8.6 - (i % 2) * .4, z = i < 7 ? HD + .75 : -3 + (i - 7) * 1.1;
    if (i < 7 && x > -1.5) { shrubs.setMatrixAt(i, ZERO); continue; }
    M.compose(new V3(x, .32, z), new THREE.Quaternion().setFromAxisAngle(UP, rnd() * 3), new V3(1, .7 + rnd() * .3, 1).multiplyScalar(.8 + rnd() * .5));
    shrubs.setMatrixAt(i, M); shrubs.setColorAt(i, tcol.setHSL(.24 + rnd() * .05, .25, .26 + rnd() * .06));
  }
  shrubs.castShadow = true; root.add(shrubs);

  /* ---------- rain: one line set animated in the shader ---------- */
  const RN = lite ? 900 : 2200, rp = new Float32Array(RN * 6), rs = new Float32Array(RN * 2);
  for (let i = 0; i < RN; i++) {
    const x = (rnd() - .5) * 60, y = rnd() * 26, z = (rnd() - .5) * 50, s = .6 + rnd() * .6;
    rp.set([x, y, z, x, y, z], i * 6); rs[i * 2] = 0; rs[i * 2 + 1] = 1;
  }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setAttribute('aEnd', new THREE.BufferAttribute(rs, 1));
  const rainMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uA: { value: 1 }, uCol: { value: new THREE.Color(0xc4ced8) } },
    vertexShader: `attribute float aEnd; uniform float uT; varying float vE;
      void main(){ vec3 p = position; float sp = 17.0 + fract(p.x * 7.13) * 5.0;
        p.y = mod(p.y - uT * sp, 26.0); vec3 w = vec3(-.18, -1.0, .06) * .7 * step(.01, aEnd);
        p += w; p.x += p.y * .14; vE = aEnd;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float uA; uniform vec3 uCol; varying float vE;
      void main(){ gl_FragColor = vec4(uCol, uA * (.12 + .3 * (1.0 - vE))); }`,
  });
  const rain = new THREE.LineSegments(rg, rainMat); rain.frustumCulled = false; root.add(rain);

  /* ---------- state ---------- */
  let last = -1;
  function apply(p, t) {
    if (p !== last) {
      setTruss(st(p, 0));
      const dk = st(p, 1);
      deckA.U.uProg.value = dk;
      fascia.visible = dk > .01;
      ulA.U.uProg.value = st(p, 2);
      shA.U.uProg.value = st(p, 3);
      const ed = st(p, 4);
      setCaps(ed); setEdges(ed);
      last = p;
    }
    const wind = 1 - ss((p - .4) / .14);
    rainMat.uniforms.uT.value = t; rainMat.uniforms.uA.value = wind;
    rain.visible = wind > .01;
    palms.forEach(pl => { pl.crown.rotation.z = Math.sin(t * 1.9 + pl.ph) * .07 * (.25 + wind); pl.crown.rotation.x = Math.sin(t * 1.3 + pl.ph) * .05 * (.2 + wind); });
  }
  return { root, apply, size: { HW, HD, YR, YE } };
}
