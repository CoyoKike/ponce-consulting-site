// Shell House, Gulf Shore: an architect's pencil drawing of a raised Gulf Coast beach house that
// draws itself stroke by stroke as you scroll, then the paper washes away like watercolor and the
// real afternoon comes through: pale Gulf, sea oats on the dunes, a low sun over the water.
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
  const DPR = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  const lineScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .5, 4000);
  const U = { time: { value: 0 } };
  let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ---------------------------------------------------------------- sky */
  const SUN = new THREE.Vector3(-.37, .095, -.93).normalize();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: SUN }, uTime: U.time },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 uSun; uniform float uTime; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.1; a*=.5; } return v; }
      void main(){
        vec3 d = normalize(vD); float y = d.y; float s = max(dot(d, uSun), 0.);
        vec3 hor = vec3(1.0,.76,.56), mid = vec3(.50,.70,.86), top = vec3(.22,.45,.72);
        vec3 c = mix(hor, mid, smoothstep(0., .16, y)); c = mix(c, top, smoothstep(.1, .5, y));
        c += vec3(1.,.66,.36) * (pow(s, 6.) * .55 + pow(s, 120.) * 1.6);
        c += vec3(1.,.9,.75) * smoothstep(.9993, .9996, s) * 3.;
        vec2 q = d.xz / max(y + .1, .04);
        float cl = smoothstep(.6, .92, fbm(q * .45 + vec2(uTime * .003, 0.))) * smoothstep(.02, .14, y) * (1. - smoothstep(.35, .7, y));
        c = mix(c, mix(vec3(1.,.97,.93), vec3(1.,.82,.62), pow(s, 3.)), cl * .4);
        c = mix(c, hor * .92, smoothstep(.0, -.05, y));
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 24), skyMat); sky.frustumCulled = false; scene.add(sky);
  scene.fog = new THREE.Fog(0xf3dcc6, 120, 1300);

  /* ---------------------------------------------------------------- lights */
  const sun = new THREE.DirectionalLight(0xffd29e, 3.8);
  sun.position.copy(SUN).multiplyScalar(160).add(new THREE.Vector3(40, 0, -6));
  sun.target.position.set(40, 0, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isPhone ? 1024 : 2048, isPhone ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 32, bottom: -32, near: 20, far: 340 });
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .05;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xf0e6da, 0xe9c9a0, 1.15));

  /* ---------------------------------------------------------------- textures */
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
  function pbr(name, opt, scale) {
    const nod = opt.nodiff; delete opt.nodiff;
    const m = new THREE.MeshStandardMaterial(Object.assign({ map: nod ? null : tex(name + '_diff.webp', true), normalMap: tex(name + '_nor.webp'), roughnessMap: tex(name + '_rough.webp'), roughness: 1 }, opt));
    m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + tri(scale)); };
    m.customProgramCacheKey = () => name + scale;
    return m;
  }
  const solid = (m) => { m.polygonOffset = true; m.polygonOffsetFactor = 1.5; m.polygonOffsetUnits = 2; return m; };
  const M = {
    siding: solid(pbr('white_planks_clean', { color: 0xfbf7ef }, .32)),
    trim: solid(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .7 })),
    roof: solid(new THREE.MeshStandardMaterial({ color: 0xc7d0d2, roughness: .38, metalness: .55 })),
    deck: solid(new THREE.MeshStandardMaterial({ color: 0xc9b49a, roughness: .9 })),
    post: solid(new THREE.MeshStandardMaterial({ color: 0xf2eee6, roughness: .8 })),
    shutter: solid(new THREE.MeshStandardMaterial({ color: 0x8fb9b1, roughness: .6 })),
    glass: solid(new THREE.MeshStandardMaterial({ color: 0x5d7f8c, roughness: .05, metalness: .3, envMapIntensity: 1.5 })),
    sand: solid(pbr('coast_sand_01', { color: 0xf6d6a0, nodiff: true, envMapIntensity: .25 }, .18)),
    wood: solid(new THREE.MeshStandardMaterial({ color: 0xb59f86, roughness: .95 })),
    stripe: solid(new THREE.MeshStandardMaterial({ color: 0x9cc9c0, roughness: .8 })),
    canvas: solid(new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: .9, side: THREE.DoubleSide }))
  };

  /* ---------------------------------------------------------------- drawing registry */
  // every solid piece can also become pencil strokes; `order` is when in the sequence it is drawn
  const strokes = [];      // {geo(world), order, dur}
  function add(mesh, order, dur = .12, edges = true) {
    mesh.updateMatrixWorld(true);
    mesh.castShadow = true; mesh.receiveShadow = true;
    if (edges) {
      const e = new THREE.EdgesGeometry(mesh.geometry, 28);
      e.applyMatrix4(mesh.matrixWorld);
      strokes.push({ geo: e, order, dur });
    }
    return mesh;
  }
  const world = new THREE.Group(); scene.add(world);
  const box = (mat, w, h, d, x, y, z, order, o = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
    world.add(m); return add(m, order, o.dur, o.edges !== false);
  };
  // pure strokes (no solid): polylines for horizon, waves, dune contours
  function polyline(pts, order, dur = .2) {
    const a = [];
    for (let i = 0; i < pts.length - 1; i++) a.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
    strokes.push({ geo: g, order, dur, seq: true, flat: true });
  }

  /* ---------------------------------------------------------------- land: beach, dunes */
  const GL = 2.2;                                          // grade at the house
  const duneH = (x, z) => {
    const ridge = Math.exp(-((x - 27) ** 2) / 26) * (2.2 + Math.sin(z * .21) * .7 + Math.sin(z * .07 + 1) * .6);
    const rise = THREE.MathUtils.smoothstep(x, 0, 40) * GL;
    return -1.2 + THREE.MathUtils.smoothstep(x, -14, 6) * 1.25 + rise + ridge;
  };
  const landGeo = new THREE.PlaneGeometry(600, 600, 200, 160);
  landGeo.rotateX(-Math.PI / 2);
  { const p = landGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 280, z = p.getZ(i) - 100; p.setY(i, duneH(x, z)); } landGeo.computeVertexNormals(); }
  const land = new THREE.Mesh(landGeo, M.sand); land.position.set(280, 0, -100); land.receiveShadow = true; world.add(land);

  /* ---------------------------------------------------------------- the Gulf */
  const water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000, 200, 200), new THREE.ShaderMaterial({
    transparent: true, fog: false,
    uniforms: { uTime: U.time, uSun: { value: SUN } },
    vertexShader: `uniform float uTime; varying vec3 vW; varying float vH;
      void main(){ vec3 p = position; vec4 w = modelMatrix*vec4(p,1.);
        float h = sin(w.x*.12 + uTime*.9)*.08 + sin(w.z*.09 - uTime*.6 + w.x*.05)*.06 + sin((w.x+w.z)*.31 + uTime*1.7)*.025;
        w.y += h; vH = h; vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uSun; varying vec3 vW; varying float vH;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 g = vec2(cos(vW.x*.12+uTime*.9)*.0096, cos(vW.z*.09-uTime*.6+vW.x*.05)*.0054);
        g += vec2(n(vW.xz*.7+uTime*.3)-.5, n(vW.zx*.7-uTime*.25)-.5)*.11;
        vec3 N = normalize(vec3(-g.x*3., 1., -g.y*3.));
        vec3 V = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
        float fres = .02 + .98*pow(1.-max(dot(N,V),0.), 5.);
        float shore = clamp(-vW.x / 90., 0., 1.);
        vec3 shallow = vec3(.48,.80,.76), deep = vec3(.18,.46,.56);
        vec3 col = mix(shallow, deep, smoothstep(0., 1., shore));
        vec3 skyc = mix(vec3(1.,.88,.76), vec3(.80,.86,.88), clamp(reflect(-V,N).y*4., 0., 1.));
        col = mix(col, skyc, clamp(fres*.9, 0., .55));
        vec3 R = reflect(-V, N); float s = max(dot(R, uSun), 0.);
        col += vec3(1.,.86,.62) * (pow(s, 300.) * 4. + pow(s, 24.) * .18);
        // surf: a soft white line that rolls in at the waterline
        float sw = vW.x + 1.3 + sin(vW.z*.15 + uTime*.7)*.5 + sin(uTime*.8)*.4;
        float foam = smoothstep(1.6, 0., abs(sw)) * (.55 + .45*n(vW.xz*2.5 + uTime*.6));
        col = mix(col, vec3(1.), foam*.8);
        float a = smoothstep(-.2, -1.6, vW.x - sin(uTime*.8)*.4 - sin(vW.z*.15+uTime*.7)*.5);
        float fogF = smoothstep(200., 1400., dist);
        col = mix(col, vec3(.98,.88,.78), fogF);
        gl_FragColor = vec4(col, max(a, foam*.9));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, .05, 0);
  water.material.depthWrite = false; water.renderOrder = 1;
  scene.add(water);

  /* ---------------------------------------------------------------- the house */
  // raised on pilings, wraparound porch, hip roof in standing-seam metal, a lookout cupola
  const HX = 47, HZ = -10;          // house center
  const PILE = 3.3;                 // clear height under the house
  const F = GL + PILE;              // first floor level
  const W = 12, D = 9, WH = 3.4;    // main body
  const PR = 2.3;                   // porch depth
  // pilings
  for (let ix = 0; ix < 5; ix++) for (let iz = 0; iz < 4; iz++) {
    const x = HX - (W + PR * 2) / 2 + .3 + ix * ((W + PR * 2 - .6) / 4), z = HZ - (D + PR) / 2 + .3 + iz * ((D + PR - .6) / 3);
    box(M.post, .42, PILE + 1.4, .42, x, GL + (PILE - 1.4) / 2, z + PR / 2, 0, { dur: .08 });
  }
  // floor platform and porch deck
  box(M.trim, W + PR * 2 + .3, .5, D + PR + .3, HX, F - .25, HZ + PR / 2, 1);
  box(M.deck, W + PR * 2, .08, D + PR, HX, F + .04, HZ + PR / 2, 1, { edges: false });
  // walls
  box(M.siding, W, WH, D, HX, F + WH / 2, HZ, 2, { dur: .1 });
  box(M.trim, W + .25, .28, D + .25, HX, F + WH + .14, HZ, 2);
  // corner boards
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(M.trim, .22, WH, .22, HX + sx * W / 2, F + WH / 2, HZ + sz * D / 2, 2, { dur: .05 });
  // west (Gulf) facade: three pairs of French doors with transoms
  const doors = [-3.6, 0, 3.6];
  doors.forEach((dz, i) => {
    const z = HZ + dz;
    box(M.glass, .08, 2.5, 1.7, HX - W / 2 - .02, F + 1.35, z, 3, { edges: false });
    box(M.trim, .14, 2.7, .12, HX - W / 2 - .06, F + 1.35, z - .9, 3);
    box(M.trim, .14, 2.7, .12, HX - W / 2 - .06, F + 1.35, z + .9, 3);
    box(M.trim, .14, .12, 1.9, HX - W / 2 - .06, F + 2.7, z, 3);
    box(M.trim, .1, 2.5, .06, HX - W / 2 - .07, F + 1.35, z, 3, { dur: .04 });
    box(M.trim, .1, .06, 1.7, HX - W / 2 - .07, F + 1.85, z, 3, { dur: .04 });
    box(M.glass, .08, .45, 1.7, HX - W / 2 - .02, F + 3.0, z, 3, { edges: false });
    box(M.trim, .14, .08, 1.9, HX - W / 2 - .06, F + 3.25, z, 3);
  });
  // south facade (facing camera): windows with shutters
  [-3.8, 0, 3.8].forEach(dx => {
    const x = HX + dx, z = HZ + D / 2 + .02;
    box(M.glass, 1.2, 1.7, .08, x, F + 1.75, z, 4, { edges: false });
    box(M.trim, 1.45, .14, .14, x, F + 2.67, z + .04, 4);
    box(M.trim, 1.5, .14, .2, x, F + .86, z + .06, 4);
    box(M.trim, .06, 1.7, .1, x, F + 1.75, z + .05, 4, { dur: .03 });
    box(M.trim, 1.2, .06, .1, x, F + 1.75, z + .05, 4, { dur: .03 });
    for (const s of [-1, 1]) {
      const sh = box(M.shutter, .62, 1.8, .07, x + s * .98, F + 1.75, z + .05, 4);
      for (let k = 0; k < 7; k++) box(M.shutter, .56, .04, .09, x + s * .98, F + 1.0 + k * .24, z + .07, 4, { edges: false });
    }
  });
  // porch posts, rails and balusters on the west and south sides
  const px0 = HX - W / 2 - PR, px1 = HX + W / 2 + PR, pz0 = HZ - D / 2, pz1 = HZ + D / 2 + PR;
  const PH = 3.0;
  const postAt = (x, z) => box(M.post, .24, PH, .24, x, F + PH / 2, z, 5, { dur: .06 });
  for (let z = pz0; z <= pz1 + .01; z += (pz1 - pz0) / 4) postAt(px0 + .15, z);
  for (let x = px0 + (px1 - px0) / 6; x <= px1 + .01; x += (px1 - px0) / 6) postAt(Math.min(x, px1 - .15), pz1 - .15);
  const rail = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    box(M.trim, len, .1, .16, (x0 + x1) / 2, F + 1.05, (z0 + z1) / 2, 6, { ry: -ang });
    box(M.trim, len, .08, .1, (x0 + x1) / 2, F + .18, (z0 + z1) / 2, 6, { ry: -ang });
    const n = Math.floor(len / .32);
    for (let i = 1; i < n; i++) { const t = i / n; box(M.trim, .05, .85, .05, x0 + (x1 - x0) * t, F + .6, z0 + (z1 - z0) * t, 6, { dur: .02 }); }
  };
  rail(px0 + .15, pz0, px0 + .15, HZ - 1.2);            // west rail, gap for stairs
  rail(px0 + .15, HZ + 1.2 + 1.2, px0 + .15, pz1 - .15);
  rail(px0 + .15, pz1 - .15, px1 - .15, pz1 - .15);     // south rail
  // porch roof: shallow shed roof around west and south
  const pRoof = (w, d, x, z, rx, rz) => box(M.roof, w, .12, d, x, F + PH + .25, z, 7, { rx, rz });
  pRoof(PR + .7, D + PR + .6, px0 + PR / 2, HZ + PR / 2, 0, -.18);
  pRoof(W + PR * 2 + .4, PR + .7, HX, pz1 - PR / 2 + .1, .18, 0);
  // main hip roof
  function hip(w, d, h, oh) {
    const x = w / 2 + oh, z = d / 2 + oh, r = Math.max(0, x - z);
    const v = [-x, 0, -z, x, 0, -z, x, 0, z, -x, 0, z, -r, h, 0, r, h, 0];
    const idx = [0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 3, 5, 4, 3, 4, 0];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx);
    const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
  }
  const roofY = F + WH + .28;
  const mainRoof = new THREE.Mesh(hip(W, D, 3.4, .9), M.roof); mainRoof.position.set(HX, roofY, HZ); world.add(mainRoof); add(mainRoof, 8, .14);
  // standing seams on the roof face toward the camera, drawn as strokes
  { const ex = W / 2 + .9, ez = D / 2 + .9, rr = ex - ez, rh = 3.4;
    for (let xi = -ex + .45; xi < ex; xi += .55) {
      const ax = Math.abs(xi); let top;
      if (ax <= rr) top = new THREE.Vector3(xi, rh, 0);
      else { const sv = (ex - ax) / ez; top = new THREE.Vector3(xi, rh * sv, ez - ez * sv); }
      polyline([new THREE.Vector3(HX + xi, roofY + .04, HZ + ez + .02), new THREE.Vector3(HX + top.x, roofY + top.y + .04, HZ + top.z + .02)], 8.5, .06);
    } }
  // cupola / lookout
  const CY = roofY + 2.3;
  box(M.siding, 2.6, 1.7, 2.6, HX, CY + .85, HZ, 9);
  box(M.glass, 2.62, .9, 1.9, HX, CY + .9, HZ, 9, { edges: false });
  box(M.glass, 1.9, .9, 2.62, HX, CY + .9, HZ, 9, { edges: false });
  const cRoof = new THREE.Mesh(hip(2.6, 2.6, 1.1, .4), M.roof); cRoof.position.set(HX, CY + 1.7, HZ); world.add(cRoof); add(cRoof, 9.3, .08);
  // chimney-like vent stack
  box(M.siding, .8, 1.8, .8, HX + 3.6, roofY + 1.6, HZ - 2.4, 9);
  // stairs from the porch down to grade, then the dune walkover to the beach
  const sx0 = px0 - .2, steps = 13;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    box(M.deck, .32, .08, 1.15, sx0 - i * .3, F - (i + 1) * (PILE / steps), HZ + 1.8, 10, { dur: .03 });
  }
  box(M.trim, Math.hypot(steps * .3, PILE), .1, .1, sx0 - steps * .15, F - PILE / 2 + .9, HZ + 1.2, 10, { rz: Math.atan2(PILE, steps * .3) });
  box(M.trim, Math.hypot(steps * .3, PILE), .1, .1, sx0 - steps * .15, F - PILE / 2 + .9, HZ + 2.4, 10, { rz: Math.atan2(PILE, steps * .3) });
  // walkover: boardwalk over the dune ridge to the sand
  const wz = HZ + 1.8;
  const wx0 = sx0 - steps * .3 - .2, wx1 = 14;
  const walkY = x => Math.max(duneH(x, wz) + .9, GL + .25);
  const seg = 1.2;
  for (let x = wx0; x > wx1; x -= seg) {
    const y0 = walkY(x), y1 = walkY(x - seg), ym = (y0 + y1) / 2;
    const ang = Math.atan2(y0 - y1, seg);
    box(M.deck, seg + .02, .1, 1.5, x - seg / 2, ym, wz, 11, { rz: ang, dur: .03 });
    for (const s of [-1, 1]) {
      box(M.wood, .12, 1.0, .12, x, ym + .45, wz + s * .78, 11, { dur: .03 });
      box(M.wood, .14, ym + .6, .14, x, (ym - .6) / 2, wz + s * .6, 11, { dur: .03, edges: false });
      box(M.wood, seg, .08, .08, x - seg / 2, ym + .95, wz + s * .78, 11, { rz: ang, dur: .03 });
    }
  }
  // steps down onto the sand
  for (let i = 0; i < 5; i++) box(M.deck, .32, .08, 1.5, wx1 - .2 - i * .32, walkY(wx1) - (i + 1) * .28, wz, 11, { dur: .02 });

  // porch chairs and a beach umbrella with two loungers
  [[HX - W / 2 - 1.2, HZ - 2.6], [HX - W / 2 - 1.2, HZ - 4.4]].forEach(([x, z]) => {
    box(M.stripe, .8, .1, .8, x, F + .5, z, 12);
    box(M.stripe, .1, .9, .8, x + .4, F + .95, z, 12, { rz: -.25 });
  });
  const umb = new THREE.Mesh(new THREE.ConeGeometry(1.9, .7, 12, 1, true), M.canvas);
  umb.position.set(4, duneH(4, -2) + 2.4, -2); world.add(umb); add(umb, 12, .05);
  const umbS = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.5, 6), M.post); umbS.position.set(4, duneH(4, -2) + 1.2, -2); world.add(umbS); add(umbS, 12, .03);
  [[3, -4.4], [5.4, -4.2]].forEach(([x, z]) => box(M.stripe, .7, .12, 1.9, x, duneH(x, z) + .35, z, 12, { rz: .05 }));

  /* ---------------------------------------------------------------- sabal palms and sea oats */
  const palmsOn = new THREE.Group(); world.add(palmsOn);
  function palm(x, z, h, lean, rot) {
    const base = new THREE.Vector3(x, duneH(x, z) - .2, z);
    const curve = new THREE.CatmullRomCurve3([0, .5, 1].map(u => base.clone().add(new THREE.Vector3(Math.cos(rot) * lean * u * u, u * h, Math.sin(rot) * lean * u * u))));
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, .26, 7, false), solid(new THREE.MeshStandardMaterial({ color: 0xa4927a, roughness: 1 })));
    world.add(trunk); add(trunk, 13, .06, false);
    const top = curve.getPoint(1);
    // fan fronds: flattened discs of thin blades
    for (let f = 0; f < 14; f++) {
      const a = f / 14 * Math.PI * 2, up = (f % 3) * .25 - .2;
      const g = new THREE.CircleGeometry(1.9, 14, -.9, 1.8);
      g.rotateX(-Math.PI / 2 + .3); g.translate(0, 0, -1.6);
      const m = new THREE.Mesh(g, palmMat);
      m.position.copy(top); m.rotation.set(up, a, 0); palmsOn.add(m); m.castShadow = true;
    }
  }
  const palmMat = solid(new THREE.MeshStandardMaterial({ color: 0x5f7c46, roughness: .8, side: THREE.DoubleSide, alphaTest: .5, alphaMap: (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.translate(128, 128); g.strokeStyle = '#fff'; g.lineCap = 'round';
    for (let i = -14; i <= 14; i++) { const a = i / 14 * 1.3; g.lineWidth = 2.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(a) * 125, -Math.cos(a) * 125); g.stroke(); }
    const t = new THREE.CanvasTexture(c); return t;
  })() }));
  palm(HX + W / 2 + 4, HZ + 5, 8.5, 1.2, .6); palm(HX + W / 2 + 6, HZ - 4, 10, .9, 1.2); palm(HX - W / 2 - 6, HZ - 7, 9, 1.4, 3.6);
  palm(HX + 13, HZ + 1, 7.5, 1, .2);

  // sea oats: instanced crossed cards that sway
  const oatTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const x0 = 12 + k * 10, bend = (k - 2) * 5;
      g.lineWidth = 2; g.beginPath(); g.moveTo(x0, 256); g.quadraticCurveTo(x0 + bend * .3, 140, x0 + bend, 30 + k * 8); g.stroke();
      if (k % 2 === 0) for (let s = 0; s < 9; s++) { g.beginPath(); g.ellipse(x0 + bend + (s % 2 ? 4 : -4), 34 + k * 8 + s * 9, 2.4, 5, (s % 2 ? .5 : -.5), 0, 6.3); g.fill(); }
    }
    return new THREE.CanvasTexture(c);
  })();
  const oatGeo = new THREE.PlaneGeometry(.9, 1.6); oatGeo.translate(0, .8, 0);
  const oatGeo2 = oatGeo.clone().rotateY(Math.PI / 2);
  const oatMerged = new THREE.BufferGeometry();
  ['position', 'normal', 'uv'].forEach(nm => { const a = oatGeo.attributes[nm], b = oatGeo2.attributes[nm]; const arr = new Float32Array(a.array.length + b.array.length); arr.set(a.array); arr.set(b.array, a.array.length); oatMerged.setAttribute(nm, new THREE.BufferAttribute(arr, a.itemSize)); });
  oatMerged.setIndex([...oatGeo.index.array, ...Array.from(oatGeo2.index.array, i => i + 4)]);
  const oatMat = solid(new THREE.MeshStandardMaterial({ color: 0xb09f66, alphaMap: oatTex, alphaTest: .4, side: THREE.DoubleSide, roughness: 1 }));
  oatMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 ow = instanceMatrix * vec4(0.,0.,0.,1.);
      float k = uv.y * uv.y;
      transformed.x += sin(uTime * 1.6 + ow.x * .4 + ow.z * .3) * .16 * k;
      transformed.z += cos(uTime * 1.2 + ow.z * .5) * .08 * k;`);
  };
  const OATS = isPhone ? 420 : 700;
  const oats = new THREE.InstancedMesh(oatMerged, oatMat, OATS);
  const OM = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sv = new THREE.Vector3(), Pv = new THREE.Vector3();
  let placed = 0;
  for (let i = 0; i < OATS * 3 && placed < OATS; i++) {
    const x = 20 + rnd() * 16, z = -80 + rnd() * 100;
    if (Math.abs(z - wz) < 1.3 && x < wx0 + 1) continue;                   // keep the walkover clear
    if (x > HX - W / 2 - PR - 2 && Math.abs(z - HZ) < 9) continue;          // not under the house
    const h = duneH(x, z);
    const ridge = Math.exp(-((x - 27) ** 2) / 40);
    if (rnd() > ridge + .25) continue;
    const s = .45 + rnd() * .45;
    OM.compose(Pv.set(x, h - .1, z), Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 3), Sv.set(s, s * (.8 + rnd() * .6), s));
    oats.setMatrixAt(placed++, OM);
  }
  oats.count = placed; oats.castShadow = false; oats.receiveShadow = true; world.add(oats);
  // a few dune contour strokes and the sea oat tufts as quick hatching
  for (let k = 0; k < 4; k++) {
    const pts = []; const x = 23 + k * 2.2;
    for (let z = -36; z <= -4; z += 1.5) pts.push(new THREE.Vector3(x, duneH(x, z) + .05, z));
    polyline(pts, -2.5 + k * .05, .25);
  }

  /* ---------------------------------------------------------------- drawing strokes for the setting */
  const horizon = []; for (let a = 1.75; a <= 4.6; a += .03) horizon.push(new THREE.Vector3(40 + Math.cos(a) * 1100, 0, -10 + Math.sin(a) * 1100));
  polyline(horizon, -4, .35);
  for (let k = 0; k < 5; k++) {
    const pts = []; const x = -3 - k * k * 2.6;
    for (let z = -150; z <= -70 + k * 6; z += 4) pts.push(new THREE.Vector3(x + Math.sin(z * .12 + k) * .6, .06, z));
    polyline(pts, -3 + k * .05, .3);
  }
  // the sun as a drawn circle, out over the Gulf
  { const c = SUN.clone().multiplyScalar(1000); const r = 22, pts = [];
    const ux = new THREE.Vector3().crossVectors(SUN, new THREE.Vector3(0, 1, 0)).normalize(), uy = new THREE.Vector3().crossVectors(ux, SUN).normalize();
    for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; pts.push(c.clone().addScaledVector(ux, Math.cos(a) * r).addScaledVector(uy, Math.sin(a) * r)); }
    polyline(pts, -3.5, .3); }
  // ground reference line under the house, like a section drawing
  polyline([new THREE.Vector3(HX - 16, GL + .02, HZ + D / 2 + PR + 2.5), new THREE.Vector3(HX + 14, GL + .02, HZ + D / 2 + PR + 2.5)], -2, .2);

  /* ---------------------------------------------------------------- neighbors down the beach, sea grape scrub */
  [[HX + 4, HZ - 46, 10, 8], [HX + 8, HZ - 86, 12, 9], [HX + 30, HZ + 6, 9, 8]].forEach(([x, z, w, d]) => {
    const gy = GL;
    for (let ix = -1; ix <= 1; ix++) for (const iz of [-1, 1]) box(M.post, .35, 3.2, .35, x + ix * w * .45, gy + 1.2, z + iz * d * .45, 12.5, { dur: .04 });
    box(M.siding, w, 3.2, d, x, gy + 3.2 + 1.6, z, 12.5);
    const r = new THREE.Mesh(hip(w, d, 2.6, .7), M.roof); r.position.set(x, gy + 6.4, z); world.add(r); add(r, 12.6, .05);
  });
  { const blobs = []; const ico = new THREE.IcosahedronGeometry(1, 3);
    for (let i = 0; i < 70; i++) {
      const x = 62 + rnd() * 70, z = -180 + rnd() * 260;
      if (Math.abs(z - HZ) < 14 && x < HX + 14) continue;
      const g = ico.clone(), sc = 2.2 + rnd() * 2.6; g.scale(sc * 1.4, sc * .6, sc * 1.4); g.translate(x, duneH(x, z) + sc * .4, z); blobs.push(g);
    }
    let vc = 0; blobs.forEach(g => vc += g.attributes.position.count);
    const pos = new Float32Array(vc * 3); let o = 0; blobs.forEach(g => { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; });
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.computeVertexNormals();
    const scrub = new THREE.Mesh(bg, solid(new THREE.MeshStandardMaterial({ color: 0x4d5d3a, roughness: 1 }))); scrub.castShadow = true; scrub.receiveShadow = true; world.add(scrub); }

  /* ---------------------------------------------------------------- build the stroke buffer */
  const orders = strokes.map(s => s.order);
  const oMin = Math.min(...orders), oMax = Math.max(...orders);
  const posA = [], tA = [], posF = [], tF = [];
  strokes.forEach(s => {
    const P = s.flat ? posF : posA, TT = s.flat ? tF : tA;
    const p = s.geo.attributes.position; const n = p.count / 2;
    // sort segments of a piece bottom-up so walls rise like they are drawn by hand
    const segs = [];
    for (let i = 0; i < n; i++) segs.push([p.getX(i * 2), p.getY(i * 2), p.getZ(i * 2), p.getX(i * 2 + 1), p.getY(i * 2 + 1), p.getZ(i * 2 + 1)]);
    if (!s.seq) segs.sort((a, b) => Math.min(a[1], a[4]) - Math.min(b[1], b[4]));
    const start = (s.order - oMin) / (oMax - oMin + 1) * .86;
    const span = s.dur;
    segs.forEach((g, i) => {
      const t0 = start + (s.seq ? i / n : (i / Math.max(1, n)) * .6) * span;
      const t1 = t0 + (s.seq ? 1 / n : .4) * span;
      P.push(...g); TT.push(t0, t1);
    });
  });
  const LU = { uDraw: { value: 0 }, uAlpha: { value: 1 }, uInk: { value: new THREE.Color(0x2a3c44) }, uRes: { value: new THREE.Vector2(1, 1) }, uCopy: { value: 1 }, uPortrait: { value: 0 } };
  const lineMat = new THREE.ShaderMaterial({
    uniforms: LU, transparent: true, depthWrite: false, fog: false,
    vertexShader: `attribute float aT; varying float vT; varying float vD; void main(){ vT = aT; vec4 mv = modelViewMatrix*vec4(position,1.); vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uDraw, uAlpha, uCopy, uPortrait; uniform vec2 uRes; uniform vec3 uInk; varying float vT; varying float vD;
      void main(){ if (vT > uDraw) discard;
        vec2 sp = gl_FragCoord.xy / uRes;
        float keep = mix(smoothstep(.44, .6, sp.x), smoothstep(.62, .7, sp.y), uPortrait);
        float fresh = smoothstep(uDraw - .03, uDraw, vT);
        float far = smoothstep(80., 900., vD);
        gl_FragColor = vec4(mix(uInk, vec3(.03,.08,.1), fresh), uAlpha * (1. - far * .5) * mix(1., keep, uCopy));
        #include <colorspace_fragment>
      }`
  });
  [[posA, tA, true], [posF, tF, false]].forEach(([pa, ta, depth]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pa, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(ta, 1));
    const m = depth ? lineMat : lineMat.clone();
    if (!depth) { m.uniforms = LU; m.depthTest = false; }
    const ls = new THREE.LineSegments(g, m); ls.frustumCulled = false; ls.renderOrder = depth ? 2 : 1; lineScene.add(ls);
  });

  /* ---------------------------------------------------------------- the paper that washes away */
  const paperScene = new THREE.Scene();
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const PU = { uReveal: { value: 0 }, uFocus: { value: new THREE.Vector2(.68, .5) }, uAspect: { value: 1 }, uTime: U.time };
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: PU, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform float uReveal, uAspect, uTime; uniform vec2 uFocus; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<6;i++){ v+=a*n(p); p*=2.03; a*=.5; } return v; }
      void main(){
        vec2 q = vUv; q.x *= uAspect;
        vec2 f = uFocus; f.x *= uAspect;
        float d = length(q - f) / (uAspect * .9);
        float field = d * .85 + fbm(q * 2.2) * .22 - .05;
        float r = uReveal * 1.4 - .25;
        float a = smoothstep(r - .16, r + .16, field);
        // paper: warm white with tooth and a faint drafting grid
        vec2 g = abs(fract(vUv * vec2(uAspect, 1.) * 28.) - .5);
        float grid = (1. - smoothstep(.0, .025, min(g.x, g.y))) * .035;
        vec3 col = vec3(.965,.948,.918) - grid - (h(floor(vUv * 900.)) - .5) * .025;
        // pigment pooling along the wet edge
        float rim = smoothstep(.07, .0, abs(field - r)) * step(.001, uReveal) * (1. - step(1.15, uReveal));
        col = mix(col, vec3(.93,.90,.84), rim * .25);
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`
  }));
  paperScene.add(paper);

  /* ---------------------------------------------------------------- environment for reflections */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));
  scene.environment = pmrem.fromScene(envScene, .04).texture;

  /* ---------------------------------------------------------------- camera path */
  const camA = { pos: new THREE.Vector3(40, 7.5, 72), look: new THREE.Vector3(27, 6.8, -8) };
  const camB = { pos: new THREE.Vector3(37, 6.5, 52), look: new THREE.Vector3(31, 6.8, -10) };
  const look = new THREE.Vector3();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5; }, { passive: true });
  let portrait = false;
  function place(p, t) {
    const e = p * p * (3 - 2 * p);
    camera.position.lerpVectors(camA.pos, camB.pos, e);
    look.lerpVectors(camA.look, camB.look, e);
    if (portrait) { camera.position.set(48, 12, 56 - e * 8); look.set(46, -13, -10); }
    if (!reduce) { camera.position.x += mouse.x * 2.4 + Math.sin(t * .05) * .6; camera.position.y -= mouse.y * 1.2; }
    camera.lookAt(look);
  }

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; portrait = w / h < .9;
    camera.fov = portrait ? 58 : w / h < 1.3 ? 44 : 34;
    camera.updateProjectionMatrix();
    PU.uAspect.value = w / h;
    LU.uRes.value.set(w * DPR, h * DPR); LU.uPortrait.value = portrait ? 1 : 0;
    PU.uFocus.value.set(portrait ? .6 : .7, portrait ? .62 : .52);
  }
  addEventListener('resize', resize); resize();

  function progress() {
    if (!hero) return 1;
    const r = hero.getBoundingClientRect();
    return THREE.MathUtils.clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
  }

  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);
  const clk = new THREE.Clock();
  let t = 0, intro = reduce ? 1 : 0, P = 0, first = true;
  const label = document.querySelector('[data-draw-label]');
  const bar = document.querySelector('[data-draw-bar]');
  function frame() {
    requestAnimationFrame(frame);
    if (!visible && !first) return;
    const raw = Math.min(clk.getDelta(), .5), dt = Math.min(raw, .05);
    t += reduce ? 0 : dt; U.time.value = t;
    intro = reduce ? 1 : Math.min(1, clk.elapsedTime / 3.2);
    const target = reduce ? 1 : progress();
    P += (target - P) * (1 - Math.exp(-raw * 5.5));
    mouse.x += (mouse.tx - mouse.x) * .04; mouse.y += (mouse.ty - mouse.y) * .04;
    // drawing: the intro sketches the setting and the pilings; the scroll finishes the house
    const ie = 1 - Math.pow(1 - intro, 2.2);
    const draw = reduce ? 1.05 : Math.max(ie * .5, THREE.MathUtils.smoothstep(P, 0, .5) * 1.05);
    const reveal = reduce ? 1.2 : THREE.MathUtils.smoothstep(P, .58, .96) * 1.2;
    LU.uDraw.value = draw;
    LU.uCopy.value = reduce ? 1 : 1 - THREE.MathUtils.smoothstep(P, .04, .2);
    LU.uAlpha.value = 1 - THREE.MathUtils.smoothstep(reveal, .55, 1.15) * .92;
    PU.uReveal.value = reveal;
    place(reduce ? .6 : P, t);
    if (bar) bar.style.transform = `scaleX(${Math.min(1, draw).toFixed(3)})`;
    if (label) label.dataset.stage = reveal > .3 ? '2' : draw > .55 ? '1' : '0';
    oats.visible = palmsOn.visible = reveal > .04;
    renderer.clear();
    renderer.render(scene, camera);
    if (reveal < 1.19) renderer.render(paperScene, ortho);
    if (LU.uAlpha.value > .01) renderer.render(lineScene, camera);
    if (first) { first = false; document.documentElement.classList.add('hero-ready'); }
  }
  frame();
}
