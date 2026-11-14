// The street: two rows of Beacon Hill townhouses on a cobbled lane that runs up to a gold dome.
// Everything is merged by material, so the whole block draws in a handful of calls. Each window
// knows which house it belongs to and when it switches on, so a house can be lit on cue.
import * as THREE from 'three';
import { mergeGeometries } from '../assets/vendor/BufferGeometryUtils.js';

export const FACADE = 5.6;                 // x of the house fronts on each side
export const ROAD = 3.6;                   // half width of the cobbles
export const MAXH = 96;                    // houses the light uniform can address

const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const pick = a => a[Math.floor(rnd() * a.length)];

export async function loadTextures(base = 'assets/tex/') {
  const tl = new THREE.TextureLoader();
  const get = (n, srgb) => new Promise(r => tl.load(base + n, t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; r(t);
  }, undefined, () => r(null)));
  const [bd, bn, br, ba, cd, cn, cr, ca] = await Promise.all([
    get('brick_diff.webp', 1), get('brick_nor_gl.webp'), get('brick_rough.webp'), get('brick_ao.webp'),
    get('cobble_diff.webp', 1), get('cobble_nor_gl.webp'), get('cobble_rough.webp'), get('cobble_ao.webp')]);
  return { brick: { map: bd, normalMap: bn, roughnessMap: br, aoMap: ba }, cobble: { map: cd, normalMap: cn, roughnessMap: cr, aoMap: ca } };
}

// world space UVs: brick stays the same real size on every wall, step and sidewalk
const tri = scale => `
vec4 tpW = modelMatrix * vec4(position, 1.0); vec3 tpN = normalize(mat3(modelMatrix) * normal);
vec3 tpA = abs(tpN);
vec2 tpUV = (tpA.x > tpA.y && tpA.x > tpA.z ? tpW.zy : (tpA.y > tpA.z ? tpW.xz : tpW.xy)) * ${scale.toFixed(3)};
#ifdef USE_MAP
vMapUv = tpUV;
#endif
#ifdef USE_NORMALMAP
vNormalMapUv = tpUV;
#endif
#ifdef USE_ROUGHNESSMAP
vRoughnessMapUv = tpUV;
#endif
#ifdef USE_AOMAP
vAoMapUv = tpUV;
#endif
`;
function texMat(tex, opt, scale, key) {
  const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 1, metalness: 0 }, opt));
  if (tex) {
    Object.assign(m, tex);
    m.normalScale = new THREE.Vector2(1, 1);
    m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + tri(scale)); };
    m.customProgramCacheKey = () => key;
  }
  return m;
}

