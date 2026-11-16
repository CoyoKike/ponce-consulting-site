// The hero: a fall of fine hair inside the arch. Thousands of thin ribbons hang from the top,
// copper at the root to champagne at the tip, with a sheen band that slides down like light on
// brushed hair. They sway in a warm breeze, part around the pointer, and comb straight as you scroll.
// With reduced motion one still frame is drawn.
import * as THREE from 'three';

const canvas = document.querySelector('.hero__gl');
const box = document.querySelector('.hero__arch');
const hero = document.querySelector('.hero');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
}
// build the scene after the page has loaded so text and photos come first
const later = fn => { const go = () => setTimeout(fn, 60); if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true }); };
if (canvas && box && webglOK()) later(init);

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);

  const small = innerWidth < 760;
  const COUNT = small ? 1700 : 2800, SEG = 72;
  // one ribbon: SEG rows of two vertices, uv.y = 0 at the root, 1 at the tip
  const g = new THREE.InstancedBufferGeometry();
  const pos = new Float32Array((SEG + 1) * 2 * 3), uv = new Float32Array((SEG + 1) * 2 * 2), idx = [];
  for (let i = 0; i <= SEG; i++) {
    for (let s = 0; s < 2; s++) {
      const k = i * 2 + s;
      pos[k * 3] = s - 0.5; pos[k * 3 + 1] = 0; pos[k * 3 + 2] = 0;
      uv[k * 2] = s; uv[k * 2 + 1] = i / SEG;
    }
    if (i < SEG) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  const root = new Float32Array(COUNT * 4), tone = new Float32Array(COUNT * 2);
  for (let i = 0; i < COUNT; i++) {
    // roots spread across the top, denser in the middle, like a parting
    const u = Math.random(), x = (u - 0.5) * 2.0 * (0.55 + 0.45 * Math.random());
    root[i * 4] = x * 1.08;
    root[i * 4 + 1] = Math.random() * 6.283;            // phase
    root[i * 4 + 2] = 0.78 + Math.random() * 0.34;      // length
    root[i * 4 + 3] = (0.6 + Math.random() * 0.9);      // width
    tone[i * 2] = Math.random(); tone[i * 2 + 1] = Math.random();
  }
  g.setAttribute('aRoot', new THREE.InstancedBufferAttribute(root, 4));
  g.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 2));
  g.instanceCount = COUNT;

  const uniforms = {
    uT: { value: 0 }, uComb: { value: 0 }, uMouse: { value: new THREE.Vector2(9, 9) }, uPush: { value: 0 },
    uAspect: { value: 1 }, uPx: { value: 1 }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      attribute vec4 aRoot; attribute vec2 aTone;
      uniform float uT, uComb, uPush, uAspect, uPx; uniform vec2 uMouse;
      varying float vT, vS, vTone, vSheen, vA;
      // the main fall: roots gathered at the crown, fanning out to fill the arch, with a slow S-curve
      float fall(float t, float free) {
        float fan = 0.36 + 0.64 * smoothstep(0.0, 0.6, t);
        return aRoot.x * uAspect * fan + sin(t * 2.6 + aRoot.x * 1.7 + uT * 0.42) * 0.2 * pow(t, 1.35) * free;
      }
      void main(){
        float t = uv.y * aRoot.z;            // 0 root .. length
        float ph = aRoot.y;
        float y = 1.1 - t * 2.15;            // hang from just above the top edge
        float free = 1.0 - uComb * 0.85;
        float k = pow(t, 1.35);
        float x = fall(t, free);
        // per-strand breeze growing toward the tip
        x += sin(t * 5.0 + ph + uT * 0.9) * 0.03 * k * free;
        x += sin(uT * 0.33 + ph * 0.3) * 0.045 * k * free;
        // the comb: strands gather into a smooth, slightly inward fall
        x = mix(x, x * (1.0 - 0.16 * t), uComb);
        // the pointer parts the hair
        vec2 d = vec2(x, y) - uMouse;
        float f = exp(-dot(d, d) * 9.0) * uPush * k;
        x += sign(d.x) * f * 0.22;
        y += f * 0.04;
        // ribbon width in pixels, thinning toward the tip
        float w = aRoot.w * (1.5 - uv.y * 0.8) * uPx * 3.2;
        vec2 p = vec2(x, y);
        float dt = 0.01;
        vec2 tg = normalize(vec2(fall(t + dt, free) - fall(t, free), -dt * 2.15));
        vec2 n = vec2(-tg.y, tg.x);
        p += n * (uv.x - 0.5) * w;
        gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
        vT = uv.y; vS = uv.x; vTone = aTone.x;
        // a band of light that slides slowly down the fall
        float band = 0.32 + 0.12 * sin(uT * 0.35 + aRoot.x * 2.0) + aTone.y * 0.06;
        vSheen = exp(-pow((t - band) * 7.0, 2.0)) + 0.45 * exp(-pow((t - band - 0.38) * 9.0, 2.0));
        vA = smoothstep(0.0, 0.05, uv.y) * (1.0 - smoothstep(0.82, 1.0, uv.y));
      }`,
    fragmentShader: /* glsl */`
      varying float vT, vS, vTone, vSheen, vA;
      void main(){
        vec3 root = vec3(0.30, 0.13, 0.06);
        vec3 copper = vec3(0.62, 0.30, 0.13);
        vec3 honey = vec3(0.86, 0.58, 0.30);
        vec3 champ = vec3(0.98, 0.86, 0.66);
        vec3 c = mix(root, copper, smoothstep(0.0, 0.28, vT));
        c = mix(c, honey, smoothstep(0.25, 0.7, vT) * (0.7 + 0.3 * vTone));
        c = mix(c, champ, smoothstep(0.6, 1.0, vT) * (0.5 + 0.5 * vTone));
        c *= 0.82 + vTone * 0.3;
        c += vec3(1.0, 0.9, 0.75) * vSheen * (0.55 + 0.45 * vTone);
        float edge = 1.0 - abs(vS - 0.5) * 2.0;
        gl_FragColor = vec4(c, vA * edge * 0.42);
      }`
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; scene.add(mesh);

  function layout() {
    const r = box.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    uniforms.uAspect.value = r.width / r.height;
    uniforms.uPx.value = 1 / r.height;
  }
  const m = { x: 9, y: 9, tx: 9, ty: 9, push: 0, tp: 0 };
  if (!reduce) {
    box.addEventListener('pointermove', e => {
      const r = box.getBoundingClientRect();
      m.tx = ((e.clientX - r.left) / r.width * 2 - 1) * (r.width / r.height); m.ty = -((e.clientY - r.top) / r.height * 2 - 1); m.tp = 1;
      if (m.x > 8) { m.x = m.tx; m.y = m.ty; }
    }, { passive: true });
    box.addEventListener('pointerleave', () => { m.tp = 0; });
  }
  let comb = 0;
  if (!reduce && window.gsap && window.ScrollTrigger) {
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onUpdate: s => { comb = s.progress; } });
  }
  let visible = true, last = performance.now(), t = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !reduce) requestAnimationFrame(tick); }, { rootMargin: '100px' }).observe(box);
  function frame(dt) {
    t += dt;
    m.x += (m.tx - m.x) * 0.08; m.y += (m.ty - m.y) * 0.08; m.push += (m.tp - m.push) * 0.05;
    uniforms.uT.value = t; uniforms.uMouse.value.set(m.x, m.y); uniforms.uPush.value = m.push;
    uniforms.uComb.value += (Math.min(1, comb * 1.6) - uniforms.uComb.value) * 0.08;
    renderer.render(scene, camera);
  }
  // adaptive quality: on slow devices drop to 1x pixels; if frames still crawl (software
  // rendering), stop the loop and redraw only when the visitor scrolls or moves the pointer
  let avg = 16, cut = false, lowPower = false, pending = false;
  function tick(now) {
    if (!visible || lowPower) return;
    const raw = now - last, dt = Math.min(0.05, raw / 1000); last = now;
    frame(dt);
    avg = avg * 0.85 + Math.min(raw, 1000) * 0.15;
    if (avg > 45 && !cut) { cut = true; renderer.setPixelRatio(1); layout(); }
    if (avg > 160) {
      lowPower = true;
      const poke = () => { if (pending || !visible) return; pending = true; setTimeout(() => { pending = false; frame(0.2); }, 250); };
      addEventListener('scroll', poke, { passive: true }); addEventListener('pointermove', poke, { passive: true });
      return;
    }
    requestAnimationFrame(tick);
  }
  layout();
  addEventListener('resize', () => { layout(); if (reduce) frame(0); });
  if (reduce) { t = 3; frame(0); } else requestAnimationFrame(n => { last = n; tick(n); });
  hero.classList.add('has-gl');
}
