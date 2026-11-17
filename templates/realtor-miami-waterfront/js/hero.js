// Casa Marea at the turn of the light: a bayfront villa on an island lot, a yacht at the dock,
// the downtown skyline across the bay. Scroll moves the evening from golden hour to night:
// the sun drops, the windows come on, the water picks it all up in a real planar reflection.
import * as THREE from 'three';

const canvas = document.querySelector('[data-hero-canvas]');
const hero = document.querySelector('[data-hero]');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = Math.min(innerWidth, innerHeight) < 600;

function fail() { document.documentElement.classList.add('no-webgl'); }
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) { fail(); }

if (renderer) init();

function init() {
  const DPR = Math.min(devicePixelRatio || 1, isPhone ? 1.6 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(isPhone ? 52 : 34, 1, 0.5, 3000);
  const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const U = { time: { value: 0 }, night: { value: 0 } };

  /* ------------------------------------------------ time of day keys */
  // p: 0 golden hour, .5 blue hour, 1 night
  const KEYS = [
    { p: 0, top: 0x2a4a7a, mid: 0x8a8fb0, hor: 0xffb070, sun: 0xffb46a, sunI: 3.2, hemiS: 0xbcd0ff, hemiG: 0x5a4636, hemiI: .9, fog: 0xd9a27f, exp: .95, el: .07, deep: 0x16303a, night: 0 },
    { p: .5, top: 0x0d1d40, mid: 0x3a4778, hor: 0xe0806a, sun: 0xff7a4a, sunI: .55, hemiS: 0x6a7fc0, hemiG: 0x2a2230, hemiI: .55, fog: 0x5a4d6a, exp: 1.05, el: -.03, deep: 0x0b1828, night: .72 },
    { p: 1, top: 0x03070f, mid: 0x0a1428, hor: 0x2a2a48, sun: 0x8fa8ff, sunI: .22, hemiS: 0x31406e, hemiG: 0x0c0c14, hemiI: .35, fog: 0x10162a, exp: 1.15, el: -.12, deep: 0x040a14, night: 1 }
  ];
  const NUM = new Set(['sunI', 'hemiI', 'exp', 'el', 'night']);
  const cA = new THREE.Color(), cB = new THREE.Color();
  function key(p, k) {
    let a = KEYS[0], b = KEYS[1];
    if (p >= KEYS[1].p) { a = KEYS[1]; b = KEYS[2]; }
    const t = THREE.MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1);
    const s = t * t * (3 - 2 * t);
    if (NUM.has(k)) return a[k] + (b[k] - a[k]) * s;
    return cA.set(a[k]).lerp(cB.set(b[k]), s).clone();
  }

  /* ------------------------------------------------ sky */
  const SKY = {
    uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3() }, uSun: { value: new THREE.Color() }, uNight: U.night, uTime: U.time
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: SKY, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `
      uniform vec3 uTop,uMid,uHor,uSun,uSunDir; uniform float uNight,uTime; varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.03; a*=.5; } return v; }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        float sd = max(dot(d, normalize(uSunDir)), 0.);
        vec3 c = mix(uHor, uMid, smoothstep(-.02, .18, y));
        c = mix(c, uTop, smoothstep(.15, .7, y));
        // warm band and glow around the sun
        c += uSun * (pow(sd, 6.) * .55 + pow(sd, 90.) * 1.6) * (1. - uNight * .75);
        float disc = smoothstep(.9994, .9997, sd) * step(-.01, y);
        c += uSun * disc * 6. * (1. - uNight);
        // cirrus, lit from below near the sun
        vec2 q = d.xz / max(y + .12, .05);
        float cl = smoothstep(.52, .86, fbm(q * .55 + vec2(uTime * .004, 0.))) * smoothstep(.0, .12, y) * (1. - smoothstep(.4, .8, y));
        vec3 cc = mix(uMid * 1.2, uSun * 1.25 + uHor * .3, pow(sd, 2.) * .8 + .2);
        cc = mix(cc, uTop * 1.4, uNight * .8);
        c = mix(c, cc, cl * .75);
        // stars
        vec2 sp = floor(d.xz / (y + 1.2) * 420.);
        float st = step(.9965, h(sp)) * smoothstep(.12, .5, y) * uNight;
        c += st * (.6 + .4 * sin(uTime * 2. + h(sp + 3.) * 30.));
        // below the horizon: dark sea haze
        c = mix(c, uHor * .35 + uMid * .2, smoothstep(0., -.06, y));
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), skyMat);
  sky.renderOrder = -1; sky.frustumCulled = false;
  scene.add(sky);

  /* ------------------------------------------------ lights */
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isPhone ? 1024 : 2048, isPhone ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 40, bottom: -40, near: 10, far: 260 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = .04;
  scene.add(sun, sun.target);
  sun.target.position.set(0, 0, -18);
  const hemi = new THREE.HemisphereLight(0xbcd0ff, 0x5a4636, .9);
  scene.add(hemi);
  scene.fog = new THREE.FogExp2(0xd9a27f, .00042);

  // warm spill from the house onto the deck and pool at night
  const spill = [];
  [[-9, 3.2, -9], [2, 3.2, -9], [-3, 7.4, -8.5], [11, 2.2, -2]].forEach(([x, y, z], i) => {
    const L = new THREE.PointLight(i === 3 ? 0x7fe8ff : 0xffb36b, 0, i === 3 ? 18 : 26, 1.6);
    L.position.set(x, y, z); scene.add(L); spill.push(L);
  });

  /* ------------------------------------------------ textures */
  const tl = new THREE.TextureLoader();
  const tex = (n, srgb, rep = 1) => {
    const t = tl.load('assets/tex/' + n);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(rep, rep);
    return t;
  };
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
  function pbr(name, opt, scale) {
    const m = new THREE.MeshStandardMaterial(Object.assign({
      map: tex(name + '_diff.webp', true), normalMap: tex(name + '_nor.webp'), roughnessMap: tex(name + '_rough.webp'), roughness: 1, metalness: 0
    }, opt));
    m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + tri(scale)); };
    m.customProgramCacheKey = () => name + scale;
    return m;
  }

  // a painted interior seen through glass: warm rooms, a sofa, art, a lamp, plants
  function interiorTexture(seed) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const g = c.getContext('2d');
    let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#fff1d6'); grd.addColorStop(.12, '#f2c690'); grd.addColorStop(.55, '#b9773e'); grd.addColorStop(1, '#3d2414');
    g.fillStyle = grd; g.fillRect(0, 0, 1024, 256);
    // pools of light from downlights
    for (let i = 0; i < 9; i++) {
      const x = 50 + i * 115 + r() * 30;
      const rg = g.createRadialGradient(x, 30, 4, x, 90, 150);
      rg.addColorStop(0, 'rgba(255,240,210,.95)'); rg.addColorStop(1, 'rgba(255,200,140,0)');
      g.fillStyle = rg; g.fillRect(x - 160, 0, 320, 256);
    }
    // back wall art and bookshelves
    for (let i = 0; i < 5; i++) {
      const x = r() * 900, w = 60 + r() * 120;
      g.fillStyle = ['#2f3d4a', '#6b3b2a', '#c8b89a', '#1d2a2a', '#8a5a3c'][i % 5];
      g.globalAlpha = .55; g.fillRect(x, 70 + r() * 20, w, 50 + r() * 30); g.globalAlpha = 1;
    }
    // furniture silhouettes
    g.fillStyle = 'rgba(40,24,14,.85)';
    for (let i = 0; i < 4; i++) {
      const x = r() * 900, w = 140 + r() * 120;
      g.beginPath(); g.roundRect(x, 180, w, 46, 10); g.fill();
      g.fillRect(x + 8, 160, w - 16, 26);
    }
    g.fillStyle = 'rgba(30,18,10,.9)';
    for (let i = 0; i < 3; i++) { const x = r() * 980; g.fillRect(x, 120, 3, 110); g.beginPath(); g.arc(x + 1, 116, 16, Math.PI, 0); g.fill(); }
    // plants
    g.fillStyle = 'rgba(22,30,16,.9)';
    for (let i = 0; i < 4; i++) {
      const x = r() * 1000;
      for (let k = 0; k < 14; k++) { g.beginPath(); g.ellipse(x + (r() - .5) * 50, 150 + r() * 60, 6 + r() * 10, 18 + r() * 14, (r() - .5) * 1.4, 0, 6.3); g.fill(); }
    }
    // sheer curtains at the ends
    g.fillStyle = 'rgba(255,236,210,.35)';
    g.fillRect(0, 0, 70, 256); g.fillRect(954, 0, 70, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  // tower windows for the skyline across the bay
  function towerTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 256, 512);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 32; x++) {
      const v = Math.random();
      if (v < .38) { g.fillStyle = v < .05 ? '#cfe6ff' : v < .2 ? '#ffd9a0' : '#ffc27a'; g.globalAlpha = .5 + Math.random() * .5; g.fillRect(x * 8 + 1, y * 4 + 1, 6, 2); }
    }
    g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  /* ------------------------------------------------ materials */
  const M = {
    stucco: pbr('white_stucco_02', { color: 0xf4efe6 }, .35),
    stuccoWarm: pbr('white_stucco_02', { color: 0xe9dfcf }, .35),
    deck: pbr('long_white_tiles', { color: 0xeee6d8 }, .28),
    wood: pbr('wood_floor_deck', { color: 0xc89a6a }, .45),
    teak: new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: .55 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: .35, metalness: .7 }),
    seawall: pbr('white_stucco_02', { color: 0xb9b2a4 }, .5),
    lawn: new THREE.MeshStandardMaterial({ color: 0x3f5a2a, roughness: 1 }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x35522a, roughness: .95 }),
    railGlass: new THREE.MeshStandardMaterial({ color: 0x9fc4c8, roughness: .05, metalness: .2, transparent: true, opacity: .22 }),
    hull: new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: .18, metalness: .05 }),
    hullDark: new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: .12, metalness: .4 }),
    poolTile: new THREE.MeshStandardMaterial({ color: 0x8fd3d8, roughness: .4 }),
    tower: new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: .5, metalness: .35, emissiveMap: towerTexture(), emissive: 0xffffff, emissiveIntensity: .1 })
  };
  const glassMats = [];
  function glass(seed) {
    const m = new THREE.MeshStandardMaterial({ color: 0x0e1316, roughness: .06, metalness: .1, emissive: 0xffffff, emissiveMap: interiorTexture(seed), emissiveIntensity: .25, envMapIntensity: 1.4 });
    glassMats.push(m); return m;
  }

  /* ------------------------------------------------ helpers */
  const world = new THREE.Group(); scene.add(world);
  const box = (mat, w, h, d, x, y, z, o = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (o.ry) m.rotation.y = o.ry;
    m.castShadow = o.cast !== false; m.receiveShadow = true;
    (o.parent || world).add(m); return m;
  };

  /* ------------------------------------------------ the lot: an island tip */
  const LOT = { x0: -30, x1: 44, z0: -60, z1: 0, top: 1.3 };
  // seawall + coral stone cap
  box(M.seawall, LOT.x1 - LOT.x0, LOT.top + 1.2, LOT.z1 - LOT.z0, (LOT.x0 + LOT.x1) / 2, (LOT.top - 1.2) / 2, (LOT.z0 + LOT.z1) / 2);
  box(M.deck, LOT.x1 - LOT.x0 + .6, .22, .7, (LOT.x0 + LOT.x1) / 2, LOT.top + .1, LOT.z1 + .05);
  box(M.deck, .7, .22, LOT.z1 - LOT.z0, LOT.x0 - .05, LOT.top + .1, (LOT.z0 + LOT.z1) / 2);
  // lawn
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(LOT.x1 - LOT.x0, LOT.z1 - LOT.z0), M.lawn);
  lawn.rotation.x = -Math.PI / 2; lawn.position.set((LOT.x0 + LOT.x1) / 2, LOT.top + .01, (LOT.z0 + LOT.z1) / 2); lawn.receiveShadow = true;
  world.add(lawn);

  /* ------------------------------------------------ pool deck + infinity pool */
  const T = LOT.top;
  box(M.deck, 40, .3, 13, -2, T + .15, -9.5);            // travertine terrace
  box(M.deck, 6, .6, 4, 16.5, T + .3, -3);               // steps down to lawn
  // pool: walls built around a recess
  const PX0 = -15, PX1 = 9, PZ0 = -8.6, PZ1 = -4.6;
  box(M.poolTile, PX1 - PX0, .1, PZ1 - PZ0, (PX0 + PX1) / 2, T + .02, (PZ0 + PZ1) / 2, { cast: false });
  const poolMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uNight: U.night },
    vertexShader: `varying vec2 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.); vP = w.xz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime,uNight; varying vec2 vP;
      float c(vec2 p){ p*=1.6; float v=0.; for(int i=0;i<3;i++){ p = vec2(p.x+sin(p.y*1.7+uTime*.8), p.y+cos(p.x*1.3+uTime*.6)); v += abs(sin(p.x)*sin(p.y)); } return v/3.; }
      void main(){ float k = pow(1.-c(vP),3.);
        vec3 day = mix(vec3(.05,.42,.52), vec3(.55,.95,1.), k*.7);
        vec3 nite = mix(vec3(.0,.35,.55), vec3(.45,1.,1.15), k) * 1.6;
        gl_FragColor = vec4(mix(day, nite, uNight), 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(PX1 - PX0, PZ1 - PZ0), poolMat);
  pool.rotation.x = -Math.PI / 2; pool.position.set((PX0 + PX1) / 2, T + .27, (PZ0 + PZ1) / 2);
  world.add(pool);
  // the deck edge around the pool, slightly raised coping
  box(M.deck, PX1 - PX0 + .8, .34, .4, (PX0 + PX1) / 2, T + .17, PZ0 - .2);
  box(M.deck, .4, .34, PZ1 - PZ0, PX0 - .2, T + .17, (PZ0 + PZ1) / 2);
  box(M.deck, .4, .34, PZ1 - PZ0, PX1 + .2, T + .17, (PZ0 + PZ1) / 2);
  // vanishing edge: a thin dark spill trough on the water side
  box(M.bronze, PX1 - PX0, .18, .25, (PX0 + PX1) / 2, T + .09, PZ1 + .15);
  // loungers
  for (let i = 0; i < 4; i++) {
    const x = -12 + i * 2.6;
    box(M.teak, .75, .12, 2, x, T + .5, -2.6);
    const back = box(M.teak, .75, .1, .8, x, T + .8, -3.6); back.rotation.x = .9;
    box(M.stucco, .75, .08, 1.95, x, T + .6, -2.55, { cast: false });
  }

  /* ------------------------------------------------ the house */
  const H = new THREE.Group(); world.add(H);
  const F1 = T + .3, FH = 4.1;               // ground floor level and height
  const F2 = F1 + FH + .45;                  // upper floor
  // ground floor: a long glass pavilion with a solid stucco wing at the west end
  const gx0 = -17, gx1 = 11, gz0 = -26, gz1 = -15.5;
  box(M.stucco, gx1 - gx0, FH, .5, (gx0 + gx1) / 2, F1 + FH / 2, gz0, { parent: H });           // back wall
  box(M.stucco, .5, FH, gz1 - gz0, gx1, F1 + FH / 2, (gz0 + gz1) / 2, { parent: H });          // east wall
  const g1 = new THREE.Mesh(new THREE.PlaneGeometry(gx1 - gx0 - 6, FH - .2), glass(3));
  g1.position.set((gx0 + 6 + gx1) / 2, F1 + FH / 2, gz1 - .1); H.add(g1);
  for (let x = gx0 + 6; x <= gx1 + .01; x += 2.75) box(M.bronze, .09, FH, .14, x, F1 + FH / 2, gz1 - .05, { parent: H });
  box(M.bronze, gx1 - gx0 - 6, .12, .16, (gx0 + 6 + gx1) / 2, F1 + .06, gz1 - .05, { parent: H });
  // west wing: solid, two storeys, a tall slot window
  box(M.stuccoWarm, 7, FH * 2 + 1.1, 13.5, -20.5, F1 + (FH * 2 + 1.1) / 2, -21.2, { parent: H });
  const slot = new THREE.Mesh(new THREE.PlaneGeometry(1.1, FH * 2 - .6), glass(17));
  slot.position.set(-19.2, F1 + FH, -14.42); H.add(slot);
  const slot2 = new THREE.Mesh(new THREE.PlaneGeometry(13.5 - 4, 1.2), glass(29));
  slot2.rotation.y = -Math.PI / 2; slot2.position.set(-24.02, F1 + FH * 1.55, -21.2); H.add(slot2);
  // floor slab between levels, cantilevered toward the water
  box(M.stucco, gx1 - gx0 + 4.5, .45, 15.8, (gx0 + gx1) / 2 + 1.25, F1 + FH + .22, -19.6, { parent: H });
  // upper floor: set back, a full-width ribbon of glass behind teak fins
  const ux0 = -15, ux1 = 9.5, uz0 = -25, uz1 = -16.2, UH = 3.7;
  box(M.stucco, ux1 - ux0, UH, .5, (ux0 + ux1) / 2, F2 + UH / 2, uz0, { parent: H });
  box(M.stucco, .5, UH, uz1 - uz0, ux1, F2 + UH / 2, (uz0 + uz1) / 2, { parent: H });
  const g2 = new THREE.Mesh(new THREE.PlaneGeometry(ux1 - ux0, UH - .2), glass(41));
  g2.position.set((ux0 + ux1) / 2, F2 + UH / 2, uz1 - .1); H.add(g2);
  for (let x = ux0 + .4; x < ux1 - 6; x += .55) box(M.teak, .12, UH - .1, .35, x, F2 + UH / 2, uz1 + .6, { parent: H, cast: true });
  // the upper terrace glass rail along the slab edge
  box(M.railGlass, gx1 - gx0 + 4, 1.05, .04, (gx0 + gx1) / 2 + 1.25, F2 + .53, -11.8, { parent: H, cast: false });
  // roof: a thin, wide plane with deep overhangs, the signature line of the house
  box(M.stucco, ux1 - ux0 + 7, .38, 14.5, (ux0 + ux1) / 2 + .8, F2 + UH + .19, -19.6, { parent: H });
  box(M.bronze, ux1 - ux0 + 7.05, .06, 14.55, (ux0 + ux1) / 2 + .8, F2 + UH + .4, -19.6, { parent: H, cast: false });
  // soffit downlights (bright dots under the overhangs)
  const dotGeo = new THREE.CircleGeometry(.09, 10); dotGeo.rotateX(Math.PI / 2);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const dots = new THREE.InstancedMesh(dotGeo, dotMat, 40); let di = 0;
  const DM = new THREE.Matrix4();
  for (let x = gx0 + 7; x < gx1 + 3; x += 2.2) { DM.makeTranslation(x, F1 + FH - .01, -12.6); dots.setMatrixAt(di++, DM); }
  for (let x = ux0 + .8; x < ux1 + 3; x += 2.2) { DM.makeTranslation(x, F2 + UH - .01, -13.2); dots.setMatrixAt(di++, DM); }
  dots.count = di; world.add(dots);
  // chimney-like mass and roof garden edge to break the box
  box(M.stuccoWarm, 2.4, 2.2, 3.4, 6.5, F2 + UH + 1.3, -22.5, { parent: H });

  /* ------------------------------------------------ dock + yacht */
  const dockX = 30, dockW = 3.2, dockL = 22;
  box(M.wood, dockW, .28, dockL, dockX, T - .1, dockL / 2 - .2);
  for (let z = 1.5; z < dockL; z += 3.4) for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.16, .18, 4, 10), M.teak);
    p.position.set(dockX + sx * (dockW / 2 + .05), T - 1.6, z); p.castShadow = true; world.add(p);
  }
  // yacht: lofted V hull, two decks of superstructure, black glass band
  function hullGeo(L, B, D) {
    const pos = [], idx = [];
    const N = 28;
    for (let i = 0; i <= N; i++) {
      const u = i / N;                                   // 0 stern .. 1 bow
      const w = B / 2 * (u < .62 ? 1 : Math.cos((u - .62) / .38 * Math.PI / 2) ** .8);
      const sheer = D * (1 + .35 * Math.max(0, u - .55) ** 2 * 3);
      const keel = -D * .55 * (u < .85 ? 1 : 1 - (u - .85) / .15 * .7);
      const z = (u - .5) * L;
      pos.push(-w, sheer, z, -w * .92, 0, z, -w * .35, keel * .8, z, 0, keel, z, w * .35, keel * .8, z, w * .92, 0, z, w, sheer, z);
    }
    for (let i = 0; i < N; i++) for (let k = 0; k < 6; k++) {
      const a = i * 7 + k, b = a + 7;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    // deck
    const base = pos.length / 3;
    for (let i = 0; i <= N; i++) { pos.push(pos[i * 21], pos[i * 21 + 1], pos[i * 21 + 2], pos[i * 21 + 18], pos[i * 21 + 19], pos[i * 21 + 20]); }
    for (let i = 0; i < N; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const yacht = new THREE.Group();
  const hull = new THREE.Mesh(hullGeo(26, 6.2, 2.2), M.hull); hull.castShadow = true; yacht.add(hull);
  const stripe = new THREE.Mesh(hullGeo(25.6, 6.3, .5), M.hullDark); stripe.position.y = .9; stripe.scale.set(1.002, 1, .985); yacht.add(stripe);
  const sup = (w, h, l, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat); m.position.set(0, y, z); m.castShadow = true; yacht.add(m); return m; };
  sup(4.8, 1.5, 13, 2.95, -1.2, M.hull);
  sup(4.86, .62, 12.4, 3.0, -1.2, M.hullDark);
  sup(4.2, 1.3, 8.5, 4.35, -2.4, M.hull);
  sup(4.26, .5, 8, 4.4, -2.4, M.hullDark);
  sup(4.6, .12, 10, 5.05, -2.6, M.hull);
  const mast = sup(.18, 2.2, .18, 6.1, -1.5, M.hull);
  yacht.position.set(dockX - dockW / 2 - 3.6, .35, 10.5);
  yacht.rotation.y = 0.0;
  world.add(yacht);

  /* ------------------------------------------------ palms */
  function frondTexture() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 512, 128);
    g.strokeStyle = '#fff'; g.lineCap = 'round';
    g.lineWidth = 5; g.beginPath(); g.moveTo(0, 64); g.lineTo(512, 64); g.stroke();
    for (let i = 4; i < 500; i += 7) {
      const L = 58 * Math.sin(Math.PI * Math.min(1, (i + 30) / 540)) + 6;
      g.lineWidth = 3.4 - i / 220;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(i, 64); g.quadraticCurveTo(i + L * .45, 64 + s * L * .55, i + L * .75, 64 + s * L); g.stroke(); }
    }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  function trunkTexture() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 512;
    const g = c.getContext('2d');
    for (let y = 0; y < 512; y += 6) {
      const v = 120 + Math.random() * 40;
      g.fillStyle = `rgb(${v},${v * .9},${v * .78})`; g.fillRect(0, y, 64, 6);
      g.fillStyle = 'rgba(40,30,20,.5)'; g.fillRect(0, y + 4, 64, 2);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x5f7f34, alphaMap: frondTexture(), alphaTest: .45, side: THREE.DoubleSide, roughness: .8, vertexColors: true });
  frondMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.time;
    sh.vertexShader = 'uniform float uTime;\nattribute float aSway;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float sw = aSway * aSway; vec4 wp0 = modelMatrix * vec4(position,1.);
      transformed.y += sin(uTime * 1.3 + wp0.x * .3 + wp0.z * .2) * .18 * sw;
      transformed.x += sin(uTime * .9 + wp0.z * .25) * .14 * sw;`);
  };
  const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTexture(), roughness: .95, color: 0xb8a58c });
  const frondParts = [], trunkParts = [];
  function palm(x, z, h, lean, rot) {
    const base = new THREE.Vector3(x, T, z);
    const dir = new THREE.Vector3(Math.cos(rot), 0, Math.sin(rot));
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      pts.push(base.clone().add(dir.clone().multiplyScalar(lean * u * u * h * .25)).add(new THREE.Vector3(0, u * h, 0)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    // trunk: tapered tube
    const segs = 18, rad = 8, pos = [], uv = [], ind = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs, p = curve.getPoint(u), r = .32 - .14 * u + (u < .06 ? (.06 - u) * 3 : 0);
      for (let k = 0; k <= rad; k++) {
        const a = k / rad * Math.PI * 2;
        pos.push(p.x + Math.cos(a) * r, p.y, p.z + Math.sin(a) * r); uv.push(k / rad, u * h / 2);
      }
    }
    for (let i = 0; i < segs; i++) for (let k = 0; k < rad; k++) { const a = i * (rad + 1) + k, b = a + rad + 1; ind.push(a, b, a + 1, a + 1, b, b + 1); }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); tg.setIndex(ind); tg.computeVertexNormals();
    trunkParts.push(tg);
    // crown of fronds
    const top = curve.getPoint(1);
    const n = 16;
    for (let f = 0; f < n; f++) {
      const a = f / n * Math.PI * 2 + rnd() * .3;
      const up = f % 3 === 0 ? .6 : f % 3 === 1 ? .15 : -.25;
      const len = 3.4 + rnd() * 1.4, segN = 10;
      const dx = Math.cos(a), dz = Math.sin(a);
      const P = [], C = [], S = [], UV = [], I = [];
      const col = new THREE.Color().setHSL(.2 + rnd() * .04, .45, .32 + rnd() * .1);
      for (let i = 0; i <= segN; i++) {
        const u = i / segN;
        const hor = u * len, vert = Math.sin(u * 1.4) * up * len * .6 - u * u * len * .55;
        const cx = top.x + dx * hor, cy = top.y + vert, cz = top.z + dz * hor;
        const w = 1.05 * Math.sin(Math.PI * Math.min(1, u * 1.1 + .05));
        const px = -dz * w, pz = dx * w, droop = -.25 * w;
        P.push(cx + px, cy + droop, cz + pz, cx, cy + .06, cz, cx - px, cy + droop, cz - pz);
        UV.push(u, 0, u, .5, u, 1);
        for (let k = 0; k < 3; k++) { C.push(col.r, col.g, col.b); S.push(u); }
      }
      for (let i = 0; i < segN; i++) for (let k = 0; k < 2; k++) { const a0 = i * 3 + k, b0 = a0 + 3; I.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aSway', new THREE.Float32BufferAttribute(S, 1));
      g.setIndex(I); g.computeVertexNormals();
      frondParts.push(g);
    }
  }
  const PALMS = [[-26, -3, 11, 1.6, 2.6], [-22.5, -6.5, 13, 1.2, 2.2], [20, -3.5, 12, 1.4, .3], [23.5, -8, 14.5, .9, .8], [37, -4, 10.5, 1.8, .2],
    [14.5, -27, 12, .8, -1.2], [-28, -30, 13.5, 1.1, 3.4], [40, -24, 12.5, 1, -.4], [-10, -32, 14, .6, -1.6]];
  PALMS.forEach(p => palm(...p));
  const merge = parts => {
    // minimal merge (same attributes)
    let vc = 0, ic = 0; parts.forEach(g => { vc += g.attributes.position.count; ic += g.index.count; });
    const out = new THREE.BufferGeometry();
    const names = Object.keys(parts[0].attributes);
    names.forEach(nm => {
      const sz = parts[0].attributes[nm].itemSize, arr = new Float32Array(vc * sz); let o = 0;
      parts.forEach(g => { arr.set(g.attributes[nm].array, o); o += g.attributes[nm].array.length; });
      out.setAttribute(nm, new THREE.BufferAttribute(arr, sz));
    });
    const ia = new Uint32Array(ic); let io = 0, vo = 0;
    parts.forEach(g => { for (let i = 0; i < g.index.count; i++) ia[io++] = g.index.array[i] + vo; vo += g.attributes.position.count; });
    out.setIndex(new THREE.BufferAttribute(ia, 1));
    return out;
  };
  const fronds = new THREE.Mesh(merge(frondParts), frondMat); fronds.castShadow = true; world.add(fronds);
  const trunks = new THREE.Mesh(merge(trunkParts), trunkMat); trunks.castShadow = true; trunks.receiveShadow = true; world.add(trunks);
  // up-lights at palm bases
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const glows = [];
  const glow = (x, y, z, s, color) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
    sp.position.set(x, y, z); sp.scale.set(s, s, s); world.add(sp); glows.push(sp); return sp;
  };
  PALMS.forEach(([x, z]) => glow(x, T + .4, z + .3, 2.2, 0xffcf8a));
  for (let z = 2; z < dockL; z += 4) { glow(dockX - dockW / 2, T + .3, z, 1.1, 0xffe0b0); glow(dockX + dockW / 2, T + .3, z, 1.1, 0xffe0b0); }
  glow(yacht.position.x, 6.4, yacht.position.z - 1.5, 1.2, 0xffffff);
  glow(yacht.position.x - 3.1, 2.6, yacht.position.z + 9, .9, 0xff3030);
  glow(yacht.position.x + 3.1, 2.6, yacht.position.z + 9, .9, 0x30ff70);
  for (let x = PX0; x <= PX1; x += 4) glow(x, T + .1, PZ1 + .3, 2.4, 0x6fe6ff);

  /* ------------------------------------------------ hedges and neighbors */
  const hedgeGeo = [];
  const ico = new THREE.IcosahedronGeometry(1, 2);
  const addBlob = (x, y, z, s) => {
    const g = ico.clone(); const p = g.attributes.position;
    const seed = rnd() * 100;
    for (let i = 0; i < p.count; i++) {
      const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i);
      const hsh = Math.sin(Math.round(X * 50) * 12.9898 + Math.round(Y * 50) * 78.233 + Math.round(Z * 50) * 37.719 + seed) * 43758.5453;
      const k = .86 + (hsh - Math.floor(hsh)) * .26;
      p.setXYZ(i, X * k, Y * k * .8, Z * k);
    }
    g.scale(s, s, s); g.translate(x, y, z); g.deleteAttribute('uv'); g.computeVertexNormals(); hedgeGeo.push(g);
  };
  for (let x = LOT.x0 + 2; x < LOT.x1; x += 2.2) addBlob(x, T + 1.2, LOT.z0 + 3 + rnd() * 2, 1.8 + rnd() * .8);
  for (let z = LOT.z0 + 4; z < -14; z += 2.4) addBlob(LOT.x1 - 2, T + 1.1, z, 1.7 + rnd() * .7);
  for (let i = 0; i < 10; i++) addBlob(-26 + rnd() * 6, T + .7, -12 - rnd() * 18, 1.1 + rnd() * .6);
  for (let i = 0; i < 8; i++) addBlob(14 + rnd() * 8, T + .6, -13 - rnd() * 4, .8 + rnd() * .5);
  const mergeNI = parts => {
    let vc = 0; parts.forEach(g => vc += g.attributes.position.count);
    const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3); let o = 0;
    parts.forEach(g => { pos.set(g.attributes.position.array, o); nor.set(g.attributes.normal.array, o); o += g.attributes.position.array.length; });
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
  };
  const hedges = new THREE.Mesh(mergeNI(hedgeGeo), M.hedge); hedges.castShadow = true; hedges.receiveShadow = true; world.add(hedges);

  // neighbors down the shore: simpler white houses with a lit window or two
  const nb = (x, z, w, h, d, s) => {
    box(M.seawall, w + 10, 2.5, d + 12, x, T - .6, z + 2);
    box(M.stucco, w, h, d, x, T + h / 2, z - 2);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(w * .7, h * .5), glass(s)); gl.position.set(x, T + h * .45, z - 2 + d / 2 + .02); world.add(gl);
    box(M.stucco, w + 2, .3, d + 2, x, T + h + .15, z - 2);
  };
  nb(68, -14, 16, 7, 12, 53); nb(98, -20, 20, 9, 14, 61);
  // a far island across the channel
  box(M.hedge, 260, 3, 30, 120, .5, -230, { cast: false });
  for (let i = 0; i < 26; i++) addBlob(0 + i * 10 + rnd() * 6, 3.5, -225 + rnd() * 8, 4 + rnd() * 3);
  const farHedges = new THREE.Mesh(mergeNI(hedgeGeo.splice(0)), M.hedge); world.add(farHedges);

  /* ------------------------------------------------ skyline across the bay */
  const towers = [];
  for (let i = 0; i < 46; i++) {
    const x = 120 + i * 34 + rnd() * 16, z = -1500 - rnd() * 220;
    const core = Math.exp(-((x - 860) ** 2) / 90000);
    const h = 22 + rnd() * 40 + core * (90 + rnd() * 120);
    const w = 14 + rnd() * 18, d = 14 + rnd() * 18;
    const g = new THREE.BoxGeometry(w, h, d);
    const uvA = g.attributes.uv;
    for (let k = 0; k < uvA.count; k++) uvA.setXY(k, uvA.getX(k) * w / 40 + rnd() * 0, uvA.getY(k) * h / 80);
    g.translate(x, h / 2 - 1, z);
    towers.push(g);
  }
  const mergeBoxes = parts => {
    let vc = 0, ic = 0; parts.forEach(g => { vc += g.attributes.position.count; ic += g.index.count; });
    const out = new THREE.BufferGeometry();
    ['position', 'normal', 'uv'].forEach(nm => {
      const sz = parts[0].attributes[nm].itemSize, arr = new Float32Array(vc * sz); let o = 0;
      parts.forEach(g => { arr.set(g.attributes[nm].array, o); o += g.attributes[nm].array.length; });
      out.setAttribute(nm, new THREE.BufferAttribute(arr, sz));
    });
    const ia = new Uint32Array(ic); let io = 0, vo = 0;
    parts.forEach(g => { for (let i = 0; i < g.index.count; i++) ia[io++] = g.index.array[i] + vo; vo += g.attributes.position.count; });
    out.setIndex(new THREE.BufferAttribute(ia, 1)); return out;
  };
  const skyline = new THREE.Mesh(mergeBoxes(towers), M.tower); world.add(skyline);
  // causeway lights low on the water
  const cw = new THREE.InstancedMesh(new THREE.SphereGeometry(2.4, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffcf8a, fog: false }), 60);
  for (let i = 0; i < 60; i++) { DM.makeTranslation(-100 + i * 26, 4, -950 - i * 2.2); cw.setMatrixAt(i, DM); }
  world.add(cw);
  box(new THREE.MeshStandardMaterial({ color: 0x1a1d26, roughness: .8 }), 1600, 2.4, 10, 670, 2, -1015, { cast: false }).rotation.y = .085;

  /* ------------------------------------------------ water with planar reflection */
  const rtScale = isPhone ? .45 : .55;
  const rt = new THREE.WebGLRenderTarget(256, 256, { type: THREE.HalfFloatType });
  const mirrorCam = new THREE.PerspectiveCamera();
  const texMatrix = new THREE.Matrix4();
  const WU = {
    tReflect: { value: rt.texture }, uTexM: { value: texMatrix }, uTime: U.time, uNight: U.night,
    uDeep: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uSun: { value: new THREE.Color() },
    uFog: { value: new THREE.Color() }, uFogD: { value: .00042 }
  };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShaderMaterial({
    uniforms: WU,
    vertexShader: `uniform mat4 uTexM; varying vec4 vM; varying vec3 vW;
      void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vM = uTexM * w; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform sampler2D tReflect; uniform float uTime,uNight,uFogD; uniform vec3 uDeep,uSunDir,uSun,uFog;
      varying vec4 vM; varying vec3 vW;
      vec2 wave(vec2 p, vec2 d, float f, float a, float s){ float ph = dot(p,d)*f + uTime*s; return d * cos(ph) * f * a; }
      void main(){
        vec2 p = vW.xz; vec2 g = vec2(0.);
        g += wave(p, normalize(vec2(1.,.3)), .21, .16, 1.1);
        g += wave(p, normalize(vec2(-.4,1.)), .37, .08, 1.6);
        g += wave(p, normalize(vec2(.7,-.6)), .83, .035, 2.3);
        g += wave(p, normalize(vec2(-.9,-.2)), 1.7, .015, 3.1);
        g += wave(p, normalize(vec2(.2,.95)), 3.1, .007, 4.2);
        vec3 N = normalize(vec3(-g.x, 1., -g.y));
        vec3 V = normalize(cameraPosition - vW);
        float dist = length(cameraPosition - vW);
        float fres = .03 + .97 * pow(1. - max(dot(N, V), 0.), 5.);
        vec4 uv = vM; uv.xy += N.xz * 2.4 * clamp(1. - dist / 2200., .1, 1.);
        vec3 refl = texture2DProj(tReflect, uv).rgb;
        vec3 col = mix(uDeep, refl, clamp(fres * 1.1 + .28, 0., 1.));
        vec3 R = reflect(-V, N);
        float spec = pow(max(dot(R, normalize(uSunDir)), 0.), 700.) * 7. + pow(max(dot(R, normalize(uSunDir)), 0.), 60.) * .35;
        col += uSun * spec * (1. - uNight) * step(-.02, uSunDir.y);
        float fogF = 1. - exp(-uFogD * uFogD * dist * dist);
        col = mix(col, uFog, fogF);
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  water.rotation.x = -Math.PI / 2;
  water.receiveShadow = false;
  scene.add(water);

  const RP = new THREE.Plane(), RN = new THREE.Vector3(0, 1, 0), RO = new THREE.Vector3();
  const vView = new THREE.Vector3(), vTarget = new THREE.Vector3(), vLook = new THREE.Vector3(), rotM = new THREE.Matrix4(), cp = new THREE.Vector4(), q4 = new THREE.Vector4();
  function renderReflection() {
    vView.setFromMatrixPosition(camera.matrixWorld);
    rotM.extractRotation(camera.matrixWorld);
    vLook.set(0, 0, -1).applyMatrix4(rotM).add(vView);
    vTarget.copy(RO).sub(vLook).reflect(RN).negate().add(RO);
    mirrorCam.position.copy(RO).sub(vView).reflect(RN).negate().add(RO);
    mirrorCam.up.set(0, 1, 0).applyMatrix4(rotM).reflect(RN);
    mirrorCam.lookAt(vTarget);
    mirrorCam.far = camera.far; mirrorCam.near = camera.near;
    mirrorCam.updateMatrixWorld();
    mirrorCam.projectionMatrix.copy(camera.projectionMatrix);
    texMatrix.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
    texMatrix.multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
    RP.setFromNormalAndCoplanarPoint(RN, RO).applyMatrix4(mirrorCam.matrixWorldInverse);
    cp.set(RP.normal.x, RP.normal.y, RP.normal.z, RP.constant);
    const pm = mirrorCam.projectionMatrix.elements;
    q4.x = (Math.sign(cp.x) + pm[8]) / pm[0]; q4.y = (Math.sign(cp.y) + pm[9]) / pm[5]; q4.z = -1; q4.w = (1 + pm[10]) / pm[14];
    cp.multiplyScalar(2 / cp.dot(q4));
    pm[2] = cp.x; pm[6] = cp.y; pm[10] = cp.z + 1; pm[14] = cp.w;
    water.visible = false; glows.forEach(g => g.material.depthTest = true);
    const sh = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, mirrorCam); renderer.setRenderTarget(null);
    renderer.shadowMap.autoUpdate = sh;
    water.visible = true;
  }

  /* ------------------------------------------------ environment from the sky itself */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat);
  envScene.add(envSky);
  let envRT = null, envP = -1;
  function updateEnv(p) {
    const b = Math.round(p * 6) / 6;
    if (b === envP) return;
    envP = b;
    const old = envRT;
    envRT = pmrem.fromScene(envScene, .04);
    scene.environment = envRT.texture;
    if (old) old.dispose();
  }

  /* ------------------------------------------------ time of day + camera */
  const sunDir = new THREE.Vector3();
  let P = 0, Ptarget = 0;
  function applyTOD(p) {
    const el = key(p, 'el');
    sunDir.set(.3, el, -.95).normalize();
    SKY.uTop.value.copy(key(p, 'top')); SKY.uMid.value.copy(key(p, 'mid')); SKY.uHor.value.copy(key(p, 'hor'));
    SKY.uSun.value.copy(key(p, 'sun')); SKY.uSunDir.value.copy(sunDir);
    const n = key(p, 'night'); U.night.value = n;
    sun.color.copy(key(p, 'sun')); sun.intensity = key(p, 'sunI');
    sun.position.copy(sunDir).multiplyScalar(140).add(sun.target.position);
    if (sunDir.y < .02) { // moonlight from high in the east once the sun is gone
      const m = THREE.MathUtils.smoothstep(.02 - sunDir.y, 0, .1);
      sun.position.lerp(new THREE.Vector3(60, 120, 40).add(sun.target.position), m);
    }
    hemi.color.copy(key(p, 'hemiS')); hemi.groundColor.copy(key(p, 'hemiG')); hemi.intensity = key(p, 'hemiI');
    scene.fog.color.copy(key(p, 'fog'));
    renderer.toneMappingExposure = key(p, 'exp');
    WU.uDeep.value.copy(key(p, 'deep')); WU.uSun.value.copy(key(p, 'sun')); WU.uSunDir.value.copy(sunDir); WU.uFog.value.copy(scene.fog.color);
    // lights come on as the light goes
    glassMats.forEach((m, i) => { m.emissiveIntensity = .12 + Math.min(1, Math.max(0, n * 1.6 - i * .05)) * 1.9; });
    M.tower.emissiveIntensity = .05 + n * 1.25;
    dotMat.color.setRGB(1, .85, .62).multiplyScalar(.2 + n * 3);
    glows.forEach(g => { g.material.opacity = Math.max(0, n * 1.3 - .25); });
    spill.forEach((L, i) => { L.intensity = n * (i === 3 ? 160 : 120); });
    updateEnv(p);
  }

  // where the camera travels during the hero scroll
  const camA = { pos: new THREE.Vector3(-58, 11, 52), look: new THREE.Vector3(-20, 5, -16) };
  const camB = { pos: new THREE.Vector3(-36, 5.4, 30), look: new THREE.Vector3(-12, 5, -14) };
  if (isPhone) { camA.pos.set(-46, 13, 64); camA.look.set(-6, -7, -16); camB.pos.set(-30, 7.5, 42); camB.look.set(-2, -4, -14); }
  const look = new THREE.Vector3();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5; }, { passive: true });
  let intro = reduce ? 1 : 0;
  function placeCamera(p, t) {
    const e = p * p * (3 - 2 * p);
    camera.position.lerpVectors(camA.pos, camB.pos, e);
    look.lerpVectors(camA.look, camB.look, e);
    // slow arrival on load
    const k = 1 - Math.pow(1 - intro, 3);
    camera.position.x += (1 - k) * -14; camera.position.y += (1 - k) * 6; camera.position.z += (1 - k) * 18;
    if (!reduce) {
      camera.position.x += Math.sin(t * .07) * 1.2 + mouse.x * 3;
      camera.position.y += mouse.y * -1.2;
    }
    camera.lookAt(look);
  }

  /* ------------------------------------------------ hud: clock + phase */
  const clock = document.querySelector('[data-tod-clock]');
  const phase = document.querySelector('[data-tod-phase]');
  const PHASES = [[0, 'Golden hour', 'Hora dorada'], [.34, 'Blue hour', 'Hora azul'], [.75, 'Night', 'Noche']];
  function hud(p) {
    if (!clock) return;
    const mins = Math.round(18 * 60 + 47 + p * (21 * 60 + 30 - 18 * 60 - 47));
    const h = Math.floor(mins / 60), m = mins % 60;
    const es = document.documentElement.lang === 'es';
    clock.textContent = es ? `${h}:${String(m).padStart(2, '0')}` : `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} pm`;
    let ph = PHASES[0]; PHASES.forEach(x => { if (p >= x[0]) ph = x; });
    phase.textContent = es ? ph[2] : ph[1];
  }

  /* ------------------------------------------------ scroll binding */
  function heroProgress() {
    if (!hero) return 0;
    const r = hero.getBoundingClientRect();
    const total = r.height - innerHeight;
    return THREE.MathUtils.clamp(-r.top / Math.max(1, total), 0, 1);
  }
  addEventListener('langchange', () => hud(P));
  document.addEventListener('langchange', () => hud(P));

  /* ------------------------------------------------ resize + loop */
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < .8 ? 56 : w / h < 1.3 ? 44 : 34;
    camera.updateProjectionMatrix();
    rt.setSize(Math.round(w * DPR * rtScale), Math.round(h * DPR * rtScale));
  }
  addEventListener('resize', resize);
  resize();

  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);
  const clk = new THREE.Clock();
  let t = 0, first = true;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible && !first) return;
    const dt = Math.min(clk.getDelta(), .05);
    if (!reduce) { t += dt; intro = Math.min(1, intro + dt / 3.2); }
    U.time.value = t;
    Ptarget = reduce ? .42 : heroProgress();
    P += (Ptarget - P) * (reduce ? 1 : .08);
    mouse.x += (mouse.tx - mouse.x) * .04; mouse.y += (mouse.ty - mouse.y) * .04;
    applyTOD(P);
    placeCamera(reduce ? .3 : P, t);
    hud(P);
    renderReflection();
    renderer.render(scene, camera);
    if (first) { first = false; document.documentElement.classList.add('hero-ready'); }
  }
  frame();
}
