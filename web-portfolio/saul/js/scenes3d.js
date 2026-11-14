// Every small 3D render on the page (Experience, Projects and Contact)
// is drawn by ONE fixed WebGL canvas with a viewport per slot, so phones never run out of WebGL contexts.
// Slots are elements with data-scene="<key>". Same look as the big map: graphite solids,
// hairline edges, one amber accent. Motion: pieces turn with the page scroll and lean toward the pointer;
// the full city map is only in the hero (map3d.js), never in these renders.
import * as THREE from '../assets/vendor/three.module.min.js';
import { fmt, onLang } from './i18n.js';

const BASE = 0x34363a, ACCENT = 0xe2a54a, EDGE = 0xecebe6, DARK = 0x1d1e21;
const cBase = new THREE.Color(BASE), cAcc = new THREE.Color(ACCENT), cNone = new THREE.Color(DARK);
const ramp = k => cBase.clone().lerp(cAcc, Math.max(0, Math.min(1, k)));

const mat = (c = BASE, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .75, metalness: .05, ...o });
const amber = () => mat(ACCENT, { emissive: ACCENT, emissiveIntensity: .25, roughness: .5 });
function edged(geo, m, op = .3) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: op })));
  return mesh;
}
const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = k => 1 - Math.pow(1 - clamp01(k), 3);
// deterministic random, so the page looks the same on every visit
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function terrain(size = 2.6, seg = 26) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, .13 * Math.sin(x * 2.1) * Math.cos(z * 1.7) + .06 * Math.sin(x * 4.7 + z * 3.1));
  }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mat(BASE, { flatShading: true })));
  g.add(new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: .1 })));
  return g;
}
function browser(accent = true, w = 1.5, hgt = 1) {
  const g = new THREE.Group();
  g.add(edged(new THREE.BoxGeometry(w, hgt, .04), mat(0x3d3f44), .4));
  const bar = new THREE.Mesh(new THREE.BoxGeometry(w, .13, .05), mat(0x24262a)); bar.position.y = hgt / 2 - .065; g.add(bar);
  const head = new THREE.Mesh(new THREE.BoxGeometry(w * .55, .1, .06), mat(EDGE, { roughness: .9 })); head.position.set(-w * .17, hgt * .18, .01); g.add(head);
  [-.02, -.14].forEach(y => { const l = new THREE.Mesh(new THREE.BoxGeometry(w * .7, .04, .06), mat(0x6a6c70)); l.position.set(-w * .1, y * hgt / .9, .01); g.add(l); });
  if (accent) { const b = new THREE.Mesh(new THREE.BoxGeometry(w * .25, .12, .08), amber()); b.position.set(-w * .3, -hgt * .34, .02); g.add(b); }
  return g;
}

/* ---------- default motion for card renders ---------- */
function turn(it, c) { it.g.rotation.set(it.rx + c.py * .18, it.ry + c.prog * -1.1 + c.px * .45, 0); }


