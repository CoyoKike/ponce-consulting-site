// Alisio hero: soap bubbles with a thin-film interference shader.
// Each bubble is a sphere whose film thickness swirls with noise and drains toward the bottom, so the
// colour bands slide like a real bubble. The room it reflects is procedural (sky gradient + two soft windows).
// Scroll lifts the bubbles and spreads them apart, the pointer nudges them, a click or tap pops one.
import * as THREE from 'three';

const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const VERT = /* glsl */`
uniform float uTime; uniform float uSeed; uniform float uWobble; uniform float uPop;
varying vec3 vN; varying vec3 vWorld; varying vec3 vLocal;
${NOISE}
void main(){
  vec3 p = position;
  float n = snoise(normal * 1.35 + vec3(uSeed, uSeed * .7, uTime * .32 + uSeed));
  float n2 = snoise(normal * 2.6 + vec3(-uTime * .21, uSeed, uSeed * 1.3));
  p += normal * (n * .03 + n2 * .01) * uWobble * (1.0 + uPop * 3.0);
  vLocal = normal;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */`
uniform float uTime; uniform float uSeed; uniform float uAlpha; uniform float uPop;
varying vec3 vN; varying vec3 vWorld; varying vec3 vLocal;
${NOISE}
// the room the film reflects: airy gradient, warm floor, two tall soft windows
float winMask;
vec3 room(vec3 r){
  float y = r.y;
  vec3 sky = mix(vec3(.93,.96,.97), vec3(.72,.86,.88), smoothstep(-.1,.9,y));
  vec3 floorc = vec3(.86,.80,.74);
  vec3 c = mix(floorc, sky, smoothstep(-.35,.05,y));
  float az = atan(r.x, -r.z);
  // two tall windows behind the viewer, so they show up as soft panes on the bubble faces
  float w1 = smoothstep(.16,.10,abs(az - 2.55)) * smoothstep(-.05,.10,y) * smoothstep(.75,.55,y);
  float w2 = smoothstep(.09,.05,abs(az + 2.35)) * smoothstep(.05,.18,y) * smoothstep(.7,.5,y);
  float mull = 1.0 - .8 * smoothstep(.014,.0,abs(az - 2.55)) - .8 * smoothstep(.014,.0,abs(y - .32)) * step(.01, w1);
  winMask = clamp(w1 * mull + w2 * .7, 0.0, 1.0);
  c += vec3(1.2,1.16,1.1) * winMask;
  c += vec3(1.0,.62,.48) * .12 * smoothstep(.4,1.0,-y);
  return c;
}
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  float cosI = clamp(dot(N, V), 0.0, 1.0);
  if (!gl_FrontFacing) N = -N;
  float fres = pow(1.0 - cosI, 3.0);
  // film thickness in nm: broad swirling bands + gravity drainage (thin on top, thick at the bottom)
  vec3 q = vLocal * .85 + vec3(uSeed);
  float sw = snoise(q + vec3(0.0, uTime * .07, uTime * .04));
  float sw2 = snoise(q * 1.9 + vec3(uTime * .05, -uTime * .08, uSeed));
  float d = 520.0 + 170.0 * sw + 45.0 * sw2 - 300.0 * vLocal.y;
  d = max(d, 60.0);
  // thin-film interference, soap n=1.33, one bounce
  float nF = 1.33;
  float sinT2 = (1.0 - cosI * cosI) / (nF * nF);
  float cosT = sqrt(max(0.0, 1.0 - sinT2));
  vec3 lambda = vec3(650.0, 532.0, 450.0);
  vec3 phase = 12.566370614 * nF * d * cosT / lambda;
  vec3 film = .5 - .5 * cos(phase);
  float lum = dot(film, vec3(.3333));
  vec3 hue = film - lum;                      // the colour part of the interference
  vec3 R = reflect(-V, N);
  vec3 env = room(R);
  vec3 col = env * (vec3(.94) + hue * 1.25);
  // window glints
  float glint = pow(max(0.0, dot(R, normalize(vec3(-.35,.55,.75)))), 220.0);
  float glint2 = pow(max(0.0, dot(R, normalize(vec3(-.7,.35,-.6)))), 60.0) * .25;
  col += vec3(1.0) * (glint * 2.5 + glint2);
  // a faint cool edge so the bubbles read against a pale page
  float edge = smoothstep(.72, 1.0, 1.0 - cosI);
  col = mix(col, col * vec3(.45,.55,.7), edge * .55);
  float sat = length(hue);
  float a = .015 + .58 * fres + sat * (.06 + .42 * fres) + winMask * .35 + glint * .9 + glint2 * .6;
  a *= uAlpha * (1.0 - uPop);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const SPARK_VERT = /* glsl */`
attribute float aSize; attribute float aSeed; attribute vec3 aColor; attribute float aLife;
uniform float uTime; uniform float uPx;
varying float vTw; varying vec3 vCol; varying float vLife;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = .5 + .5 * sin(uTime * (1.3 + aSeed * 2.0) + aSeed * 40.0);
  vTw = tw * tw; vCol = aColor; vLife = aLife;
  gl_PointSize = aSize * uPx * (0.6 + vTw * .6) * (15.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const SPARK_FRAG = /* glsl */`
