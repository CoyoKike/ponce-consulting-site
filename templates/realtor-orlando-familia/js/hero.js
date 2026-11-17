// La casa abierta: a Central Florida family home at golden hour. Stucco, barrel-tile roof, a live oak
// with Spanish moss, a screened pool lanai, bikes on the driveway. Scroll and it opens like a dollhouse:
// the roof lifts away, the front wall swings down onto the lawn, the rooms light up and get their names.
import * as THREE from 'three';

const canvas = document.querySelector('[data-hero-canvas]');
const hero = document.querySelector('[data-hero]');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = Math.min(innerWidth, innerHeight) < 600;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { document.documentElement.classList.add('no-webgl'); }
if (renderer) init();

function init() {
  const DPR = Math.min(devicePixelRatio || 1, isPhone ? 1.6 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .3, 2500);
  const rnd = (() => { let s = 23; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const U = { time: { value: 0 } };
  const world = new THREE.Group(); scene.add(world);

  /* ---------------- sky ---------------- */
  const sunDir = new THREE.Vector3(-.62, .36, .62).normalize();
  const SKY = {
    uTop: { value: new THREE.Color(0x4f86c4) }, uMid: { value: new THREE.Color(0xa8c7e4) }, uHor: { value: new THREE.Color(0xffd6a2) },
    uSun: { value: new THREE.Color(0xffc483) }, uSunDir: { value: sunDir }, uTime: U.time
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: SKY, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 uTop,uMid,uHor,uSun,uSunDir; uniform float uTime; varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.02; a*=.5; } return v; }
      void main(){ vec3 d = normalize(vDir); float y = d.y; float sd = max(dot(d, normalize(uSunDir)), 0.);
        vec3 c = mix(uHor, uMid, smoothstep(-.02, .22, y)); c = mix(c, uTop, smoothstep(.2, .75, y));
        c += uSun * (pow(sd, 5.) * .45 + pow(sd, 120.) * 1.2);
        vec2 q = d.xz / max(y + .1, .05);
        float cl = smoothstep(.5, .85, fbm(q * .45 + vec2(uTime * .003, 0.))) * smoothstep(.02, .15, y);
        vec3 cc = mix(vec3(1.,.95,.9), uSun * 1.15, pow(sd, 2.) * .7 + .15);
        c = mix(c, cc, cl * .7);
        c = mix(c, uHor * .8, smoothstep(0., -.08, y));
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 24), skyMat); sky.frustumCulled = false; scene.add(sky);
  scene.fog = new THREE.Fog(0xf3d9b6, 70, 420);

  /* ---------------- light ---------------- */
  const sun = new THREE.DirectionalLight(0xffcf96, 3.1);
  sun.position.copy(sunDir).multiplyScalar(80); sun.castShadow = true;
  sun.shadow.mapSize.set(isPhone ? 1024 : 2048, isPhone ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 30, bottom: -26, near: 5, far: 200 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xc4dbf2, 0x6d5a3c, .85); scene.add(hemi);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));
  scene.environment = pmrem.fromScene(envScene, .04).texture;

  /* ---------------- materials ---------------- */
  const tl = new THREE.TextureLoader();
  const tex = (n, srgb) => { const t = tl.load('assets/tex/' + n); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const tri = s => `
    vec4 tpW = modelMatrix * vec4(position, 1.0); vec3 tpN = normalize(mat3(modelMatrix) * normal); vec3 tpA = abs(tpN);
    vec2 tpUV = (tpA.x > tpA.y && tpA.x > tpA.z ? tpW.zy : (tpA.y > tpA.z ? tpW.xz : tpW.xy)) * ${s.toFixed(3)};
    #ifdef USE_MAP
    vMapUv = tpUV;
    #endif
    #ifdef USE_NORMALMAP
    vNormalMapUv = tpUV;
    #endif
    #ifdef USE_ROUGHNESSMAP
    vRoughnessMapUv = tpUV;
    #endif`;
  const texCache = {};
  function pbr(name, opt, scale, triplanar = true) {
    const set = texCache[name] || (texCache[name] = { map: tex(name + '_diff.webp', true), normalMap: tex(name + '_nor.webp'), roughnessMap: tex(name + '_rough.webp') });
    const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 1, metalness: 0 }, set, opt));
    if (triplanar) {
      m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + tri(scale)); };
      m.customProgramCacheKey = () => name + scale + (opt.color || '');
    }
    return m;
  }
  const M = {
    stucco: pbr('white_stucco_02', { color: 0xf3dcc0 }, .45),
    stuccoN: pbr('white_stucco_02', { color: 0xe6e0cf }, .45),
    stuccoN2: pbr('white_stucco_02', { color: 0xf0d2b8 }, .45),
    roof: pbr('clay_roof_tiles_02', { color: 0xf0b48f, side: THREE.DoubleSide }, .5, false),
    roofG: pbr('clay_roof_tiles_02', { color: 0xf0b48f, side: THREE.DoubleSide }, .51, false),
    roofN: pbr('clay_roof_tiles_02', { color: 0xc9a58b, side: THREE.DoubleSide }, .5, false),
    pavers: pbr('concrete_pavers', { color: 0xe9dccb }, .4),
    grass: pbr('leafy_grass', { color: 0x9fb46a }, .22),
    floor: new THREE.MeshStandardMaterial({ color: 0xd2ad84, roughness: .55 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xfbf7ef, roughness: .6 }),
    inner: new THREE.MeshStandardMaterial({ color: 0xf6efe2, roughness: .95 }),
    sage: new THREE.MeshStandardMaterial({ color: 0xb7c3a3, roughness: .95 }),
    clay: new THREE.MeshStandardMaterial({ color: 0xe3a98a, roughness: .95 }),
    door: new THREE.MeshStandardMaterial({ color: 0x2f5e62, roughness: .45 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1f2b31, roughness: .05, metalness: .85, transparent: true, opacity: .62, envMapIntensity: 1.5, emissive: 0xffc58a, emissiveIntensity: .08 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x3b342c, roughness: .5, metalness: .5 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false }),
    asphalt: pbr('clean_asphalt', { color: 0xd6cbbd }, .22),
    concrete: new THREE.MeshStandardMaterial({ color: 0xd9d2c4, roughness: .9 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x34481f, roughness: 1 }),
    oak: new THREE.MeshStandardMaterial({ color: 0x2c3d1c, roughness: 1 }),
    bark: new THREE.MeshStandardMaterial({ color: 0x5a4a3c, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xb98a5e, roughness: .7 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x6e4a32, roughness: .6 }),
    linen: new THREE.MeshStandardMaterial({ color: 0xe8dcc6, roughness: 1 }),
    sofa: new THREE.MeshStandardMaterial({ color: 0xcdbb9e, roughness: 1 }),
    cabinet: new THREE.MeshStandardMaterial({ color: 0xf7f3ea, roughness: .5 }),
    counter: new THREE.MeshStandardMaterial({ color: 0xece8e2, roughness: .25 }),
    black: new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: .3, metalness: .2 }),
    terracotta: new THREE.MeshStandardMaterial({ color: 0xc0623f, roughness: .9 }),
    mustard: new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 1 }),
    teal: new THREE.MeshStandardMaterial({ color: 0x3f8f8a, roughness: .5, metalness: .2 }),
    coral: new THREE.MeshStandardMaterial({ color: 0xe0644d, roughness: .5, metalness: .2 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xf08a24, roughness: .6 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 0 }),
    tile: new THREE.MeshStandardMaterial({ color: 0x9ad3d6, roughness: .4 })
  };

  const box = (mat, w, h, d, x, y, z, parent = world, o = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = o.cast !== false; m.receiveShadow = true;
    if (o.ry) m.rotation.y = o.ry;
    parent.add(m); return m;
  };
  const cyl = (mat, rt, rb, h, x, y, z, parent = world, seg = 16) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  // a wall with rectangular openings, built from a shape (local x along the wall, y up)
  function wall(mat, len, h, thick, holes) {
    const s = new THREE.Shape(); s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(len / 2, h); s.lineTo(-len / 2, h); s.closePath();
    holes.forEach(([x0, x1, y0, y1, arch]) => {
      const p = new THREE.Path(); p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1);
      if (arch) p.absarc((x0 + x1) / 2, y1, (x1 - x0) / 2, 0, Math.PI, false); else p.lineTo(x0, y1);
      p.lineTo(x0, y0); s.holes.push(p);
    });
    const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 12 });
    g.translate(0, 0, -thick / 2);
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function windowUnit(parent, x0, x1, y0, y1, z, arch) {
    const w = x1 - x0, cx = (x0 + x1) / 2, t = .09;
    box(M.trim, w + .2, t, .2, cx, y0 - .02, z + .06, parent);                 // sill
    box(M.trim, t, y1 - y0, .16, x0 - t / 2, (y0 + y1) / 2, z, parent);
    box(M.trim, t, y1 - y0, .16, x1 + t / 2, (y0 + y1) / 2, z, parent);
    if (!arch) box(M.trim, w + .18, t, .16, cx, y1 + t / 2, z, parent);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, y1 - y0), M.glass); gl.position.set(cx, (y0 + y1) / 2, z); parent.add(gl);
    if (arch) { const a = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 24, 0, Math.PI), M.glass); a.position.set(cx, y1, z); parent.add(a); }
    box(M.trim, .05, y1 - y0, .05, cx, (y0 + y1) / 2, z + .02, parent, { cast: false });   // muntin
    box(M.trim, w, .05, .05, cx, (y0 + y1) / 2, z + .02, parent, { cast: false });
  }

  /* ---------------- ground ---------------- */
  const G = 0, FL = .35;
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), M.grass);
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, 0, -10); lawn.receiveShadow = true; world.add(lawn);
  box(M.asphalt, 260, .04, 9, 0, .0, 27.5, world, { cast: false });
  box(M.concrete, 260, .12, 1.7, 0, .06, 22.2, world, { cast: false });                 // sidewalk
  box(M.concrete, 260, .16, .25, 0, .08, 23.15, world, { cast: false });                // curb
  for (let x = -120; x < 120; x += 6) box(new THREE.MeshBasicMaterial({ color: 0xe8d9a8 }), 2.6, .01, .14, x, .03, 27.5, world, { cast: false });
  box(M.pavers, 6.4, .06, 15.6, 12.25, .03, 13.8, world, { cast: false });             // driveway
  box(M.pavers, 1.5, .06, 5.6, 0, .03, 9.2, world, { cast: false });                   // front walk
  box(M.pavers, 7.6, .06, 1.5, 4.6, .03, 11.3, world, { cast: false });
  box(M.concrete, 19, FL, 13, 0, FL / 2, 0, world);                                     // slab
  box(M.concrete, 7, FL * .6, 10.4, 12.25, FL * .3, 1, world);

  /* ---------------- the house ---------------- */
  const HW = 18, HD = 12, WH = 3.1;
  const house = new THREE.Group(); world.add(house);
  // floors
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(HW - .3, HD - .3), M.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(0, FL + .01, 0); fl.receiveShadow = true; house.add(fl);
  const kfl = new THREE.Mesh(new THREE.PlaneGeometry(5.6, HD - .3), new THREE.MeshStandardMaterial({ color: 0xeee5d6, roughness: .5 })); kfl.rotation.x = -Math.PI / 2; kfl.position.set(6.1, FL + .015, 0); kfl.receiveShadow = true; house.add(kfl);
  // back wall with windows
  const back = wall(M.stucco, HW, WH, .25, [[-7.4, -4.8, 1.1, 2.4], [4.4, 7.6, 1.3, 2.4]]);
  back.position.set(0, FL, -HD / 2 + .12); house.add(back);
  // inner faces painted per room
  box(M.sage, 5.6, WH, .02, -6.1, FL + WH / 2, -HD / 2 + .26, house, { cast: false });
  box(M.inner, 6.2, WH, .02, 0, FL + WH / 2, -HD / 2 + .26, house, { cast: false });
  box(M.inner, 5.6, WH, .02, 6.1, FL + WH / 2, -HD / 2 + .26, house, { cast: false });
  // side walls
  const left = wall(M.stucco, HD, WH, .25, [[-2.6, 1.6, 0, 2.5]]); left.rotation.y = Math.PI / 2; left.position.set(-HW / 2 + .12, FL, 0); house.add(left);
  const slider = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.5), M.glass); slider.rotation.y = -Math.PI / 2; slider.position.set(-HW / 2 + .05, FL + 1.25, .5); house.add(slider);
  const right = wall(M.stucco, HD, WH, .25, []); right.rotation.y = Math.PI / 2; right.position.set(HW / 2 - .12, FL, 0); house.add(right);
  // partitions with doorways
  for (const px of [-3.2, 3.2]) {
    box(M.inner, .14, WH, 6.6, px, FL + WH / 2, -2.7, house);
    box(M.inner, .14, WH, 2.4, px, FL + WH / 2, 4.6, house);
    box(M.inner, .14, .6, 3, px, FL + WH - .3, 2, house);
  }
  // the front wall, hinged at its foot so it can swing down onto the lawn
  const hinge = new THREE.Group(); hinge.position.set(0, FL, HD / 2 - .12); house.add(hinge);
  const OPEN = [[-7.3, -4.9, 1.0, 2.35], [-1.0, 1.0, 0, 2.3, true], [1.7, 2.6, 1.0, 2.35], [4.6, 7.6, 1.05, 2.35]];
  const front = wall(M.stucco, HW, WH, .34, OPEN); hinge.add(front);
  windowUnit(hinge, -7.3, -4.9, 1.0, 2.35, .14); windowUnit(hinge, 1.7, 2.6, 1.0, 2.35, .14); windowUnit(hinge, 4.6, 7.6, 1.05, 2.35, .14);
  // shutters in sage beside the bedroom and kitchen windows
  [[-7.3, -4.9], [4.6, 7.6]].forEach(([a, b]) => { box(M.sage, .55, 1.45, .06, a - .42, 1.68, .17, hinge); box(M.sage, .55, 1.45, .06, b + .42, 1.68, .17, hinge); });
  // front door under an arch, coach lamps
  box(M.door, 1.9, 2.3, .08, 0, 1.15, .02, hinge); box(M.cabinet, 1.9, 2.3, .04, 0, 1.15, -.1, hinge);
  const fan = new THREE.Mesh(new THREE.CircleGeometry(1, 24, 0, Math.PI), M.glass); fan.position.set(0, 2.3, .02); hinge.add(fan);
  box(M.trim, 2.3, .1, .2, 0, 3.0, .12, hinge);
  for (const sx of [-1.35, 1.35]) { box(M.black, .2, .38, .2, sx, 2.05, .2, hinge); box(M.lamp, .12, .22, .12, sx, 2.02, .24, hinge, { cast: false }); }
  box(M.trim, HW + .1, .16, .32, 0, WH - .08, .1, hinge);   // frieze band
  // planters along the front wall belong to the ground, not the wall
  const blobs = [], ico = new THREE.IcosahedronGeometry(1, 3), vT = new THREE.Vector3();
  const blob = (x, y, z, s, sy = .8, arr = blobs) => {
    const g = ico.clone(); const p = g.attributes.position;
    const seed = rnd() * 100;
    for (let i = 0; i < p.count; i++) {
      // same jitter for vertices that share a position, so faces stay closed
      const hx = Math.round(p.getX(i) * 1000), hy = Math.round(p.getY(i) * 1000), hz = Math.round(p.getZ(i) * 1000);
      const hsh = Math.abs(Math.sin(hx * 12.9898 + hy * 78.233 + hz * 37.719 + seed) * 43758.5453) % 1;
      const k = .82 + hsh * .34; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * sy, p.getZ(i) * k);
    }
    const nr = g.attributes.normal; for (let i = 0; i < p.count; i++) { vT.set(p.getX(i), p.getY(i) / Math.max(sy, .3), p.getZ(i)).normalize(); nr.setXYZ(i, vT.x, vT.y, vT.z); }
    g.scale(s, s, s); g.translate(x, y, z); g.deleteAttribute('uv'); arr.push(g);
  };

  // leaf cards: many small alpha-cut quads around a volume, normals pointing out of the crown so it shades softly
  const leafC = document.createElement('canvas'); leafC.width = leafC.height = 256; const lg = leafC.getContext('2d');
  lg.fillStyle = '#fff';
  for (let i = 0; i < 46; i++) {
    const x = 24 + rnd() * 208, y = 24 + rnd() * 208, a = rnd() * Math.PI * 2, L = 30 + rnd() * 26, W = L * (.34 + rnd() * .12);
    lg.save(); lg.translate(x, y); lg.rotate(a); lg.beginPath(); lg.moveTo(-L / 2, 0);
    lg.quadraticCurveTo(0, -W, L / 2, 0); lg.quadraticCurveTo(0, W, -L / 2, 0); lg.fill(); lg.restore();
  }
  const leafTex = new THREE.CanvasTexture(leafC);
  const LF = { P: [], N: [], C: [], UV: [], S: [], I: [] };
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vN = new THREE.Vector3();
  function canopy(cx, cy, cz, rx, ry, rz, n, size, hue, light = .3) {
    for (let i = 0; i < n; i++) {
      // bias toward the surface of the ellipsoid
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = Math.pow(rnd(), .35);
      const sx = Math.sqrt(1 - u * u) * Math.cos(th), sz = Math.sqrt(1 - u * u) * Math.sin(th);
      const px = cx + sx * rx * r, py = cy + u * ry * r, pz = cz + sz * rz * r;
      vN.set(sx, u * 1.2 + .25, sz).normalize();
      vA.set(rnd() - .5, rnd() - .5, rnd() - .5).cross(vN).normalize();
      vB.copy(vN).cross(vA).normalize();
      const s = size * (.7 + rnd() * .6) / 2;
      const base = LF.P.length / 3;
      const top = (u + 1) / 2;
      const col = new THREE.Color().setHSL(hue + (rnd() - .5) * .04, .5 + rnd() * .12, light * (.62 + top * .45 + r * .15) + rnd() * .05);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        LF.P.push(px + (vA.x * a + vB.x * b) * s, py + (vA.y * a + vB.y * b) * s, pz + (vA.z * a + vB.z * b) * s);
        LF.N.push(vN.x, vN.y, vN.z); LF.C.push(col.r, col.g, col.b); LF.S.push(r * Math.min(1, size));
      }
      LF.UV.push(0, 0, 1, 0, 1, 1, 0, 1);
      LF.I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  for (let x = -8.6; x < 8.8; x += .9) if (Math.abs(x) > 1.4) blob(x, .55, 6.75 + rnd() * .2, .55 + rnd() * .2);
  for (let x = -8.6; x < 8.8; x += .9) if (Math.abs(x) > 1.4) canopy(x, .72, 6.8, .64, .5, .47, 64, .4, .27, .3);
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 6, 4), new THREE.MeshStandardMaterial({ roughness: .8 }), 90);
  const DM = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < 90; i++) {
    let x = -8.6 + rnd() * 17.2; if (Math.abs(x) < 1.5) x += 3;
    DM.makeTranslation(x, .75 + rnd() * .35, 6.6 + rnd() * .7); flowers.setMatrixAt(i, DM);
    flowers.setColorAt(i, col.set([0xe0405a, 0xf28aa8, 0xffffff, 0xf4b23c][i % 4]));
  }
  world.add(flowers);

  /* ---------------- rooms ---------------- */
  const R = new THREE.Group(); house.add(R);
  const y0 = FL;
  // kids' room: bunk bed, rug, desk, toy chest
  for (const [x, z] of [[-8.3, -5.3], [-8.3, -3.2], [-5.9, -5.3], [-5.9, -3.2]]) box(M.wood, .1, 2.0, .1, x + .1, y0 + 1, z + .1, R);
  box(M.wood, 2.5, .14, 2.2, -7.05, y0 + .45, -4.2, R); box(M.linen, 2.3, .22, 2, -7.05, y0 + .62, -4.2, R);
  box(M.wood, 2.5, .14, 2.2, -7.05, y0 + 1.5, -4.2, R); box(new THREE.MeshStandardMaterial({ color: 0x8fb6c9, roughness: 1 }), 2.3, .22, 2, -7.05, y0 + 1.67, -4.2, R);
  box(M.coral, 2.32, .06, 1.2, -7.05, y0 + .76, -3.8, R, { cast: false });
  const rug1 = cyl(M.mustard, 1.3, 1.3, .02, -5.6, y0 + .02, .4, R, 32); rug1.castShadow = false;
  box(M.wood, 1.6, .08, .7, -4.2, y0 + .78, -5.4, R); box(M.wood, .08, .74, .6, -4.95, y0 + .37, -5.4, R); box(M.wood, .08, .74, .6, -3.45, y0 + .37, -5.4, R);
  box(M.lamp, .18, .26, .18, -3.7, y0 + .95, -5.45, R);
  box(M.teal, 1.0, .55, .55, -8.3, y0 + .28, 2.6, R);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: .6 })); ball.position.set(-5.2, y0 + .18, 1.6); ball.castShadow = true; R.add(ball);
  // living room: sofa, coffee table, rug, console, art, plant, floor lamp
  const rug2 = box(M.terracotta, 4.4, .02, 3.2, 0, y0 + .02, -.8, R, { cast: false });
  box(M.sofa, 3.6, .45, 1.0, 0, y0 + .3, -3.4, R); box(M.sofa, 3.6, .7, .3, 0, y0 + .55, -3.85, R);
  box(M.sofa, .3, .62, 1.0, -1.85, y0 + .4, -3.4, R); box(M.sofa, .3, .62, 1.0, 1.85, y0 + .4, -3.4, R);
  for (const x of [-1.1, 0, 1.1]) box(new THREE.MeshStandardMaterial({ color: [0xb5603f, 0xe8d6b2, 0x6f8b6a][(x + 1.1) / 1.1 | 0], roughness: 1 }), .55, .45, .14, x, y0 + .72, -3.6, R);
  cyl(M.woodDark, .65, .65, .08, 0, y0 + .45, -1.6, R, 28); cyl(M.woodDark, .12, .2, .4, 0, y0 + .22, -1.6, R);
  box(M.sofa, .9, .5, .9, 2.0, y0 + .28, -.6, R);
  box(M.woodDark, 2.6, .5, .45, 0, y0 + .25, 3.3, R); box(M.black, 1.9, 1.05, .06, 0, y0 + 1.15, 3.42, R);
  [[-1.8, 1.9, 1.0, .8, 0xd27b4f], [-.9, 1.9, .6, .8, 0x8aa07a], [1.9, 1.85, 1.1, 1.1, 0xe7c37a]].forEach(([x, y, w, h, c]) => box(new THREE.MeshStandardMaterial({ color: c, roughness: .9 }), w, h, .04, x, y0 + y, -HD / 2 + .3, R, { cast: false }));
  cyl(M.terracotta, .26, .2, .5, 2.6, y0 + .25, -4.9, R);
  for (let i = 0; i < 7; i++) blob(2.6 + (rnd() - .5) * .5, y0 + .8 + rnd() * .7, -4.9 + (rnd() - .5) * .5, .28, 1.4);
  cyl(M.black, .03, .03, 1.6, -2.6, y0 + .8, -4.8, R); box(M.lamp, .4, .35, .4, -2.6, y0 + 1.7, -4.8, R, { cast: false });
  // kitchen: cabinets, counter, uppers, island, stools, table, oranges
  box(M.cabinet, 5.4, .9, .65, 6.1, y0 + .45, -5.4, R); box(M.counter, 5.5, .06, .7, 6.1, y0 + .93, -5.38, R);
  box(M.cabinet, 1.4, .9, .65, 4.1, y0 + 1.95, -5.55, R); box(M.cabinet, 1.4, .9, .65, 8.1, y0 + 1.95, -5.55, R);
  box(M.black, .8, .08, .5, 6.1, y0 + .97, -5.4, R);
  box(M.cabinet, .65, 2.4, .7, 8.65, y0 + 1.2, -3.8, R);           // fridge column
  box(M.sage, 2.6, .9, 1.0, 6.1, y0 + .45, -2.4, R); box(M.counter, 2.8, .06, 1.15, 6.1, y0 + .93, -2.4, R);
  for (const x of [5.3, 6.1, 6.9]) { cyl(M.wood, .2, .2, .06, x, y0 + .7, -1.55, R); cyl(M.black, .025, .025, .68, x, y0 + .34, -1.55, R, 6); }
  const bowl = cyl(M.cabinet, .28, .16, .12, 6.1, y0 + 1.02, -2.4, R);
  for (let i = 0; i < 6; i++) { const o = new THREE.Mesh(new THREE.SphereGeometry(.08, 10, 8), M.orange); o.position.set(6.1 + Math.cos(i) * .14, y0 + 1.1 + (i % 2) * .05, -2.4 + Math.sin(i) * .14); R.add(o); }
  cyl(M.wood, .75, .75, .06, 6.2, y0 + .78, 2.4, R, 28); cyl(M.wood, .08, .14, .75, 6.2, y0 + .38, 2.4, R);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .4; box(M.wood, .42, .45, .42, 6.2 + Math.cos(a) * 1.05, y0 + .23, 2.4 + Math.sin(a) * 1.05, R); }
  // pendant glow over island and lamp blobs
  const pend = [];
  for (const x of [5.4, 6.8]) { const p = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), M.lamp); p.position.set(x, y0 + 2.2, -2.4); R.add(p); pend.push(p); cyl(M.black, .01, .01, .9, x, y0 + 2.75, -2.4, R, 4); }
  // interior lights
  const inLights = [[-6.1, -1], [0, -1], [6.1, -1]].map(([x, z]) => { const L = new THREE.PointLight(0xffc98a, 0, 9, 1.4); L.position.set(x, y0 + 2.6, z); house.add(L); return L; });

  /* ---------------- roof (lifts away) ---------------- */
  function hipRoof(x0, x1, z0, z1, rise, o) {
    const X0 = x0 - o, X1 = x1 + o, Z0 = z0 - o, Z1 = z1 + o, d = (Z1 - Z0) / 2, zm = (Z0 + Z1) / 2;
    const A = [X0, 0, Z1], B = [X1, 0, Z1], C = [X1, 0, Z0], D = [X0, 0, Z0], R1 = [X0 + d, rise, zm], R2 = [X1 - d, rise, zm];
    const pos = [], uv = [];
    const slope = Math.hypot(d, rise);
    const face = (pts, axis, flip) => {
      // u along the eave, v up the slope (in meters / 2.2 per tile repeat)
      pts.forEach(p => {
        const u = axis === 'x' ? p[0] : p[2];
        const v = (p[1] / rise) * slope;
        pos.push(...p); uv.push(u / 2.2 * (flip ? -1 : 1), v / 2.2);
      });
    };
    face([A, B, R2], 'x'); face([A, R2, R1], 'x');
    face([C, D, R1], 'x', 1); face([C, R1, R2], 'x', 1);
    face([D, A, R1], 'z'); face([B, C, R2], 'z', 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  const roof = new THREE.Group(); roof.position.set(0, FL + WH, 0); house.add(roof);
  const roofMesh = new THREE.Mesh(hipRoof(-HW / 2, HW / 2, -HD / 2, HD / 2, 3.2, .7), M.roof); roofMesh.castShadow = true; roofMesh.receiveShadow = true; roof.add(roofMesh);
  box(M.trim, HW + 1.5, .28, .12, 0, -.08, HD / 2 + .72, roof); box(M.trim, HW + 1.5, .28, .12, 0, -.08, -HD / 2 - .72, roof);
  box(M.trim, .12, .28, HD + 1.5, -HW / 2 - .72, -.08, 0, roof); box(M.trim, .12, .28, HD + 1.5, HW / 2 + .72, -.08, 0, roof);
  const soffit = box(M.trim, HW + 1.4, .05, HD + 1.4, 0, -.2, 0, roof, { cast: false });
  const roofMats = [M.roof, M.trim];

  /* ---------------- garage ---------------- */
  const gar = new THREE.Group(); world.add(gar);
  box(M.stucco, 6.6, 3.0, 10, 12.25, FL * .6 + 1.5, 1, gar);
  const doorC = document.createElement('canvas'); doorC.width = 256; doorC.height = 128; const dg = doorC.getContext('2d');
  dg.fillStyle = '#f7f3ea'; dg.fillRect(0, 0, 256, 128);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { dg.strokeStyle = 'rgba(0,0,0,.12)'; dg.lineWidth = 2; dg.strokeRect(c * 32 + 4, r * 32 + 4, 24, 24); }
  const gd = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.4), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(doorC), roughness: .6 }));
  gd.material.map.colorSpace = THREE.SRGBColorSpace; gd.position.set(12.25, FL * .6 + 1.2, 6.02); gar.add(gd);
  box(M.trim, 5.4, .14, .14, 12.25, FL * .6 + 2.45, 6.05, gar);
  const groof = new THREE.Mesh(hipRoof(9, 15.5, -4, 6, 2.5, .6), M.roofG); groof.position.set(0, FL * .6 + 3, 0); groof.castShadow = true; gar.add(groof);
  box(M.trim, 7.8, .26, .12, 12.25, FL * .6 + 2.92, 6.62, gar);
  // bikes on the driveway
  function bike(x, z, ry, mat) {
    const b = new THREE.Group();
    const wheel = new THREE.TorusGeometry(.3, .035, 8, 28);
    for (const dx of [-.5, .5]) { const w = new THREE.Mesh(wheel, M.black); w.position.set(dx, .33, 0); w.castShadow = true; b.add(w); }
    const bar = (x1, y1, x2, y2) => { const L = Math.hypot(x2 - x1, y2 - y1); const m = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, L, 6), mat); m.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0); m.rotation.z = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2; m.castShadow = true; b.add(m); };
    bar(-.5, .33, -.05, .33); bar(-.05, .33, .3, .72); bar(-.5, .33, -.15, .7); bar(-.15, .7, .3, .72); bar(.5, .33, .3, .72); bar(-.05, .33, -.18, .78); bar(.3, .72, .34, .9);
    const seat = box(M.black, .26, .05, .12, -.18, .8, 0, b); const hb = box(M.black, .04, .04, .5, .34, .9, 0, b);
    b.position.set(x, 0, z); b.rotation.y = ry; world.add(b);
  }
  bike(10.6, 9.2, .5, M.coral); bike(11.6, 10.4, -.3, M.teal);
  // mailbox
  cyl(M.woodDark, .05, .05, 1.1, 8.4, .55, 20.9); box(M.black, .5, .32, .28, 8.4, 1.2, 20.9);

  /* ---------------- screened pool lanai ---------------- */
  const LX0 = -18.5, LX1 = -9.2, LZ0 = -6, LZ1 = 4, LH = 3.4;
  box(M.pavers, LX1 - LX0, .3, LZ1 - LZ0, (LX0 + LX1) / 2, .15, (LZ0 + LZ1) / 2, world, { cast: false });
  box(M.tile, 5.4, .05, 6, -14.6, .29, -1.2, world, { cast: false });
  const poolMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time },
    vertexShader: `varying vec2 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.); vP = w.xz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime; varying vec2 vP;
      float c(vec2 p){ p*=1.7; float v=0.; for(int i=0;i<3;i++){ p = vec2(p.x+sin(p.y*1.7+uTime*.8), p.y+cos(p.x*1.3+uTime*.6)); v += abs(sin(p.x)*sin(p.y)); } return v/3.; }
      void main(){ float k = pow(1.-c(vP),3.); gl_FragColor = vec4(mix(vec3(.12,.55,.66), vec3(.75,1.,1.), k*.75), 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(5, 5.6), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(-14.6, .31, -1.2); world.add(pool);
  for (let i = 0; i < 2; i++) { box(M.trim, .8, .12, 1.9, -11, .5, -4 + i * 1.3, world); box(M.trim, .8, .1, .7, -11, .75, -4.8 + i * 1.3, world).rotation.x = .9; }
  // aluminum cage + screens
  const cage = new THREE.Group(); world.add(cage);
  const post = (x, z, h) => box(M.bronze, .08, h, .08, x, .3 + h / 2, z, cage);
  for (let x = LX0; x <= LX1 + .01; x += (LX1 - LX0) / 4) { post(x, LZ1, LH); post(x, LZ0, LH); }
  for (let z = LZ0; z <= LZ1 + .01; z += (LZ1 - LZ0) / 4) post(LX0, z, LH);
  box(M.bronze, LX1 - LX0, .08, .08, (LX0 + LX1) / 2, .3 + LH, LZ1, cage); box(M.bronze, LX1 - LX0, .08, .08, (LX0 + LX1) / 2, .3 + LH, LZ0, cage);
  box(M.bronze, .08, .08, LZ1 - LZ0, LX0, .3 + LH, (LZ0 + LZ1) / 2, cage);
  box(M.bronze, LX1 - LX0, .06, .06, (LX0 + LX1) / 2, 1.2, LZ1, cage); box(M.bronze, .06, .06, LZ1 - LZ0, LX0, 1.2, (LZ0 + LZ1) / 2, cage);
  const scr = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.screen); m.position.set(x, y, z); m.rotation.y = ry; cage.add(m); };
  scr(LX1 - LX0, LH, (LX0 + LX1) / 2, .3 + LH / 2, LZ1, 0); scr(LX1 - LX0, LH, (LX0 + LX1) / 2, .3 + LH / 2, LZ0, 0); scr(LZ1 - LZ0, LH, LX0, .3 + LH / 2, (LZ0 + LZ1) / 2, Math.PI / 2);
  // sloped screen roof up to the house eave
  const sr = new THREE.Mesh(new THREE.PlaneGeometry(LX1 - LX0, LZ1 - LZ0), M.screen); sr.rotation.x = -Math.PI / 2; sr.rotation.y = 0; sr.position.set((LX0 + LX1) / 2, .3 + LH + .4, (LZ0 + LZ1) / 2); cage.add(sr);
  for (let x = LX0; x <= LX1 + .01; x += (LX1 - LX0) / 4) box(M.bronze, .06, .06, LZ1 - LZ0, x, .3 + LH + .4, (LZ0 + LZ1) / 2, cage);

  /* ---------------- trees ---------------- */
  // live oak: a short trunk splitting into wide limbs under a broad, low canopy hung with moss
  const oak = new THREE.Group(); world.add(oak);
  const OX = -25, OZ = 13;
  cyl(M.bark, .5, .75, 3, OX, 1.5, OZ, oak, 12);
  const limb = (dx, dz, len, up) => { const m = cyl(M.bark, .22, .4, len, 0, 0, 0, oak, 10); const dir = new THREE.Vector3(dx, up, dz).normalize(); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); m.position.set(OX + dir.x * len / 2, 2.8 + dir.y * len / 2, OZ + dir.z * len / 2); };
  limb(1, .2, 6, .55); limb(-1, .3, 6.5, .5); limb(.2, -1, 5, .7); limb(-.3, 1, 5, .6);
  const oakBlobs = [];
  for (let i = 0; i < 16; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 5; blob(OX + Math.cos(a) * r, 6.7 + rnd() * .8 - r * .1, OZ + Math.sin(a) * r * .8, 1.4 + rnd() * .6, .55, oakBlobs); }
  canopy(OX, 6.9, OZ, 7.4, 1.9, 6, 1500, 1.3, .24, .34);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + rnd() * .4; canopy(OX + Math.cos(a) * 5.2, 6.4 + rnd() * .8, OZ + Math.sin(a) * 4.2, 2.4, 1.3, 2.2, 160, .9, .25, .3); }
  const mossC = document.createElement('canvas'); mossC.width = 64; mossC.height = 256; const mg = mossC.getContext('2d');
  mg.strokeStyle = '#fff'; for (let i = 0; i < 22; i++) { mg.lineWidth = .8 + rnd() * 1.2; mg.beginPath(); let x = 8 + rnd() * 48; mg.moveTo(x, 0); for (let y = 0; y < 256; y += 16) { x += (rnd() - .5) * 5; mg.lineTo(x, y + rnd() * (256 - y) * .15); } mg.stroke(); }
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x939a80, alphaMap: new THREE.CanvasTexture(mossC), alphaTest: .4, side: THREE.DoubleSide, roughness: 1 });
  mossMat.onBeforeCompile = sh => { sh.uniforms.uTime = U.time; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float sw = 1.0 - uv.y; transformed.x += sin(uTime * 1.1 + position.z * 2.) * .1 * sw; transformed.z += cos(uTime * .9 + position.x * 2.) * .06 * sw;'); };
  // Spanish moss: hundreds of thin hanging strands, merged into one mesh
  const MS = { P: [], UV: [], I: [] };
  for (let i = 0; i < 320; i++) {
    const a = rnd() * Math.PI * 2, r = 1.2 + Math.sqrt(rnd()) * 6.4, L = .8 + rnd() * 2.2, w = .08 + rnd() * .12, ry = rnd() * Math.PI;
    const x = OX + Math.cos(a) * r, z = OZ + Math.sin(a) * r * .8, y = 5.75 - r * .1 + rnd() * .3;
    const dx = Math.cos(ry) * w / 2, dz = Math.sin(ry) * w / 2, b = MS.P.length / 3;
    MS.P.push(x - dx, y, z - dz, x + dx, y, z + dz, x + dx, y - L, z + dz, x - dx, y - L, z - dz);
    MS.UV.push(0, 1, 1, 1, 1, 0, 0, 0); MS.I.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const mossG = new THREE.BufferGeometry(); mossG.setAttribute('position', new THREE.Float32BufferAttribute(MS.P, 3)); mossG.setAttribute('uv', new THREE.Float32BufferAttribute(MS.UV, 2)); mossG.setIndex(MS.I); mossG.computeVertexNormals();
  const moss = new THREE.Mesh(mossG, mossMat); moss.castShadow = true; oak.add(moss);
  // palms (same build as the bayfront site, sized for a front yard)
  const frondC = document.createElement('canvas'); frondC.width = 512; frondC.height = 128; const fg = frondC.getContext('2d');
  fg.strokeStyle = '#fff'; fg.lineCap = 'round'; fg.lineWidth = 5; fg.beginPath(); fg.moveTo(0, 64); fg.lineTo(512, 64); fg.stroke();
  for (let i = 4; i < 500; i += 7) { const L = 58 * Math.sin(Math.PI * Math.min(1, (i + 30) / 540)) + 6; fg.lineWidth = 3.4 - i / 220; for (const s of [-1, 1]) { fg.beginPath(); fg.moveTo(i, 64); fg.quadraticCurveTo(i + L * .45, 64 + s * L * .55, i + L * .75, 64 + s * L); fg.stroke(); } }
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x6f8a3c, alphaMap: new THREE.CanvasTexture(frondC), alphaTest: .45, side: THREE.DoubleSide, roughness: .8, vertexColors: true });
  frondMat.onBeforeCompile = sh => { sh.uniforms.uTime = U.time; sh.vertexShader = 'uniform float uTime;\nattribute float aSway;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    float sw = aSway * aSway; vec4 wp0 = modelMatrix * vec4(position,1.); transformed.y += sin(uTime * 1.3 + wp0.x * .3 + wp0.z * .2) * .15 * sw; transformed.x += sin(uTime * .9 + wp0.z * .25) * .12 * sw;`); };
  const trunkC = document.createElement('canvas'); trunkC.width = 64; trunkC.height = 512; const tg2 = trunkC.getContext('2d');
  for (let y = 0; y < 512; y += 6) { const v = 130 + rnd() * 40; tg2.fillStyle = `rgb(${v},${v * .9},${v * .78})`; tg2.fillRect(0, y, 64, 6); tg2.fillStyle = 'rgba(40,30,20,.5)'; tg2.fillRect(0, y + 4, 64, 2); }
  const trunkTex = new THREE.CanvasTexture(trunkC); trunkTex.colorSpace = THREE.SRGBColorSpace; trunkTex.wrapS = trunkTex.wrapT = THREE.RepeatWrapping;
  const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTex, roughness: .95, color: 0xbba88e });
  const frondParts = [], trunkParts = [];
  function palm(x, z, h, lean, rot) {
    const base = new THREE.Vector3(x, 0, z), dir = new THREE.Vector3(Math.cos(rot), 0, Math.sin(rot)), pts = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(base.clone().add(dir.clone().multiplyScalar(lean * u * u * h * .25)).add(new THREE.Vector3(0, u * h, 0))); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const segs = 16, rad = 8, pos = [], uv = [], ind = [];
    for (let i = 0; i <= segs; i++) { const u = i / segs, p = curve.getPoint(u), r = .26 - .1 * u + (u < .06 ? (.06 - u) * 3 : 0); for (let k = 0; k <= rad; k++) { const a = k / rad * Math.PI * 2; pos.push(p.x + Math.cos(a) * r, p.y, p.z + Math.sin(a) * r); uv.push(k / rad, u * h / 2); } }
    for (let i = 0; i < segs; i++) for (let k = 0; k < rad; k++) { const a = i * (rad + 1) + k, b = a + rad + 1; ind.push(a, b, a + 1, a + 1, b, b + 1); }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); tg.setIndex(ind); tg.computeVertexNormals(); trunkParts.push(tg);
    const top = curve.getPoint(1);
    for (let f = 0; f < 15; f++) {
      const a = f / 15 * Math.PI * 2 + rnd() * .3, up = f % 3 === 0 ? .6 : f % 3 === 1 ? .15 : -.25, len = 2.6 + rnd() * 1.1, segN = 10, dx = Math.cos(a), dz = Math.sin(a);
      const P = [], C = [], S = [], UV = [], I = []; const c = new THREE.Color().setHSL(.2 + rnd() * .04, .45, .34 + rnd() * .1);
      for (let i = 0; i <= segN; i++) { const u = i / segN, hor = u * len, vert = Math.sin(u * 1.4) * up * len * .6 - u * u * len * .55, cx = top.x + dx * hor, cy = top.y + vert, cz = top.z + dz * hor, w = .85 * Math.sin(Math.PI * Math.min(1, u * 1.1 + .05)), px = -dz * w, pz = dx * w, dr = -.22 * w;
        P.push(cx + px, cy + dr, cz + pz, cx, cy + .05, cz, cx - px, cy + dr, cz - pz); UV.push(u, 0, u, .5, u, 1); for (let k = 0; k < 3; k++) { C.push(c.r, c.g, c.b); S.push(u); } }
      for (let i = 0; i < segN; i++) for (let k = 0; k < 2; k++) { const a0 = i * 3 + k, b0 = a0 + 3; I.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aSway', new THREE.Float32BufferAttribute(S, 1)); g.setIndex(I); g.computeVertexNormals(); frondParts.push(g);
    }
  }
  [[16.8, 8, 7.5, 1.2, .4], [17.6, 3, 9, .8, .1], [-20, 6, 8.5, 1.4, 2.8], [-21, -3, 10, 1, 3.1], [5, -11, 9.5, .7, -1.4]].forEach(p => palm(...p));
  const mergeIdx = parts => {
    let vc = 0, ic = 0; parts.forEach(g => { vc += g.attributes.position.count; ic += g.index.count; });
    const out = new THREE.BufferGeometry();
    Object.keys(parts[0].attributes).forEach(nm => { const sz = parts[0].attributes[nm].itemSize, arr = new Float32Array(vc * sz); let o = 0; parts.forEach(g => { arr.set(g.attributes[nm].array, o); o += g.attributes[nm].array.length; }); out.setAttribute(nm, new THREE.BufferAttribute(arr, sz)); });
    const ia = new Uint32Array(ic); let io = 0, vo = 0; parts.forEach(g => { for (let i = 0; i < g.index.count; i++) ia[io++] = g.index.array[i] + vo; vo += g.attributes.position.count; });
    out.setIndex(new THREE.BufferAttribute(ia, 1)); return out;
  };
  const mergeNI = parts => {
    let vc = 0; parts.forEach(g => vc += g.attributes.position.count);
    const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3); let o = 0;
    parts.forEach(g => { pos.set(g.attributes.position.array, o); nor.set(g.attributes.normal.array, o); o += g.attributes.position.array.length; });
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
  };
  const fronds = new THREE.Mesh(mergeIdx(frondParts), frondMat); fronds.castShadow = true; world.add(fronds);
  const trunks = new THREE.Mesh(mergeIdx(trunkParts), trunkMat); trunks.castShadow = true; world.add(trunks);
  const oakM = new THREE.Mesh(mergeNI(oakBlobs), M.oak); oakM.castShadow = true; oakM.receiveShadow = true; oak.add(oakM);

  /* ---------------- the street: neighbors and a tree line ---------------- */
  function neighbor(x, z, w, d, mat, rmat) {
    box(mat, w, 3, d, x, 1.5, z);
    const r = new THREE.Mesh(hipRoof(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 2.6, .6), rmat); r.position.y = 3; r.castShadow = true; world.add(r);
    box(M.glass, w * .3, 1.3, .05, x - w * .2, 1.7, z + d / 2 + .02, world, { cast: false });
    box(M.trim, 3, 2.2, .05, x + w * .25, 1.1, z + d / 2 + .02, world, { cast: false });
    for (let i = 0; i < 5; i++) { const bx = x - w / 2 + 1 + i * (w - 2) / 4; blob(bx, .5, z + d / 2 + .7, .45 + rnd() * .15); canopy(bx, .62, z + d / 2 + .7, .65, .5, .5, 30, .45, .27, .3); }
  }
  neighbor(-36, -1, 17, 12, M.stuccoN, M.roofN); neighbor(36, -1, 18, 12, M.stuccoN2, M.roof);
  neighbor(-30, 40, 16, 11, M.stuccoN2, M.roofN); neighbor(4, 42, 18, 12, M.stuccoN, M.roof); neighbor(38, 41, 17, 12, M.stuccoN2, M.roofN);
  for (let i = 0; i < 44; i++) {
    const x = -140 + i * 6.5 + rnd() * 3, z = -46 - rnd() * 14, h = 5 + rnd() * 3, rr = 4 + rnd() * 2.5;
    blob(x, h, z, rr * .55, .9);
    canopy(x, h + .4, z, rr, rr * .85, rr, 300, 2.4, .25 + rnd() * .04, .27);
  }
  const leafG = new THREE.BufferGeometry();
  leafG.setAttribute('position', new THREE.Float32BufferAttribute(LF.P, 3)); leafG.setAttribute('normal', new THREE.Float32BufferAttribute(LF.N, 3));
  leafG.setAttribute('color', new THREE.Float32BufferAttribute(LF.C, 3)); leafG.setAttribute('uv', new THREE.Float32BufferAttribute(LF.UV, 2));
  leafG.setAttribute('aSway', new THREE.Float32BufferAttribute(LF.S, 1)); leafG.setIndex(LF.I);
  const leafMat = new THREE.MeshStandardMaterial({ alphaMap: leafTex, alphaTest: .5, side: THREE.DoubleSide, vertexColors: true, roughness: .8 });
  leafMat.onBeforeCompile = sh => { sh.uniforms.uTime = U.time; sh.vertexShader = 'uniform float uTime;\nattribute float aSway;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    vec4 lw = modelMatrix * vec4(position, 1.); transformed.x += sin(uTime * 1.6 + lw.x * .7 + lw.y) * .04 * aSway; transformed.y += cos(uTime * 1.3 + lw.z * .8) * .03 * aSway;`); };
  const leaves = new THREE.Mesh(leafG, leafMat); leaves.castShadow = true; leaves.receiveShadow = true;
  leaves.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: leafTex, alphaTest: .5 });
  world.add(leaves);
  const shrubs = new THREE.Mesh(mergeNI(blobs), M.leaf); shrubs.castShadow = true; shrubs.receiveShadow = true; world.add(shrubs);

  /* ---------------- labels ---------------- */
  const labels = Array.from(document.querySelectorAll('[data-room]')).map(el => {
    const [x, y, z] = el.dataset.room.split(',').map(Number);
    return { el, p: new THREE.Vector3(x, y, z) };
  });

  /* ---------------- camera + scroll ---------------- */
  const camA = isPhone ? { pos: new THREE.Vector3(10, 13, 44), look: new THREE.Vector3(-2.5, 7.5, 0) } : { pos: new THREE.Vector3(19, 8.5, 33), look: new THREE.Vector3(-4.5, 2.6, 0) };
  const camB = isPhone ? { pos: new THREE.Vector3(3, 20, 31), look: new THREE.Vector3(-3, .5, -1) } : { pos: new THREE.Vector3(8, 13, 22), look: new THREE.Vector3(-3.5, .8, -1) };
  const look = new THREE.Vector3(), tmp = new THREE.Vector3();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5; }, { passive: true });
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function progress() {
    if (!hero) return 0;
    const r = hero.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
  }
  let P = 0, t = 0, intro = reduce ? 1 : 0;
  function apply(p) {
    const kRoof = ss(.06, .36, p), kWall = ss(.22, .55, p), kCam = ss(.05, .9, p), kLab = ss(.5, .68, p), kIn = ss(.2, .55, p);
    roof.position.y = FL + WH + kRoof * 9; roof.rotation.z = kRoof * .12; roof.position.x = -kRoof * 2;
    const op = 1 - ss(.12, .36, p);
    roofMats.forEach(m => { m.transparent = op < .999; m.opacity = op; m.depthWrite = op > .5; });
    roof.visible = op > .01;
    hinge.rotation.x = kWall * Math.PI / 2;
    inLights.forEach(L => { L.intensity = kIn * 20; });
    M.lamp.emissiveIntensity = .4 + kIn * 2.6;
    const e = kCam;
    camera.position.lerpVectors(camA.pos, camB.pos, e);
    look.lerpVectors(camA.look, camB.look, e);
    const k = 1 - Math.pow(1 - intro, 3);
    camera.position.x += (1 - k) * 8; camera.position.y += (1 - k) * 3; camera.position.z += (1 - k) * 10;
    if (!reduce) { camera.position.x += Math.sin(t * .08) * .6 + mouse.x * 2.2; camera.position.y -= mouse.y * .9; }
    camera.lookAt(look);
    camera.updateMatrixWorld();
    const w = canvas.clientWidth, h = canvas.clientHeight;
    labels.forEach(({ el, p: lp }) => {
      tmp.copy(lp).project(camera);
      el.style.transform = `translate3d(${(tmp.x * .5 + .5) * w}px, ${(-tmp.y * .5 + .5) * h}px, 0)`;
      el.style.opacity = kLab;
    });
  }

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < .8 ? 50 : w / h < 1.3 ? 40 : 32; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  let visible = true; new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);
  const clk = new THREE.Clock(); let first = true;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible && !first) return;
    const rawDt = Math.min(clk.getDelta(), .5), dt = Math.min(rawDt, .05);
    if (!reduce) { t += dt; intro = Math.min(1, intro + dt / 2.8); }
    U.time.value = t;
    const target = reduce ? .72 : progress();
    P += (target - P) * (reduce ? 1 : 1 - Math.exp(-rawDt * 5));
    mouse.x += (mouse.tx - mouse.x) * .04; mouse.y += (mouse.ty - mouse.y) * .04;
    apply(P);
    renderer.render(scene, camera);
    if (first) { first = false; document.documentElement.classList.add('hero-ready'); }
  }
  frame();
}