/* =================== Experience =================== */
// CentroGeo: the layer catalog (GeoNode). Three abstract layers on one grid: base grid, a point layer,
// and a tile layer of values on top; the layers part on hover. Deliberately not the city outline,
// which the page shows only in the hero.
function exCentrogeo() {
  const g = new THREE.Group(), R = rng(138);
  const plate = edged(new THREE.BoxGeometry(2.3, .03, 2.3), mat(BASE, { transparent: true, opacity: .6 }), .35);
  const grid = new THREE.GridHelper(2.3, 12, EDGE, EDGE); grid.material.transparent = true; grid.material.opacity = .16; grid.position.y = .02; plate.add(grid);
  const dots = new THREE.Group();
  const sheet = edged(new THREE.BoxGeometry(2.3, .015, 2.3), mat(0x2a2c30, { transparent: true, opacity: .45 }), .25); dots.add(sheet);
  const dg = new THREE.SphereGeometry(.035, 10, 8);
  for (let n = 0; n < 34; n++) { const d = new THREE.Mesh(dg, n % 7 === 0 ? amber() : mat(EDGE, { roughness: .9 })); d.position.set((R() - .5) * 2, .04, (R() - .5) * 2); dots.add(d); }
  const tiles = new THREE.Group();
  for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) {
    const v = R(), h = .04 + v * .32;
    const t = edged(new THREE.BoxGeometry(.4, h, .4), v > .82 ? amber() : mat(), .3);
    t.position.set(-.92 + x * .46, h / 2, -.92 + z * .46); tiles.add(t);
  }
  const layers = [plate, dots, tiles]; layers.forEach(l => g.add(l));
  return { g, rx: .62, update(it, c) { const s = .3 + c.hv * .22; layers.forEach((l, i) => (l.position.y = (i - 1) * s - .1)); turn(it, c); } };
}
// INECC: environment and climate institute; its portals float over a landscape.
function exInecc() {
  const g = new THREE.Group();
  const t = terrain(2.6); t.position.y = -.45; g.add(t);
  const w = browser(true, 1.5, .95); w.position.set(0, .45, .1); g.add(w);
  const w2 = browser(false, 1.1, .7); w2.position.set(-.55, .25, -.45); g.add(w2);
  return { g, rx: .38, update(it, c) { w.position.y = .45 + c.hv * .14; w2.position.y = .25 + c.hv * .08; turn(it, c); } };
}
// Keywords Studios: a grid of test cases; one is flagged and lifts.
function exKeywords() {
  const g = new THREE.Group(); const geo = new THREE.BoxGeometry(.4, .08, .4); let flag;
  for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) {
    const bad = x === 2 && z === 1;
    const t = edged(geo, bad ? amber() : mat(), .35); t.position.set((x - 1.5) * .48, 0, (z - 1.5) * .48); g.add(t);
    if (bad) flag = t;
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.3, .018, 10, 48), amber()); ring.rotation.x = Math.PI / 2; g.add(ring);
  return { g, rx: .7, update(it, c) { flag.position.y = .18 + c.hv * .2; ring.position.set(flag.position.x, flag.position.y + .14 + c.hv * .06, flag.position.z); turn(it, c); } };
}
// Freelance: a laptop; the screen opens a little more on hover.
function exFreelance() {
  const g = new THREE.Group();
  const base = edged(new THREE.BoxGeometry(2, .07, 1.3), mat(), .35); g.add(base);
  const keys = new THREE.Mesh(new THREE.BoxGeometry(1.6, .02, .7), mat(0x24262a)); keys.position.set(0, .045, .1); g.add(keys);
  const hinge = new THREE.Group(); hinge.position.set(0, .035, -.65); g.add(hinge);
  const scr = browser(true, 2, 1.25); scr.position.set(0, .63, 0); hinge.add(scr);
  g.position.y = -.35;
  return { g, rx: .3, update(it, c) { hinge.rotation.x = -.22 - c.hv * .14; turn(it, c); } };
}
// Master's in Big Data: a cloud of records in three clusters; one cluster found.
function exMaster() {
  const r = rng(7), n = 900, pos = new Float32Array(n * 3), posA = [];
  const C = [[-.6, .1, .2], [.55, -.2, -.3], [.1, .5, -.5]];
  const gauss = () => (r() + r() + r() - 1.5) * .55;
  for (let i = 0; i < n; i++) {
    const k = i % 3, c = C[k];
    const p = [c[0] + gauss(), c[1] + gauss() * .8, c[2] + gauss()];
    if (k === 0) posA.push(...p); else pos.set(p, i * 3);
  }
  const g = new THREE.Group();
  const grey = new THREE.BufferGeometry(); grey.setAttribute('position', new THREE.BufferAttribute(pos.filter((_, i) => Math.floor(i / 3) % 3 !== 0), 3));
  const amb = new THREE.BufferGeometry(); amb.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posA), 3));
  g.add(new THREE.Points(grey, new THREE.PointsMaterial({ color: EDGE, size: .03, transparent: true, opacity: .55 })));
  g.add(new THREE.Points(amb, new THREE.PointsMaterial({ color: ACCENT, size: .036, transparent: true, opacity: .95 })));
  const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.4, 1.8, 2)), new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: .14 })); g.add(box);
  return { g, rx: .25, update(it, c) { g.children[1].material.size = .036 + c.hv * .014; turn(it, c); } };
}
// Engineering degree: a circuit board, processor in amber.
function exDegree() {
  const g = new THREE.Group();
  g.add(edged(new THREE.BoxGeometry(2.4, .06, 1.6), mat(0x26282c), .35));
  const chips = [[0, 0, .6, .6, true], [-.8, -.4, .35, .25], [-.8, .35, .35, .35], [.8, .4, .4, .25], [.85, -.35, .3, .3], [-.25, .6, .25, .12], [.3, -.6, .5, .12]];
  const parts = chips.map(([x, z, w, d, hot]) => { const m = edged(new THREE.BoxGeometry(w, .08, d), hot ? amber() : mat(), .4); m.position.set(x, .07, z); g.add(m); return m; });
  const lm = new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: .4 });
  chips.slice(1).forEach(([x, z]) => g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, .035, z), new THREE.Vector3(x, .035, 0), new THREE.Vector3(0, .035, 0)]), lm)));
  return { g, rx: .75, update(it, c) { parts[0].position.y = .07 + c.hv * .12; turn(it, c); } };
}

