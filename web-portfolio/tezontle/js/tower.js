// The tower: a 22 level concrete frame with a glass curtain wall, its foundation pit and piles,
// a tower crane and a few neighbouring blocks. Every part is instanced so the whole building can
// be "built" to any point: set state { piles, raft, s, glass, lights, crane } and call apply().
import * as THREE from 'three';

export const FH = 3.6, N = 22, W = 24, D = 18;
const PIT = { w: 31, d: 25, y: -5 };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const outE = x => 1 - Math.pow(1 - clamp(x), 3);

export async function loadTextures(base = 'assets/tex/') {
  const tl = new THREE.TextureLoader();
  const get = (n, srgb) => new Promise(r => tl.load(base + n, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; r(t); }, undefined, () => r(null)));
  const [cd, cn, cr, gd, gn, gr] = await Promise.all([
    get('concrete_wall_008_diffuse.webp', 1), get('concrete_wall_008_nor_gl.webp'), get('concrete_wall_008_rough.webp'),
    get('gravel_concrete_diffuse.webp', 1), get('gravel_concrete_nor_gl.webp'), get('gravel_concrete_rough.webp')]);
  return { concrete: { map: cd, normalMap: cn, roughnessMap: cr }, ground: { map: gd, normalMap: gn, roughnessMap: gr } };
}

// concrete with world space UVs: the texture keeps the same real size on every slab, column and wall
const TRI = `
vec4 tpW = vec4(position, 1.0); vec3 tpN = normal;
#ifdef USE_INSTANCING
tpW = instanceMatrix * tpW; tpN = mat3(instanceMatrix) * tpN;
#endif
tpW = modelMatrix * tpW; tpN = normalize(mat3(modelMatrix) * tpN);
vec3 tpA = abs(tpN);
vec2 tpUV = (tpA.x > tpA.y && tpA.x > tpA.z ? tpW.zy : (tpA.y > tpA.z ? tpW.xz : tpW.xy)) * 0.3;
#ifdef USE_MAP
vMapUv = tpUV;
#endif
#ifdef USE_NORMALMAP
vNormalMapUv = tpUV;
#endif
#ifdef USE_ROUGHNESSMAP
vRoughnessMapUv = tpUV;
#endif
`;
function concreteMat(tex, tint = 0xbdb8b0) {
  const m = new THREE.MeshStandardMaterial({ color: tint, roughness: 1, metalness: 0 });
  if (tex) {
    m.map = tex.map; m.normalMap = tex.normalMap; m.roughnessMap = tex.roughnessMap;
    m.normalScale = new THREE.Vector2(.6, .6);
    m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + TRI); };
    m.customProgramCacheKey = () => 'tri';
  }
  return m;
}

