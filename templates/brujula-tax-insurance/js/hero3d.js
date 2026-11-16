// Brújula hero: a loose stack of tax forms and a glass shield with a brass compass inside it.
// Calm studio light, soft shadows. setProgress(0..1) fans the papers out and turns the shield.
import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- paper textures: generic forms drawn on canvas ---------- */
const FORMS = [
  { code: 'W-2', title: 'Wage and Tax Statement', year: '2026', boxes: 'grid' },
  { code: '1099-NEC', title: 'Nonemployee Compensation', year: '2026', boxes: 'pairs' },
  { code: 'SCH C', title: 'Profit or Loss From Business', year: '2026', boxes: 'lines' },
  { code: '1095-A', title: 'Health Insurance Marketplace Statement', year: '2026', boxes: 'table' },
  { code: 'DEC', title: 'Homeowners Policy · Declarations', year: '2027', boxes: 'policy' },
  { code: '1040', title: 'Individual Income Tax Return', year: '2026', boxes: 'lines' },
  { code: 'W-7', title: 'Application for ITIN', year: '2026', boxes: 'pairs' },
];
function formTexture(f, i, aniso) {
  const W = 680, H = 880, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const paper = ['#fbf9f4', '#f7f4ec', '#fdfcf8', '#f4f1e8'][i % 4];
  x.fillStyle = paper; x.fillRect(0, 0, W, H);
  // paper fibre
  for (let k = 0; k < 2600; k++) { x.fillStyle = `rgba(120,110,90,${Math.random() * .035})`; x.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1); }
  const ink = '#1d3a36', soft = 'rgba(36,67,63,.42)', red = '#9c3b2b';
  x.strokeStyle = ink; x.fillStyle = ink; x.lineWidth = 2;
  // header
  x.font = '700 54px Georgia, serif'; x.fillText(f.code, 44, 92);
  x.font = '500 21px Arial, sans-serif'; x.fillText(f.title, 44, 128);
  x.font = '600 26px Arial, sans-serif'; x.textAlign = 'right'; x.fillText(f.year, W - 44, 92); x.textAlign = 'left';
  x.lineWidth = 3; x.beginPath(); x.moveTo(44, 150); x.lineTo(W - 44, 150); x.stroke();
  x.lineWidth = 1.4; x.strokeStyle = soft;
  const label = (t, lx, ly) => { x.fillStyle = 'rgba(36,67,63,.82)'; x.font = '600 15px Arial, sans-serif'; x.fillText(t, lx, ly); };
  const field = (fx, fy, fw, fh) => { x.strokeRect(fx, fy, fw, fh); };
  let y = 180;
  if (f.boxes === 'grid') {
    for (let r = 0; r < 6; r++) for (let col = 0; col < 2; col++) {
      const bx = 44 + col * 300, by = y + r * 98; field(bx, by, 290, 88); label(`${r * 2 + col + 1}  ${['Wages, tips', 'Federal tax withheld', 'Social security wages', 'SS tax withheld', 'Medicare wages', 'Medicare withheld', 'Allocated tips', 'Dependent care', 'Box 12a', 'Box 12b', 'State wages', 'State'][r * 2 + col]}`, bx + 10, by + 22);
      x.fillStyle = ink; x.font = '600 26px "Courier New", monospace'; if ((r + col + i) % 3) x.fillText(['48,215.00', '5,120.40', '48,215.00', '2,989.33', '48,215.00', '699.12'][r % 6], bx + 18, by + 66);
    }
  } else if (f.boxes === 'pairs') {
    for (let r = 0; r < 9; r++) { field(44, y + r * 68, 380, 58); field(436, y + r * 68, 200, 58); label(['Payer name', 'Payer TIN', 'Recipient', 'Street address', 'City, state, ZIP', 'Account number', 'Compensation', 'Withholding', 'State income'][r], 54, y + r * 68 + 20); }
    x.fillStyle = ink; x.font = '600 24px "Courier New", monospace'; x.fillText('$ 31,860.00', 452, y + 6 * 68 + 42);
  } else if (f.boxes === 'table') {
    field(44, y, W - 88, 600);
    for (let r = 1; r < 13; r++) { x.beginPath(); x.moveTo(44, y + r * 46); x.lineTo(W - 44, y + r * 46); x.stroke(); }
    [210, 360, 500].forEach(cx => { x.beginPath(); x.moveTo(cx, y); x.lineTo(cx, y + 600); x.stroke(); });
    ['Month', 'Premium', 'SLCSP', 'Advance PTC'].forEach((t, k) => label(t, [56, 222, 372, 512][k], y + 28));
    x.fillStyle = ink; x.font = '20px "Courier New", monospace';
    for (let r = 1; r < 13; r++) { x.fillText(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][r - 1], 58, y + r * 46 + 31); x.fillText('612.40', 228, y + r * 46 + 31); x.fillText('588.10', 376, y + r * 46 + 31); x.fillText('541.00', 516, y + r * 46 + 31); }
  } else if (f.boxes === 'policy') {
    label('Named insured', 44, y + 10); x.fillStyle = ink; x.font = '22px Arial'; x.fillText('Policy period  01/12/2027 – 01/12/2028', 44, y + 44);
    field(44, y + 70, W - 88, 330);
    ['A  Dwelling', 'B  Other structures', 'C  Personal property', 'D  Loss of use', 'E  Personal liability', 'F  Medical payments', 'Hurricane deductible', 'All other perils'].forEach((t, k) => {
      label(t, 60, y + 108 + k * 38); x.fillStyle = ink; x.font = '600 20px "Courier New", monospace'; x.textAlign = 'right'; x.fillText(['$ 342,000', '$ 6,840', '$ 171,000', '$ 34,200', '$ 300,000', '$ 5,000', '2%', '$ 1,000'][k], W - 64, y + 110 + k * 38); x.textAlign = 'left';
    });
    x.save(); x.translate(470, 700); x.rotate(-.18); x.strokeStyle = red; x.lineWidth = 4; x.strokeRect(-110, -40, 220, 80); x.fillStyle = red; x.font = '700 30px Arial'; x.textAlign = 'center'; x.fillText('BOUND', 0, 11); x.restore();
  } else {
    for (let r = 0; r < 15; r++) {
      const ly = y + r * 42; x.strokeStyle = soft; x.beginPath(); x.moveTo(44, ly + 34); x.lineTo(W - 200, ly + 34); x.stroke(); field(W - 184, ly + 6, 140, 32);
      label(`${r + 1}`, 44, ly + 26); x.fillStyle = 'rgba(36,67,63,.55)'; x.fillRect(74, ly + 16, 120 + ((r * 97 + i * 31) % 200), 7);
      if ((r + i) % 4 === 1) { x.fillStyle = ink; x.font = '600 19px "Courier New", monospace'; x.fillText(['12,480', '3,915', '880', '26,300', '1,204'][r % 5], W - 172, ly + 30); }
    }
  }
  // signature line + a pencil tick
  x.strokeStyle = ink; x.lineWidth = 1.2; x.beginPath(); x.moveTo(44, H - 70); x.lineTo(380, H - 70); x.stroke();
  label('Sign here', 44, H - 46);
  x.strokeStyle = '#2d4f8a'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(70, H - 82);
  for (let k = 0; k < 18; k++) x.quadraticCurveTo(90 + k * 14, H - 96 - (k % 2) * 18, 100 + k * 14, H - 80 - (k % 3) * 4); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}

