// Ceiba & Coral Realty: the hero house. A Miami modern home on the bay, built in code:
// a glass ground floor, a white upper volume cantilevered over the pool, teak screens, a stone wall,
// palms and the city across the water. One value, dusk (0 golden hour, 1 blue hour), sets the sky,
// the sun, the lights inside, the pool glow and the windows across the bay.
import * as THREE from 'three';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const C = h => new THREE.Color(h);

/* ---------- sky: gradient dome with a soft sun, shared by the page and the reflections ---------- */
function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uZen: { value: C('#4f6fa8') }, uMid: { value: C('#e9a98a') }, uHor: { value: C('#ffc58a') },
      uSun: { value: new THREE.Vector3(0, .1, -1) }, uSunCol: { value: C('#ffd9a8') }, uSunAmt: { value: 1 }
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 uZen,uMid,uHor,uSunCol,uSun; uniform float uSunAmt; varying vec3 vDir;
      void main(){
        float h = vDir.y;
        vec3 col = mix(uHor, uMid, smoothstep(-.02, .16, h));
        col = mix(col, uZen, smoothstep(.12, .62, h));
        col = mix(col, uHor * .55, smoothstep(0., -.25, h));
        float s = max(dot(normalize(vDir), normalize(uSun)), 0.);
        col += uSunCol * (pow(s, 900.) * 6. + pow(s, 24.) * .55 + pow(s, 4.) * .18) * uSunAmt;
        // faint cloud bands near the horizon
        float band = sin(vDir.x * 9. + vDir.z * 4.) * .5 + .5;
        col = mix(col, col * vec3(1.06, .96, .98), band * smoothstep(.03, .09, h) * smoothstep(.22, .1, h) * .5);
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

/* ---------- small procedural textures ---------- */
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function waterNormals() {
  // tileable ripple normal map from summed sines
  return canvasTex(256, 256, (x, w, h) => {
    const img = x.createImageData(w, h), r = rand(7), waves = [];
    for (let i = 0; i < 14; i++) waves.push([Math.floor(r() * 6) + 1, Math.floor(r() * 6) - 3, r() * 6.28, .3 + r() * .7]);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let dx = 0, dy = 0;
      for (const [kx, ky, ph, a] of waves) { const v = Math.cos((kx * i / w + ky * j / h) * 6.283 + ph) * a; dx += v * kx; dy += v * ky; }
      const k = (j * w + i) * 4;
      img.data[k] = 128 + dx * 5; img.data[k + 1] = 128 + dy * 5; img.data[k + 2] = 255; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }, false);
}
function stoneTex() {
  return canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#d8cebf'; x.fillRect(0, 0, w, h);
    const r = rand(11);
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${150 + r() * 60 | 0},${135 + r() * 50 | 0},${115 + r() * 40 | 0},${r() * .12})`; x.fillRect(r() * w, r() * h, 1 + r() * 18, 1 + r() * 2); }
    x.strokeStyle = 'rgba(120,105,90,.35)'; x.lineWidth = 1.2;
    for (let y = 0; y <= h; y += 128) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
    for (let y = 0; y < h; y += 128) for (let xx = (y / 128) % 2 ? 128 : 0; xx <= w; xx += 256) { x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + 128); x.stroke(); }
  });
}
function windowsTex() {
  return canvasTex(128, 256, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h); const r = rand(3);
    for (let j = 0; j < 32; j++) for (let i = 0; i < 12; i++) if (r() < .45) {
      const v = r(); x.fillStyle = `rgba(255,${200 + v * 50 | 0},${140 + v * 90 | 0},${.45 + v * .55})`; x.fillRect(i * 10.6 + 2, j * 8 + 2, 6, 4);
    }
  });
}

/* ---------- palms: a bent tapered trunk and drooping pinnate fronds, merged into two meshes ---------- */
function buildPalms(list) {
  const tPos = [], tNor = [], tIdx = [], fPos = [], fIdx = [];
  const v = new THREE.Vector3();
  for (const p of list) {
    const { x, z, h, bend, dir, seed } = p, r = rand(seed);
    // trunk
    const seg = 18, rad = 8, base = tPos.length / 3;
    const top = new THREE.Vector3();
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, y = t * h, off = bend * t * t;
      const cx = x + Math.cos(dir) * off, cz = z + Math.sin(dir) * off;
      const rr = lerp(.34, .17, t) * (1 + .08 * Math.sin(i * 2.7));
      for (let k = 0; k <= rad; k++) {
        const a = k / rad * Math.PI * 2;
        tPos.push(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr);
        tNor.push(Math.cos(a), 0, Math.sin(a));
      }
      if (i === seg) top.set(cx, y, cz);
    }
    for (let i = 0; i < seg; i++) for (let k = 0; k < rad; k++) {
      const a = base + i * (rad + 1) + k, b = a + rad + 1;
      tIdx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    // fronds
    const nF = 13;
    for (let f = 0; f < nF; f++) {
      const yaw = f / nF * Math.PI * 2 + r() * .4;
      const len = 3.2 + r() * 1.3, lift = .5 + r() * .7;   // how high the frond arches before drooping
      const ca = Math.cos(yaw), sa = Math.sin(yaw);
      const n = 36, pts = [], drop = 1.7 + r() * .6;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push(new THREE.Vector3(top.x + ca * len * t, top.y + lift * Math.sin(t * Math.PI * .8) - t * t * drop, top.z + sa * len * t));
      }
      // each leaflet is a narrow curved blade: base on the rib, a bend in the middle, a drooping tip
      for (let i = 2; i < n; i++) {
        const t = i / n, a = pts[i], nb = pts[i + 1];
        const ll = (Math.sin(Math.min(1, t * 1.25) * Math.PI) * .95 + .2) * (1.05 + r() * .2);
        for (const side of [-1, 1]) {
          const px = -sa * side, pz = ca * side, up = (i % 2 ? .12 : -.06);
          const bx = lerp(a.x, nb.x, .7), by = lerp(a.y, nb.y, .7), bz = lerp(a.z, nb.z, .7);
          const m1 = [a.x + px * ll * .5 + ca * ll * .18, a.y + ll * (up + .02), a.z + pz * ll * .5 + sa * ll * .18];
          const tip = [a.x + px * ll + ca * ll * .42, a.y - ll * (.42 - up), a.z + pz * ll + sa * ll * .42];
          const w = .055, base = fPos.length / 3;
          fPos.push(a.x, a.y, a.z, bx, by, bz, m1[0], m1[1], m1[2], m1[0] + ca * w, m1[1], m1[2] + sa * w, tip[0], tip[1], tip[2]);
          fIdx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4);
        }
      }
      // rachis as a thin ribbon
      for (let i = 0; i < n; i++) {
        const b = fPos.length / 3, a = pts[i], c = pts[i + 1], w = .05;
        fPos.push(a.x - sa * w, a.y, a.z + ca * w, a.x + sa * w, a.y, a.z - ca * w, c.x - sa * w, c.y, c.z + ca * w, c.x + sa * w, c.y, c.z - ca * w);
        fIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(tPos, 3)); tg.setAttribute('normal', new THREE.Float32BufferAttribute(tNor, 3)); tg.setIndex(tIdx);
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3)); fg.setIndex(fIdx); fg.computeVertexNormals();
  const trunk = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: 0x6e5f50, roughness: .95 }));
  const fronds = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: 0x2f4a2c, roughness: .8, side: THREE.DoubleSide }));
  trunk.castShadow = fronds.castShadow = true;
  return [trunk, fronds];
}

export async function initHero(canvas, { reduce = false, isPhone = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isPhone, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isPhone ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const fog = new THREE.Fog(0xf2b48a, 160, 1300); scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(isPhone ? 46 : 34, 1, .5, 1500);

  const skyMat = skyMaterial();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMat); scene.add(sky);

  // environment for reflections: just the sky, re-baked when the light changes enough
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat); envScene.add(envSky);
  let envRT = null, envAt = -1;
  const bakeEnv = d => { if (Math.abs(d - envAt) < .08 && envRT) return; envRT?.dispose(); envRT = pmrem.fromScene(envScene, .02); scene.environment = envRT.texture; envAt = d; };

  /* lights */
  const hemi = new THREE.HemisphereLight(0xbfd2ff, 0x5a4636, .8); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc28a, 3.2);
  sun.castShadow = true; sun.shadow.mapSize.set(isPhone ? 1024 : 2048, isPhone ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 26, bottom: -22, near: 1, far: 220 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .04; sun.shadow.radius = 4;
  scene.add(sun, sun.target); sun.target.position.set(2, 0, 0);

  /* materials */
  const stucco = new THREE.MeshStandardMaterial({ color: 0xf1ece4, roughness: .82 });
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xfaf7f2, roughness: .6 });
  const sTex = stoneTex(); sTex.repeat.set(5, 3);
  const stone = new THREE.MeshStandardMaterial({ color: 0xd6ccbe, map: sTex, roughness: .85 });
  const basalt = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: .9 });
  const teak = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: .55 });
  const mull = new THREE.MeshStandardMaterial({ color: 0x23211f, roughness: .4, metalness: .6 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x8fa3a6, metalness: .2, roughness: .03, transparent: true, opacity: .3, envMapIntensity: 1.6, depthWrite: false });
  const room = new THREE.MeshStandardMaterial({ color: 0x1b1612, emissive: 0xffb36b, emissiveIntensity: .8, roughness: 1 });
  const roomDim = new THREE.MeshStandardMaterial({ color: 0x1b1612, emissive: 0xff9f55, emissiveIntensity: .35, roughness: 1 });
  const lawn = new THREE.MeshStandardMaterial({ color: 0x4a5e38, roughness: 1 });
  const hedge = new THREE.MeshStandardMaterial({ color: 0x2c3f27, roughness: 1 });
  const wTex = waterNormals();
  const pool = new THREE.MeshPhysicalMaterial({ color: 0x0b97a3, roughness: .08, metalness: 0, normalMap: wTex, normalScale: new THREE.Vector2(.3, .3), emissive: 0x18b9c6, emissiveIntensity: .12, envMapIntensity: .55, clearcoat: .6, clearcoatRoughness: .08 });
  const bayTex = wTex.clone(); bayTex.repeat.set(260, 150); bayTex.needsUpdate = true;
  const bay = new THREE.MeshStandardMaterial({ color: 0x1a3446, metalness: .75, roughness: .16, envMapIntensity: 1.4 });

  const house = new THREE.Group(); scene.add(house);
  const add = (geo, mat, x, y, z, parent = house, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  /* site: lawn, terrace, seawall, bay */
  const ground = add(new THREE.PlaneGeometry(260, 120), lawn, 0, 0, 30, scene, false); ground.rotation.x = -Math.PI / 2;
  add(B(260, 1.4, 3), basalt, 0, -.5, -20.5, scene, false);   // seawall
  const water = add(new THREE.PlaneGeometry(2400, 1400), bay, 0, -.6, -720, scene, false); water.rotation.x = -Math.PI / 2;
  add(B(40, .5, 24), stone, 2, .25, 1);                        // travertine terrace
  add(B(4, .3, 12), stone, -15, .15, -13);                      // dock
  add(B(.3, 1.2, 11), basalt, -13.1, .6, -13, house);

  /* ground floor: glass box with the rooms lit behind it */
  const GF = { x0: -9, x1: 7, z0: -6, z1: 4, y0: .5, h: 3.4 };
  const gw = GF.x1 - GF.x0, gd = GF.z1 - GF.z0;
  add(B(gw, .05, gd), new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: .5 }), (GF.x0 + GF.x1) / 2, GF.y0 + .03, (GF.z0 + GF.z1) / 2, house, false);
  const back = add(B(gw, GF.h, .2), room, (GF.x0 + GF.x1) / 2, GF.y0 + GF.h / 2, GF.z0 + .1, house, false);
  const ceil = add(B(gw, .1, gd), roomDim, (GF.x0 + GF.x1) / 2, GF.y0 + GF.h - .06, (GF.z0 + GF.z1) / 2, house, false);
  // furniture silhouettes: sofa, island, dining table, a couple of pendants
  const furn = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: .9 });
  add(B(4, .8, 1.1), furn, -5, GF.y0 + .4, -2.5); add(B(1, .55, 2.4), furn, -7.4, GF.y0 + .3, -1.2);
  add(B(3.2, .95, 1), new THREE.MeshStandardMaterial({ color: 0xe8e2d8, roughness: .3 }), 2.5, GF.y0 + .48, -2.8);
  add(B(2.6, .08, 1.1), teak, -1, GF.y0 + .78, 1);
  const pend = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  for (const px of [1.5, 2.5, 3.5]) add(new THREE.SphereGeometry(.16, 12, 8), pend, px, GF.y0 + 2.5, -2.8, house, false);
  // glass and mullions on the three open sides
  const glassFront = add(B(gw, GF.h, .04), glass, (GF.x0 + GF.x1) / 2, GF.y0 + GF.h / 2, GF.z1, house, false);
  const glassSide = add(B(.04, GF.h, gd), glass, GF.x1, GF.y0 + GF.h / 2, (GF.z0 + GF.z1) / 2, house, false);
  glassFront.renderOrder = glassSide.renderOrder = 3;
  for (let x = GF.x0; x <= GF.x1 + .01; x += gw / 7) add(B(.07, GF.h, .1), mull, x, GF.y0 + GF.h / 2, GF.z1);
  for (let z = GF.z0; z <= GF.z1 + .01; z += gd / 4) add(B(.1, GF.h, .07), mull, GF.x1, GF.y0 + GF.h / 2, z);
  // stone feature wall running through the house
  add(B(.9, 7.9, 15), basalt, GF.x0 - .45, 3.95, -1.2);
  add(B(.9, 2.6, 6), basalt, GF.x0 - .45 - 6, 1.3, 2.5);

  /* the floor plate and the cantilevered upper volume */
  const UF = { x0: -6, x1: 15.5, z0: -6.4, z1: 3.6, y0: 4.25, h: 3.3 };
  add(B(UF.x1 - UF.x0 + 3, .4, 12), slabMat, (UF.x0 + UF.x1) / 2 - 1.5, 4.05, -.6);
  const uw = UF.x1 - UF.x0, ux = (UF.x0 + UF.x1) / 2, uy = UF.y0 + UF.h / 2;
  add(B(uw, UF.h, .3), stucco, ux, uy, UF.z0);                         // back
  add(B(.3, UF.h, UF.z1 - UF.z0), stucco, UF.x1, uy, (UF.z0 + UF.z1) / 2); // pool end
  add(B(.3, UF.h, UF.z1 - UF.z0), stucco, UF.x0, uy, (UF.z0 + UF.z1) / 2);
  // front: solid stucco with one long ribbon window, the teak screen on the left part
  const ribbon = { x0: 2, x1: 14.6, y0: UF.y0 + .7, y1: UF.y0 + 2.75 };
  add(B(ribbon.x0 - UF.x0, UF.h, .3), stucco, (UF.x0 + ribbon.x0) / 2, uy, UF.z1);
  add(B(UF.x1 - ribbon.x1, UF.h, .3), stucco, (ribbon.x1 + UF.x1) / 2, uy, UF.z1);
  add(B(ribbon.x1 - ribbon.x0, ribbon.y0 - UF.y0, .3), stucco, (ribbon.x0 + ribbon.x1) / 2, (UF.y0 + ribbon.y0) / 2, UF.z1);
  add(B(ribbon.x1 - ribbon.x0, UF.y0 + UF.h - ribbon.y1, .3), stucco, (ribbon.x0 + ribbon.x1) / 2, (ribbon.y1 + UF.y0 + UF.h) / 2, UF.z1);
  const upRoom = add(B(ribbon.x1 - ribbon.x0, ribbon.y1 - ribbon.y0, .1), room, (ribbon.x0 + ribbon.x1) / 2, (ribbon.y0 + ribbon.y1) / 2, UF.z1 - 2.6, house, false);
  add(B(ribbon.x1 - ribbon.x0, .1, 2.6), roomDim, (ribbon.x0 + ribbon.x1) / 2, ribbon.y1 - .05, UF.z1 - 1.3, house, false);
  add(B(ribbon.x1 - ribbon.x0, .1, 2.6), furn, (ribbon.x0 + ribbon.x1) / 2, ribbon.y0 + .05, UF.z1 - 1.3, house, false);
  for (let x = ribbon.x0; x <= ribbon.x1 + .01; x += (ribbon.x1 - ribbon.x0) / 6) add(B(.06, ribbon.y1 - ribbon.y0, .08), mull, x, (ribbon.y0 + ribbon.y1) / 2, UF.z1 + .1);
  const ribGlass = add(B(ribbon.x1 - ribbon.x0, ribbon.y1 - ribbon.y0, .03), glass, (ribbon.x0 + ribbon.x1) / 2, (ribbon.y0 + ribbon.y1) / 2, UF.z1 + .05, house, false);
  ribGlass.renderOrder = 3;
  // teak vertical slats in front of the left part of the upper floor
  const slatN = 26, slat = new THREE.InstancedMesh(B(.09, UF.h - .2, .22), teak, slatN);
  for (let i = 0; i < slatN; i++) slat.setMatrixAt(i, new THREE.Matrix4().makeTranslation(UF.x0 + .4 + i * ((ribbon.x0 - UF.x0 - .7) / (slatN - 1)), uy, UF.z1 + .45));
  slat.castShadow = true; house.add(slat);
  // roof with a thin overhang
  add(B(uw + 1.6, .32, 11.2), slabMat, ux + .3, UF.y0 + UF.h + .16, -1.4);
  add(B(3.4, 1.2, 2.6), stucco, -1, UF.y0 + UF.h + .9, -3.6);   // stair head

  /* pool under the cantilever, lit from inside at dusk */
  const PL = { x0: 3, x1: 19, z0: 5.2, z1: 10.6 };
  const plw = PL.x1 - PL.x0, pld = PL.z1 - PL.z0;
  const pw = add(new THREE.PlaneGeometry(plw, pld), pool, (PL.x0 + PL.x1) / 2, .515, (PL.z0 + PL.z1) / 2, house, false); pw.rotation.x = -Math.PI / 2; pw.castShadow = false;
  const coping = new THREE.MeshStandardMaterial({ color: 0xece5d9, roughness: .6 });
  add(B(plw + .8, .08, .4), coping, (PL.x0 + PL.x1) / 2, .56, PL.z0 - .2); add(B(plw + .8, .08, .4), coping, (PL.x0 + PL.x1) / 2, .56, PL.z1 + .2);
  add(B(.4, .08, pld), coping, PL.x0 - .2, .56, (PL.z0 + PL.z1) / 2); add(B(.4, .08, pld), coping, PL.x1 + .2, .56, (PL.z0 + PL.z1) / 2);
  // loungers
  const cush = new THREE.MeshStandardMaterial({ color: 0xf4efe7, roughness: .9 });
  for (const lx of [-5, -2.6, -.2]) { const l = add(B(.8, .28, 2), cush, lx, .64, 7.6); l.rotation.y = .02; add(B(.8, .5, .12), cush, lx, .85, 6.7).rotation.x = -.5; }
  add(B(3.2, .03, 3.2), new THREE.MeshStandardMaterial({ color: 0xc9b9a1, roughness: 1 }), -2.6, .52, 7.6, house, false);
  // hedges and a planter line
  add(B(14, 1.1, 1.1), hedge, -13, .55, 9); add(B(1.1, 1.1, 10), hedge, -19.5, .55, 4); add(B(8, .8, .9), hedge, 26, .4, 10);

  /* palms */
  const palms = buildPalms([
    { x: -13.5, z: 4.5, h: 11.5, bend: 1.4, dir: 2.6, seed: 3 }, { x: -16, z: 1.5, h: 9.2, bend: 1.8, dir: 3.3, seed: 9 },
    { x: 22.5, z: 4, h: 12.5, bend: 2.2, dir: .3, seed: 21 }, { x: 24.5, z: 8, h: 9, bend: 1.4, dir: .9, seed: 5 },
    { x: 9, z: -9.5, h: 14, bend: 1.5, dir: -1.2, seed: 13 }, { x: -24, z: -6, h: 13, bend: 1.2, dir: 3.8, seed: 17 }
  ]);
  palms.forEach(p => scene.add(p));

  /* the city across the bay: dark towers whose windows light up after sunset */
  const city = new THREE.Group(); scene.add(city);
  const wt = windowsTex();
  const cityMat = new THREE.MeshStandardMaterial({ color: 0x6a7088, roughness: .6, metalness: .2, emissive: 0xffc98f, emissiveMap: wt, emissiveIntensity: .05 });
  const r = rand(42);
  for (let i = 0; i < 52; i++) {
    const x = -980 + i * 38 + r() * 14, h = 14 + Math.pow(r(), 1.6) * 85 * Math.max(.15, 1 - Math.abs(x + 120) / 700), w = 9 + r() * 12, d = 9 + r() * 10;
    const m = new THREE.Mesh(B(w, h, d), cityMat.clone()); m.material.emissiveMap = wt.clone(); m.material.emissiveMap.repeat.set(w / 14, h / 28); m.material.emissiveMap.offset.set(r(), r()); m.material.emissiveMap.needsUpdate = true;
    m.position.set(x, h / 2 - .6, -680 - r() * 90); city.add(m);
  }

  /* garden uplights: soft glows at the palm bases and along the terrace at dusk */
  const glowTex = canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,214,160,1)'); g.addColorStop(.3, 'rgba(255,190,120,.35)'); g.addColorStop(1, 'rgba(255,170,100,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending });
  const glows = [[-13.5, 4.5], [-16, 1.5], [22.5, 4], [24.5, 8], [9, -9.5], [-24, -6], [-6, 9.6], [0, 9.6], [6, 11.3], [12, 11.3]];
  glows.forEach(([x, z]) => { const s = new THREE.Sprite(glowMat); s.position.set(x, .9, z); s.scale.set(3.2, 3.2, 1); scene.add(s); });
  const poolLight = new THREE.PointLight(0x4fe3e8, 0, 22, 1.6); poolLight.position.set(11, .2, 8); scene.add(poolLight);
  const roomLight = new THREE.PointLight(0xffb067, 0, 26, 1.4); roomLight.position.set(-1, 2.2, 6); scene.add(roomLight);

  /* ---------- time of day ---------- */
  const K = {
    zen: [C('#5878b0'), C('#0e1633')], mid: [C('#eaa486'), C('#5a4378')], hor: [C('#ffc488'), C('#ef8a68')],
    fog: [C('#f0b892'), C('#3e3550')], sunCol: [C('#ffc890'), C('#ff8a5c')], hemiSky: [C('#c7d6ff'), C('#4d5a8c')]
  };
  const sunDir = new THREE.Vector3();
  let dusk = -1;
  function setDusk(d) {
    d = clamp(d); if (Math.abs(d - dusk) < .002) return; dusk = d;
    const e = smooth(d);
    skyMat.uniforms.uZen.value.lerpColors(K.zen[0], K.zen[1], e);
    skyMat.uniforms.uMid.value.lerpColors(K.mid[0], K.mid[1], e);
    skyMat.uniforms.uHor.value.lerpColors(K.hor[0], K.hor[1], e);
    skyMat.uniforms.uSunCol.value.lerpColors(K.sunCol[0], K.sunCol[1], e);
    const el = lerp(.075, -.03, e), az = 2.62;
    sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize();
    skyMat.uniforms.uSun.value.copy(sunDir);
    skyMat.uniforms.uSunAmt.value = lerp(1, .35, e);
    sun.position.copy(sunDir).multiplyScalar(120).add(sun.target.position).setY(Math.max(6, sunDir.y * 120 + 10));
    sun.intensity = lerp(3.4, .15, smooth(d * 1.3));
    sun.color.copy(skyMat.uniforms.uSunCol.value);
    hemi.intensity = lerp(1.0, .42, e); hemi.color.lerpColors(K.hemiSky[0], K.hemiSky[1], e);
    fog.color.lerpColors(K.fog[0], K.fog[1], e);
    renderer.toneMappingExposure = lerp(1.0, 1.25, e);
    room.emissiveIntensity = lerp(.55, 2.4, e); roomDim.emissiveIntensity = lerp(.25, 1.2, e);
    pool.emissiveIntensity = lerp(.12, .8, smooth((d - .25) / .75));
    poolLight.intensity = lerp(0, 60, smooth((d - .3) / .7)); roomLight.intensity = lerp(0, 40, smooth((d - .2) / .8));
    glowMat.opacity = smooth((d - .35) / .65) * .9;
    city.children.forEach((m, i) => m.material.emissiveIntensity = lerp(0, 1.4, smooth((d - .25 - (i % 7) * .05) / .5)));
    scene.environmentIntensity = lerp(1, .55, e);
    bakeEnv(d);
  }

  /* ---------- camera path: high three quarter view to low by the pool ---------- */
  const camA = { p: new THREE.Vector3(), t: new THREE.Vector3(-3.5, 3.2, 0) };
  const camB = { p: new THREE.Vector3(), t: new THREE.Vector3(-5.5, 3.6, 3) };
  if (isPhone) { camA.t.set(4, 1.2, 0); camB.t.set(3, 2.4, 2); }
  const look = new THREE.Vector3(), pos = new THREE.Vector3();
  let prog = 0, cur = 0, px = 0, py = 0, cx = 0, cy = 0, time = 0;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = (w / h < .8 ? 50 : 34); camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  function frame(dt) {
    cur += (prog - cur) * (reduce ? 1 : Math.min(1, dt * 3.2));
    cx += (px - cx) * Math.min(1, dt * 2.5); cy += (py - cy) * Math.min(1, dt * 2.5);
    const e = smooth(cur);
    // orbit around the house on a gentle arc rather than a straight line
    const a = lerp(-.62, .34, e), rad = lerp(50, 35, e), h = lerp(8.5, 3, e);
    pos.set(Math.sin(a) * rad + 3, h, Math.cos(a) * rad);
    if (isPhone) pos.multiplyScalar(1.02).setY(h + 2);
    look.lerpVectors(camA.t, camB.t, e);
    pos.x += cx * 1.6; pos.y += -cy * .7;
    if (!reduce) { pos.y += Math.sin(time * .25) * .12; pos.x += Math.sin(time * .17) * .25; }
    camera.position.copy(pos); camera.lookAt(look);
    setDusk(cur);
    if (!reduce) { wTex.offset.x = time * .012; wTex.offset.y = time * .008; bayTex.offset.y = time * .02; }
    renderer.render(scene, camera);
  }

  let running = false, last = 0, raf = 0;
  const loop = t => { const dt = Math.min(.05, (t - last) / 1000 || .016); last = t; time += dt; frame(dt); if (running) raf = requestAnimationFrame(loop); };
  setDusk(0); frame(1);
  return {
    setProgress(p) { prog = clamp(p); if (reduce) frame(1); },
    setPointer(x, y) { px = x; py = y; },
    start() { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); },
    stop() { running = false; cancelAnimationFrame(raf); },
    render() { frame(1); }
  };
}
