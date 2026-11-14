// 3D extruded map of the 16 alcaldías. Height and color are the value of the chosen indicator.
import * as THREE from '../assets/vendor/three.module.min.js';
import { niceTicks, short } from './charts.js';
import { t, fmt } from './i18n.js';

export const METRICS = {
  pop: { get: a => a.pop, digits: 0, unit: 'popUnit', title: 'pop', sub: 'popSub', src: 'INEGI, Censo de Población y Vivienda 2020' },
  density: { get: a => a.density, digits: 0, unit: 'densityUnit', title: 'density', sub: 'densitySub', src: 'INEGI, Censo 2020 · Marco Geoestadístico 2020' },
  metro: { get: a => a.metro_daily || null, digits: 0, unit: 'metroUnit', title: 'metro', sub: 'metroSub', src: 'STC Metro 2019 (datos.cdmx.gob.mx) · estaciones: INEGI', none: 'noData' },
  space: { get: a => a.public_space_m2_hab, digits: 1, unit: 'spaceUnit', title: 'space', sub: 'spaceSub', src: 'Gobierno de la CDMX y CentroGeo, 2020 a 2021 (datos.cdmx.gob.mx)' },
  car: { get: a => a.pct_car, digits: 1, unit: 'carUnit', title: 'car', sub: 'carSub', src: 'INEGI, Censo 2020' },
};

const BASE = new THREE.Color('#34363a');
const ACCENT = new THREE.Color('#e2a54a');
const NONE = new THREE.Color('#1d1e21');
const MAXH = 14; // scene units for the top of the scale
const shortName = n => n.replace(' de Morelos', '').replace('La Magdalena Contreras', 'Magdalena Contreras');

