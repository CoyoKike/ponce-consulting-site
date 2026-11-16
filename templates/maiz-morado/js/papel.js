// Maíz Morado hero: walking under strings of papel picado at dusk.
// Every flag is cut on a canvas at load (flowers, corn, suns, stars), hung on a sagging string and moved by the wind in a shader.
import * as THREE from 'three';

const COLORS = [0xff3d7f, 0xffb000, 0x19b8a6, 0x8a4dff, 0xff6a2b, 0x34c46a, 0xfff1d6, 0xe8358f];

/* ---------- cut paper: draw a flag, then punch the pattern out ---------- */
function cutFlag(kind) {
  const W = 256, H = 320, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  const circle = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const ell = (x, y, rx, ry, a) => { g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); g.fill(); };
  // fold line at the top, then a frame of small cuts
  g.fillRect(0, 14, W, 3);
  for (let x = 16; x < W - 8; x += 22) { g.save(); g.translate(x, 32); g.rotate(Math.PI / 4); g.fillRect(-4, -4, 8, 8); g.restore(); }
  for (let y = 54; y < H - 50; y += 22) { circle(14, y, 3.2); circle(W - 14, y, 3.2); }
  // inner frame line, cut as thin bars
  g.fillRect(26, 46, W - 52, 2.5); g.fillRect(26, H - 58, W - 52, 2.5); g.fillRect(26, 46, 2.5, H - 104); g.fillRect(W - 28.5, 46, 2.5, H - 104);
  // the fringe: scalloped bottom edge
  for (let x = 0; x <= W; x += 21) { g.beginPath(); g.moveTo(x - 11, H); g.lineTo(x, H - 22); g.lineTo(x + 11, H); g.fill(); }
  for (let x = 10; x < W; x += 21) circle(x, H - 36, 3);
  // central motif
  const cx = W / 2, cy = 150;
  if (kind === 0) { // flower
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ell(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44, 26, 11, a); }
    g.globalCompositeOperation = 'source-over'; circle(cx, cy, 20); g.globalCompositeOperation = 'destination-out'; circle(cx, cy, 10);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; circle(cx + Math.cos(a) * 82, cy + Math.sin(a) * 82, 6); }
  } else if (kind === 1) { // corn cob with husks
    for (let r = 0; r < 9; r++) for (let k = -2; k <= 2; k++) {
      const w = 1 - Math.abs(r - 4) / 6; if (Math.abs(k) > 2 * w + .4) continue;
      ell(cx + k * 15 + (r % 2) * 7 - 3.5, cy - 70 + r * 17, 6, 7, 0);
    }
    g.beginPath(); g.moveTo(cx - 8, cy + 92); g.quadraticCurveTo(cx - 70, cy + 20, cx - 58, cy - 54); g.quadraticCurveTo(cx - 40, cy + 30, cx - 4, cy + 72); g.fill();
    g.beginPath(); g.moveTo(cx + 8, cy + 92); g.quadraticCurveTo(cx + 70, cy + 20, cx + 58, cy - 54); g.quadraticCurveTo(cx + 40, cy + 30, cx + 4, cy + 72); g.fill();
  } else if (kind === 2) { // sun
    circle(cx, cy, 34);
    g.globalCompositeOperation = 'source-over'; circle(cx, cy, 24); g.globalCompositeOperation = 'destination-out';
    circle(cx - 8, cy - 5, 4); circle(cx + 8, cy - 5, 4); g.fillRect(cx - 9, cy + 9, 18, 3);
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; g.save(); g.translate(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62); g.rotate(a + Math.PI / 2); g.beginPath(); g.moveTo(-7, 12); g.lineTo(0, -16); g.lineTo(7, 12); g.fill(); g.restore(); }
  } else if (kind === 3) { // star burst with diamonds
    g.beginPath();
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 2, r = i % 2 ? 30 : 76; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    g.fill();
    g.globalCompositeOperation = 'source-over'; circle(cx, cy, 14); g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 4; i++) { const x = i % 2 ? 60 : W - 60, y = i < 2 ? 76 : 228; g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-10, -10, 20, 20); g.restore(); }
  } else { // bird among leaves
    g.beginPath(); g.moveTo(cx - 70, cy + 10); g.quadraticCurveTo(cx - 20, cy - 70, cx + 10, cy - 10); g.quadraticCurveTo(cx + 40, cy - 60, cx + 72, cy - 30); g.quadraticCurveTo(cx + 30, cy + 10, cx + 20, cy + 30); g.quadraticCurveTo(cx - 20, cy + 50, cx - 70, cy + 10); g.fill();
    g.globalCompositeOperation = 'source-over'; circle(cx + 44, cy - 30, 5); g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 6; i++) ell(cx - 80 + i * 32, cy + 86 + (i % 2) * 8, 14, 6, (i % 2 ? .5 : -.5));
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function initPapel(canvas, { reduce }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2a0f3d, 9, 30);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 80);

  const textures = [0, 1, 2, 3, 4].map(cutFlag);
  const flagGeo = new THREE.PlaneGeometry(1, 1.25, 12, 14);
  flagGeo.translate(0, -0.625, 0); // hang from the top edge

  const uniforms = { uTime: { value: 0 }, uWind: { value: 1 } };
  const makeMat = (tex, color, seed) => new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: false, fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: uniforms.uTime, uWind: uniforms.uWind, uMap: { value: tex }, uColor: { value: new THREE.Color(color) }, uSeed: { value: seed } },
    vertexShader: `
      #include <fog_pars_vertex>
      uniform float uTime, uWind, uSeed; varying vec2 vUv; varying float vShade;
      void main(){
        vUv = uv; vec3 p = position;
        float hang = clamp(-p.y / 1.25, 0., 1.);                // 0 at the string, 1 at the fringe
        vec4 wp = modelMatrix * vec4(p, 1.);
        float ph = uTime * (1.6 + uSeed * .6) + wp.x * .55 + wp.z * .35 + uSeed * 6.2831;
        float sway = sin(ph) * .38 + sin(ph * 2.3 + p.x * 3.) * .12;
        float ripple = sin(uTime * 4.2 + p.x * 5. + p.y * 3. + uSeed * 9.) * .05;
        float z = (sway + ripple) * hang * uWind;
        p.z += z; p.y += abs(z) * .18 * hang;
        vShade = .78 + .22 * cos(ph) * hang * uWind + .1 * (1. - hang);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform sampler2D uMap; uniform vec3 uColor; varying vec2 vUv; varying float vShade;
      void main(){
        float a = texture2D(uMap, vUv).a;
        if (a < .5) discard;
        vec3 col = uColor * vShade * (gl_FrontFacing ? 1. : .72);
        col += uColor * .18 * smoothstep(.2, 1., vUv.y);       // light through the paper near the string
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });

  /* ---------- strings of flags, receding down the street ---------- */
  const rows = [], bulbs = [];
  const ROWS = 9;
  const bulbGeo = new THREE.SphereGeometry(0.06, 10, 8);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe3a3, fog: true });
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,220,150,1)'); gr.addColorStop(.25, 'rgba(255,190,110,.45)'); gr.addColorStop(1, 'rgba(255,160,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true });
  let seed = 0;
  for (let r = 0; r < ROWS; r++) {
    const row = new THREE.Group();
    const z = 2 - r * 3.1, y0 = 3.1 + (r % 2) * 0.35, W = 15, sag = 0.85 + (r % 3) * 0.15;
    const curve = x => y0 - sag * (1 - (2 * x / W) ** 2);
    // the string
    const pts = []; for (let i = 0; i <= 40; i++) { const x = -W / 2 + W * i / 40; pts.push(new THREE.Vector3(x, curve(x) + 0.02, 0)); }
    row.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xf6d9b8, transparent: true, opacity: .55, fog: true })));
    const step = 1.08, off = (r % 2) * 0.5;
    for (let x = -W / 2 + 0.6 + off; x < W / 2 - 0.4; x += step) {
      const k = (seed++ * 7 + r * 3) % COLORS.length;
      const m = new THREE.Mesh(flagGeo, makeMat(textures[(seed + r) % textures.length], COLORS[k], Math.random()));
      m.position.set(x, curve(x), 0);
      m.rotation.z = Math.atan(sag * 8 * x / (W * W)) * 0.9;
      row.add(m);
    }
    // a few warm bulbs between rows
    if (r % 2 === 0) for (let x = -W / 2 + 1; x < W / 2; x += 2.2) {
      const b = new THREE.Mesh(bulbGeo, bulbMat); b.position.set(x + 0.5, curve(x + 0.5) - 0.12, 0.25); row.add(b);
      const s = new THREE.Sprite(glowMat); s.scale.setScalar(0.9); s.position.copy(b.position); row.add(s); bulbs.push(s);
    }
    row.position.z = z; row.userData.z = z;
    scene.add(row); rows.push(row);
  }

  /* ---------- floating petals (marigold) drifting down ---------- */
  const N = innerWidth < 760 ? 120 : 240;
  const pp = new Float32Array(N * 3), ps = new Float32Array(N);
  for (let i = 0; i < N; i++) { pp[i * 3] = (Math.random() - .5) * 16; pp[i * 3 + 1] = Math.random() * 6; pp[i * 3 + 2] = 4 - Math.random() * 26; ps[i] = Math.random(); }
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pgeo.setAttribute('seed', new THREE.BufferAttribute(ps, 1));
  const pmat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: uniforms.uTime, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; uniform float uTime, uPx; varying float vS;
      void main(){ vec3 p = position; p.y = mod(p.y - uTime * (.18 + seed * .2), 6.) - .5; p.x += sin(uTime * .7 + seed * 30.) * .4;
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = (5. + seed * 7.) * uPx * (5. / -mv.z); vS = seed; }`,
    fragmentShader: `varying float vS; void main(){ vec2 q = gl_PointCoord - .5; float d = length(q * vec2(1., 1.8)); if (d > .5) discard;
      vec3 c = mix(vec3(1., .62, .08), vec3(1., .32, .45), step(.7, vS)); gl_FragColor = vec4(c, .9); }`,
  });
  scene.add(new THREE.Points(pgeo, pmat));

  /* ---------- state ---------- */
  const st = { p: 0, mx: 0, my: 0, tx: 0, ty: 0, gust: 0, w: 1, intro: reduce ? 1 : 0 };
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight; st.w = w;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w < 760 ? 70 : 52; camera.updateProjectionMatrix();
  }
  layout(); addEventListener('resize', layout);
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    let lx = 0;
    addEventListener('pointermove', e => {
      st.tx = e.clientX / innerWidth * 2 - 1; st.ty = e.clientY / innerHeight * 2 - 1;
      st.gust = Math.min(1.6, st.gust + Math.abs(e.clientX - lx) * 0.004); lx = e.clientX;
    }, { passive: true });
  }

  const look = new THREE.Vector3();
  function place(t) {
    st.mx += (st.tx - st.mx) * 0.04; st.my += (st.ty - st.my) * 0.04;
    st.gust *= 0.97;
    uniforms.uWind.value = (0.75 + st.gust * 0.6 + st.p * 0.5) * (0.4 + 0.6 * st.intro);
    const travel = st.p * 9 + (1 - st.intro) * -3;
    camera.position.set(st.mx * 0.6, 0.2 + st.my * -0.2 + Math.sin(t * 0.0005) * 0.05, 6.5 - travel);
    look.set(st.mx * 1.2, 2.2 + st.p * 0.4, -6 - travel);
    camera.lookAt(look);
    bulbs.forEach((b, i) => { b.material.opacity = 0.75 + Math.sin(t * 0.003 + i) * 0.08; });
  }

  let visible = true, raf = 0;
  const loop = time => {
    raf = 0;
    if (!visible || document.hidden) return;
    uniforms.uTime.value = reduce ? 2 : time * 0.001;
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
    intro() { if (reduce || !window.gsap) { st.intro = 1; kick(); return; } window.gsap.to(st, { intro: 1, duration: 3, ease: 'expo.out' }); },
  };
}