/* =================== Projects =================== */
// The data build behind this site, as a pipeline (not the map itself): a loose cloud of raw points (the shapefiles)
// flows into one processing block (Python) and comes out as 7 tidy bars (the 7 charts). On hover the cloud packs in.
function prBuild() {
  const g = new THREE.Group(), R = rng(209);
  const n = 420, base = new Float32Array(n * 3), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { base[i * 3] = -1.15 + (R() - .5) * 1.1; base[i * 3 + 1] = (R() - .5) * 1.1; base[i * 3 + 2] = (R() - .5) * 1.1; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: EDGE, size: .045, transparent: true, opacity: .9 })));
  const core = edged(new THREE.BoxGeometry(.55, .55, .55), mat(0x3d3f44), .5); g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.42, .012, 8, 64), amber()); ring.rotation.y = Math.PI / 2; g.add(ring);
  const lm = new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: .35 });
  [[-.6, .3], [.3, .95]].forEach(([a, b]) => g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a, 0, 0), new THREE.Vector3(b, 0, 0)]), lm)));
  const H = [.35, .7, .5, .9, .42, .62, .28];
  H.forEach((h, k) => { const b = edged(new THREE.BoxGeometry(.11, h, .11), k === 3 ? amber() : mat(), .35); b.position.set(1.0 + k * .15, -.4 + h / 2, 0); g.add(b); });
  const grid = new THREE.GridHelper(3.6, 18, EDGE, EDGE); grid.material.transparent = true; grid.material.opacity = .06; grid.position.y = -.42; g.add(grid);
  g.position.x = -.05;
  let last = -1;
  return { g, rx: .35, update(it, c) {
    const s = 1 - ease(c.hv) * .55;
    if (Math.abs(s - last) > .001) {
      for (let i = 0; i < n; i++) { pos[i * 3] = -1.15 + (base[i * 3] + 1.15) * s; pos[i * 3 + 1] = base[i * 3 + 1] * s; pos[i * 3 + 2] = base[i * 3 + 2] * s; }
      pg.attributes.position.needsUpdate = true; last = s;
    }
    ring.rotation.x += .01;
    it.g.scale.setScalar(Math.min(1, .55 + it.camera.aspect * .3));
    it.g.rotation.set(it.rx + c.py * .15, -.35 + c.prog * -.6 + c.px * .35, 0);
  } };
}