export class CityMap {
  constructor(canvas, labelHost, data, opts = {}) {
    this.canvas = canvas; this.labelHost = labelHost; this.data = data; this.opts = opts;
    this.metric = opts.metric || 'pop';
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 1, 2000);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.view = { az: opts.az ?? -0.35, el: opts.el ?? 0.78, dist: opts.dist ?? 118, tx: opts.tx ?? 0, tz: opts.tz ?? 0, ty: 0, offsetX: opts.offsetX || 0, offsetYPortrait: opts.offsetYPortrait || 0 };
    this.mouse = opts.hover ? { x: 9, y: 9, sx: 0, sy: 0 } : { x: 0, y: 0, sx: 0, sy: 0 };
    this.hover = null;
    this.visible = true;
    this.needs = true;
    this._build();
    this._labels();
    this.setMetric(this.metric, true);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    new IntersectionObserver(es => { this.visible = es[0].isIntersecting; if (this.visible) this._loop(); }, { rootMargin: '100px' }).observe(canvas);
    this._loop();
  }

  _build() {
    const hemi = new THREE.HemisphereLight(0xf2efe8, 0x0d0e10, 1.6);
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-40, 90, 60);
    this.scene.add(hemi, sun);

    // hairline ground grid (1 cell = 5 km)
    const grid = new THREE.GridHelper(120, 24, 0x3a3b3e, 0x232427);
    grid.material.transparent = true; grid.material.opacity = .55;
    grid.position.y = -0.02;
    this.group.add(grid);

    this.items = this.data.alcaldias.map(a => {
      const shapes = a.shape.map(ring => {
        const s = new THREE.Shape();
        ring.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
        return s;
      });
      const geo = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false });
      const cap = new THREE.MeshStandardMaterial({ color: BASE.clone(), roughness: .75, metalness: .05 });
      const side = new THREE.MeshStandardMaterial({ color: BASE.clone(), roughness: .9, metalness: 0 });
      const mesh = new THREE.Mesh(geo, [cap, side]);
      mesh.rotation.x = -Math.PI / 2;
      mesh.scale.z = 0.01;
      mesh.userData.a = a;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: 0xecebe6, transparent: true, opacity: .28 }));
      mesh.add(edges);
      this.group.add(mesh);
      return { a, mesh, cap, side, edges, h: 0.01, target: 0.01, from: 0.01, colFrom: BASE.clone(), colTo: BASE.clone() };
    });
    this.ray = new THREE.Raycaster();
  }

  _labels() {
    this.labelEls = this.items.map(it => {
      const d = document.createElement('div');
      d.className = 'map-label';
      d.innerHTML = `<span>${shortName(it.a.name)}</span><b></b>`;
      this.labelHost.appendChild(d);
      it.label = d;
      return d;
    });
  }

  scale() {
    const m = METRICS[this.metric];
    const vals = this.items.map(it => m.get(it.a)).filter(v => v != null);
    const ticks = niceTicks(Math.max(...vals), 4);
    return { ticks, top: ticks[ticks.length - 1], m };
  }

  setMetric(key, instant = false) {
    this.metric = key;
    const { top, m } = this.scale();
    this.items.forEach(it => {
      const v = m.get(it.a);
      it.value = v;
      it.from = it.h;
      it.target = v == null ? 0.12 : Math.max(0.12, (v / top) * MAXH);
      it.colFrom = it.cap.color.clone();
      it.colTo = v == null ? NONE.clone() : BASE.clone().lerp(ACCENT, v / top);
    });
    this.tween = { t0: performance.now(), dur: instant ? 0 : 1100 };
    this.updateLabels();
    this.needs = true;
    this._loop();
  }

  /** Which labels show: hero shows the top N, dashboard shows all. */
  updateLabels() {
    const m = METRICS[this.metric];
    const ranked = this.items.filter(i => i.value != null).sort((a, b) => b.value - a.value);
    const show = new Set(this.opts.labels === 'all' ? this.items : ranked.slice(0, this.opts.labels || 3));
    this.items.forEach(it => {
      it.showLabel = show.has(it);
      it.label.querySelector('b').textContent = it.value == null ? t(m.none || 'noData') : fmt(it.value, m.digits);
      it.label.style.display = it.showLabel ? '' : 'none';
    });
    this.ranked = ranked;
  }

  legendHTML() {
    const { ticks, m } = this.scale();
    const pos = v => (v / ticks[ticks.length - 1]) * 100;
    const marks = [ticks[0], ticks[Math.floor(ticks.length / 2)], ticks[ticks.length - 1]];
    const hasNone = this.items.some(it => it.value == null);
    return `<div class="legend__bar"></div><div class="legend__ticks">${marks.map(v => `<span style="left:${pos(v)}%">${short(v)}</span>`).join('')}</div>`
      + `<p class="legend__unit">${t(m.unit)}${hasNone ? `<span class="legend__na"><i></i>${t(m.none || 'noData')}</span>` : ''}</p>`;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return;
    this.w = r.width; this.h = r.height;
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    this.needs = true;
    this._loop();
  }

  setView(v) { Object.assign(this.view, v); this.needs = true; this._loop(); }

  pointer(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    this.mouse.px = e.clientX - r.left; this.mouse.py = e.clientY - r.top;
    this.needs = true; this._loop();
  }

  pick() {
    this.ray.setFromCamera({ x: this.mouse.x, y: this.mouse.y }, this.camera);
    const hit = this.ray.intersectObjects(this.items.map(i => i.mesh), false)[0];
    return hit ? this.items.find(i => i.mesh === hit.object) : null;
  }

  _place() {
    const v = this.view;
    const px = this.opts.parallax ? this.mouse.sx * 0.06 : 0;
    const py = this.opts.parallax ? this.mouse.sy * 0.04 : 0;
    const az = v.az + px, el = Math.min(1.45, Math.max(0.25, v.el + py));
    // tall screens (phones) need the camera further back so the whole city fits
    const aspect = this.w / this.h || 1.6;
    const dist = v.dist * Math.max(1, (this.opts.fitAspect || 1.25) / aspect);
    this.camera.position.set(v.tx + dist * Math.cos(el) * Math.sin(az), v.ty + dist * Math.sin(el), v.tz + dist * Math.cos(el) * Math.cos(az));
    this.camera.lookAt(v.tx, v.ty, v.tz);
    const ox = aspect < 1 ? 0 : v.offsetX || 0, oy = aspect < 1 ? (v.offsetYPortrait || 0) : 0;
    if (ox || oy) {
      // shift the map on screen without changing the angle
      this.camera.setViewOffset(this.w, this.h, -ox * this.w, -oy * this.h, this.w, this.h);
    } else if (this.camera.view) this.camera.clearViewOffset();
  }

  _loop() {
    if (this._raf || !this.visible) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this._frame(); });
  }

  _frame() {
    let busy = false;
    // tween heights and colors
    if (this.tween) {
      const k = this.tween.dur ? Math.min(1, (performance.now() - this.tween.t0) / this.tween.dur) : 1;
      const e = 1 - Math.pow(1 - k, 3);
      this.items.forEach(it => {
        it.h = it.from + (it.target - it.from) * e;
        it.mesh.scale.z = it.h;
        it.cap.color.copy(it.colFrom).lerp(it.colTo, e);
        it.side.color.copy(it.cap.color).multiplyScalar(.62);
      });
      if (k < 1) busy = true; else this.tween = null;
    }
    // smooth mouse parallax
    if (this.opts.parallax) {
      this.mouse.sx += (this.mouse.x - this.mouse.sx) * .06;
      this.mouse.sy += (this.mouse.y - this.mouse.sy) * .06;
      if (Math.abs(this.mouse.x - this.mouse.sx) + Math.abs(this.mouse.y - this.mouse.sy) > .002) busy = true;
    }
    this._place();

    // hover
    if (this.opts.hover) {
      const it = this.pick();
      if (it !== this.hover) {
        if (this.hover) this.hover.edges.material.opacity = .28;
        this.hover = it;
        if (it) it.edges.material.opacity = 1;
        this.opts.onHover && this.opts.onHover(it);
      }
      this.opts.onMove && this.opts.onMove(this.mouse);
    }

    this.renderer.render(this.scene, this.camera);

    // labels follow the top of each prism
    // labels follow the top of each prism; higher values win when two labels collide
    const p = new THREE.Vector3();
    const placed = [];
    const order = [...this.items].sort((a, b) => (b === this.hover) - (a === this.hover) || (b.value ?? -1) - (a.value ?? -1));
    order.forEach(it => {
      if (!it.showLabel && it !== this.hover) { it.label.style.display = 'none'; return; }
      p.set(it.a.label[0], it.h + 0.3, -it.a.label[1]);
      p.project(this.camera);
      const x = (p.x * .5 + .5) * this.w, y = (-p.y * .5 + .5) * this.h;
      const bw = it._bw || (it._bw = Math.max(70, it.label.querySelector('span').textContent.length * 6.2 + 14)), bh = 34;
      const box = [x - bw / 2, y - bh, x + bw / 2, y];
      const hit = placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
      if (hit && it !== this.hover) { it.label.style.display = 'none'; return; }
      placed.push(box);
      it.label.style.display = '';
      it.label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      it.label.classList.toggle('is-hover', it === this.hover);
    });

    if (busy) this._loop();
  }
}