/* ---------- a small studio for reflections (soft boxes around the set) ---------- */
function studioEnv(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0xf3efe7);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const room = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0xeee8dc, side: THREE.BackSide }));
  room.scale.set(30, 16, 30); s.add(room);
  const light = (c, i, p, sc) => { const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i) })); m.position.set(...p); m.scale.set(...sc); s.add(m); };
  light(0xfff3e0, 9, [-8, 6, 6], [6, .2, 6]);     // warm key softbox
  light(0xffffff, 6, [9, 3, 2], [.2, 9, 3]);
  light(0xffffff, 5, [-9, 2, -2], [.2, 9, 2]);    // second strip for the glass edge       // side strip
  light(0xdfe9ff, 2.2, [0, 7.9, -6], [14, .2, 4]); // cool top
  light(0xfff0d8, 1.5, [0, -3, 10], [10, 2, .2]);  // bounce from the desk
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(s, .04).texture; pm.dispose(); return env;
}

/* ---------- the glass shield ---------- */
function shieldShape(w = 1.6, h = 2.0) {
  const s = new THREE.Shape();
  s.moveTo(-w, h * .62);
  s.quadraticCurveTo(-w * .5, h * .78, 0, h * .9);
  s.quadraticCurveTo(w * .5, h * .78, w, h * .62);
  s.lineTo(w, h * .05);
  s.bezierCurveTo(w, -h * .55, w * .45, -h * .85, 0, -h * 1.05);
  s.bezierCurveTo(-w * .45, -h * .85, -w, -h * .55, -w, h * .05);
  s.closePath();
  return s;
}
function roseShape(R = .92, r = .17, n = 8) {
  const s = new THREE.Shape();
  for (let k = 0; k <= n * 2; k++) {
    const a = Math.PI / 2 + k * Math.PI / n, rad = k % 2 ? r : (k % 4 === 0 ? R : R * .62);
    const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
    k ? s.lineTo(px, py) : s.moveTo(px, py);
  }
  return s;
}