export function buildStreet(tex, { isPhone } = {}) {
  const root = new THREE.Group();
  const parts = { brick: [], stone: [], black: [], slate: [], win: [], brass: [], lamp: [] };
  const houses = [];
  const lampSpots = [];
  const C = new THREE.Color();
  const M = new THREE.Matrix4(), L = new THREE.Matrix4();
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const plane = new THREE.PlaneGeometry(1, 1);

  function push(kind, geo, mat, color, extra) {
    const g = geo.clone(); g.applyMatrix4(mat);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    C.set(color ?? 0xffffff);
    for (let i = 0; i < n; i++) { col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const h = new Float32Array(n), t = new Float32Array(n);
    if (extra) { h.fill(extra.house); t.fill(extra.thr); }
    g.setAttribute('aHouse', new THREE.BufferAttribute(h, 1));
    g.setAttribute('aThr', new THREE.BufferAttribute(t, 1));
    if (!g.index) g.setIndex([...Array(n).keys()]);
    parts[kind].push(g);
  }
  // a box in a house's local frame: facade on z = 0 facing +z, x across the front
  const box = (kind, base, w, h, d, x, y, z, color, rx = 0) => {
    L.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(w, h, d));
    push(kind, unit, M.clone().multiply(base).multiply(L), color);
  };
  const pane = (base, w, h, x, y, z, house, thr) => {
    L.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(w, h, 1));
    push('win', plane, M.clone().multiply(base).multiply(L), 0xffffff, { house, thr });
  };

  const BRICKS = [0xffffff, 0xe6d2c8, 0xd2b3a6, 0xf2ddd0, 0xc49c8c];
  const FH = 3.3, PLINTH = 1.05, DEPTH = 13;

  function house(side, zc, W, idx, opts = {}) {
    const base = new THREE.Matrix4().compose(new THREE.Vector3(side * FACADE, 0, zc),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1));
    M.identity();
    const floors = opts.floors ?? (3 + (rnd() < .55 ? 1 : 0));
    const H = PLINTH + floors * FH;
    const tint = opts.tint ?? pick(BRICKS);
    const stoneC = 0xd9d2c3, trim = 0xf1eee6;
    const mansard = opts.mansard ?? rnd() < .45;
    const shutters = opts.shutters ?? rnd() < .65;
    const bays = W >= 6.2 ? 3 : 2;
    const bw = W / bays;
    const doorBay = opts.doorBay ?? (rnd() < .5 ? 0 : bays - 1);
    const doorX = -W / 2 + bw * (doorBay + .5);

    box('brick', base, W, H + .6, DEPTH, 0, (H + .6) / 2, -DEPTH / 2, tint);
    // granite base course, string course over the parlor floor
    box('stone', base, W + .02, PLINTH, .12, 0, PLINTH / 2, .04, 0xbdb6a8);
    box('stone', base, W + .02, .18, .1, 0, PLINTH + FH * 2 - .25, .04, stoneC);

    for (let k = 0; k < floors; k++) {
      const wh = k === 1 ? 2.35 : k === 0 ? 2.0 : 1.8;
      const y0 = PLINTH + k * FH + (k === 1 ? .35 : .55);
      for (let b = 0; b < bays; b++) {
        if (k === 0 && b === doorBay) continue;
        const x = -W / 2 + bw * (b + .5), ww = Math.min(1.12, bw * .52);
        pane(base, ww, wh, x, y0 + wh / 2, .02, idx, rnd());
        // frame, sill, lintel
        box('stone', base, ww + .14, .07, .06, x, y0 + wh + .03, .04, trim);
        box('stone', base, .07, wh, .06, x - ww / 2 - .035, y0 + wh / 2, .04, trim);
        box('stone', base, .07, wh, .06, x + ww / 2 + .035, y0 + wh / 2, .04, trim);
        box('stone', base, ww + .34, .1, .26, x, y0 - .06, .1, stoneC);
        box('stone', base, ww + .3, .26, .1, x, y0 + wh + .2, .06, stoneC);
        if (shutters) {
          box('black', base, ww * .52, wh, .05, x - ww * .78 - .08, y0 + wh / 2, .07, 0x1a1d1c);
          box('black', base, ww * .52, wh, .05, x + ww * .78 + .08, y0 + wh / 2, .07, 0x1a1d1c);
        }
        // a few window boxes on the parlor floor
        if (k === 1 && rnd() < .35) {
          box('black', base, ww + .2, .28, .3, x, y0 - .05, .25, 0x2b231c);
          for (let f = 0; f < 6; f++) box('brass', base, .16, .16, .16, x - ww / 2 + (f + .5) * (ww / 6), y0 + .14, .26 + (rnd() - .5) * .1, pick([0xb2302a, 0xd2553a, 0x8a1e2a, 0x4f6b35]));
        }
      }
    }
    // basement windows, half below the stoop line
    for (let b = 0; b < bays; b++) {
      if (b === doorBay) continue;
      const x = -W / 2 + bw * (b + .5);
      pane(base, .9, .55, x, .55, .08, idx, .3 + rnd() * .7);
      box('black', base, .9, .04, .04, x, .55, .1, 0x111111);
    }

    // door: stone surround, black door, fanlight, stoop with iron rails
    const dy = PLINTH, dw = 1.1, dh = 2.45;
    box('stone', base, dw + .5, .32, .14, doorX, dy + dh + .62, .07, stoneC);
    box('stone', base, .2, dh + .55, .12, doorX - dw / 2 - .12, dy + (dh + .55) / 2, .06, stoneC);
    box('stone', base, .2, dh + .55, .12, doorX + dw / 2 + .12, dy + (dh + .55) / 2, .06, stoneC);
    pane(base, dw, .42, doorX, dy + dh + .26, .02, idx, .02);
    const doorCol = opts.doorColor ?? pick([0x101211, 0x101211, 0x1f2a24, 0x3a1513]);
    let door = null;
    if (opts.openable) {
      // the door is its own piece hung on a hinge, with warm light behind it
      const g = new THREE.Group();
      const hinge = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(dw, dh, .07), new THREE.MeshStandardMaterial({ color: doorCol, roughness: .25, metalness: .1 }));
      slab.position.set(dw / 2, dh / 2, 0);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), new THREE.MeshStandardMaterial({ color: 0xc9a14f, metalness: 1, roughness: .25 }));
      knob.position.set(dw - .16, dh * .47, .06);
      const knocker = new THREE.Mesh(new THREE.TorusGeometry(.09, .018, 8, 24), knob.material);
      knocker.position.set(dw / 2, dh * .72, .06);
      hinge.add(slab, knob, knocker);
      hinge.position.set(doorX - dw / 2, dy, .05);
      g.add(hinge);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(dw, dh), new THREE.MeshBasicMaterial({ color: 0xffc77d }));
      glow.position.set(doorX, dy + dh / 2, .012);
      g.add(glow);
      g.applyMatrix4(base);
      root.add(g);
      door = { hinge, glow };
    } else {
      box('black', base, dw, dh, .07, doorX, dy + dh / 2, .04, doorCol);
      box('brass', base, .08, .08, .08, doorX + dw / 2 - .17, dy + dh * .47, .1, 0xc9a14f);
    }
    // stoop
    const steps = 4, sd = .32;
    for (let s = 0; s < steps; s++) {
      const h = PLINTH * (steps - s) / steps;
      box('stone', base, 1.7, h, sd, doorX, h / 2, .02 + sd * (s + .5), 0xc7c0b2);
    }
    const run = steps * sd;
    const rail = Math.atan2(PLINTH, run);
    for (const sx of [-.88, .88]) {
      L.compose(new THREE.Vector3(doorX + sx, PLINTH * .5 + .92, run / 2 + .02), new THREE.Quaternion().setFromEuler(new THREE.Euler(rail, 0, 0)), new THREE.Vector3(.05, .05, Math.hypot(run, PLINTH)));
      push('black', unit, M.clone().multiply(base).multiply(L), 0x0e0f0f);
      for (let p = 0; p <= 4; p++) {
        const zz = .02 + run * (1 - p / 4), hh = .9;
        box('black', base, .025, hh, .025, doorX + sx, PLINTH * p / 4 + hh / 2, zz, 0x0e0f0f);
      }
    }
    // gas lantern by the door
    const lx = doorX + (doorBay === 0 ? 1 : -1) * (dw / 2 + .55);
    box('black', base, .26, .42, .26, lx, dy + 2.3, .24, 0x0e0f0f);
    box('lamp', base, .2, .32, .2, lx, dy + 2.3, .24);
    box('black', base, .06, .06, .26, lx, dy + 2.3, .1, 0x0e0f0f);
    lampSpots.push({ pos: new THREE.Vector3(lx, dy + 2.3, .4).applyMatrix4(base), small: true });

    // top: cornice, or a slate mansard with dormers
    box('black', base, W + .3, .42, .55, 0, H + .25, .2, opts.cornice ?? pick([0x1b1c1c, 0x2a2a28, 0xd8d2c4]));
    if (mansard) {
      const mh = 3.1, inset = 1.3;
      const s = new THREE.Shape([new THREE.Vector2(.05, 0), new THREE.Vector2(-DEPTH + .4, 0), new THREE.Vector2(-DEPTH + .4, mh), new THREE.Vector2(-inset, mh)]);
      const g = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: false });
      const sw = new THREE.Matrix4().set(0, 0, -1, W / 2, 0, 1, 0, H + .46, 1, 0, 0, 0, 0, 0, 0, 1);
      push('slate', g, M.clone().multiply(base).multiply(sw), opts.slate ?? pick([0x6f7378, 0x5d6166, 0x7d7a74]));
      for (let b = 0; b < bays; b++) {
        const x = -W / 2 + bw * (b + .5);
        const zf = -inset * .45, yb = H + .46 + .55;
        box('stone', base, 1.05, 1.55, 1.3, x, yb + .75, zf - .55, 0xe8e3d8);
        pane(base, .62, 1.0, x, yb + .7, zf + .11, idx, rnd());
        box('slate', base, 1.25, .16, 1.5, x, yb + 1.6, zf - .55, 0x55595e);
      }
    } else {
      box('brick', base, W, .6, .3, 0, H + .75, -.15, tint);
    }
    for (let c = 0; c < (rnd() < .6 ? 2 : 1); c++) box('brick', base, .9, 1.6, .6, (c ? 1 : -1) * W * .3, H + (mansard ? 3.4 : .9) + .8, -DEPTH + 1.2, tint);

    houses.push({ idx, side, zc, W, H, doorX, base, floors, door });
    return houses[houses.length - 1];
  }

  /* ---------- lay out both rows ---------- */
  const rows = { '1': [], '-1': [] };
  for (const side of [1, -1]) {
    let z = 34 - rnd() * 3;
    while (z > -158) {
      const W = 5.6 + rnd() * 1.8;
      rows[side].push({ z: z - W / 2, W });
      z -= W + .02;
    }
  }
  // the houses we stop at, chosen by where they stand on the lane
  const want = [[1, -14], [-1, -38], [1, -62], [-1, -86], [1, -110]];
  const feat = want.map(([side, z]) => {
    const r = rows[side]; let best = 0;
    r.forEach((h, i) => { if (Math.abs(h.z - z) < Math.abs(r[best].z - z)) best = i; });
    r[best].feat = true; return r[best];
  });
  const STYLE = [
    { tint: 0xf2ddd0, mansard: false, shutters: true, floors: 4, doorColor: 0x101211, cornice: 0xd8d2c4 },
    { tint: 0xe6d2c8, mansard: true, shutters: false, floors: 4, doorColor: 0x1f2a24, slate: 0x5d6166 },
    { tint: 0xd2b3a6, mansard: true, shutters: false, floors: 4, doorColor: 0x101211 },
    { tint: 0xffffff, mansard: false, shutters: true, floors: 3, doorColor: 0x3a1513, cornice: 0x1b1c1c },
    { tint: 0xe6d2c8, mansard: false, shutters: true, floors: 4, doorColor: 0x101211, openable: true, doorBay: 2, cornice: 0xd8d2c4 },
  ];
  let idx = 0;
  const featIdx = [];
  for (const side of [1, -1]) for (const h of rows[side]) {
    const k = feat.indexOf(h);
    const o = k >= 0 ? STYLE[k] : {};
    const W = k === 4 ? Math.max(h.W, 6.4) : h.W;
    const made = house(side, h.z, W, idx, o);
    if (k >= 0) featIdx[k] = made;
    idx++;
  }

  /* ---------- the lane ---------- */
  const zA = 40, zB = -160, len = zA - zB, zm = (zA + zB) / 2;
  M.identity();
  const I = new THREE.Matrix4();
  for (const side of [1, -1]) {
    // brick sidewalk, granite curb, a gutter line
    L.compose(new THREE.Vector3(side * (ROAD + (FACADE - ROAD) / 2 + .1), .09, zm), new THREE.Quaternion(), new THREE.Vector3(FACADE - ROAD - .2, .18, len));
    push('brick', unit, L.clone(), 0x9a7a6c);
    L.compose(new THREE.Vector3(side * (ROAD + .1), .1, zm), new THREE.Quaternion(), new THREE.Vector3(.22, .2, len));
    push('stone', unit, L.clone(), 0x9e9a92);
  }
  // street lamps along the curb, staggered
  for (let z = 26, s = 1; z > -150; z -= 15, s *= -1) {
    const x = s * (ROAD + .55);
    L.compose(new THREE.Vector3(x, .2, z), new THREE.Quaternion(), new THREE.Vector3(.36, .4, .36)); push('black', unit, L.clone(), 0x0e0f0f);
    L.compose(new THREE.Vector3(x, 1.9, z), new THREE.Quaternion(), new THREE.Vector3(.12, 3.4, .12)); push('black', unit, L.clone(), 0x0e0f0f);
    L.compose(new THREE.Vector3(x, 3.45, z), new THREE.Quaternion(), new THREE.Vector3(.22, .1, .22)); push('black', unit, L.clone(), 0x0e0f0f);
    L.compose(new THREE.Vector3(x, 3.85, z), new THREE.Quaternion(), new THREE.Vector3(.36, .62, .36)); push('lamp', unit, L.clone());
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      L.compose(new THREE.Vector3(x + dx * .19, 3.85, z + dz * .19), new THREE.Quaternion(), new THREE.Vector3(.04, .66, .04)); push('black', unit, L.clone(), 0x0e0f0f);
    }
    const cap = new THREE.ConeGeometry(.34, .32, 4); cap.rotateY(Math.PI / 4);
    L.compose(new THREE.Vector3(x, 4.33, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); push('black', cap, L.clone(), 0x0e0f0f);
    lampSpots.push({ pos: new THREE.Vector3(x, 3.85, z), small: false });
  }

  /* ---------- the State House at the top of the hill ---------- */
  const sh = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: .22 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe9e3d6, roughness: .8 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(7, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), gold);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 7.6, 4, 48), white);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 2.6, 16), white);
  const top = new THREE.Mesh(new THREE.ConeGeometry(.9, 1.6, 16), gold);
  drum.position.y = 2; dome.position.y = 4; lantern.position.y = 12.2; top.position.y = 14.3;
  sh.add(drum, dome, lantern, top);
  sh.position.set(0, 19, -196);
  root.add(sh);
  M.identity();
  L.compose(new THREE.Vector3(0, 9.5, -196), new THREE.Quaternion(), new THREE.Vector3(56, 19, 20)); push('brick', unit, L.clone(), 0xd8b6a4);
  for (let c = -3; c <= 3; c++) { L.compose(new THREE.Vector3(c * 3.2, 11, -185.7), new THREE.Quaternion(), new THREE.Vector3(.8, 10, .8)); push('stone', unit, L.clone(), 0xf0ebe0); }
  L.compose(new THREE.Vector3(0, 16.6, -185.6), new THREE.Quaternion(), new THREE.Vector3(24, 1.4, 1.2)); push('stone', unit, L.clone(), 0xf0ebe0);
  for (let wx = -24; wx <= 24; wx += 4) for (const wy of [4, 8.5]) { if (Math.abs(wx) < 11) continue; L.compose(new THREE.Vector3(wx, wy, -185.9), new THREE.Quaternion(), new THREE.Vector3(1.4, 2.6, 1)); push('win', plane, L.clone(), 0xffffff, { house: MAXH - 1, thr: rnd() }); }

  /* ---------- materials ---------- */
  const mats = {
    brick: texMat(tex?.brick, { vertexColors: true, color: 0xffffff }, .55, 'brick'),
    stone: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78, metalness: 0 }),
    black: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .32, metalness: .2 }),
    slate: texMat(tex?.cobble ? { normalMap: tex.cobble.normalMap } : null, { vertexColors: true, roughness: .55, metalness: .1 }, .9, 'slate'),
    brass: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .3 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0x2a1c0c, emissive: 0xffb45e, emissiveIntensity: 0, roughness: .3 }),
    win: windowMaterial(),
  };
  for (const k of Object.keys(parts)) {
    if (!parts[k].length) continue;
    const g = mergeGeometries(parts[k], false);
    const mesh = new THREE.Mesh(g, mats[k]);
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
  }

  // the cobbles: a long strip with world UVs, a little wet
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD * 2, len, 1, 1).rotateX(-Math.PI / 2), texMat(tex?.cobble, { color: 0xa39a92, roughness: .9 }, .42, 'cobble'));
  road.position.set(0, 0, zm);
  road.material.roughnessMap && (road.material.roughness = .72);
  root.add(road);

  // leaves on the ground along the curbs and steps
  const leafGeo = new THREE.PlaneGeometry(.13, .09).rotateX(-Math.PI / 2);
  const leafMat = new THREE.MeshStandardMaterial({ roughness: .8, side: THREE.DoubleSide });
  const nGround = isPhone ? 900 : 1800;
  const gl = new THREE.InstancedMesh(leafGeo, leafMat, nGround);
  const LEAF = [0xc2581f, 0xd9822b, 0x9b2f1c, 0xe0a23a, 0x7d3a17, 0xb8471f];
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < nGround; i++) {
    const side = rnd() < .5 ? -1 : 1;
    const nearCurb = rnd() < .65;
    const x = nearCurb ? side * (ROAD - rnd() * rnd() * 2.4) : side * (ROAD + .3 + rnd() * (FACADE - ROAD - .4));
    const z = 30 - rnd() * 180;
    e.set(0, rnd() * 6.3, (rnd() - .5) * .3);
    L.compose(new THREE.Vector3(x, (Math.abs(x) > ROAD + .2 ? .185 : .01) + rnd() * .01, z), q.setFromEuler(e), new THREE.Vector3(1, 1, 1).multiplyScalar(.7 + rnd() * .7));
    gl.setMatrixAt(i, L);
    gl.setColorAt(i, C.set(pick(LEAF)).multiplyScalar(.75 + rnd() * .4));
  }
  root.add(gl);

  return { root, houses, feat: featIdx, lampSpots, mats, sh, leafMat, LEAF };
}