// Contact: a route through a network. Four amber stops (idea, data, map, launch) climb like steps,
// a light pulse runs along the route; on hover the steps rise and the pulse speeds up. No map here:
// the city map belongs to the hero only.
function ctRoute() {
  const g = new THREE.Group();
  const grid = new THREE.GridHelper(3.6, 18, EDGE, EDGE); grid.material.transparent = true; grid.material.opacity = .07; grid.position.y = -.02; g.add(grid);
  const P = [[-1.25, .9], [-.7, -.6], [-.35, .1], [.15, -.85], [.25, .75], [.6, -.15], [1.2, .6], [1.05, -.8], [-1.3, -.35], [.85, .2]];
  const pts = P.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const route = [8, 2, 5, 6];                 // the four stops, left to right
  const L = [[0, 2], [0, 8], [8, 1], [1, 3], [1, 2], [2, 4], [3, 5], [4, 6], [5, 7], [7, 9], [9, 6], [3, 7], [4, 9]];
  const lm = new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: .28 });
  L.forEach(([a, b]) => g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([pts[a], pts[b]]), lm)));
  const nodes = pts.map((p, i) => {
    const k = route.indexOf(i), on = k >= 0;
    const m = edged(new THREE.CylinderGeometry(on ? .16 : .1, on ? .16 : .1, 1, 32), on ? amber() : mat(), .4);
    m.position.copy(p); g.add(m);
    return { m, base: on ? .12 + k * .16 : .06, lift: on ? k * .12 : 0 };
  });
  // the route line rides on top of the stops
  const rPos = new Float32Array(route.length * 3);
  const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
  g.add(new THREE.Line(rGeo, new THREE.LineBasicMaterial({ color: ACCENT })));
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(.06, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1d6 }));
  g.add(pulse);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.26, .01, 8, 48), amber()); halo.rotation.x = Math.PI / 2; g.add(halo);
  const tops = route.map(() => new THREE.Vector3());
  let t = 0;
  g.position.y = -.3;
  return { g, rx: .62, update(it, c) {
    it.g.scale.setScalar(Math.min(.86, .5 + it.camera.aspect * .3));
    nodes.forEach(n => { const h = n.base + n.lift * c.hv * .8; n.m.scale.y = h; n.m.position.y = h / 2; });
    route.forEach((i, k) => { const n = nodes[i]; tops[k].set(pts[i].x, n.m.scale.y + .01, pts[i].z); rPos.set([tops[k].x, tops[k].y, tops[k].z], k * 3); });
    rGeo.attributes.position.needsUpdate = true;
    t = (t + .004 + c.hv * .006) % 1;
    const seg = t * (route.length - 1), k = Math.min(route.length - 2, Math.floor(seg)), f = seg - k;
    pulse.position.lerpVectors(tops[k], tops[k + 1], f);
    halo.position.copy(tops[route.length - 1]); halo.scale.setScalar(1 + Math.sin(t * Math.PI * 2) * .12 + c.hv * .3);
    it.g.rotation.set(it.rx + c.py * .12, -.35 + c.prog * -.7 + c.px * .35, 0);
    it.busy = true;
  } };
}
// full screen scenes: city sits right of the text on wide screens, lower on phones
function place(it, g, k, py = .2, ps = 1) {
  const a = it.camera.aspect, visH = 2 * it.camera.position.z * Math.tan(THREE.MathUtils.degToRad(it.camera.fov / 2));
  if (a > 1.05) { g.position.set(visH * a * k, 0, 0); g.scale.setScalar(1); }
  else { g.position.set(0, -visH * py, 0); g.scale.setScalar(Math.min(1, .55 + a * .45) * ps); }
}

const BUILDERS = {
  'ex-centrogeo': exCentrogeo, 'ex-inecc': exInecc, 'ex-keywords': exKeywords, 'ex-freelance': exFreelance, 'ex-master': exMaster, 'ex-degree': exDegree,
  'pr-build': prBuild,
  'ct-route': ctRoute,
};