export async function initHero(canvas, { reduce = false, isPhone = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isPhone ? 1.75 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .94;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const BG = new THREE.Color(0xe8e0d0);
  scene.background = BG;
  scene.environment = studioEnv(renderer);
  scene.fog = new THREE.Fog(BG, 16, 30);

  const camera = new THREE.PerspectiveCamera(30, 1, .1, 80);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  /* light */
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0xcfc4ae, .5));
  const key = new THREE.DirectionalLight(0xfff1dc, 1.55);
  key.position.set(-5, 9, 6); key.castShadow = true;
  key.shadow.mapSize.set(isPhone ? 1024 : 2048, isPhone ? 1024 : 2048);
  key.shadow.camera.left = -7; key.shadow.camera.right = 7; key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
  key.shadow.radius = 14; key.shadow.blurSamples = 24; key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd8e6ff, .9); rim.position.set(6, 3, -5); scene.add(rim);

  /* shadow catcher: the "desk" is the page colour itself */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: 0x4a3f2c, opacity: .16 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.15; floor.receiveShadow = true; scene.add(floor);

  const rig = new THREE.Group(); scene.add(rig);

  /* papers */
  const PW = 2.55, PH = 3.3, SX = isPhone ? 12 : 18, SY = isPhone ? 16 : 24;
  const sheets = [];
  const stack = new THREE.Group(); rig.add(stack);
  FORMS.forEach((f, i) => {
    const g = new THREE.PlaneGeometry(PW, PH, SX, SY);
    const base = g.attributes.position.array.slice();
    const m = new THREE.MeshStandardMaterial({ map: formTexture(f, i, aniso), color: 0xfffdf8, roughness: .9, metalness: 0, side: THREE.DoubleSide, envMapIntensity: .45 });
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true;
    const pivot = new THREE.Group(); pivot.add(mesh);
    mesh.position.set(PW * .5, PH * .5, 0);             // pivot sits at the sheet's lower left corner
    const seed = Math.sin(i * 91.7) * .5 + .5;
    pivot.userData = { i, seed, base, g,
      rest: { x: -1.6 + i * .14 + (seed - .5) * .3, y: -1.75 + i * .05 + (seed - .5) * .25, z: .045 * i, rz: (seed - .5) * .5 + (i % 2 ? .1 : -.08) } };
    stack.add(pivot); sheets.push(pivot);
  });
  stack.rotation.set(-.8, 0, .28);
  stack.position.set(-.35, -.55, -.4);

  /* shield */
  const shieldGroup = new THREE.Group(); rig.add(shieldGroup);
  const sGeo = new THREE.ExtrudeGeometry(shieldShape(), { depth: .22, bevelEnabled: true, bevelThickness: .16, bevelSize: .12, bevelSegments: isPhone ? 5 : 9, curveSegments: isPhone ? 24 : 48 });
  sGeo.center();
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: .03, transmission: 1, thickness: .9, ior: 1.42,
    attenuationColor: new THREE.Color(0xcfe7df), attenuationDistance: 7, clearcoat: 1, clearcoatRoughness: .06,
    specularIntensity: 1, envMapIntensity: 1.8, dispersion: .35,
  });
  const shield = new THREE.Mesh(sGeo, glass); shield.castShadow = true; shieldGroup.add(shield);
  // brass compass suspended inside the glass
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89a4a, metalness: 1, roughness: .28, envMapIntensity: 1.3 });
  const brassDark = new THREE.MeshStandardMaterial({ color: 0x8c6a33, metalness: 1, roughness: .38 });
  const compass = new THREE.Group(); compass.position.y = .08; shieldGroup.add(compass);
  const rose = new THREE.Mesh(new THREE.ExtrudeGeometry(roseShape(), { depth: .03, bevelEnabled: true, bevelThickness: .02, bevelSize: .015, bevelSegments: 2 }), brass);
  rose.geometry.center(); compass.add(rose);
  const rose2 = new THREE.Mesh(new THREE.ExtrudeGeometry(roseShape(.5, .1, 4), { depth: .05, bevelEnabled: false }), brassDark);
  rose2.geometry.center(); rose2.rotation.z = Math.PI / 4; compass.add(rose2);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.06, .028, 12, 120), brass); compass.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(.98, .01, 8, 120), brassDark); compass.add(ring2);
  for (let k = 0; k < 32; k++) {   // ticks
    const t = new THREE.Mesh(new THREE.BoxGeometry(.012, k % 8 === 0 ? .12 : .06, .02), brassDark);
    const a = k / 32 * Math.PI * 2; t.position.set(Math.cos(a) * .9, Math.sin(a) * .9, 0); t.rotation.z = a - Math.PI / 2; compass.add(t);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .1, 24), brass); hub.rotation.x = Math.PI / 2; compass.add(hub);
  shieldGroup.scale.setScalar(.66);

  /* a few drifting dust motes in the light */
  const motes = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 140 * 3 }, (_, k) => (Math.random() - .5) * (k % 3 === 1 ? 7 : 12)), 3)),
    new THREE.PointsMaterial({ color: 0xb08a4a, size: .025, transparent: true, opacity: .5, depthWrite: false }));
  if (!isPhone) rig.add(motes);

  /* layout */
  let W = 1, H = 1, layout = {};
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setSize(W, H, false); camera.aspect = W / H;
    const narrow = W / H < 1.05;
    if (narrow) { layout = { cam: [0, .9, 14], look: [0, -.2, 0], rig: [.05, 1.55, 0], scale: .9, fan: 0 }; camera.fov = 34; }
    else { layout = { cam: [0, 1.1, 13], look: [0, -.25, 0], rig: [W / H > 1.9 ? 2.9 : 2.5, .15, 0], scale: 1, fan: 1 }; camera.fov = 30; }
    camera.updateProjectionMatrix();
    rig.position.set(...layout.rig); rig.scale.setScalar(layout.scale);
  }
  resize(); addEventListener('resize', resize);

  /* pointer parallax */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduce) addEventListener('pointermove', e => { ptr.tx = e.clientX / innerWidth - .5; ptr.ty = e.clientY / innerHeight - .5; }, { passive: true });

  let progress = 0, shown = 0;
  const tmp = new THREE.Vector3();
  function bend(p, t) {
    const { i, seed, base, g } = p.userData;
    const pos = g.attributes.position.array;
    const amp = reduce ? .5 : 1;
    const lift = .16 + seed * .14 + progress * .35;        // the free corner curls up a little
    const wave = Math.sin(t * .9 + i * 1.3) * .045 * amp;
    for (let k = 0; k < pos.length; k += 3) {
      const x = base[k] / PW + .5, y = base[k + 1] / PH + .5;   // 0..1 across the sheet
      const curl = Math.pow(Math.max(0, x * .7 + y * .3 - .35), 2.2) * lift;
      const sag = Math.sin(x * Math.PI) * .03 + Math.sin(y * Math.PI * 1.2 + t * .7 + i) * wave * x;
      pos[k + 2] = curl + sag;
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals();
  }

  function frame(time) {
    const t = reduce ? 1.2 : time / 1000;
    shown = Math.min(1, shown + (reduce ? 1 : .018));
    const intro = ease(shown);
    ptr.x += (ptr.tx - ptr.x) * .05; ptr.y += (ptr.ty - ptr.y) * .05;
    const p = ease(progress);

    camera.position.set(layout.cam[0] + ptr.x * .9, layout.cam[1] - ptr.y * .6 + p * .6, layout.cam[2] - p * .3);
    camera.lookAt(tmp.set(...layout.look));

    // papers: a neat stack that fans open like a hand of cards as you scroll
    const n = sheets.length;
    sheets.forEach((s, k) => {
      const r = s.userData.rest, c = k - (n - 1) / 2;
      const bob = reduce ? 0 : Math.sin(t * .8 + k * .6) * .03;
      s.position.set(r.x + c * (layout.fan ? .27 : .2) * p - .7 * p * layout.fan, r.y * (1 - .1 * p) + bob + (1 - intro) * (1.2 + k * .25), r.z + Math.abs(c) * .06 * p + k * .14 * p);
      s.rotation.z = r.rz * (1 - p) + c * -.13 * p;
      s.rotation.x = -.06 * p;
      bend(s, t);
    });
    stack.rotation.x = -.8 + p * .5;
    stack.rotation.z = .28 - p * .2;
    stack.position.y = -.55 + (reduce ? 0 : Math.sin(t * .6) * .05);

    // shield floats in front, turns through a full revolution with the scroll
    shieldGroup.position.set(.45 - p * .35, .55 + (reduce ? 0 : Math.sin(t * .9) * .12) + (1 - intro) * -.8, 1.35 + p * .2);
    shieldGroup.rotation.set(.08 + ptr.y * .12, -.42 + p * Math.PI * 2 + ptr.x * .35 + (reduce ? 0 : Math.sin(t * .5) * .06), -.06);
    compass.rotation.z = reduce ? .2 : Math.sin(t * .7) * .25 + p * 1.2;     // the needle settles, never quite still
    glass.opacity = intro;
    motes.rotation.y = t * .02;

    renderer.render(scene, camera);
  }

  let raf = 0, visible = true;
  const loop = time => { frame(time); raf = visible && !reduce ? requestAnimationFrame(loop) : 0; };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf && !reduce) raf = requestAnimationFrame(loop); }, { threshold: 0 }).observe(canvas);
  if (reduce) { frame(0); addEventListener('resize', () => frame(0)); }
  else raf = requestAnimationFrame(loop);

  return {
    setProgress(v) { progress = clamp(v); if (reduce) frame(0); },
  };
}
