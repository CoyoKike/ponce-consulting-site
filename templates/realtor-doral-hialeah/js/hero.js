// West Miami-Dade as an architect's model: Miami Lakes, Hialeah, Miami Springs, the airport, Doral and
// Westchester as raised tiles on a plinth, with the Palmetto Expressway, the canals, small houses, condo
// towers and palms. Each agent's pin drops onto their part of the map; scrolling walks through the team.
import * as THREE from 'three';

const canvas = document.querySelector('[data-hero-canvas]');
const hero = document.querySelector('[data-hero]');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = Math.min(innerWidth, innerHeight) < 600;
const AG = (window.SITE && window.SITE.agents) || [];

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
catch (e) { document.documentElement.classList.add('no-webgl'); }
if (renderer) init();

function init() {
  const DPR = Math.min(devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
  const rnd = (() => { let s = 23; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const T = { value: 0 };

  /* ---------------------------------------------------------------- map data (x east, z south) */
  const REG = {
    lakes:   { name: 'Miami Lakes', poly: [[-58, -68], [-5, -68], [-5, -37], [-58, -37]], tint: '#cfd6b4', kind: 'lakes' },
    hialeah: { name: 'Hialeah', poly: [[3, -68], [58, -68], [58, -12], [33, -12], [3, -27]], tint: '#ecd2b3', kind: 'dense' },
    springs: { name: 'Miami Springs', poly: [[37, -6], [58, -6], [58, 28], [41, 28]], tint: '#cfdcbd', kind: 'trees' },
    airport: { name: 'MIA', poly: [[3, -21], [31, -7], [35, 28], [3, 28]], tint: '#cfcac0', kind: 'airport' },
    doral:   { name: 'Doral', poly: [[-58, -31], [-5, -31], [-5, 28], [-58, 28]], tint: '#e6dcc3', kind: 'doral' },
    west:    { name: 'Westchester', poly: [[-58, 37], [58, 37], [58, 66], [-58, 66]], tint: '#f0d9bf', kind: 'grid' }
  };
  const MAP = { x0: -64, x1: 64, z0: -74, z1: 72 };
  const TOP = 1.6;     // height of the neighborhood tiles above street level

  const inPoly = (x, z, p) => {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, zi] = p[i], [xj, zj] = p[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
    }
    return c;
  };
  const distToPolyEdge = (x, z, p) => {
    let d = 1e9;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [ax, az] = p[j], [bx, bz] = p[i];
      const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
      d = Math.min(d, Math.hypot(x - ax - vx * t, z - az - vz * t));
    }
    return d;
  };
  const LAKES = [
    { x: -40, z: -54, rx: 7, rz: 4.5, r: .4 }, { x: -22, z: -47, rx: 5.5, rz: 3.2, r: -.3 }, { x: -16, z: -60, rx: 4, rz: 2.6, r: .8 },
    { x: -38, z: 12, rx: 6, rz: 3, r: .2 }, { x: 44, z: -40, rx: 4, rz: 2.2, r: .5 }
  ];
  const inLake = (x, z, pad = 1.2) => LAKES.some(l => {
    const c = Math.cos(-l.r), s = Math.sin(-l.r), dx = x - l.x, dz = z - l.z;
    const u = dx * c - dz * s, v = dx * s + dz * c;
    return (u * u) / ((l.rx + pad) ** 2) + (v * v) / ((l.rz + pad) ** 2) < 1;
  });
  const GOLF = { x: -42, z: 6, rx: 13, rz: 14 };
  const inGolf = (x, z) => ((x - GOLF.x) / GOLF.rx) ** 2 + ((z - GOLF.z) / GOLF.rz) ** 2 < 1;
  const EXPWY_X = -1.2;
  const CANAL = [[-64, 33], [64, 33]];           // Tamiami-style canal along the top of Westchester
  const MCANAL = [[1, -30], [20, -16], [36, -9], [64, -9]];  // Miami Canal down the side of Hialeah

  /* ---------------------------------------------------------------- ground map painted on a canvas */
  function groundTexture() {
    const S = 2048, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    const W = MAP.x1 - MAP.x0, H = MAP.z1 - MAP.z0;
    const px = x => (x - MAP.x0) / W * S, pz = z => (z - MAP.z0) / H * S;
    g.fillStyle = '#b9ad9c'; g.fillRect(0, 0, S, S);
    for (const k in REG) {
      const r = REG[k];
      g.save();
      g.beginPath(); r.poly.forEach(([x, z], i) => i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))); g.closePath();
      g.fillStyle = r.tint; g.fill(); g.clip();
      // speckle so tiles read as a material, not flat color
      for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '90,70,50'},${Math.random() * .06})`; g.fillRect(Math.random() * S, Math.random() * S, 3 + Math.random() * 8, 3 + Math.random() * 8); }
      // streets
      g.strokeStyle = 'rgba(255,250,240,.75)';
      if (r.kind === 'airport') {
        g.fillStyle = '#77726b';
        [[6, -12, 26, -3], [6, 4, 31, 12], [6, 18, 33, 24]].forEach(([a, b, cc, d]) => { g.save(); g.translate(px((a + cc) / 2), pz((b + d) / 2)); g.rotate(.08); g.fillRect(-(px(cc) - px(a)) / 2, -9, px(cc) - px(a), 18); g.restore(); });
        g.strokeStyle = 'rgba(255,255,255,.9)'; g.setLineDash([14, 12]); g.lineWidth = 2;
        [[-7.5, 8, 20], [8, 8, 20], [21, 8, 20]].forEach(([z]) => { g.beginPath(); g.moveTo(px(7), pz(z)); g.lineTo(px(31), pz(z + 1.5)); g.stroke(); });
        g.setLineDash([]);
      } else {
        const step = r.kind === 'dense' ? 4.2 : r.kind === 'grid' ? 4.6 : 6;
        g.lineWidth = r.kind === 'dense' ? 2.2 : 2.6;
        for (let x = MAP.x0; x < MAP.x1; x += step) { g.beginPath(); g.moveTo(px(x), 0); g.lineTo(px(x), S); g.stroke(); }
        for (let z = MAP.z0; z < MAP.z1; z += step * 2.2) { g.beginPath(); g.moveTo(0, pz(z)); g.lineTo(S, pz(z)); g.stroke(); }
      }
      if (r.kind === 'doral') {
        // golf course with bunkers
        g.fillStyle = '#9fbf7a'; g.beginPath(); g.ellipse(px(GOLF.x), pz(GOLF.z), GOLF.rx / W * S, GOLF.rz / H * S, 0, 0, 7); g.fill();
        g.fillStyle = '#b6d08f';
        for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(px(GOLF.x - 8 + i * 3.3), pz(GOLF.z - 9 + i * 3.5), 18, 9, i, 0, 7); g.fill(); }
        g.fillStyle = '#efe0bf';
        for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(px(GOLF.x - 9 + rnd() * 18), pz(GOLF.z - 10 + rnd() * 20), 8, 5, rnd() * 3, 0, 7); g.fill(); }
      }
      if (r.kind === 'trees' || r.kind === 'lakes') {
        g.fillStyle = 'rgba(120,150,90,.35)';
        for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 8 + Math.random() * 20, 0, 7); g.fill(); }
      }
      g.restore();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return { tex: t, W, H };
  }

  /* ---------------------------------------------------------------- materials */
  const GT = groundTexture();
  const topMat = new THREE.MeshStandardMaterial({ map: GT.tex, roughness: .92 });
  const sideMat = new THREE.MeshStandardMaterial({ color: 0xe9dcc6, roughness: .8 });
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x14332c, roughness: .55, metalness: .05 });
  const plinthTop = new THREE.MeshStandardMaterial({ color: 0xb4a894, roughness: .95 });
  const waterMat = new THREE.ShaderMaterial({
    uniforms: { uT: T },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uT; varying vec3 vW;
      void main(){ float s = sin(vW.x*1.7+uT*1.2)*sin(vW.z*1.3-uT*.9);
        vec3 c = mix(vec3(.16,.47,.5), vec3(.42,.74,.74), .5+.5*s);
        c += pow(max(s,0.),8.)*vec3(1.,.85,.6)*.6;
        gl_FragColor = vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });

  /* ---------------------------------------------------------------- plinth + tiles */
  const world = new THREE.Group(); scene.add(world);
  function rrect(x0, z0, x1, z1, r) {
    const s = new THREE.Shape();
    s.moveTo(x0 + r, -z0); s.lineTo(x1 - r, -z0); s.quadraticCurveTo(x1, -z0, x1, -z0 - r);
    s.lineTo(x1, -z1 + r); s.quadraticCurveTo(x1, -z1, x1 - r, -z1); s.lineTo(x0 + r, -z1);
    s.quadraticCurveTo(x0, -z1, x0, -z1 + r); s.lineTo(x0, -z0 - r); s.quadraticCurveTo(x0, -z0, x0 + r, -z0);
    return s;
  }
  // the plinth: dark emerald lacquer with a stone top, like a model in a sales gallery
  {
    const g = new THREE.ExtrudeGeometry(rrect(MAP.x0 - 3, MAP.z0 - 3, MAP.x1 + 3, MAP.z1 + 3, 6), { depth: 7, bevelEnabled: true, bevelThickness: .6, bevelSize: .6, bevelSegments: 3, curveSegments: 8 });
    g.rotateX(-Math.PI / 2); g.translate(0, -7.6, 0);
    const m = new THREE.Mesh(g, plinthMat); m.receiveShadow = true; m.castShadow = true; world.add(m);
    const tg = new THREE.ExtrudeGeometry(rrect(MAP.x0, MAP.z0, MAP.x1, MAP.z1, 4), { depth: .6, bevelEnabled: false, curveSegments: 6 });
    tg.rotateX(-Math.PI / 2); tg.translate(0, -.6, 0);
    const t = new THREE.Mesh(tg, plinthTop); t.receiveShadow = true; world.add(t);
  }
  const regionMesh = {}, regionGlow = {};
  for (const k in REG) {
    const r = REG[k];
    const s = new THREE.Shape();
    r.poly.forEach(([x, z], i) => i ? s.lineTo(x, -z) : s.moveTo(x, -z));
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: TOP, bevelEnabled: true, bevelThickness: .25, bevelSize: .35, bevelSegments: 2 });
    g.rotateX(-Math.PI / 2);
    // world-space UVs for the painted ground
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - MAP.x0) / GT.W, 1 - (pos.getZ(i) - MAP.z0) / GT.H);
    const m = new THREE.Mesh(g, [topMat, sideMat]); m.receiveShadow = true; m.castShadow = true;
    world.add(m); regionMesh[k] = m;
    // highlight wash, faded in when an agent's area is in focus
    const hg = new THREE.ShapeGeometry(s); hg.rotateX(-Math.PI / 2); hg.translate(0, TOP + .32, 0);
    const hm = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.NormalBlending }));
    hm.renderOrder = 2; world.add(hm); regionGlow[k] = hm;
  }

  /* ---------------------------------------------------------------- water: lakes, canals */
  LAKES.forEach(l => {
    const g = new THREE.CircleGeometry(1, 40); g.scale(l.rx, l.rz, 1); g.rotateX(-Math.PI / 2); g.rotateY(l.r);
    const m = new THREE.Mesh(g, waterMat); m.position.set(l.x, TOP + .3, l.z); world.add(m);
  });
  function ribbon(pts, w, y, mat, ro = 0) {
    const P = [], I = [];
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
      const nx = -dz / L * w / 2, nz = dx / L * w / 2;
      P.push(p[0] + nx, y, p[1] + nz, p[0] - nx, y, p[1] - nz);
      if (i) { const k = (i - 1) * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.renderOrder = ro; m.receiveShadow = true; world.add(m); return m;
  }
  ribbon(CANAL, 2.4, .05, waterMat);
  ribbon(MCANAL, 2.2, TOP + .31, waterMat);
  // Palmetto Expressway: dark ribbon with a dashed center line
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x3a3b3d, roughness: .7 });
  const expPts = []; for (let z = MAP.z0 + 1; z <= MAP.z1 - 1; z += 2) expPts.push([EXPWY_X + Math.sin(z * .03) * .8, z]);
  ribbon(expPts, 3.6, .08, asphalt);
  const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(.18, .02, 1.1), new THREE.MeshBasicMaterial({ color: 0xf2e6c8 }), 80);
  const DM = new THREE.Matrix4();
  expPts.forEach((p, i) => { if (i < 80) { DM.makeTranslation(p[0], .1, p[1]); dash.setMatrixAt(i, DM); } });
  world.add(dash);

  /* ---------------------------------------------------------------- buildings */
  const HOUSE_COLS = ['#f6efe4', '#f3dcc4', '#e9d5b5', '#f4e6c5', '#dbe6d8', '#f2d3c4', '#e7e9ee', '#f7f1e8'];
  const ROOF_COLS = ['#b5583b', '#c06a45', '#a34f37', '#c98a5c', '#e8e2d6'];
  const bodies = [], roofs = [], towers = [], trees = [], palms = [];
  function scatter(k, step, fn) {
    const r = REG[k];
    const xs = r.poly.map(p => p[0]), zs = r.poly.map(p => p[1]);
    for (let x = Math.min(...xs) + step / 2; x < Math.max(...xs); x += step)
      for (let z = Math.min(...zs) + step / 2; z < Math.max(...zs); z += step * 1.1) {
        const jx = x + (rnd() - .5) * step * .35, jz = z + (rnd() - .5) * step * .35;
        if (!inPoly(jx, jz, r.poly) || distToPolyEdge(jx, jz, r.poly) < 1.6 || inLake(jx, jz)) continue;
        if (Math.abs(jx - EXPWY_X) < 3.5) continue;
        fn(jx, jz);
      }
  }
  const house = (x, z, s = 1, flat = false) => {
    const w = (1.5 + rnd() * .8) * s, d = (1.4 + rnd() * .7) * s, h = (.95 + rnd() * .35) * s, ry = (rnd() < .5 ? 0 : Math.PI / 2) + (rnd() - .5) * .06;
    bodies.push({ x, z, w, d, h, ry, c: HOUSE_COLS[Math.floor(rnd() * HOUSE_COLS.length)] });
    if (!flat) roofs.push({ x, z, w: w * 1.08, d: d * 1.08, y: TOP + h, h: .7 * s, ry, c: ROOF_COLS[Math.floor(rnd() * 4)] });
    else roofs.push({ x, z, w: w * 1.04, d: d * 1.04, y: TOP + h, h: .12, ry, c: '#e8e2d6', flat: true });
  };
  scatter('hialeah', 3.4, (x, z) => { if (rnd() < .1) towers.push({ x, z, w: 3, d: 2.4, h: 2.6 + rnd() * 2.2, c: '#f2e4cf' }); else house(x, z, .92); if (rnd() < .22) palms.push({ x: x + 1.2, z: z + 1, s: .8 + rnd() * .3 }); });
  scatter('west', 3.7, (x, z) => { house(x, z, 1); if (rnd() < .3) trees.push({ x: x + 1.3, z: z - 1, s: .9 + rnd() * .5 }); });
  scatter('springs', 4.2, (x, z) => { house(x, z, 1.05); trees.push({ x: x + 1.5, z: z + 1.2, s: 1.1 + rnd() * .6 }); });
  scatter('lakes', 4.4, (x, z) => { house(x, z, 1.15, rnd() < .25); if (rnd() < .45) palms.push({ x: x + 1.4, z: z + 1.3, s: .9 + rnd() * .4 }); });
  scatter('doral', 4.2, (x, z) => {
    if (inGolf(x, z)) { if (rnd() < .18) palms.push({ x, z, s: 1 + rnd() * .4 }); return; }
    if (x > -22 && z > -6) towers.push({ x, z, w: 3.6, d: 3.6, h: 6 + rnd() * 10, c: '#f4efe6', glass: true });   // Downtown Doral
    else if (z < -14) { bodies.push({ x, z, w: 3.6, d: 1.6, h: 1.5, ry: 0, c: '#efe3d0' }); roofs.push({ x, z, w: 3.8, d: 1.8, y: TOP + 1.5, h: .55, ry: 0, c: '#b5583b' }); }
    else house(x, z, 1.1, rnd() < .4);
    if (rnd() < .3) palms.push({ x: x + 1.6, z: z + 1.2, s: 1 + rnd() * .4 });
  });
  // around the lakes, a ring of palms
  LAKES.forEach(l => { for (let a = 0; a < 6.28; a += .55) palms.push({ x: l.x + Math.cos(a) * (l.rx + 1.1), z: l.z + Math.sin(a) * (l.rz + 1.1), s: .9 + rnd() * .5 }); });
  // palms along the expressway shoulders
  for (let z = MAP.z0 + 4; z < MAP.z1 - 4; z += 5.5) { palms.push({ x: EXPWY_X - 3, z, s: 1.05 }); palms.push({ x: EXPWY_X + 3, z: z + 2.7, s: 1.05 }); }

  const C = new THREE.Color(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3(), E = new THREE.Euler();
  function instanced(geo, mat, list, place) {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((o, i) => { place(o, DM); im.setMatrixAt(i, DM); if (o.c) im.setColorAt(i, C.set(o.c)); });
    im.castShadow = true; im.receiveShadow = true; world.add(im); return im;
  }
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, .5, 0);
  const bodyMat = new THREE.MeshStandardMaterial({ roughness: .85 });
  instanced(box, bodyMat, bodies, (o, M) => M.compose(V.set(o.x, TOP, o.z), Q.setFromEuler(E.set(0, o.ry, 0)), Sc.set(o.w, o.h, o.d)));
  const hip = new THREE.ConeGeometry(.72, 1, 4, 1); hip.rotateY(Math.PI / 4); hip.translate(0, .5, 0); hip.computeVertexNormals();
  const roofMat = new THREE.MeshStandardMaterial({ roughness: .7, flatShading: true });
  instanced(hip, roofMat, roofs.filter(r => !r.flat), (o, M) => M.compose(V.set(o.x, o.y, o.z), Q.setFromEuler(E.set(0, o.ry, 0)), Sc.set(o.w, o.h, o.d)));
  instanced(box, new THREE.MeshStandardMaterial({ roughness: .8 }), roofs.filter(r => r.flat), (o, M) => M.compose(V.set(o.x, o.y, o.z), Q.setFromEuler(E.set(0, o.ry, 0)), Sc.set(o.w, o.h, o.d)));
  // towers with banded glass
  const bandTex = (() => {
    const c = document.createElement('canvas'); c.width = 16; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#f6f0e6'; g.fillRect(0, 0, 16, 128);
    for (let y = 0; y < 128; y += 8) { g.fillStyle = '#6f9aa0'; g.fillRect(0, y + 2, 16, 5); g.fillStyle = '#e9e0d0'; g.fillRect(0, y + 7, 16, 1); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const towerGeo = new THREE.BoxGeometry(1, 1, 1); towerGeo.translate(0, .5, 0);
  const towerMat = new THREE.MeshStandardMaterial({ map: bandTex, roughness: .35, metalness: .15 });
  towerMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n vec4 iw = instanceMatrix * vec4(position,1.); vMapUv = vec2(uv.x, iw.y / 9.0);\n#endif');
  };
  instanced(towerGeo, towerMat, towers, (o, M) => M.compose(V.set(o.x, TOP, o.z), Q.identity(), Sc.set(o.w, o.h, o.d)));
  // round shade trees
  const treeGeo = new THREE.IcosahedronGeometry(1, 1); treeGeo.translate(0, 1.6, 0);
  instanced(treeGeo, new THREE.MeshStandardMaterial({ color: 0x4f7a46, roughness: .9, flatShading: true }), trees, (o, M) => M.compose(V.set(o.x, TOP, o.z), Q.setFromEuler(E.set(0, rnd() * 3, 0)), Sc.set(o.s * 1.1, o.s, o.s * 1.1)));
  // palms: a thin trunk and a crown of drooping leaves, merged into one shape
  const palmGeo = (() => {
    const parts = [];
    const trunk = new THREE.CylinderGeometry(.07, .11, 3, 5); trunk.translate(0, 1.5, 0); parts.push(trunk);
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.ConeGeometry(.22, 1.6, 3); leaf.rotateZ(-Math.PI / 2 - .35); leaf.translate(.8, 2.85, 0); leaf.rotateY(i / 7 * Math.PI * 2);
      parts.push(leaf);
    }
    let n = 0, ni = 0; parts.forEach(p => { n += p.attributes.position.count; ni += p.index.count; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), idx = []; let o = 0;
    parts.forEach((p, pi) => {
      pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3);
      const c = pi === 0 ? [.55, .45, .33] : [.32, .52, .26];
      for (let i = 0; i < p.attributes.position.count; i++) col.set(c, (o + i) * 3);
      for (let i = 0; i < p.index.count; i++) idx.push(p.index.array[i] + o);
      o += p.attributes.position.count;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
    return g;
  })();
  instanced(palmGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, flatShading: true }), palms, (o, M) => M.compose(V.set(o.x, TOP, o.z), Q.setFromEuler(E.set((rnd() - .5) * .12, rnd() * 6, (rnd() - .5) * .12)), Sc.set(o.s, o.s, o.s)));

  // airport: terminal, a few parked planes, and one taking off on a loop
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: .5 });
  const term = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 4), white); term.position.set(21, TOP + .8, 20); term.castShadow = term.receiveShadow = true; world.add(term);
  const planeGeo = (() => {
    const g = new THREE.Group();
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(.32, 3, 4, 8), white); f.rotation.z = Math.PI / 2; g.add(f);
    const w = new THREE.Mesh(new THREE.BoxGeometry(.9, .06, 3.6), white); g.add(w);
    const t = new THREE.Mesh(new THREE.BoxGeometry(.5, .05, 1.4), white); t.position.x = -1.6; g.add(t);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.6, .8, .06), new THREE.MeshStandardMaterial({ color: 0xc4573a })); fin.position.set(-1.6, .4, 0); g.add(fin);
    g.traverse(o => { o.castShadow = true; });
    return g;
  })();
  [[12, 16.5], [17, 16.5], [26, 16.5]].forEach(([x, z]) => { const p = planeGeo.clone(); p.position.set(x, TOP + .45, z); p.rotation.y = Math.PI / 2; world.add(p); });
  const flyer = planeGeo.clone(); world.add(flyer);

  // cars on the expressway
  const carGeo = new THREE.BoxGeometry(.5, .32, 1); carGeo.translate(0, .16, 0);
  const CARS = 34;
  const cars = new THREE.InstancedMesh(carGeo, new THREE.MeshStandardMaterial({ roughness: .4, metalness: .3 }), CARS);
  const carData = [];
  for (let i = 0; i < CARS; i++) { const dir = i % 2 ? 1 : -1; carData.push({ dir, lane: dir * (.6 + (i % 4 < 2 ? 0 : .9)), z: MAP.z0 + rnd() * (MAP.z1 - MAP.z0), v: 5 + rnd() * 4 }); cars.setColorAt(i, C.set(['#f4f2ee', '#c4573a', '#2f3a40', '#d9a24a', '#9fb4c2'][i % 5])); }
  cars.castShadow = true; world.add(cars);

  /* ---------------------------------------------------------------- agent pins + listing dots */
  const pins = [];
  // a tapered teardrop: cone point + sphere head
  const head = new THREE.SphereGeometry(1.25, 32, 20); head.translate(0, 3.1, 0);
  const tip = new THREE.ConeGeometry(.82, 2.6, 32, 1, true); tip.rotateX(Math.PI); tip.translate(0, 1.3 + .45, 0);
  AG.forEach((a, i) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: a.color, roughness: .28, metalness: .15, emissive: a.color, emissiveIntensity: .08 });
    const h = new THREE.Mesh(head, mat), t = new THREE.Mesh(tip, mat);
    const d = new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 12), new THREE.MeshStandardMaterial({ color: 0xfff8ee, roughness: .4 }));
    d.position.set(0, 3.1, 0); d.scale.set(1, 1, .4); d.position.z = 1.05;
    [h, t].forEach(m => { m.castShadow = true; });
    g.add(h, t, d);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.55, 40), new THREE.MeshBasicMaterial({ color: a.color, transparent: true, opacity: .0, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .05;
    const holder = new THREE.Group(); holder.add(g, ring);
    holder.position.set(a.pin[0], TOP + .35, a.pin[1]);
    g.scale.setScalar(1.15);
    world.add(holder);
    pins.push({ holder, g, ring, mat, d, drop: reduce ? 1 : 0, delay: .6 + i * .28, a, i });
  });
  const listDots = [];
  const dotMats = {};
  document.addEventListener('listingsready', e => {
    const L = e.detail || [];
    L.forEach((l, i) => {
      const a = AG.find(x => x.id === l.agent); if (!a || !l.map) return;
      const m = dotMats[a.id] || (dotMats[a.id] = new THREE.MeshStandardMaterial({ color: a.color, emissive: a.color, emissiveIntensity: .5, roughness: .4 }));
      const s = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .5, 20), m); s.position.set(l.map[0], TOP + .6, l.map[1]); s.castShadow = true;
      const halo = new THREE.Mesh(new THREE.RingGeometry(.8, 1.05, 32), new THREE.MeshBasicMaterial({ color: a.color, transparent: true, opacity: .7, depthWrite: false }));
      halo.rotation.x = -Math.PI / 2; halo.position.set(l.map[0], TOP + .4, l.map[1]);
      world.add(s, halo); listDots.push({ s, halo, a, ph: i * .7 });
    });
  });

  /* ---------------------------------------------------------------- light + environment */
  const sun = new THREE.DirectionalLight(0xffc28e, 3.1);
  sun.position.set(-90, 70, 40); sun.castShadow = true;
  sun.shadow.mapSize.set(isPhone ? 1024 : 2048, isPhone ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 10, far: 300 });
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .03; sun.shadow.radius = 4;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xffe2c4, 0x1f3a32, 1.1); scene.add(hemi);
  const fill = new THREE.DirectionalLight(0x9fc4d6, .5); fill.position.set(80, 40, -60); scene.add(fill);
  {
    const pm = new THREE.PMREMGenerator(renderer);
    const es = new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'varying vec3 vP; void main(){ float y = vP.y; vec3 c = mix(vec3(.12,.24,.21), vec3(1.,.78,.58), smoothstep(-.2,.35,y)); c = mix(c, vec3(.55,.7,.78), smoothstep(.35,1.,y)); c += vec3(1.,.6,.35)*pow(max(dot(vP, normalize(vec3(-.8,.4,.3))),0.),8.)*2.; gl_FragColor = vec4(c,1.); }'
    })));
    scene.environment = pm.fromScene(es, .04).texture;
    scene.environmentIntensity = .55;
  }

  /* ---------------------------------------------------------------- html labels */
  const labelLayer = document.querySelector('[data-map-labels]');
  const labels = [];
  const LBL = [['lakes', -32, -42], ['hialeah', 34, -52], ['springs', 49, 12], ['airport', 18, 6], ['doral', -34, -22], ['west', 22, 54]];
  if (labelLayer) LBL.forEach(([k, x, z]) => {
    const el = document.createElement('span'); el.className = 'maplabel'; el.textContent = REG[k].name; labelLayer.appendChild(el);
    labels.push({ el, v: new THREE.Vector3(x, TOP + 1, z), k });
  });

  /* ---------------------------------------------------------------- camera story */
  const overview = { pos: new THREE.Vector3(70, 118, 150), look: new THREE.Vector3(-8, 0, -2) };
  if (isPhone) { overview.pos.set(40, 210, 210); overview.look.set(0, 0, -6); }
  const shots = AG.map(a => ({ pos: new THREE.Vector3(a.pin[0] + 38, 66, a.pin[1] + 74), look: new THREE.Vector3(a.pin[0], 2, a.pin[1] + 2) }));
  if (isPhone) shots.forEach((s, i) => { s.pos.set(AG[i].pin[0] + 30, 120, AG[i].pin[1] + 120); s.look.set(AG[i].pin[0], 0, AG[i].pin[1] + 8); });
  const cur = { pos: overview.pos.clone(), look: overview.look.clone() };
  const tgtPos = new THREE.Vector3(), tgtLook = new THREE.Vector3();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5; }, { passive: true });

  let active = -1;
  function stageFromScroll() {
    if (reduce || !hero) return { s: -1, k: 0 };
    const r = hero.getBoundingClientRect();
    const p = THREE.MathUtils.clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    if (p < .16) return { s: -1, k: 0, p };
    const s = Math.min(AG.length - 1, Math.floor((p - .16) / (.84 / AG.length)));
    return { s, k: 1, p };
  }
  function setActive(s) {
    if (s === active) return;
    active = s;
    document.dispatchEvent(new CustomEvent('agentfocus', { detail: s }));
  }
  document.addEventListener('agentpick', e => { forced = e.detail; forcedAt = performance.now(); });
  let forced = null, forcedAt = 0;

  /* ---------------------------------------------------------------- picking */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hoverPin = -1;
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pins.map(p => p.g), true)[0];
    hoverPin = hit ? pins.findIndex(p => p.g === hit.object.parent) : -1;
    canvas.style.cursor = hoverPin >= 0 ? 'pointer' : '';
  });
  canvas.addEventListener('click', () => { if (hoverPin >= 0 && window.openAgent) window.openAgent(AG[hoverPin].id); });

  /* ---------------------------------------------------------------- loop */
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < .8 ? 38 : 30;
    // on wide screens, shift the model to the right so the headline has the left half
    VW = w; VH = h; applyOffset(); camera.updateProjectionMatrix();
  }
  // wide screens: the model sits right of the headline in the overview and left of the agent card in close-ups
  let VW = 1, VH = 1, offX = null, offY = 0;
  function applyOffset(targetX, targetY) {
    const wide = VW / VH > 1.1;
    const tx = targetX != null ? targetX : (wide ? -.17 : 0), ty = targetY != null ? targetY : (wide ? 0 : -.14);
    offX = offX == null ? tx : offX + (tx - offX) * .06; offY += (ty - offY) * .06;
    camera.setViewOffset(VW, VH, VW * offX, VH * offY, VW, VH);
  }
  addEventListener('resize', resize); resize();
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);
  const clk = new THREE.Clock(); let t = 0, first = true;
  const P = new THREE.Vector3();
  const wantGlow = {};
  function frame() {
    requestAnimationFrame(frame);
    if (!visible && !first) return;
    const dt = Math.min(clk.getDelta(), .05);
    if (!reduce) t += dt;
    T.value = t;
    let st = stageFromScroll();
    if (forced != null && performance.now() - forcedAt < 4000 && st.s < 0) st = { s: forced, k: 1 };
    setActive(st.s);
    const shot = st.s >= 0 ? shots[st.s] : overview;
    tgtPos.copy(shot.pos); tgtLook.copy(shot.look);
    if (!reduce && st.s < 0) { // slow orbit over the whole model
      const a = Math.sin(t * .06) * .12;
      tgtPos.sub(tgtLook).applyAxisAngle(new THREE.Vector3(0, 1, 0), a).add(tgtLook);
    }
    mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
    const k = reduce ? 1 : 1 - Math.pow(.0009, dt);
    cur.pos.lerp(tgtPos, k); cur.look.lerp(tgtLook, k);
    camera.position.copy(cur.pos);
    if (!reduce) { camera.position.x += mouse.x * 10; camera.position.y -= mouse.y * 6; }
    camera.lookAt(cur.look);
    { const wide = VW / VH > 1.1; applyOffset(st.s >= 0 ? (wide ? .14 : 0) : (wide ? -.17 : 0), st.s >= 0 ? (wide ? 0 : .12) : (wide ? 0 : -.14)); camera.updateProjectionMatrix(); }

    // pins drop, bob, and the active one lifts
    pins.forEach((p, i) => {
      if (!reduce && clk.elapsedTime > p.delay) p.drop = Math.min(1, (clk.elapsedTime - p.delay) * 1.1);
      const d = p.drop, bounce = d < 1 ? (1 - Math.abs(Math.cos(d * Math.PI * 2.5)) * (1 - d)) : 1;
      const fall = (1 - d) * (1 - d) * 60;
      const on = i === st.s || i === hoverPin;
      p.g.position.y = fall + (reduce ? 0 : Math.sin(t * 1.6 + i) * .25) + (on ? 2.4 : 0) * bounce;
      p.g.rotation.y = reduce ? .4 : t * .5 + i;
      const sc = (on ? 3 : 2.3) * (d > .02 ? 1 : 0);
      p.g.scale.lerp(P.set(sc, sc, sc), .12);
      p.ring.material.opacity += ((on ? .9 : .35) * d - p.ring.material.opacity) * .1;
      const rs = 1 + (reduce ? 0 : (t * .8 + i * .3) % 1) * 1.6; p.ring.scale.set(rs, rs, rs);
    });
    // area wash for the active agent
    for (const kk in regionGlow) wantGlow[kk] = 0;
    if (st.s >= 0) AG[st.s].regions.forEach(r => { wantGlow[r] = .26; regionGlow[r].material.color.set(AG[st.s].color); });
    for (const kk in regionGlow) { const m = regionGlow[kk].material; m.opacity += (wantGlow[kk] - m.opacity) * .08; }
    listDots.forEach(d => {
      const on = st.s < 0 || AG[st.s].id === d.a.id;
      const s = (on ? 1 : .55); d.s.scale.lerp(P.set(s, on ? 1 : .4, s), .1);
      const hs = 1 + (reduce ? 0 : ((t * .9 + d.ph) % 1)) * 1.4; d.halo.scale.set(hs, hs, hs);
      d.halo.material.opacity = on ? .7 * (1 - (hs - 1) / 1.4) : 0;
    });
    // traffic and the plane
    if (!reduce) {
      carData.forEach((c, i) => {
        c.z += c.dir * c.v * dt; if (c.z > MAP.z1 - 1) c.z = MAP.z0 + 1; if (c.z < MAP.z0 + 1) c.z = MAP.z1 - 1;
        DM.compose(V.set(EXPWY_X + Math.sin(c.z * .03) * .8 + c.lane, .12, c.z), Q.identity(), Sc.set(1, 1, 1)); cars.setMatrixAt(i, DM);
      });
      cars.instanceMatrix.needsUpdate = true;
      const f = (t % 16) / 16;
      const fx = 6 + f * 70, fy = TOP + .45 + Math.max(0, f - .3) ** 2 * 60, fz = 8 + f * 6;
      flyer.position.set(fx, fy, fz); flyer.rotation.set(0, -.08, Math.min(.25, Math.max(0, f - .3) * .9));
      flyer.visible = f < .95;
    } else { carData.forEach((c, i) => { DM.compose(V.set(EXPWY_X + c.lane, .12, c.z), Q.identity(), Sc.set(1, 1, 1)); cars.setMatrixAt(i, DM); }); flyer.visible = false; }

    renderer.render(scene, camera);
    // labels follow the model
    if (labelLayer) {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      labels.forEach(l => {
        P.copy(l.v).project(camera);
        const x = (P.x * .5 + .5) * w, y = (-P.y * .5 + .5) * h;
        l.el.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
        l.el.classList.toggle('is-on', st.s >= 0 && AG[st.s].regions.includes(l.k));
        l.el.style.opacity = P.z < 1 && x > -40 && x < w + 40 ? '' : '0';
      });
    }
    if (first) { first = false; document.documentElement.classList.add('hero-ready'); }
  }
  frame();
}