// glass that is dark and reflective until its house switches on, then warm behind 6-over-6 muntins
function windowMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0x0d1116, roughness: .1, metalness: .85, envMapIntensity: 1.1 });
  const lights = new Float32Array(MAXH);
  m.userData.lights = lights;
  m.onBeforeCompile = sh => {
    sh.uniforms.uLights = { value: lights };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aHouse; attribute float aThr; varying float vHouse; varying float vThr; varying vec2 vQ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHouse = aHouse; vThr = aThr; vQ = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uLights[${MAXH}]; varying float vHouse; varying float vThr; varying vec2 vQ;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float lvl = uLights[int(vHouse + .5)];
        float on = smoothstep(vThr, vThr + .05, lvl);
        float bx = smoothstep(.45, .48, abs(fract(vQ.x * 3.) - .5));
        float by = smoothstep(.45, .48, abs(fract(vQ.y * 4.) - .5));
        float edge = 1. - smoothstep(.0, .04, min(min(vQ.x, 1. - vQ.x), min(vQ.y, 1. - vQ.y)));
        float bars = max(max(bx, by), edge);
        float room = mix(.45, 1., smoothstep(0., .9, vQ.y)) * (.7 + .3 * fract(vThr * 37.));
        float curtain = smoothstep(.12, .0, vQ.x) + smoothstep(.88, 1., vQ.x);
        vec3 warm = mix(vec3(1., .46, .16), vec3(1., .66, .36), fract(vThr * 13.));
        totalEmissiveRadiance += warm * on * room * (1. - bars) * (1. - curtain * .55) * 1.25;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.06), bars);`);
  };
  m.customProgramCacheKey = () => 'win6';
  return m;
}