export function buildTower(tex, opt = {}) {
  const lite = !!opt.lite;
  const root = new THREE.Group();
  const M4 = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const conc = concreteMat(tex?.concrete, 0xdedbd6);
  const concDark = concreteMat(tex?.concrete, 0xb3b0ab);

  /* ---------- floors: columns, slabs, core ---------- */
  const colX = [-11.2, -5.6, 0, 5.6, 11.2], colZ = [-8.2, -2.8, 2.8, 8.2];
  const cols = [];
  colX.forEach(x => colZ.forEach(z => { if (Math.abs(x) < 3 && Math.abs(z) < 4) return; cols.push([x, z]); }));
  const nCol = cols.length;
  const colMesh = new THREE.InstancedMesh(box, conc, nCol * (N + 1));
  const slabMesh = new THREE.InstancedMesh(box, conc, N + 1);
  const coreMesh = new THREE.InstancedMesh(box, concDark, N + 2);
  [colMesh, slabMesh, coreMesh].forEach(m => { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; root.add(m); });
  const yb = j => j === 0 ? PIT.y + 1.2 : (j - 1) * FH;   // bottom of the columns under slab j
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);

  /* ---------- envelope: glass, mullions, spandrel bands, lit rooms behind ---------- */
  const panels = [];   // [x, z, rotY, width]
  const gx = W / 2 + .35, gz = D / 2 + .35, nx = 8, nz = 6;
  for (let i = 0; i < nx; i++) { const w = (W + .7) / nx, x = -gx + w * (i + .5); panels.push([x, gz, 0, w]); }
  for (let i = 0; i < nz; i++) { const w = (D + .7) / nz, z = gz - w * (i + .5); panels.push([gx, z, Math.PI / 2, w]); }
  for (let i = 0; i < nx; i++) { const w = (W + .7) / nx, x = gx - w * (i + .5); panels.push([x, -gz, Math.PI, w]); }
  for (let i = 0; i < nz; i++) { const w = (D + .7) / nz, z = -gz + w * (i + .5); panels.push([-gx, z, -Math.PI / 2, w]); }
  const nP = panels.length;
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1d2328, metalness: .95, roughness: .06, transparent: true, opacity: .74, envMapIntensity: 1.25 });
  const mullMat = new THREE.MeshStandardMaterial({ color: 0x2a2b2d, metalness: .7, roughness: .38 });
  const plane = new THREE.PlaneGeometry(1, 1);
  const glassMesh = new THREE.InstancedMesh(plane, glassMat, nP * N);
  const mullMesh = new THREE.InstancedMesh(box, mullMat, nP * N);
  const bandMesh = new THREE.InstancedMesh(box, mullMat, N);
  const roomMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true });
  const roomMesh = new THREE.InstancedMesh(plane, roomMat, 4 * N);
  [glassMesh, mullMesh, bandMesh, roomMesh].forEach(m => { m.frustumCulled = false; root.add(m); });
  mullMesh.castShadow = true; bandMesh.castShadow = true;
  glassMesh.renderOrder = 2;
  const roomCol = new THREE.Color();
  const roomLvl = Array.from({ length: N }, (_, k) => [.55 + .45 * Math.abs(Math.sin(k * 12.9898) * 43758.5453 % 1), .5 + .5 * Math.abs(Math.sin(k * 78.233) * 1e4 % 1), .45 + .55 * Math.abs(Math.sin(k * 3.7) * 9e3 % 1), .6 + .4 * Math.abs(Math.sin(k * 5.1) * 7e3 % 1)]);
  for (let k = 0; k < 4 * N; k++) roomMesh.setColorAt(k, roomCol.setRGB(0, 0, 0));

  /* roof: parapet + plant room, appear with the last slab */
  const roof = new THREE.Group();
  const plant = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 7), concDark); plant.position.set(-2, N * FH + 1.6, 0);
  const plant2 = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4), mullMat); plant2.position.set(6, N * FH + 1, -3);
  roof.add(plant, plant2); plant.castShadow = plant2.castShadow = true;
  root.add(roof);

  /* ---------- ground, pit, piles, raft ---------- */
  const site = new THREE.Group(); root.add(site);
  let groundMat = new THREE.MeshStandardMaterial({ color: 0x8a8885, roughness: 1 });
  if (tex?.ground?.map) {
    const c = k => { const t = tex.ground[k].clone(); t.repeat.set(1 / 7, 1 / 7); t.needsUpdate = true; return t; };
    groundMat = new THREE.MeshStandardMaterial({ color: 0x8a8885, roughness: 1, map: c('map'), normalMap: c('normalMap'), roughnessMap: c('roughnessMap') });
  }
  const R = lite ? 30 : 420;
  const shape = new THREE.Shape([new THREE.Vector2(-R, -R), new THREE.Vector2(R, -R), new THREE.Vector2(R, R), new THREE.Vector2(-R, R)]);
  shape.holes.push(new THREE.Path([new THREE.Vector2(-PIT.w / 2, -PIT.d / 2), new THREE.Vector2(-PIT.w / 2, PIT.d / 2), new THREE.Vector2(PIT.w / 2, PIT.d / 2), new THREE.Vector2(PIT.w / 2, -PIT.d / 2)]));
  const ground = new THREE.Mesh(new THREE.ShapeGeometry(shape), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; site.add(ground);
  const pitFloor = new THREE.Mesh(new THREE.PlaneGeometry(PIT.w, PIT.d), groundMat.clone());
  pitFloor.material.color.setHex(0x6f6b66);
  pitFloor.material.map && (pitFloor.material.map = pitFloor.material.map.clone(), pitFloor.material.map.repeat.set(PIT.w / 7, PIT.d / 7));
  pitFloor.rotation.x = -Math.PI / 2; pitFloor.position.y = PIT.y; pitFloor.receiveShadow = true; site.add(pitFloor);
  const wallMat = concreteMat(tex?.concrete, 0x8f8d89);
  [[0, PIT.d / 2, Math.PI, PIT.w], [0, -PIT.d / 2, 0, PIT.w], [PIT.w / 2, 0, -Math.PI / 2, PIT.d], [-PIT.w / 2, 0, Math.PI / 2, PIT.d]].forEach(([x, z, r, w]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, -PIT.y), wallMat); m.position.set(x, PIT.y / 2, z); m.rotation.y = r; m.receiveShadow = true; site.add(m);
  });
  const pileGeo = new THREE.CylinderGeometry(.42, .42, 1, 14);
  const pileXs = [-10.5, -7.5, -4.5, -1.5, 1.5, 4.5, 7.5, 10.5], pileZs = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
  const piles = []; pileXs.forEach(x => pileZs.forEach(z => piles.push([x, z])));
  const pileMesh = new THREE.InstancedMesh(pileGeo, conc, piles.length); pileMesh.castShadow = true; pileMesh.frustumCulled = false; site.add(pileMesh);
  const pileOrder = piles.map((p, i) => i).sort((a, b) => (piles[a][0] + piles[a][1] * .3) - (piles[b][0] + piles[b][1] * .3));
  const raft = new THREE.Mesh(box, conc); raft.castShadow = raft.receiveShadow = true; site.add(raft);

  /* ---------- tower crane (steel lattice) ---------- */
  const crane = new THREE.Group();
  const craneMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c6, metalness: .35, roughness: .55, transparent: true });
  const members = [];
  const HM = N * FH + 16, cw = 2.0, seg = 3;
  const mast = (x0, z0) => {
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [x0 + a * cw / 2, z0 + b * cw / 2]);
    c.forEach(([x, z]) => members.push([[x, 0, z], [x, HM, z], .16]));
    for (let y = 0; y < HM - .1; y += seg) for (let k = 0; k < 4; k++) {
      const [ax, az] = c[k], [bx, bz] = c[(k + 1) % 4];
      members.push([[ax, y, az], [bx, y, bz], .08]);
      members.push([[ax, y, az], [bx, y + seg, bz], .06]);
    }
  };
  const CX = -5, CZ = -16.5;
  mast(CX, CZ);
  const top = new THREE.Group(); top.position.set(CX, HM, CZ); crane.add(top);   // slews
  const topMembers = [];
  const jib = (len, dir, h) => {   // triangular truss along x
    const ch = [[0, 0, -.9], [0, 0, .9], [0, h, 0]];
    ch.forEach(([, y, z]) => topMembers.push([[0, y, z], [dir * len, y * .35, z * .5], .1]));
    for (let x = 0; x < len - .1; x += 2.5) {
      const x1 = x + 2.5;
      const sh = t => 1 - t / len * .65, sz = t => 1 - t / len * .5;
      topMembers.push([[dir * x, 0, -.9 * sz(x)], [dir * x, 0, .9 * sz(x)], .05]);
      topMembers.push([[dir * x, 0, -.9 * sz(x)], [dir * x1, h * sh(x1), 0], .045]);
      topMembers.push([[dir * x, 0, .9 * sz(x)], [dir * x1, h * sh(x1), 0], .045]);
    }
  };
  jib(48, 1, 2.2); jib(15, -1, 1.6);
  topMembers.push([[0, 0, 0], [0, 7, 0], .25]);                    // tower head
  topMembers.push([[0, 7, 0], [30, 1.2, 0], .035]);                 // pendant ties
  topMembers.push([[0, 7, 0], [-13, 1, 0], .035]);
  const memberMesh = (list, parent) => {
    const m = new THREE.InstancedMesh(box, craneMat, list.length);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    list.forEach(([p0, p1, t], i) => {
      a.set(...p0); b.set(...p1); d.subVectors(b, a); const L = d.length(); d.normalize();
      Q.setFromUnitVectors(up, d); P.addVectors(a, b).multiplyScalar(.5); S.set(t, L, t);
      m.setMatrixAt(i, M4.compose(P, Q, S));
    });
    m.castShadow = true; m.frustumCulled = false; parent.add(m); return m;
  };
  memberMesh(members, crane); memberMesh(topMembers, top);
  const cw1 = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 2.4), concDark); cw1.position.set(-13, -1, 0); cw1.castShadow = true; top.add(cw1);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 1.8), craneMat); cab.position.set(1.4, -1.4, 1.6); top.add(cab);
  const trolley = new THREE.Group(); top.add(trolley);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(.05, 1, .05), mullMat); trolley.add(cable);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(.7, .9, .5), new THREE.MeshStandardMaterial({ color: 0xc4643c, roughness: .6 })); trolley.add(hook);
  const load = new THREE.Mesh(new THREE.BoxGeometry(6, .25, 2.6), conc); load.castShadow = true; trolley.add(load);
  root.add(crane);

  /* ---------- the neighbours: quiet dark blocks with windows that light up at night ---------- */
  const city = new THREE.Group(); root.add(city);
  let cityMats = [];
  if (!lite) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
    const cx = cv.getContext('2d'); cx.fillStyle = '#000'; cx.fillRect(0, 0, 128, 256);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { const v = Math.random(); if (v < .42) { cx.fillStyle = `rgba(255,${190 + (v * 120 | 0)},${120 + (v * 160 | 0)},${.5 + v})`; cx.fillRect(x * 16 + 4, y * 16 + 5, 9, 7); } }
    const winTex = new THREE.CanvasTexture(cv); winTex.colorSpace = THREE.SRGBColorSpace; winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
    const fc = document.createElement('canvas'); fc.width = fc.height = 128;
    const fx = fc.getContext('2d'), gr = fx.createRadialGradient(64, 64, 20, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(.55, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    fx.fillStyle = gr; fx.fillRect(0, 0, 128, 128);
    const footMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fc), transparent: true, depthWrite: false });
    const blocks = [[-62, 20, 22, 26, 34], [-58, -40, 30, 20, 18], [48, -52, 26, 30, 40], [-20, -78, 40, 22, 28], [-80, 70, 30, 30, 46], [-110, -10, 26, 26, 24], [10, -120, 40, 26, 56]];
    blocks.forEach(([x, z, w, d, h], i) => {
      const t = winTex.clone(); t.repeat.set(w / 28, h / 56); t.offset.set(i * .37, i * .21); t.needsUpdate = true;
      const m = concreteMat(tex?.concrete, 0x77736d); m.emissiveMap = t; m.emissive = new THREE.Color(0xffc58a); m.emissiveIntensity = 0;
      cityMats.push(m);
      const b = new THREE.Mesh(box, m); b.scale.set(w, h, d); b.position.set(x * 1.6, h / 2, z * 1.6); b.castShadow = b.receiveShadow = true; city.add(b);
      // a soft dark footprint so each block sits on the ground instead of seeming to hover
      const fp = new THREE.Mesh(plane, footMat); fp.rotation.x = -Math.PI / 2; fp.scale.set(w * 1.5, d * 1.5, 1); fp.position.set(x * 1.6, .04, z * 1.6); fp.renderOrder = 1; city.add(fp);
    });
  }

  /* ---------- props from Poly Haven placed at the pit edge (added later by addProps) ---------- */
  const props = new THREE.Group(); root.add(props);

  /* ---------- build state ---------- */
  const state = { piles: 1, raft: 1, s: N + 1, glass: N, lights: 0, crane: 1, night: 0, slew: 0, t: 0 };
  function apply() {
    const { s } = state;
    // piles drive down into the pit floor one after another
    pileOrder.forEach((i, n) => {
      const [x, z] = piles[i];
      const p = outE(state.piles * 1.6 - n / piles.length * .6);
      const top = PIT.y + .15 + (1 - p) * 9;
      const len = 16;
      P.set(x, top - len / 2, z); S.set(1, len, 1);
      pileMesh.setMatrixAt(n, state.piles <= 0 ? zero : M4.compose(P, Q.identity(), S));
    });
    pileMesh.instanceMatrix.needsUpdate = true;
    const rp = ease(state.raft);
    raft.visible = rp > .001;
    raft.scale.set(W + 2, 1.2 * rp, D + 2); raft.position.set(0, PIT.y + .6 * rp, 0);

    let ci = 0;
    for (let j = 0; j <= N; j++) {
      const t = s - j;
      const cp = ease(t / .55), sp = ease((t - .45) / .55);
      const y0 = yb(j), y1 = j * FH, h = y1 - y0 - .3;
      for (let c = 0; c < nCol; c++) {
        const [x, z] = cols[c];
        const lag = clamp(cp * 1.25 - ((c * 7) % nCol) / nCol * .25);
        if (lag <= 0) colMesh.setMatrixAt(ci++, zero);
        else { P.set(x, y0 + h * lag / 2, z); S.set(.8, h * lag, .8); colMesh.setMatrixAt(ci++, M4.compose(P, Q.identity(), S)); }
      }
      if (sp <= 0) slabMesh.setMatrixAt(j, zero);
      else { P.set(0, y1 - .15, 0); S.set((W + .6) * (.25 + .75 * sp), .3 * Math.max(.05, sp), (D + .6) * (.25 + .75 * sp)); slabMesh.setMatrixAt(j, M4.compose(P, Q.identity(), S)); }
    }
    // the core climbs about a floor ahead of the frame
    for (let j = 0; j <= N + 1; j++) {
      const t = ease((s + clamp(s / 1.5) - j) / .8);
      const y0 = j === 0 ? yb(0) : (j - 1) * FH, h = (j === N + 1 ? 3.2 : (j === 0 ? -yb(0) : FH));
      if (t <= 0) coreMesh.setMatrixAt(j, zero);
      else { P.set(0, y0 + h * t / 2, 0); S.set(5.6, h * t, 7.2); coreMesh.setMatrixAt(j, M4.compose(P, Q.identity(), S)); }
    }
    colMesh.instanceMatrix.needsUpdate = slabMesh.instanceMatrix.needsUpdate = coreMesh.instanceMatrix.needsUpdate = true;
    roof.visible = s > N + .6;
    roof.position.y = (1 - ease((s - N - .6) / .4)) * -3;

    // glass: each floor's panels slide up into place around the building
    const g = Math.min(state.glass, s - 1.5);
    for (let k = 0; k < N; k++) {
      const fp = g - k;
      const y0 = k * FH + .3, h = FH - .3;
      for (let i = 0; i < nP; i++) {
        const [x, z, r, w] = panels[i];
        const p = ease(fp * 1.5 - i / nP * .5);
        const idx = k * nP + i;
        if (p <= 0) { glassMesh.setMatrixAt(idx, zero); mullMesh.setMatrixAt(idx, zero); continue; }
        Q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r);
        P.set(x, y0 + h / 2 - (1 - p) * 2.5, z); S.set(w - .06, h * (.4 + .6 * p), 1);
        glassMesh.setMatrixAt(idx, M4.compose(P, Q, S));
        const ox = Math.cos(r) * w / 2, oz = -Math.sin(r) * w / 2;
        P.set(x + ox, y0 + h / 2 - (1 - p) * 2.5, z + oz); S.set(.12, h * (.4 + .6 * p), .3);
        mullMesh.setMatrixAt(idx, M4.compose(P, Q, S));
      }
      const bp = ease(fp * 1.5);
      if (bp <= 0) bandMesh.setMatrixAt(k, zero);
      else { P.set(0, (k + 1) * FH - .1, 0); S.set(W + .85, .62 * bp, D + .85); bandMesh.setMatrixAt(k, M4.compose(P, Q.identity(), S)); }
      // rooms behind the glass light up floor by floor at night
      const lv = clamp(state.lights - k) * (fp > .9 ? 1 : 0);
      const rooms = [[0, D / 2 - 1.4, 0, W - 1.6], [W / 2 - 1.4, 0, Math.PI / 2, D - 1.6], [0, -D / 2 + 1.4, Math.PI, W - 1.6], [-W / 2 + 1.4, 0, -Math.PI / 2, D - 1.6]];
      rooms.forEach(([x, z, r, w], f) => {
        const idx = k * 4 + f;
        if (lv <= 0) { roomMesh.setMatrixAt(idx, zero); return; }
        Q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r);
        P.set(x, y0 + h / 2, z); S.set(w, h - .2, 1);
        roomMesh.setMatrixAt(idx, M4.compose(P, Q, S));
        const r0 = roomLvl[k][f], v = lv * (r0 < .62 ? .12 : r0) * 1.05;
        roomMesh.setColorAt(idx, roomCol.setRGB(v, v * .7, v * .42));
      });
    }
    glassMesh.instanceMatrix.needsUpdate = mullMesh.instanceMatrix.needsUpdate = bandMesh.instanceMatrix.needsUpdate = roomMesh.instanceMatrix.needsUpdate = true;
    if (roomMesh.instanceColor) roomMesh.instanceColor.needsUpdate = true;

    // crane: fades away at handover
    craneMat.opacity = state.crane; crane.visible = state.crane > .01;
    craneMat.depthWrite = state.crane > .98;
    cityMats.forEach(m => m.emissiveIntensity = state.night * 1.1);
    glassMat.opacity = .74 - state.night * .3;
  }
  function tick(t) {
    state.t = t;
    if (!crane.visible) return;
    top.rotation.y = state.slew + Math.sin(t * .11) * .22;
    const tr = 20 + Math.sin(t * .17) * 8;
    const topY = Math.max(6, Math.min(N, state.s) * FH + 6);
    const drop = HM - topY - 4 + Math.sin(t * .23) * 3;
    trolley.position.set(tr, 0, 0);
    cable.scale.y = drop; cable.position.y = -drop / 2;
    hook.position.y = -drop; load.position.y = -drop - 1.6; load.rotation.y = Math.sin(t * .3) * .3;
  }
  async function addProps(loader) {
    if (lite) return;
    const get = u => new Promise(r => loader.load(u, g => r(g.scene), undefined, () => r(null)));
    const [bar, bag] = await Promise.all([get('assets/models/concrete_road_barrier.glb'), get('assets/models/cement_bag.glb')]);
    const fit = (o, len) => { const b = new THREE.Box3().setFromObject(o), s = new THREE.Vector3(); b.getSize(s); o.scale.setScalar(len / Math.max(s.x, s.z)); o.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); return o; };
    if (bar) {
      fit(bar, 3.6);
      // a run of barriers along the street side of the pit
      for (let i = 0; i < 9; i++) { const b = bar.clone(); b.position.set(-PIT.w / 2 + 2 + i * 3.7, 0, PIT.d / 2 + 2.4); props.add(b); }
      for (let i = 0; i < 6; i++) { const b = bar.clone(); b.rotation.y = Math.PI / 2; b.position.set(PIT.w / 2 + 2.4, 0, PIT.d / 2 - 2 - i * 3.7); props.add(b); }
    }
    if (bag) {
      fit(bag, .9);
      const spots = [[16, 0, 14.6, .3], [16.9, 0, 14.4, -.2], [16.4, .35, 14.5, .1], [-17.6, 0, -6, .8], [-17.2, 0, -7, 1.4], [-17.4, .35, -6.5, .2]];
      spots.forEach(([x, y, z, r]) => { const b = bag.clone(); b.position.set(x, y, z); b.rotation.y = r; props.add(b); });
    }
  }
  apply();
  return { root, state, apply, tick, addProps, crane, HM, materials: { glassMat, craneMat } };
}
