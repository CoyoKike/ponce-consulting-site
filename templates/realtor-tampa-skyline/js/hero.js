// Altura hero: a forty-storey glass tower on the river builds itself floor by floor, the day turns to
// dusk as you scroll, and the residences for sale float off its facade on glass panels, then line up
// in front of you. Every panel is a live listing from listings.json; click one to open it.
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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 1, 4000);
  const rnd = (() => { let s = 23; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const U = { time: { value: 0 }, night: { value: 0 } };

  /* -------------------------------------------- time of day: late morning to dusk */
  const KEYS = [
    { p: 0, top: 0x3f7fd0, mid: 0x95bde8, hor: 0xeef2f4, sun: 0xfff3e0, sunI: 3.4, hemiS: 0xdfeaf7, hemiG: 0x6f7880, hemiI: 1.05, fog: 0xdfe8ef, exp: .92, el: .55, deep: 0x2f5a73, night: 0 },
    { p: .55, top: 0x3d6aa8, mid: 0x9fb4d2, hor: 0xf6d9bf, sun: 0xffc48a, sunI: 2.6, hemiS: 0xc9d6ee, hemiG: 0x6a6460, hemiI: .85, fog: 0xe6d8ce, exp: .95, el: .16, deep: 0x26475e, night: .15 },
    { p: 1, top: 0x18264d, mid: 0x5d628f, hor: 0xf2a07c, sun: 0xff9a5c, sunI: 1.1, hemiS: 0x8090c0, hemiG: 0x2c2830, hemiI: .6, fog: 0xa88a96, exp: 1.05, el: .02, deep: 0x142438, night: .85 }
  ];
  const NUM = new Set(['sunI', 'hemiI', 'exp', 'el', 'night']);
  const cA = new THREE.Color(), cB = new THREE.Color();
  function key(p, k) {
    let a = KEYS[0], b = KEYS[1];
    if (p >= KEYS[1].p) { a = KEYS[1]; b = KEYS[2]; }
    const t = THREE.MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1), s = t * t * (3 - 2 * t);
    if (NUM.has(k)) return a[k] + (b[k] - a[k]) * s;
    return cA.set(a[k]).lerp(cB.set(b[k]), s).clone();
  }

  /* -------------------------------------------- sky */
  const SKY = { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uSun: { value: new THREE.Color() }, uNight: U.night, uTime: U.time };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: SKY, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 uTop,uMid,uHor,uSun,uSunDir; uniform float uNight,uTime; varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.03; a*=.5; } return v; }
      void main(){
        vec3 d = normalize(vDir); float y = d.y; float sd = max(dot(d, normalize(uSunDir)), 0.);
        vec3 c = mix(uHor, uMid, smoothstep(-.02, .22, y)); c = mix(c, uTop, smoothstep(.2, .85, y));
        c += uSun * (pow(sd, 8.) * .3 + pow(sd, 600.) * .9);
        c += uSun * smoothstep(.99965, .9998, sd) * 4.;
        vec2 q = d.xz / max(y + .1, .05);
        float cl = smoothstep(.55, .9, fbm(q * .45 + vec2(uTime * .003, 0.))) * smoothstep(.0, .15, y) * (1. - smoothstep(.45, .85, y));
        vec3 cc = mix(vec3(1.), uSun * 1.1 + uHor * .25, pow(sd, 2.) * .7 + uNight * .5);
        c = mix(c, cc, cl * .55);
        c = mix(c, uHor * .55, smoothstep(0., -.08, y));
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 48, 24), skyMat);
  sky.frustumCulled = false; scene.add(sky);

  /* -------------------------------------------- lights */
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isPhone ? 1024 : 2048, isPhone ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 160, bottom: -40, near: 10, far: 600 });
  sun.shadow.bias = -.0003; sun.shadow.normalBias = .05;
  scene.add(sun, sun.target); sun.target.position.set(0, 40, 0);
  const hemi = new THREE.HemisphereLight(0xdfeaf7, 0x6f7880, 1);
  scene.add(hemi);
  scene.fog = new THREE.FogExp2(0xdfe8ef, .00085);

  /* -------------------------------------------- facade textures */
  function facadeTex(kind) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
    if (kind === 'color') {
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#dfe9f1'); gr.addColorStop(1, '#b9cada');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#5d6c78'; g.fillRect(0, 0, 6, 256);                 // vertical mullion
      g.fillStyle = '#f4f6f8'; g.fillRect(0, 226, 256, 30);             // slab edge band
      g.fillStyle = 'rgba(70,90,110,.35)'; g.fillRect(0, 222, 256, 4);
    } else if (kind === 'rough') {
      g.fillStyle = '#141414'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#9a9a9a'; g.fillRect(0, 226, 256, 30); g.fillRect(0, 0, 6, 256);
    } else {                                                              // lit interiors at dusk
      g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
      const on = Math.random();
      if (on < .62) {
        const gr = g.createLinearGradient(0, 30, 0, 222);
        const warm = Math.random() < .8;
        gr.addColorStop(0, warm ? '#ffe2b0' : '#d9ecff'); gr.addColorStop(1, warm ? '#a8662c' : '#5c7aa0');
        g.fillStyle = gr; g.globalAlpha = .45 + Math.random() * .55; g.fillRect(6, 20, 250, 202);
      }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (kind === 'color' || kind === 'lit') t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8; return t;
  }
  // a large lit-window atlas: 8 x 8 random rooms, so floors do not repeat visibly
  function litAtlas() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 1024);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (rnd() < .66) continue;
      const warm = rnd() < .82;
      const gr = g.createLinearGradient(0, y * 64 + 4, 0, y * 64 + 56);
      gr.addColorStop(0, warm ? '#fff0d0' : '#dcefff'); gr.addColorStop(1, warm ? '#b06a2a' : '#4e6d96');
      g.globalAlpha = .25 + rnd() * .5; g.fillStyle = gr; g.fillRect(x * 64 + 4, y * 64 + 8, 58, 46);
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const FLOOR_H = 3.4, MULL = 1.6;
  const lit = litAtlas();
  function glassMat(tint, metal = .35) {
    const map = facadeTex('color'), rough = facadeTex('rough'), em = lit.clone();
    [map, rough].forEach(t => t.repeat.set(1 / MULL, 1 / FLOOR_H));
    em.repeat.set(1 / (MULL * 16), 1 / (FLOOR_H * 16)); em.needsUpdate = true;
    return new THREE.MeshPhysicalMaterial({ color: tint, map, roughnessMap: rough, roughness: 1, metalness: metal, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.7, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0 });
  }
  const MAT = {
    hero: glassMat(0xa7c4dc, .45),
    blue: glassMat(0x7f9fbf, .5),
    bronze: glassMat(0x8f8576, .55),
    pale: glassMat(0xc9d8e4, .3),
    stone: new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: .85 }),
    slab: new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: .5 }),
    park: new THREE.MeshStandardMaterial({ color: 0x6f8f5a, roughness: 1 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b3440, roughness: .6, metalness: .3 })
  };
  const glassMats = [MAT.hero, MAT.blue, MAT.bronze, MAT.pale];

  /* -------------------------------------------- the Altura tower: 40 floors, twisting */
  function roundedRect(w, d, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  function floorGeo(w, d, r, h) {
    const g = new THREE.ExtrudeGeometry(roundedRect(w, d, r), { depth: h, bevelEnabled: false, curveSegments: 6 });
    g.rotateX(-Math.PI / 2);                      // extrude upward
    return g;
  }
  const FLOORS = 40;
  const TW = 19, TD = 14, TR = 4;
  const tower = new THREE.Group(); scene.add(tower);
  const floorMesh = new THREE.InstancedMesh(floorGeo(TW, TD, TR, FLOOR_H - .45), MAT.hero, FLOORS);
  const slabMesh = new THREE.InstancedMesh(floorGeo(TW + 1.3, TD + 1.3, TR + .6, .45), MAT.slab, FLOORS + 1);
  floorMesh.castShadow = slabMesh.castShadow = true; floorMesh.receiveShadow = slabMesh.receiveShadow = true;
  tower.add(floorMesh, slabMesh);
  const TWIST = THREE.MathUtils.degToRad(1.55);
  const PODIUM = 6;
  // crown: a glass fin and a lit lantern ring at the top
  const crown = new THREE.Group(); tower.add(crown);
  const lantern = new THREE.Mesh(floorGeo(TW - 3, TD - 3, TR - 1, 5), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe2b5, emissiveIntensity: 0, roughness: .3 }));
  crown.add(lantern);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(.5, 12, TD + 2), MAT.slab); fin.position.set(TW / 2 - 2, 10, 0); crown.add(fin);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), E = new THREE.Euler();
  function setTower(build) {
    // build: 0..FLOORS (fractional); floors above the build line float down into place
    for (let i = 0; i < FLOORS; i++) {
      const k = THREE.MathUtils.clamp(build - i, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      const y = PODIUM + i * FLOOR_H + (1 - e) * 9;
      E.set(0, i * TWIST, 0); Q.setFromEuler(E);
      S3.set(1, Math.max(e, .0001), 1);
      M4.compose(V3.set(0, y + .45, 0), Q, S3); floorMesh.setMatrixAt(i, M4);
      M4.compose(V3.set(0, y, 0), Q, S3.set(e > .001 ? 1 : .0001, Math.max(e, .0001), e > .001 ? 1 : .0001)); slabMesh.setMatrixAt(i, M4);
    }
    const top = THREE.MathUtils.clamp(build - FLOORS, 0, 1);
    E.set(0, FLOORS * TWIST, 0); Q.setFromEuler(E);
    M4.compose(V3.set(0, PODIUM + FLOORS * FLOOR_H, 0), Q, S3.set(top > .001 ? 1 : .0001, Math.max(top, .0001), top > .001 ? 1 : .0001)); slabMesh.setMatrixAt(FLOORS, M4);
    crown.position.set(0, PODIUM + FLOORS * FLOOR_H + .45, 0); crown.rotation.y = FLOORS * TWIST; crown.scale.setScalar(Math.max(top, .0001));
    floorMesh.instanceMatrix.needsUpdate = slabMesh.instanceMatrix.needsUpdate = true;
  }
  const TOWER_TOP = PODIUM + FLOORS * FLOOR_H + 5;
  // podium with a lobby glow and a riverwalk deck
  const pod = new THREE.Mesh(floorGeo(TW + 12, TD + 10, 5, PODIUM), MAT.stone); pod.castShadow = pod.receiveShadow = true; scene.add(pod);
  const lobby = new THREE.Mesh(floorGeo(TW + 12.2, TD + 10.2, 5.05, 2.6), new THREE.MeshStandardMaterial({ color: 0x23303a, emissive: 0xffd7a0, emissiveIntensity: 0, roughness: .2, metalness: .2 }));
  lobby.position.y = .6; scene.add(lobby);

  /* -------------------------------------------- the rest of the skyline */
  const city = new THREE.Group(); scene.add(city);
  const block = (x, z, w, d, h, mat, rot = 0, r = 1.2) => {
    const m = new THREE.Mesh(floorGeo(w, d, r, h), mat); m.position.set(x, 0, z); m.rotation.y = rot; m.castShadow = true; m.receiveShadow = true; city.add(m);
    if (rnd() < .5) { const cap = new THREE.Mesh(floorGeo(w * .7, d * .7, r * .6, 4 + rnd() * 6), MAT.slab); cap.position.set(x, h, z); cap.rotation.y = rot; city.add(cap); }
    return m;
  };
  // ground: the downtown bank of the river; the water runs in front (z > 30)
  const bank = new THREE.Mesh(new THREE.BoxGeometry(900, 4, 500), MAT.stone); bank.position.set(0, -1.2, -215); bank.receiveShadow = true; scene.add(bank);
  const walk = new THREE.Mesh(new THREE.BoxGeometry(900, .6, 8), MAT.slab); walk.position.set(0, .9, 31); walk.receiveShadow = true; scene.add(walk);
  // the hero tower stands alone on the river; the rest of downtown steps back behind it
  const PL = [
    [-70, -60, 22, 18, 72, MAT.blue, .1], [-120, -110, 26, 22, 112, MAT.bronze, -.05], [62, -70, 20, 20, 84, MAT.pale, .2],
    [96, -40, 18, 26, 46, MAT.blue, 0], [130, -120, 28, 24, 128, MAT.blue, .05], [-165, -50, 22, 20, 58, MAT.pale, 0],
    [-210, -150, 30, 26, 96, MAT.blue, .1], [190, -70, 24, 20, 62, MAT.bronze, -.1], [20, -170, 26, 26, 138, MAT.pale, 0],
    [-40, -230, 30, 30, 104, MAT.bronze, .3], [86, -210, 28, 24, 92, MAT.blue, -.2], [-260, -80, 26, 30, 44, MAT.pale, 0],
    [250, -140, 30, 26, 80, MAT.pale, .1], [-300, -190, 34, 30, 70, MAT.blue, 0], [300, -60, 22, 24, 40, MAT.blue, 0],
    [-110, -260, 30, 26, 86, MAT.pale, 0], [170, -250, 34, 28, 100, MAT.bronze, 0], [-25, -110, 18, 18, 52, MAT.blue, .4]
  ];
  PL.forEach(([x, z, w, d, h, m, r]) => block(x, z, w, d, h, m, r));
  // park strip with tree canopies along the riverwalk
  const park = new THREE.Mesh(new THREE.BoxGeometry(900, .5, 14), MAT.park); park.position.set(0, .95, 20); park.receiveShadow = true; scene.add(park);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x4d6b3c, roughness: 1, flatShading: true }), 70);
  for (let i = 0; i < 70; i++) {
    const x = -340 + i * 10 + rnd() * 4; if (Math.abs(x) < 20) { crowns.setMatrixAt(i, M4.makeScale(0, 0, 0)); continue; }
    const s = 2.2 + rnd() * 1.4; M4.compose(V3.set(x, 3.6 + s * .4, 18 + rnd() * 6), Q.identity(), S3.set(s, s * .85, s)); crowns.setMatrixAt(i, M4);
  }
  crowns.castShadow = true; scene.add(crowns);

  /* -------------------------------------------- water with planar reflection */
  const rtScale = isPhone ? .4 : .5;
  const rt = new THREE.WebGLRenderTarget(256, 256, { type: THREE.HalfFloatType });
  const mirrorCam = new THREE.PerspectiveCamera(), texMatrix = new THREE.Matrix4();
  const WU = { tReflect: { value: rt.texture }, uTexM: { value: texMatrix }, uTime: U.time, uNight: U.night, uDeep: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uSun: { value: new THREE.Color() }, uFog: { value: new THREE.Color() }, uFogD: { value: .00085 } };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.ShaderMaterial({
    uniforms: WU,
    vertexShader: `uniform mat4 uTexM; varying vec4 vM; varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vM = uTexM * w; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform sampler2D tReflect; uniform float uTime,uNight,uFogD; uniform vec3 uDeep,uSunDir,uSun,uFog; varying vec4 vM; varying vec3 vW;
      vec2 wave(vec2 p, vec2 d, float f, float a, float s){ float ph = dot(p,d)*f + uTime*s; return d * cos(ph) * f * a; }
      void main(){
        vec2 p = vW.xz; vec2 g = vec2(0.);
        g += wave(p, normalize(vec2(1.,.2)), .12, .2, .9); g += wave(p, normalize(vec2(-.3,1.)), .29, .08, 1.4);
        g += wave(p, normalize(vec2(.8,-.5)), .7, .03, 2.1); g += wave(p, normalize(vec2(-.9,-.3)), 1.5, .012, 2.9);
        vec3 N = normalize(vec3(-g.x, 1., -g.y)); vec3 V = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
        float fres = .04 + .96 * pow(1. - max(dot(N, V), 0.), 5.);
        vec4 uv = vM; uv.xy += N.xz * 3. * clamp(1. - dist / 1400., .2, 1.);
        vec3 refl = texture2DProj(tReflect, uv).rgb;
        vec3 col = mix(uDeep, refl, clamp(fres * 1.05 + .3, 0., 1.));
        vec3 R = reflect(-V, N);
        col += uSun * (pow(max(dot(R, normalize(uSunDir)), 0.), 600.) * 5. + pow(max(dot(R, normalize(uSunDir)), 0.), 40.) * .2);
        col = mix(col, uFog, 1. - exp(-uFogD * uFogD * dist * dist));
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  water.rotation.x = -Math.PI / 2; water.position.y = -.4; scene.add(water);
  const RP = new THREE.Plane(), RN = new THREE.Vector3(0, 1, 0), RO = new THREE.Vector3(0, -.4, 0);
  const vView = new THREE.Vector3(), vTarget = new THREE.Vector3(), vLook = new THREE.Vector3(), rotM = new THREE.Matrix4(), cp = new THREE.Vector4(), q4 = new THREE.Vector4();
  function renderReflection() {
    vView.setFromMatrixPosition(camera.matrixWorld); rotM.extractRotation(camera.matrixWorld);
    vLook.set(0, 0, -1).applyMatrix4(rotM).add(vView);
    vTarget.copy(RO).sub(vLook).reflect(RN).negate().add(RO);
    mirrorCam.position.copy(RO).sub(vView).reflect(RN).negate().add(RO);
    mirrorCam.up.set(0, 1, 0).applyMatrix4(rotM).reflect(RN); mirrorCam.lookAt(vTarget);
    mirrorCam.far = camera.far; mirrorCam.near = camera.near; mirrorCam.updateMatrixWorld();
    mirrorCam.projectionMatrix.copy(camera.projectionMatrix);
    texMatrix.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
    texMatrix.multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
    RP.setFromNormalAndCoplanarPoint(RN, RO).applyMatrix4(mirrorCam.matrixWorldInverse);
    cp.set(RP.normal.x, RP.normal.y, RP.normal.z, RP.constant);
    const pm = mirrorCam.projectionMatrix.elements;
    q4.x = (Math.sign(cp.x) + pm[8]) / pm[0]; q4.y = (Math.sign(cp.y) + pm[9]) / pm[5]; q4.z = -1; q4.w = (1 + pm[10]) / pm[14];
    cp.multiplyScalar(2 / cp.dot(q4)); pm[2] = cp.x; pm[6] = cp.y; pm[10] = cp.z + 1; pm[14] = cp.w;
    water.visible = false; panelsGroup.visible = false;
    const sh = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, mirrorCam); renderer.setRenderTarget(null);
    renderer.shadowMap.autoUpdate = sh; water.visible = true; panelsGroup.visible = true;
  }

  /* -------------------------------------------- environment: sky plus a horizon of towers, so glass reads as glass */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(100, 32), new THREE.MeshBasicMaterial({ color: 0x3a4652 }));
  envGround.rotation.x = -Math.PI / 2; envGround.position.y = -2; envScene.add(envGround);
  const envCityMat = new THREE.MeshBasicMaterial({ color: 0x54606c });
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 2, h = 4 + rnd() * 16, w = 3 + rnd() * 5;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), envCityMat);
    b.position.set(Math.cos(a) * 70, h / 2 - 2, Math.sin(a) * 70); b.lookAt(0, h / 2, 0); envScene.add(b);
  }
  let envRT = null, envP = -1;
  function updateEnv(p) {
    const b = Math.round(p * 5) / 5; if (b === envP) return; envP = b;
    envCityMat.color.copy(key(p, 'hor')).multiplyScalar(.38);
    envGround.material.color.copy(key(p, 'deep')).multiplyScalar(1.2);
    const old = envRT; envRT = pmrem.fromScene(envScene, .02); scene.environment = envRT.texture; if (old) old.dispose();
  }

  /* -------------------------------------------- glass panels carrying the listings */
  const panelsGroup = new THREE.Group(); scene.add(panelsGroup);
  const PW = 17, PH = 16;
  const panels = [];
  const tl = new THREE.TextureLoader();
  const frameGeo = new THREE.ExtrudeGeometry(roundedRect(PW, PH, .9), { depth: .22, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 3, curveSegments: 8 });
  frameGeo.translate(0, 0, -.11);
  // the cards stay paper-white whatever the hour, like a UI layer floating in the scene
  const frameMat = new THREE.MeshBasicMaterial({ color: 0xf3f6f9, transparent: true, opacity: .93, toneMapped: false, fog: false, depthWrite: false });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .75 });
  const edgeGeo = new THREE.EdgesGeometry(new THREE.ShapeGeometry(roundedRect(PW, PH, .9), 8));
  const photoGeo = new THREE.PlaneGeometry(PW - 1, (PW - 1) * .62);
  const CAPH = (PW - 1) * 276 / 1024;
  const capGeo = new THREE.PlaneGeometry(PW - 1, CAPH);
  const fmt = (n, es) => new Intl.NumberFormat(es ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  function drawCaption(p) {
    const es = document.documentElement.lang === 'es';
    const l = p.l, g = p.ctx, W = 1024, H = 276;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#0d1b2a';
    g.font = '500 34px "JetBrains Mono", monospace';
    const st = (window.LX && window.LX.STATUS[l.status]) || [l.status, l.status];
    g.fillStyle = '#1f3fff';
    g.fillText(((l.neighborhood || '') + (l.floor ? `  ·  ${es ? 'PISO' : 'FLOOR'} ${l.floor}` : '')).toUpperCase(), 0, 40);
    g.fillStyle = '#0d1b2a';
    g.font = '600 80px Archivo, Arial, sans-serif';
    const title = (l.title && (l.title[es ? 'es' : 'en'] || l.title.en)) || '';
    g.fillText(title.length > 20 ? title.slice(0, 19) + '…' : title, 0, 134);
    g.font = '600 64px Archivo, Arial, sans-serif';
    g.fillText(fmt(l.price, es), 0, 236);
    g.fillStyle = '#33475b';
    g.font = '500 32px "JetBrains Mono", monospace';
    const specs = `${l.beds} ${es ? 'HAB' : 'BD'}  ·  ${l.baths} ${es ? 'BAÑOS' : 'BA'}  ·  ${new Intl.NumberFormat('en-US').format(l.sqft)} ${es ? 'PIES²' : 'SQ FT'}`;
    const w = g.measureText(specs).width; g.fillText(specs, W - w, 232);
    g.fillStyle = '#33475b'; g.font = '500 34px "JetBrains Mono", monospace';
    const sw = g.measureText(st[es ? 1 : 0].toUpperCase()).width;
    g.fillText((es ? st[1] : st[0]).toUpperCase(), W - sw, 40);
    p.capTex.needsUpdate = true;
  }
  function buildPanels(list) {
    list.slice(0, 6).forEach((l, i) => {
      const grp = new THREE.Group();
      const frame = new THREE.Mesh(frameGeo, frameMat); frame.renderOrder = 2; grp.add(frame);
      const edge = new THREE.LineSegments(edgeGeo, edgeMat); edge.position.z = .2; grp.add(edge);
      const src = l.thumb || l.photos[0];
      const tex = tl.load(src, undefined, undefined, () => setTimeout(() => tl.load(src, t2 => { tex.image = t2.image; tex.needsUpdate = true; }), 1500));
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const photo = new THREE.Mesh(photoGeo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }));
      photo.position.set(0, PH / 2 - .5 - (PW - 1) * .31, .24); photo.renderOrder = 3; grp.add(photo);
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 276;
      const capTex = new THREE.CanvasTexture(cv); capTex.colorSpace = THREE.SRGBColorSpace; capTex.anisotropy = 4;
      const cap = new THREE.Mesh(capGeo, new THREE.MeshBasicMaterial({ map: capTex, transparent: true, toneMapped: false, fog: false, depthWrite: false }));
      cap.position.set(0, -PH / 2 + .55 + CAPH / 2, .24); cap.renderOrder = 4; grp.add(cap);
      grp.userData.id = l.id;
      [frame, photo, cap].forEach(m => { m.userData.panel = grp; });
      panelsGroup.add(grp);
      const p = { grp, l, ctx: cv.getContext('2d'), capTex, hover: 0, seed: rnd() };
      panels.push(p); drawCaption(p);
    });
  }
  const redraw = () => panels.forEach(drawCaption);
  document.addEventListener('langchange', redraw);
  if (document.fonts) document.fonts.ready.then(redraw);
  const ready = l => { if (!panels.length && l && l.length) buildPanels(l); };
  if (window.LX && window.LX.listings.length) ready(window.LX.listings);
  document.addEventListener('listingsready', e => ready(e.detail));

  /* -------------------------------------------- camera path */
  const camA = isPhone ? { pos: new THREE.Vector3(-46, 16, 285), look: new THREE.Vector3(-4, 30, 0) } : { pos: new THREE.Vector3(-150, 34, 250), look: new THREE.Vector3(-58, 74, 0) };
  const camB = isPhone ? { pos: new THREE.Vector3(40, 34, 250), look: new THREE.Vector3(0, 52, 0) } : { pos: new THREE.Vector3(-20, 52, 245), look: new THREE.Vector3(-46, 82, 0) };
  const look = new THREE.Vector3();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5; }, { passive: true });

  const camFwd = new THREE.Vector3(), camRight = new THREE.Vector3(), camUp = new THREE.Vector3(), tmp = new THREE.Vector3(), tq = new THREE.Quaternion(), oq = new THREE.Quaternion(), dummy = new THREE.Object3D();
  function layoutPanels(p, t) {
    const n = panels.length; if (!n) return;
    camera.getWorldDirection(camFwd); camRight.crossVectors(camFwd, camera.up).normalize(); camUp.crossVectors(camRight, camFwd).normalize();
    const aspect = camera.aspect;
    const cols = aspect < .9 ? 2 : 3, rows = Math.ceil(n / cols);
    const gapX = PW * 1.1, gapY = PH * 1.1;
    const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const D = aspect < .9 ? Math.max(cols * gapX / (1.84 * th * aspect), rows * gapY / (1.3 * th)) : Math.max(cols * gapX / (1.02 * th * aspect), rows * gapY / (1.25 * th));
    const halfH = th * D, halfW = halfH * aspect;
    // grid sits right of center on wide screens, centered on phones
    const gx = aspect < .9 ? 0 : halfW - (cols * gapX) / 2 - halfW * .05;
    const gy = aspect < .9 ? -halfH * .06 : -halfH * .02;
    panels.forEach((P, i) => {
      // orbit: a slow spiral around the tower
      const a = i / n * Math.PI * 2 + t * .06 + 1.2;
      const R = 36 + (i % 2) * 8;
      const oy = 30 + i * 19 + Math.sin(t * .5 + i) * 1.2;
      const ox = Math.cos(a) * R, oz = Math.sin(a) * R;
      dummy.position.set(ox, oy, oz);
      dummy.lookAt(ox * 3, oy, oz * 3);
      oq.copy(dummy.quaternion);
      // grid: in front of the camera
      const c = i % cols, r = Math.floor(i / cols);
      tmp.copy(camera.position).addScaledVector(camFwd, D)
        .addScaledVector(camRight, gx + (c - (cols - 1) / 2) * gapX)
        .addScaledVector(camUp, gy + ((rows - 1) / 2 - r) * gapY);
      tq.copy(camera.quaternion);
      const k0 = THREE.MathUtils.clamp((p - .42 - i * .035) / .32, 0, 1);
      const k = k0 * k0 * (3 - 2 * k0);
      P.grp.position.set(ox, oy, oz).lerp(tmp, k);
      P.grp.quaternion.copy(oq).slerp(tq, k);
      // arc a little toward the viewer mid-flight
      P.grp.position.addScaledVector(camFwd, -Math.sin(k * Math.PI) * 18);
      P.hover += ((hovered === P.grp ? 1 : 0) - P.hover) * .15;
      const s = (.82 + .18 * k) * (1 + P.hover * .06);
      P.grp.scale.setScalar(s);
      P.grp.position.addScaledVector(camFwd, -P.hover * 2);
    });
  }

  /* -------------------------------------------- picking */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hovered = null, downAt = null;
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(panelsGroup.children, true).find(h => h.object.userData.panel);
    return hit ? hit.object.userData.panel : null;
  }
  canvas.addEventListener('pointermove', e => { hovered = pick(e); canvas.style.cursor = hovered ? 'pointer' : ''; }, { passive: true });
  canvas.addEventListener('pointerleave', () => { hovered = null; });
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return;
    const g = pick(e); if (g && window.openListing) window.openListing(g.userData.id);
  });

  /* -------------------------------------------- tod + hud */
  const sunDir = new THREE.Vector3();
  function applyTOD(p) {
    const el = key(p, 'el');
    sunDir.set(-.55 + p * .9, el, -.75).normalize();
    SKY.uTop.value.copy(key(p, 'top')); SKY.uMid.value.copy(key(p, 'mid')); SKY.uHor.value.copy(key(p, 'hor'));
    SKY.uSun.value.copy(key(p, 'sun')); SKY.uSunDir.value.copy(sunDir);
    const n = key(p, 'night'); U.night.value = n;
    sun.color.copy(key(p, 'sun')); sun.intensity = key(p, 'sunI');
    sun.position.copy(sunDir).multiplyScalar(320).add(sun.target.position);
    hemi.color.copy(key(p, 'hemiS')); hemi.groundColor.copy(key(p, 'hemiG')); hemi.intensity = key(p, 'hemiI');
    scene.fog.color.copy(key(p, 'fog')); renderer.toneMappingExposure = key(p, 'exp');
    WU.uDeep.value.copy(key(p, 'deep')); WU.uSun.value.copy(key(p, 'sun')); WU.uSunDir.value.copy(sunDir); WU.uFog.value.copy(scene.fog.color);
    glassMats.forEach(m => { m.emissiveIntensity = Math.max(0, n - .25) * 1.1; });
    lantern.material.emissiveIntensity = .2 + n * 2.2; lobby.material.emissiveIntensity = .15 + n * 1.4;
    updateEnv(p);
  }
  const hudFloor = document.querySelector('[data-hud-floor]');
  const hudClock = document.querySelector('[data-hud-clock]');
  function hud(build, p) {
    if (hudFloor) hudFloor.textContent = String(Math.min(FLOORS, Math.max(1, Math.floor(build)))).padStart(2, '0');
    if (hudClock) {
      const mins = Math.round(10 * 60 + 40 + p * (19 * 60 + 52 - 10 * 60 - 40));
      const h = Math.floor(mins / 60), m = String(mins % 60).padStart(2, '0');
      hudClock.textContent = document.documentElement.lang === 'es' ? `${h}:${m}` : `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'am' : 'pm'}`;
    }
  }

  function heroProgress() {
    if (!hero) return 0;
    const r = hero.getBoundingClientRect();
    return THREE.MathUtils.clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
  }

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w / h < .9 ? 50 : 36; camera.updateProjectionMatrix();
    rt.setSize(Math.round(w * DPR * rtScale), Math.round(h * DPR * rtScale));
  }
  addEventListener('resize', resize); resize();

  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);
  const clk = new THREE.Clock();
  let t = 0, P = 0, build = reduce ? FLOORS + 1 : 0, first = true;
  setTower(build);
  function frame() {
    requestAnimationFrame(frame);
    if (!visible && !first) return;
    const raw = Math.min(clk.getDelta(), .5), dt = Math.min(raw, .05);
    if (!reduce) { t += dt; build = Math.min(FLOORS + 1, build + Math.min(raw, .25) * 16); setTower(build); }
    U.time.value = t;
    const target = reduce ? .35 : heroProgress();
    P += (target - P) * (reduce ? 1 : 1 - Math.exp(-raw * 5));
    mouse.x += (mouse.tx - mouse.x) * .04; mouse.y += (mouse.ty - mouse.y) * .04;
    applyTOD(P);
    const e = Math.min(1, P / .6), ee = e * e * (3 - 2 * e);
    camera.position.lerpVectors(camA.pos, camB.pos, ee);
    look.lerpVectors(camA.look, camB.look, ee);
    if (!reduce) { camera.position.x += mouse.x * 8; camera.position.y -= mouse.y * 4; }
    camera.lookAt(look);
    camera.updateMatrixWorld();
    layoutPanels(reduce ? .2 : P, t);
    hud(build, P);
    renderReflection();
    renderer.render(scene, camera);
    if (first) { first = false; document.documentElement.classList.add('hero-ready'); }
  }
  frame();
}
