// Flattop Flamingo hero: the pink step van, built from code, parked under a Florida sunset.
// Drag to turn it; scroll and it swings round to the serving window while the awning drops open.
import * as THREE from 'three';

const PINK = 0xff5c9e, CREAM = 0xfff3e3, TEAL = 0x1aa5a0, NIGHT = 0x10232b;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export async function initTruck(canvas, { reduce }) {
  try { await Promise.race([document.fonts.load('80px Shrikhand'), new Promise(r => setTimeout(r, 1500))]); } catch { /* fallback font */ }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  /* ---------- light ---------- */
  scene.add(new THREE.HemisphereLight(0xffc3d8, 0x1a4a55, 1.4));
  const sun = new THREE.DirectionalLight(0xffd9b0, 2.6);
  sun.position.set(-6, 9, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  sun.shadow.radius = 4; sun.shadow.bias = -0.0005;
  scene.add(sun);
  const rimL = new THREE.DirectionalLight(0x6fe3ff, 1.2); rimL.position.set(5, 3, -6); scene.add(rimL);

  /* ---------- retro sun + palms behind ---------- */
  const sunMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      void main(){ vec2 p = vUv - .5; float d = length(p); if (d > .5) discard;
        vec3 col = mix(vec3(1., .36, .55), vec3(1., .82, .35), vUv.y);
        float y = vUv.y; float band = step(.42, y) + step(fract((y + uTime * .02) * 14.), mix(.15, .85, smoothstep(.0, .42, y)));
        if (band < .5) discard;
        float edge = smoothstep(.5, .48, d);
        gl_FragColor = vec4(col, edge * .95); }`,
  });
  const sunDisk = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), sunMat);
  sunDisk.position.set(-1.5, 3.6, -16); scene.add(sunDisk);
  const palmTex = canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = '#3a1640'; g.strokeStyle = '#3a1640'; g.lineCap = 'round';
    g.lineWidth = 26; g.beginPath(); g.moveTo(w * .52, h); g.bezierCurveTo(w * .5, h * .7, w * .44, h * .45, w * .5, h * .26); g.stroke();
    const leaf = (a, len) => { g.save(); g.translate(w * .5, h * .26); g.rotate(a); g.beginPath(); g.moveTo(0, 0);
      g.quadraticCurveTo(len * .5, -len * .28, len, len * .22); g.quadraticCurveTo(len * .5, -len * .06, 0, 10); g.fill(); g.restore(); };
    [-2.7, -2.2, -1.6, -.9, -.35, .2, .7, -3.1].forEach((a, i) => leaf(a, 220 + (i % 3) * 30));
  });
  const palmMat = new THREE.MeshBasicMaterial({ map: palmTex, transparent: true, depthWrite: false, opacity: .9 });
  [[-9, -9, 9, .1], [-6.4, -11, 7, -.08], [8.5, -10, 10, -.05]].forEach(([x, z, s, r]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(s * .5, s), palmMat); p.position.set(x, s * .5 - .2, z); p.rotation.z = r; scene.add(p); });

  /* ---------- the truck ---------- */
  const truck = new THREE.Group(); scene.add(truck);
  const body = new THREE.Group(); truck.add(body);
  const prof = new THREE.Shape(), r = .28;
  prof.moveTo(-2.6 + r, .45); prof.lineTo(2.62 - r, .45); prof.quadraticCurveTo(2.62, .45, 2.62, .45 + r);
  prof.lineTo(2.62, 1.42); prof.quadraticCurveTo(2.62, 1.64, 2.38, 1.67); prof.lineTo(1.96, 1.72);
  prof.lineTo(1.56, 2.6); prof.quadraticCurveTo(1.48, 2.8, 1.24, 2.8); prof.lineTo(-2.6 + r, 2.8);
  prof.quadraticCurveTo(-2.6, 2.8, -2.6, 2.8 - r); prof.lineTo(-2.6, .45 + r); prof.quadraticCurveTo(-2.6, .45, -2.6 + r, .45);
  const shellGeo = new THREE.ExtrudeGeometry(prof, { depth: 2, bevelEnabled: true, bevelThickness: .09, bevelSize: .09, bevelSegments: 5, curveSegments: 10 });
  shellGeo.translate(0, 0, -1);
  const paint = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .38, metalness: .05 });
  paint.onBeforeCompile = sh => {
    sh.uniforms.cA = { value: new THREE.Color(PINK) }; sh.uniforms.cB = { value: new THREE.Color(CREAM) }; sh.uniforms.cC = { value: new THREE.Color(TEAL) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvY = position.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vY; uniform vec3 cA, cB, cC;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `float aa = .012;
        vec3 base = mix(cA, cC, smoothstep(1.16 - aa, 1.16 + aa, vY));
        base = mix(base, cB, smoothstep(1.3 - aa, 1.3 + aa, vY));
        vec4 diffuseColor = vec4(base, opacity);`);
  };
  const shell = new THREE.Mesh(shellGeo, paint); shell.castShadow = true; shell.receiveShadow = true; body.add(shell);

  const dark = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: .6 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x3f7f8f, roughness: .15, metalness: .1, emissive: 0x16333d, emissiveIntensity: .6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe9eef2, roughness: .22, metalness: .9 });
  const creamMat = new THREE.MeshStandardMaterial({ color: CREAM, roughness: .5 });
  const SIDE = 1.09; // outer face of the side panels

  // windshield on the sloped front
  const n = new THREE.Vector3(.9, .4, 0).normalize();
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.75, .82), glass);
  ws.position.set(1.76, 2.16, 0).addScaledVector(n, .1); ws.lookAt(ws.position.clone().add(n)); body.add(ws);
  // cab side windows, both sides
  [1, -1].forEach(s => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(.62, .62), glass);
    w.position.set(1.08, 2.18, s * (SIDE + .002)); if (s < 0) w.rotation.y = Math.PI; body.add(w);
  });
  // grille, bumper and headlights
  const grille = new THREE.Mesh(new THREE.BoxGeometry(.04, .42, 1.1), dark); grille.position.set(2.72, 1.0, 0); body.add(grille);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(.22, .2, 2.3), chrome); bumper.position.set(2.72, .52, 0); bumper.castShadow = true; body.add(bumper);
  const rear = bumper.clone(); rear.position.x = -2.7; body.add(rear);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff6d5, emissive: 0xfff0b0, emissiveIntensity: 1.4 });
  [-.72, .72].forEach(z => { const l = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .06, 24), lampMat); l.rotation.z = Math.PI / 2; l.position.set(2.72, 1.08, z); body.add(l);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.18, .03, 8, 24), chrome); ring.rotation.y = Math.PI / 2; ring.position.set(2.74, 1.08, z); body.add(ring); });

  // serving window: warm interior, frame, counter, bottles
  const interior = canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffcf7a'); gr.addColorStop(1, '#ff7a45'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(80,20,30,.35)'; for (let i = 0; i < 3; i++) g.fillRect(0, 70 + i * 60, w, 6);
    g.fillStyle = '#fff6dc'; [90, 250, 410].forEach(x => { g.beginPath(); g.arc(x, 26, 14, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(60,15,30,.55)'; g.beginPath(); g.ellipse(170, 230, 70, 120, 0, 0, 7); g.fill(); g.beginPath(); g.arc(170, 96, 34, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(320, 150, 150, 80);
  });
  const winMat = new THREE.MeshBasicMaterial({ map: interior, toneMapped: false });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.0), winMat); win.position.set(-.62, 1.86, SIDE + .003); body.add(win);
  const frameBar = (w, h, x, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, .06), chrome); b.position.set(x, y, SIDE + .02); body.add(b); };
  frameBar(2.42, .06, -.62, 2.38); frameBar(2.42, .06, -.62, 1.34); frameBar(.06, 1.06, -1.81, 1.86); frameBar(.06, 1.06, .57, 1.86);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.6, .07, .42), creamMat); counter.position.set(-.62, 1.31, SIDE + .2); counter.castShadow = true; body.add(counter);
  [[-1.4, 0xe03a2f], [-1.25, 0xffc93c], [-.1, 0xe03a2f]].forEach(([x, c]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(.045, .055, .26, 12), new THREE.MeshStandardMaterial({ color: c, roughness: .35 })); b.position.set(x, 1.48, SIDE + .22); b.castShadow = true; body.add(b); });
  const nap = new THREE.Mesh(new THREE.BoxGeometry(.2, .16, .12), chrome); nap.position.set(.25, 1.42, SIDE + .22); body.add(nap);
  const winLight = new THREE.PointLight(0xffa860, 0, 4, 1.6); winLight.position.set(-.6, 1.9, SIDE + .8); body.add(winLight);

  // striped awning with a scalloped edge, hinged above the window
  const awnTex = canvasTex(512, 220, (g, w, h) => {
    const n = 8, sw = w / n;
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#fff3e3' : '#ff5c9e'; g.fillRect(i * sw, 0, sw, h - 34); g.beginPath(); g.arc(i * sw + sw / 2, h - 34, sw / 2, 0, Math.PI); g.fill(); }
  });
  const hinge = new THREE.Group(); hinge.position.set(-.62, 2.44, SIDE + .04); body.add(hinge);
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.0), new THREE.MeshStandardMaterial({ map: awnTex, transparent: true, alphaTest: .5, side: THREE.DoubleSide, roughness: .7 }));
  awning.position.y = -.5; awning.castShadow = true; hinge.add(awning);

  // painted lettering on the lower panel
  const decal = canvasTex(1024, 160, (g, w, h) => {
    g.fillStyle = '#fff3e3'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 80; g.font = `900 ${fs}px Archivo, Arial Black, sans-serif`; const tw = g.measureText('SMASH BURGERS · SHAKES').width; if (tw > w * .9) { fs = Math.floor(fs * w * .9 / tw); g.font = `900 ${fs}px Archivo, Arial Black, sans-serif`; }
    g.fillText('SMASH BURGERS · SHAKES', w / 2, h / 2 + 4);
  });
  const dec = new THREE.Mesh(new THREE.PlaneGeometry(2.1, .33), new THREE.MeshBasicMaterial({ map: decal, transparent: true, depthWrite: false }));
  dec.position.set(.03, .8, SIDE + .004); body.add(dec);

  // roof sign
  const signTex = canvasTex(1024, 320, (g, w, h) => {
    g.fillStyle = '#10232b'; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 60); g.fill();
    g.lineWidth = 10; g.strokeStyle = '#ffc93c'; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '140px Shrikhand, Georgia, serif';
    g.shadowColor = '#ff5c9e'; g.shadowBlur = 40; g.fillStyle = '#ff9cc6'; g.fillText('Flattop', w / 2, h * .36);
    g.shadowBlur = 20; g.fillStyle = '#ffe1ee'; g.fillText('Flattop', w / 2, h * .36);
    g.font = '900 64px Archivo, Arial Black, sans-serif'; g.shadowColor = '#ffc93c'; g.shadowBlur = 24; g.fillStyle = '#ffd770';
    g.fillText('F L A M I N G O', w / 2, h * .76);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.03), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  sign.position.set(-.6, 3.5, .1); body.add(sign);
  [-1.9, .7].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .55, 8), chrome); p.position.set(x, 3.02, .1); body.add(p); });
  const signGlow = new THREE.PointLight(0xff5c9e, 6, 5, 1.8); signGlow.position.set(-.6, 3.3, .9); body.add(signGlow);
  // roof vent
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .32, 16), chrome); vent.position.set(-2.0, 3.0, -.5); body.add(vent);

  // wheels and arches
  const tire = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: .85 });
  const wheels = [];
  [[-1.65, 1], [1.7, 1], [-1.65, -1], [1.7, -1]].forEach(([x, s]) => {
    const w = new THREE.Group(); w.position.set(x, .45, s * .92);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .34, 32), tire); t.rotation.x = Math.PI / 2; t.castShadow = true; w.add(t);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .36, 24), creamMat); hub.rotation.x = Math.PI / 2; w.add(hub);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 8), chrome); cap.position.z = s * .19; w.add(cap);
    truck.add(w); wheels.push(w);
    const arch = new THREE.Mesh(new THREE.CircleGeometry(.56, 32, 0, Math.PI), dark); arch.position.set(x, .45, s * (SIDE + .001)); if (s < 0) arch.rotation.y = Math.PI; body.add(arch);
  });

  // ground: soft contact shadow + real shadow
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .28 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.6), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(256, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(16,35,43,.55)'); gr.addColorStop(1, 'rgba(16,35,43,0)');
    g.setTransform(1, 0, 0, .5, 0, h / 4); g.fillStyle = gr; g.fillRect(0, 0, w, h * 2); }) }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = .005; truck.add(blob);

  // steam from the vent
  const puffTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const puffs = Array.from({ length: 14 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false })); s.userData.o = i / 14; body.add(s); return s; });

  /* ---------- state ---------- */
  const st = { p: 0, drag: 0, dragT: 0, mx: 0, tx: 0, intro: reduce ? 1 : 0, w: 1, h: 1, phone: false };
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight; Object.assign(st, { w, h, phone: w < 760 });
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = st.phone ? 46 : 32; camera.updateProjectionMatrix();
  }
  layout(); addEventListener('resize', layout);
  if (!reduce && matchMedia('(pointer: fine)').matches) addEventListener('pointermove', e => { st.tx = e.clientX / innerWidth * 2 - 1; }, { passive: true });
  // drag to turn (horizontal only, so phones can still scroll the page)
  let dx = null;
  canvas.addEventListener('pointerdown', e => { dx = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-drag'); });
  canvas.addEventListener('pointermove', e => { if (dx === null) return; st.dragT += (e.clientX - dx) * 0.008; dx = e.clientX; });
  const up = () => { dx = null; canvas.classList.remove('is-drag'); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

  const look = new THREE.Vector3();
  function place(t) {
    const p = st.p, e = p * p * (3 - 2 * p);
    st.mx += (st.tx - st.mx) * .05; st.drag += (st.dragT - st.drag) * .08;
    if (dx === null) st.dragT *= .985; // eases back to its pose
    const idle = reduce ? 0 : Math.sin(t * .00035) * .16;
    truck.rotation.y = (-.62 + idle) * (1 - e) + st.drag + st.mx * .12 * (1 - e) + e * .02;
    truck.position.y = (1 - st.intro) * -.4;
    body.position.y = reduce ? 0 : Math.sin(t * .006) * .006 + Math.max(0, Math.sin(t * .0021)) * .01;
    hinge.rotation.x = -(.18 + 1.05 * Math.max(st.intro * .55, e));
    winLight.intensity = 3 + e * 5;
    const dist = (st.phone ? 13.8 : 11.2) - e * (st.phone ? 5 : 4.2);
    camera.position.set(Math.sin(.32 * (1 - e)) * dist, (st.phone ? 3.4 : 2.9) - e * .9, Math.cos(.32 * (1 - e)) * dist);
    look.set(-.4 * e, 1.75 + (st.phone ? -2.1 : 0) * (1 - e), 0);
    camera.lookAt(look);
    // desktop: frame the truck on the right of the headline; phone: high in the frame
    const sx = st.phone ? 0 : -st.w * .2 * (1 - e), sy = st.phone ? st.h * .0 : 0;
    camera.setViewOffset(st.w, st.h, sx, sy, st.w, st.h);
    puffs.forEach(s => { const k = ((t * .00028 + s.userData.o) % 1); s.position.set(-2.0 + k * .5, 3.2 + k * 1.6, -.5 + Math.sin(k * 6 + s.userData.o * 20) * .12); s.scale.setScalar(.2 + k * .9); s.material.opacity = (1 - k) * .55 * (reduce ? 0 : 1); });
    sunMat.uniforms.uTime.value = t * .001;
  }

  let visible = true, raf = 0;
  const loop = time => {
    raf = 0;
    if (!visible || document.hidden) return;
    place(time); renderer.render(scene, camera);
    if (!reduce || dx !== null || Math.abs(st.dragT - st.drag) > .001) raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  canvas.addEventListener('pointerdown', kick);
  kick();
  return {
    setScroll(v) { st.p = Math.max(0, Math.min(1, v)); kick(); },
    intro() { if (reduce || !window.gsap) { st.intro = 1; kick(); return; } window.gsap.to(st, { intro: 1, duration: 1.8, ease: 'elastic.out(1, .6)' }); },
    turn(d) { st.dragT += d; kick(); },
  };
}