export function initScenes(data) {
  const slots = [...document.querySelectorAll('[data-scene]')].filter(el => BUILDERS[el.dataset.scene]);
  if (!slots.length) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'scenes3d';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { canvas.remove(); document.documentElement.classList.add('no-3d'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setScissorTest(true);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gp = { x: 0, y: 0 }; // page pointer, for the full screen scenes

  const items = slots.map((el, i) => {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xf2efe8, 0x0d0e10, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(-4, 9, 6); scene.add(sun);
    const b = BUILDERS[el.dataset.scene](data);
    scene.add(b.g);
    const camera = new THREE.PerspectiveCamera(30, 2, .1, 50);
    camera.position.set(0, 0, b.full ? 6.2 : 5.6);
    const card = el.closest('[data-card]') || el;
    const band = el.closest('.band');
    const mats = [];
    b.g.traverse(o => { if (o.material) mats.push({ m: o.material, op: o.material.opacity, tr: o.material.transparent }); });
    const it = { el, card, band, scene, camera, g: b.g, rx: b.rx || .3, ry: -.5 + (i % 6) * .17, update: b.update || turn, full: b.full, mats, fade: 1, px: 0, py: 0, tx: 0, ty: 0, hv: 0, th: 0, vis: false };
    if (!reduce && !b.full) {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        it.tx = ((e.clientX - r.left) / r.width - .5) * 2; it.ty = ((e.clientY - r.top) / r.height - .5) * 2; kick();
      });
      card.addEventListener('pointerenter', () => { it.th = 1; kick(); });
      card.addEventListener('pointerleave', () => { it.tx = 0; it.ty = 0; it.th = 0; kick(); });
    }
    return it;
  });

  let raf = 0, nVis = 0;
  function kick() { if (nVis && !raf) raf = requestAnimationFrame(frame); }
  const io = new IntersectionObserver(es => {
    es.forEach(e => { const it = items.find(i => i.el === e.target); if (it) it.vis = e.isIntersecting; });
    nVis = items.filter(i => i.vis).length;
    canvas.style.visibility = nVis ? 'visible' : 'hidden';
    kick();
  }, { rootMargin: '60px' });
  items.forEach(it => io.observe(it.el));
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  if (!reduce) window.addEventListener('pointermove', e => { gp.x = e.clientX / innerWidth * 2 - 1; gp.y = e.clientY / innerHeight * 2 - 1; if (nVis) kick(); }, { passive: true });
  onLang(() => { items.forEach(it => (it.relang = true)); kick(); });

  function setFade(it, op) {
    if (Math.abs(op - it.fade) < .01) return;
    it.fade = op;
    it.mats.forEach(({ m, op: o, tr }) => { m.transparent = tr || op < .999; m.opacity = o * op; });
  }

  function frame() {
    raf = 0;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const sz = renderer.getSize(new THREE.Vector2());
    if (sz.x !== W || sz.y !== H) renderer.setSize(W, H, false);
    renderer.setScissor(0, 0, W, H); renderer.setViewport(0, 0, W, H); renderer.clear();
    let busy = false;
    items.forEach(it => {
      if (!it.vis) return;
      const r = it.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.width < 2 || r.height < 2) return;
      const op = it.card === it.el ? 1 : +getComputedStyle(it.card).opacity;
      if (op < .02) return;
      setFade(it, op);
      if (op < .999) busy = true;
      const sp = it.full ? .05 : .08;
      const tx = it.full ? gp.x : it.tx, ty = it.full ? gp.y : it.ty;
      it.px += (tx - it.px) * sp; it.py += (ty - it.py) * sp; it.hv += (it.th - it.hv) * .09;
      if (Math.abs(tx - it.px) + Math.abs(ty - it.py) + Math.abs(it.th - it.hv) > .002) busy = true;
      let band = 1;
      if (it.band) { const br = it.band.getBoundingClientRect(); band = clamp01(-br.top / Math.max(1, br.height - H)); }
      if (reduce) band = 1;
      const prog = reduce ? 0 : ((r.top + r.height / 2) / H - .5);
      it.camera.aspect = r.width / r.height;
      it.camera.updateProjectionMatrix();
      it.update(it, { prog, band, px: it.px, py: it.py, hv: it.hv });
      const y = H - r.bottom;
      renderer.setViewport(r.left, y, r.width, r.height);
      renderer.setScissor(r.left, y, r.width, r.height);
      renderer.render(it.scene, it.camera);
      if (it.busy && !reduce) busy = true;
    });
    if (busy) kick();
  }
  kick();
}