varying float vTw; varying vec3 vCol; varying float vLife;
void main(){
  vec2 p = gl_PointCoord - .5;
  float r = length(p);
  float core = smoothstep(.16, .0, r);
  float cross = smoothstep(.035, .0, abs(p.x)) * smoothstep(.5, .0, abs(p.y)) + smoothstep(.035, .0, abs(p.y)) * smoothstep(.5, .0, abs(p.x));
  float a = (core + cross * .8) * (.25 + vTw * .75) * vLife;
  if (a < .01) discard;
  gl_FragColor = vec4(mix(vCol, vec3(1.0), core * .25), a);
  #include <colorspace_fragment>
}`;

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch (e) { return false; }
}

export function initBubbles(canvas, { reduce = false } = {}) {
  if (!canvas || !webglOK()) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  camera.position.set(0, 0, 14);

  const small = () => innerWidth < 760;
    const geo = new THREE.SphereGeometry(1, small() ? 48 : 72, small() ? 32 : 48);

  // layout: bubbles keep to the right of the headline on wide screens, above it on phones
  const rand = (a, b) => a + Math.random() * (b - a);
  let seedR = 7; const srand = () => (seedR = (seedR * 16807) % 2147483647) / 2147483647;
  const bubbles = [];
  const spots = small()
    ? [[0.9, 3.3, 1.5], [-1.9, 4.9, .6], [-1.7, 1.8, .5], [2.3, 5.6, .35], [2.35, 2.1, .42]]
    : [[6.6, 1.4, 2.0], [10.2, 2.3, .85], [3.0, 2.5, .6], [9.5, -1.15, 1.0], [6.2, -3.3, .55], [1.2, 4.0, .35], [11.2, .2, .45],
       [5.4, -2.0, .3], [8.4, -2.5, .4], [-1.6, 2.5, .28], [11.6, -3.8, .6]];
  for (let i = 0; i < spots.length; i++) {
    const [x, y, r] = spots[i];
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uSeed: { value: srand() * 20 }, uWobble: { value: 1 }, uAlpha: { value: 1 }, uPop: { value: 0 } },
    });
    mat.toneMapped = true;
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = i;
    const b = { m, base: new THREE.Vector3(x, y, r > 1.2 ? 0 : rand(-2.5, 1.5)), r, ph: srand() * 6.28, sp: .25 + srand() * .35,
      off: new THREE.Vector3(), vel: new THREE.Vector3(), popping: 0, hidden: 0, grow: 1 };
    m.scale.setScalar(r);
    scene.add(m); bubbles.push(b);
  }
  // back-to-front so the films layer nicely
  bubbles.sort((a, b) => a.base.z - b.base.z).forEach((b, i) => (b.m.renderOrder = i));

  // glints drifting through the air + a pool reused for pop bursts
  const SP = small() ? 46 : 90, BURST = 60, TOTAL = SP + BURST;
  const sPos = new Float32Array(TOTAL * 3), sSize = new Float32Array(TOTAL), sSeed = new Float32Array(TOTAL), sCol = new Float32Array(TOTAL * 3), sLife = new Float32Array(TOTAL);
  const sVel = new Float32Array(TOTAL * 3);
  const tints = [[.3, .68, .63], [.93, .52, .42], [.58, .52, .95], [.85, .7, .35], [.4, .6, .92]];
  for (let i = 0; i < TOTAL; i++) {
    sPos.set([rand(-9, 12), rand(-6, 6), rand(-4, 3)], i * 3);
    sSize[i] = i < SP ? rand(5, 15) : rand(8, 18); sSeed[i] = Math.random();
    sCol.set(tints[i % tints.length], i * 3); sLife[i] = i < SP ? 1 : 0;
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
  sGeo.setAttribute('aSeed', new THREE.BufferAttribute(sSeed, 1));
  sGeo.setAttribute('aColor', new THREE.BufferAttribute(sCol, 3));
  sGeo.setAttribute('aLife', new THREE.BufferAttribute(sLife, 1));
  const sMat = new THREE.ShaderMaterial({ vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG, transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 } } });
  const sparks = new THREE.Points(sGeo, sMat);
  sparks.frustumCulled = false;
  scene.add(sparks);
  let burstHead = 0;

  // ---------- sizing ----------
  let W = 1, H = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // keep the scene's right edge in frame on narrow screens
    camera.position.x = small() ? 0 : Math.max(0, 3.2 - (W / H - 1.2) * 1.4);
    camera.fov = small() ? 48 : 36;
    camera.updateProjectionMatrix();
    sMat.uniforms.uPx.value = dpr;
  }
  resize();
  addEventListener('resize', resize);

  // ---------- pointer: nudge + pop ----------
  const ptr = { x: -9999, y: -9999, on: false };
  const tmp = new THREE.Vector3();
  const toScreen = (v) => { tmp.copy(v).project(camera); return [(tmp.x * .5 + .5) * W, (-tmp.y * .5 + .5) * H]; };
  const screenRadius = (b) => {
    const d = camera.position.distanceTo(b.m.position);
    return (b.r * b.grow / (d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * H / 2;
  };
  const host = canvas.parentElement;
  host.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.on = true; }, { passive: true });
  host.addEventListener('pointerleave', () => (ptr.on = false));
  host.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a,button,input,select,textarea,label')) return;
    const r = canvas.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 1e9;
    for (const b of bubbles) {
      if (b.popping || b.hidden) continue;
      const [sx, sy] = toScreen(b.m.position); const d = Math.hypot(sx - x, sy - y);
      if (d < screenRadius(b) && b.m.position.z > (best ? best.m.position.z : -99)) { best = b; bd = d; }
    }
    if (best) pop(best);
  });

  function pop(b) {
    b.popping = .0001;
    const c = b.m.position;
    for (let k = 0; k < 18; k++) {
      const i = SP + (burstHead++ % BURST);
      const th = Math.random() * Math.PI * 2, ph = Math.acos(rand(-1, 1));
      const dir = [Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph)];
      const rr = b.r * b.grow;
      sPos.set([c.x + dir[0] * rr, c.y + dir[1] * rr, c.z + dir[2] * rr], i * 3);
      const s = rand(1.2, 3.2);
      sVel.set([dir[0] * s, dir[1] * s + .4, dir[2] * s], i * 3);
      sLife[i] = 1;
    }
    if (!running) frame(performance.now());
  }

  // ---------- loop ----------
  let scrollP = 0, introT = reduce ? 1 : 0, running = false, visible = true, last = performance.now(), t = 0, raf = 0;
  const easeOut = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  function update(dt) {
    t += dt;
    if (introT < 1) introT = Math.min(1, introT + dt / 2.2);
    const intro = easeOut(introT);
    for (const b of bubbles) {
      const u = b.m.material.uniforms;
      u.uTime.value = t;
      // drift
      const bob = Math.sin(t * b.sp + b.ph) * .28, sway = Math.cos(t * b.sp * .7 + b.ph * 1.7) * .22;
      // scroll: rise and spread apart; nearer bubbles move faster (parallax)
      const depth = 1 + (b.base.z + 2.5) * .25;
      const spread = (b.base.x - (small() ? 0 : 4)) * scrollP * .9;
      const rise = scrollP * (7 + b.r * 2.5) * depth;
      // pointer push
      if (ptr.on && !b.popping) {
        const [sx, sy] = toScreen(b.m.position); const sr = screenRadius(b) + 90;
        const dx = sx - ptr.x, dy = sy - ptr.y, d = Math.hypot(dx, dy);
        if (d < sr && d > .01) { const f = (1 - d / sr) * 2.4 * dt; b.vel.x += (dx / d) * f; b.vel.y -= (dy / d) * f; }
      }
      b.vel.multiplyScalar(Math.pow(.18, dt)); b.off.addScaledVector(b.vel, dt * 3); b.off.multiplyScalar(Math.pow(.55, dt));
      b.m.position.set(b.base.x + sway + spread + b.off.x, b.base.y + bob + rise + b.off.y - (1 - intro) * 3.5, b.base.z + b.off.z);
      // pop: quick swell and fade, then a new one grows back in place
      if (b.popping) {
        b.popping += dt * 4.5; u.uPop.value = Math.min(1, b.popping);
        b.m.scale.setScalar(b.r * (1 + b.popping * .18));
        if (b.popping >= 1) { b.popping = 0; b.hidden = 2.2; b.m.visible = false; u.uPop.value = 0; }
      } else if (b.hidden) {
        b.hidden = Math.max(0, b.hidden - dt);
        if (!b.hidden) { b.m.visible = true; b.grow = .01; }
      } else {
        b.grow = Math.min(1, b.grow + dt * .8);
        b.m.scale.setScalar(b.r * easeOut(b.grow) * (.6 + .4 * intro));
      }
      u.uAlpha.value = intro;
      b.m.rotation.y = t * .05 + b.ph; b.m.rotation.x = Math.sin(t * .1 + b.ph) * .2;
    }
    // ambient glints rise slowly; burst glints fly out and fade
    for (let i = 0; i < TOTAL; i++) {
      if (i < SP) {
        sPos[i * 3 + 1] += dt * (.12 + sSeed[i] * .2);
        if (sPos[i * 3 + 1] > 7) sPos[i * 3 + 1] = -7;
        sLife[i] = intro * (1 - scrollP * .6);
      } else if (sLife[i] > 0) {
        sPos[i * 3] += sVel[i * 3] * dt; sPos[i * 3 + 1] += sVel[i * 3 + 1] * dt; sPos[i * 3 + 2] += sVel[i * 3 + 2] * dt;
        sVel[i * 3] *= Math.pow(.25, dt); sVel[i * 3 + 1] *= Math.pow(.25, dt); sVel[i * 3 + 2] *= Math.pow(.25, dt);
        sLife[i] = Math.max(0, sLife[i] - dt * 1.4);
      }
    }
    sparks.position.y = scrollP * 5;
    sGeo.attributes.position.needsUpdate = true; sGeo.attributes.aLife.needsUpdate = true;
    sMat.uniforms.uTime.value = t;
  }

  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    update(dt);
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }
  function start() { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible && !document.hidden ? start() : stop(); });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden || !visible ? stop() : start()));

  if (reduce) { t = 4; update(0); renderer.render(scene, camera); addEventListener('resize', () => renderer.render(scene, camera)); }

  return {
    setScroll(p) { scrollP = p; if (reduce) { update(0); renderer.render(scene, camera); } },
    start,
  };
}
