// Madreperla hero: a scallop shell opens on a dark sea floor, a pearl inside catches the light.
// Built from code (no model files): parametric shell, physical iridescent materials, caustic floor shader, drifting specks.
import * as THREE from 'three';

export function initPearl(canvas, { reduce }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070a0d, 0.06);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  /* ---------- environment: a dark room with a few soft light panels, so the pearl has something to reflect ---------- */
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0x05070a, side: THREE.BackSide })));
  const panel = (w, h, color, pos, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); if (rot) m.rotateZ(rot); env.add(m);
  };
  panel(9, 3, new THREE.Color(3.2, 2.7, 2.2), [-5, 7, 3]);      // warm key, top left
  panel(3, 8, new THREE.Color(0.5, 1.4, 1.8), [8, 1, -2]);       // cool sea light, right
  panel(6, 2, new THREE.Color(1.6, 0.8, 1.1), [0, -6, 5]);      // faint rose bounce from below
  panel(3.5, 3.5, new THREE.Color(7, 6.6, 6.2), [3, 5, 8]);
  panel(4, 1.2, new THREE.Color(2.5, 2.2, 2.6), [-6, 1, 6]);             // small hot spot: the pearl's highlight
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.02).texture;

  /* ---------- lights ---------- */
  const key = new THREE.SpotLight(0xffe2c4, 60, 30, 0.5, 0.6, 1.4);
  key.position.set(-3, 7, 4); scene.add(key); scene.add(key.target);
  const rim = new THREE.PointLight(0x6fd3e0, 18, 14, 1.6); rim.position.set(3, 1.5, -3); scene.add(rim);
  const glow = new THREE.PointLight(0xffd6e4, 0, 3, 2); scene.add(glow);
  scene.add(new THREE.HemisphereLight(0x2a3a4a, 0x050608, 0.9));
  const fill = new THREE.DirectionalLight(0xfff1e6, 1.6); fill.position.set(-2, 4, 9); scene.add(fill);

  /* ---------- shell geometry ---------- */
  const R = 2.3, PHI = 1.22, NS = 70, NT = 120;
  const depth = (s, t) => 0.42 * Math.pow(Math.sin(Math.PI * Math.min(s, 1) * 0.93), 0.85) * Math.pow(1 - t * t, 0.55);
  const ribs = (s, th) => 0.045 * THREE.MathUtils.smoothstep(s, 0.05, 0.9) * Math.pow(Math.abs(Math.cos(th * 11)), 0.7);
  function shellPoint(s, t, out, off = 0) {
    const th = t * PHI;
    const r = R * s * (1 - 0.1 * t ** 4) * (1 + 0.022 * Math.cos(th * 22) * s);
    out.set(r * Math.sin(th), -depth(s, t) - ribs(s, th) - off, r * Math.cos(th));
    return out;
  }
  function surface(off) {
    const pos = [], col = [], idx = [], v = new THREE.Vector3(), c = new THREE.Color();
    const sand = new THREE.Color(0xc79a83), rose = new THREE.Color(0x8e5a55), cream = new THREE.Color(0xe9cdb7);
    for (let i = 0; i <= NS; i++) for (let j = 0; j <= NT; j++) {
      const s = 0.02 + 0.98 * i / NS, t = -1 + 2 * j / NT;
      shellPoint(s, t, v, off); pos.push(v.x, v.y, v.z);
      const band = 0.5 + 0.5 * Math.sin(s * 46 + Math.sin(t * 5) * 0.6);
      c.copy(sand).lerp(rose, band * 0.55).lerp(cream, Math.pow(Math.abs(Math.cos(t * PHI * 11)), 6) * 0.35);
      col.push(c.r, c.g, c.b);
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) {
      const a = i * (NT + 1) + j, b = a + NT + 1;
      if (off) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function rimGeo() { // band joining inner and outer edges, so the shell has thickness
    const pos = [], idx = [], a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let j = 0; j <= NT; j++) { const t = -1 + 2 * j / NT; shellPoint(1, t, a, 0); shellPoint(1, t, b, 0.05); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    for (let j = 0; j < NT; j++) { const k = j * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const gIn = surface(0), gOut = surface(0.05), gRim = rimGeo();
  const nacre = new THREE.MeshPhysicalMaterial({
    color: 0xf3ebe6, roughness: 0.22, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.12,
    iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessRange: [180, 720], envMapIntensity: 1.4,
  });
  const outer = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, envMapIntensity: 0.5 });
  const valve = () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(gIn, nacre), new THREE.Mesh(gOut, outer), new THREE.Mesh(gRim, outer));
    return g;
  };
  const shell = new THREE.Group(); scene.add(shell);
  const bottom = valve(); shell.add(bottom);
  const hinge = new THREE.Group(); shell.add(hinge);
  const top = valve(); top.scale.y = -1; hinge.add(top);
  const lig = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.34, 4, 12), new THREE.MeshStandardMaterial({ color: 0x3a2522, roughness: 0.6 }));
  lig.rotation.z = Math.PI / 2; lig.position.set(0, 0, 0.02); shell.add(lig);

  /* ---------- pearl ---------- */
  const pearlMat = new THREE.MeshPhysicalMaterial({
    color: 0xfffaf5, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
    iridescence: 0.85, iridescenceIOR: 1.35, iridescenceThicknessRange: [260, 640],
    sheen: 1, sheenColor: new THREE.Color(0xffd3e6), sheenRoughness: 0.35, envMapIntensity: 2.6,
  });
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.43, 96, 64), pearlMat);
  const PZ = 1.15, PY = -depth(PZ / R, 0) + 0.4;
  pearl.position.set(0, PY, PZ); shell.add(pearl);
  glow.position.set(0, PY + 0.3, PZ + 0.4);
  const pearlKey = new THREE.PointLight(0xfff4ea, 5, 4, 1.5); pearlKey.position.set(-0.9, PY + 1.1, PZ + 1.5); shell.add(pearlKey);

  /* ---------- sea floor with moving caustics ---------- */
  const floorMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x1d4a55) }, uLight: { value: new THREE.Color(0x9fe6ea) } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor; uniform vec3 uLight; varying vec2 vUv; varying vec3 vW;
      float caustic(vec2 uv, float t){
        vec2 p = mod(uv * 6.28318, 6.28318) - 250.; vec2 i = p; float c = 1.; float inten = .005;
        for (int n = 0; n < 4; n++){ float tt = t * (1. - (3.5 / float(n + 1)));
          i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
          c += 1. / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten))); }
        c /= 4.; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.);
      }
      void main(){
        float d = length(vW.xz - vec2(0., 1.));
        float fall = smoothstep(7.5, 0.4, d);
        float c = caustic(vW.xz * .16, uTime * .35);
        vec3 col = uColor * .22 + uLight * c * .55;
        gl_FragColor = vec4(col * fall, fall * .95);
      }`,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.62; scene.add(floor);

  /* ---------- drifting specks (plankton in the light) ---------- */
  const N = innerWidth < 760 ? 260 : 520;
  const sp = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { sp[i * 3] = (Math.random() - 0.5) * 14; sp[i * 3 + 1] = Math.random() * 6 - 0.6; sp[i * 3 + 2] = (Math.random() - 0.5) * 12; seed[i] = Math.random(); }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); pg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const pm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; uniform float uTime; uniform float uPx; varying float vA;
      void main(){ vec3 p = position; float t = uTime * (.05 + seed * .08);
        p.y = mod(p.y + t + 0.6, 6.) - 0.6; p.x += sin(uTime * .3 + seed * 20.) * .25; p.z += cos(uTime * .25 + seed * 13.) * .2;
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = (2. + seed * 5.) * uPx * (6. / -mv.z); vA = (.25 + .75 * seed) * smoothstep(-.6, .4, p.y) * smoothstep(5.4, 3.5, p.y); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vec3(.85, .95, 1.) * a * vA * .55, a * vA); }`,
  });
  scene.add(new THREE.Points(pg, pm));

  /* ---------- state, layout ---------- */
  const st = { p: 0, open: reduce ? 0.62 : 0.04, intro: reduce ? 1 : 0, mx: 0, my: 0, tx: 0, ty: 0, w: 1, h: 1 };
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    st.w = w; st.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < 760 ? 42 : 30; camera.updateProjectionMatrix();
  }
  layout();
  addEventListener('resize', layout);
  if (!reduce && matchMedia('(pointer: fine)').matches) addEventListener('pointermove', e => { st.tx = e.clientX / innerWidth * 2 - 1; st.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  const look = new THREE.Vector3();
  function place(time) {
    const phone = st.w < 760, p = st.p;
    st.mx += (st.tx - st.mx) * 0.04; st.my += (st.ty - st.my) * 0.04;
    const e = p * p * (3 - 2 * p);
    // shell sits right of the copy on wide screens, high and centred on phones; scrolling brings it to the middle
    const sx = phone ? 0 : 1.75 * (1 - e);
    shell.position.set(sx, 0, 0);
    shell.rotation.y = -0.42 + st.mx * 0.16 + Math.sin(time * 0.00012) * 0.05 + e * 0.42;
    // the top valve opens on load, then wider as you scroll
    hinge.rotation.x = -(st.open + e * 0.3) - Math.sin(time * 0.0007) * 0.015 * st.intro;
    pearl.position.y = PY + Math.sin(time * 0.0011) * 0.012;
    pearl.rotation.y = time * 0.00012;
    // camera: a high three-quarter view into the shell, then a dive toward the pearl
    const dist = phone ? 13.5 - e * 11 : 9.6 - e * 7.2;
    camera.position.set(st.mx * 0.5, (phone ? 4.8 : 3.4) - e * (phone ? 3.5 : 2.1) - st.my * 0.25, dist);
    look.set(st.mx * 0.1, (phone ? -2.3 : -0.15) * (1 - e) + PY * e, 0.45 * (1 - e) + PZ * e);
    camera.lookAt(look);
    glow.intensity = (0.6 + e * 3.5) * st.intro;
    key.intensity = 60 * (0.35 + 0.65 * st.intro);
    key.target.position.set(sx, 0, 1);
    renderer.toneMappingExposure = 0.85 + 0.3 * st.intro;
  }

  let visible = true, raf = 0;
  const loop = time => {
    raf = 0;
    if (!visible || document.hidden) return;
    floorMat.uniforms.uTime.value = time * 0.001;
    pm.uniforms.uTime.value = time * 0.001;
    place(time);
    renderer.render(scene, camera);
    if (!reduce) raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  kick();

  return {
    setScroll(v) { st.p = Math.max(0, Math.min(1, v)); if (reduce) kick(); },
    intro() {
      const gsap = window.gsap;
      if (reduce || !gsap) { st.intro = 1; st.open = 0.62; kick(); return; }
      gsap.to(st, { intro: 1, duration: 2.4, ease: 'power2.out' });
      gsap.to(st, { open: 0.62, duration: 3.2, delay: 0.35, ease: 'expo.inOut' });
    },
  };
}
