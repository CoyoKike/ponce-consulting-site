/* Sea floor: a real 3D scan of a fossil whale skeleton (Smithsonian, CC0).
   Scroll drives one continuous camera flight: high above the slab while a survey line
   turns depth contours into the textured scan, then low along the skeleton, then back up.
   Drag turns the view; on release it springs back onto the flight path. */
(function () {
  const section = document.getElementById('seafloor');
  if (!section || !window.THREE) return;
  const T = window.THREE;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE = matchMedia('(max-width: 900px)').matches;
  const stage = section.querySelector('.fall-stage');
  const canvas = section.querySelector('.fall-canvas');
  const intro = section.querySelector('.fall-intro');
  const titleLines = [...section.querySelectorAll('.fall-title .vl > span')];
  const steps = [...section.querySelectorAll('.fall-steps li')];
  const dragHint = section.querySelector('.fall-drag');
  const loading = section.querySelector('.fall-loading');
  const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  let renderer, scene, camera, key, snow, uni, started = false, ready = false;
  let posCurve, tgtCurve;

  // load the model only when the section gets close (the scan is a few MB)
  const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting) || started) return;
    started = true; io.disconnect();
    const s = document.createElement('script');
    s.src = 'js/whale-model.js';
    s.onload = build;
    document.body.appendChild(s);
  }, { rootMargin: '150% 0px' });
  io.observe(section);

  function b64ToBuffer(b64) {
    const bin = atob(b64), n = bin.length, out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }

  function softDot() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }

  function build() {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 1.75));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0);

    scene = new T.Scene();
    scene.fog = new T.FogExp2(0x02090d, 0.09);
    camera = new T.PerspectiveCamera(MOBILE ? 55 : 40, 1, 0.05, 60);

    // cold ambient from above, the escort sub's lights from the front, a faint rim from behind
    scene.add(new T.HemisphereLight(0x9fc6d6, 0x010304, 0.55));
    key = new T.SpotLight(0xdcecf6, 30, 18, Math.PI / 5, 0.85, 1.6);
    key.position.set(-2.5, 4.5, 4.5); scene.add(key); scene.add(key.target);
    const fill = new T.DirectionalLight(0x5f8fa3, 0.6); fill.position.set(4, 3, -3); scene.add(fill);
    const rim = new T.DirectionalLight(0xbfd8e4, 0.5); rim.position.set(0, 2, -6); scene.add(rim);

    new window.GLTFLoader().parse(b64ToBuffer(window.WHALE_GLB), '', g => {
      window.WHALE_GLB = null;
      let m = null;
      g.scene.traverse(o => { if (!m && o.isMesh) m = o; });
      const whale = new T.Group();
      whale.add(g.scene);
      whale.scale.setScalar(0.001);                           // scan units are millimetres
      scene.add(whale);
      whale.updateMatrixWorld(true);
      let bb = new T.Box3().setFromObject(whale);
      const c = bb.getCenter(new T.Vector3());
      whale.position.set(-c.x, -bb.min.y, -c.z);              // centre on the origin, resting on y = 0
      whale.updateMatrixWorld(true);
      bb = new T.Box3().setFromObject(whale);
      const size = bb.getSize(new T.Vector3());
      const mat = m.material;
      mat.normalMapType = T.ObjectSpaceNormalMap;          // the scan ships object space normals
      mat.color = new T.Color(0.5, 0.6, 0.66);             // pull the dry sand toward cold sea floor grey
      mat.roughness = 0.92; mat.metalness = 0;
      mat.transparent = true;
      uni = { uScan: { value: REDUCED ? 1 : 0 }, uContour: { value: REDUCED ? 0 : 1 },
              uMin: { value: bb.min.clone() }, uSize: { value: size.clone() } };
      mat.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, uni);
        sh.vertexShader = 'varying vec3 vWld;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWld = (modelMatrix * vec4(transformed, 1.)).xyz;');
        sh.fragmentShader = 'uniform float uScan, uContour; uniform vec3 uMin, uSize; varying vec3 vWld;\n' +
          sh.fragmentShader.replace('#include <dithering_fragment>', [
            '#include <dithering_fragment>',
            'vec3 q = (vWld - uMin) / uSize;',
            'vec2 d = (q.xz - .5) * 2.;',
            'float fade = 1. - smoothstep(.5, .97, length(d));',
            'float h = vWld.y / .022;',
            'float ln = 1. - min(abs(fract(h) - .5) / max(fwidth(h), 1e-4), 1.);',
            'float ed = q.x - uScan;',
            'float shown = 1. - smoothstep(-.004, .004, ed);',
            'float edge = smoothstep(.008, 0., abs(ed)) * step(.001, uScan) * step(uScan, .999);',
            'vec3 contourCol = vec3(.72, .84, .9) * ln * .75;',
            'vec3 col = mix(contourCol, gl_FragColor.rgb, shown) + vec3(.85, .92, .95) * edge * .55;',
            'float a = max(shown, max(ln * .8 * uContour, edge)) * fade;',
            'gl_FragColor = vec4(col, a);',
          ].join('\n'));
      };
      mat.needsUpdate = true;
      window.__fall = { whale, size: size.toArray(), camera, scene, setP: v => { forced = v; } };

      makePath();
      makeSnow();
      ready = true;
      loading.classList.add('done');
      resize();
      if (REDUCED) render(1, 0);
    }, err => { loading.textContent = ''; console.error(err); });
  }
  let forced = null;   // test hook: window.__fall.setP(0.5)

  // flight path in metres; the slab is about 6.2 m by 6 m with the skeleton in the middle
  function makePath() {
    const P = (x, y, z) => new T.Vector3(x, y, z);
    posCurve = new T.CatmullRomCurve3([
      P(0.4, 9.5, 1.2),      // high above, looking down
      P(0.2, 6.0, 3.6),      // tilting while the survey line passes
      P(-2.6, 1.6, 2.6),     // down low beside the jaws
      P(-1.2, 1.0, -1.4),    // across the ribs
      P(1.8, 0.9, -1.6),     // along the backbone
      P(3.2, 1.5, 1.6),      // round the tail end
      P(1.4, 5.5, 5.8),      // back up and away
    ], false, 'centripetal');
    tgtCurve = new T.CatmullRomCurve3([
      P(0.3, 0, 0.6),
      P(0.1, 0, 0.2),
      P(-0.9, 0.1, 0.4),
      P(0.0, 0.1, 0.2),
      P(1.0, 0.1, 0.0),
      P(1.2, 0.1, -0.5),
      P(0.2, 0, 0.0),
    ], false, 'centripetal');
  }

  function makeSnow() {
    const N = MOBILE ? 500 : 1300, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - .5) * 16; pos[i * 3 + 1] = Math.random() * 10; pos[i * 3 + 2] = (Math.random() - .5) * 16;
      seed[i] = Math.random();
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    snow = new T.Points(geo, new T.PointsMaterial({ size: 0.035, map: softDot(), transparent: true, opacity: .55, depthWrite: false, color: 0xd8e6ec, sizeAttenuation: true }));
    snow.userData.seed = seed;
    scene.add(snow);
  }

  function resize() {
    if (!renderer) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  // ---------- drag to turn, spring back on release ----------
  let yaw = 0, pitch = 0, vYaw = 0, vPitch = 0, dragging = false, lx = 0, ly = 0, mx = 0, my = 0, smx = 0, smy = 0;
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.classList.add('grabbing');
  });
  canvas.addEventListener('pointermove', e => {
    mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5;
    if (!dragging) return;
    vYaw = (e.clientX - lx) * -0.006; vPitch = (e.clientY - ly) * 0.004;
    yaw = clamp(yaw + vYaw, -2.6, 2.6); pitch = clamp(pitch + vPitch, -0.35, 0.6);
    lx = e.clientX; ly = e.clientY;
  });
  const up = () => { dragging = false; canvas.classList.remove('grabbing'); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

  // ---------- frame ----------
  let eased = 0;
  const tmpP = new T.Vector3(), tmpT = new T.Vector3(), off = new T.Vector3(), lightOff = new T.Vector3(-1.2, 2.2, 0.6), clock = new T.Clock();
  function progress() {
    const r = section.getBoundingClientRect(), total = section.offsetHeight - innerHeight;
    return clamp(-r.top / total, 0, 1);
  }

  function render(p, t) {
    // survey line crosses the slab, contours fade once it has passed
    const scan = REDUCED ? 1 : ss(0.06, 0.26, p);
    uni.uScan.value = scan; uni.uContour.value = REDUCED ? 0 : 1 - ss(0.22, 0.32, p);
    const u = clamp(p, 0, 1);
    posCurve.getPointAt(u, tmpP);
    tgtCurve.getPointAt(u, tmpT);
    // drag orbits the current target; the mouse adds a slight parallax
    off.subVectors(tmpP, tmpT);
    const rad = off.length();
    const az = Math.atan2(off.x, off.z) + yaw + smx * -0.12;
    const el = clamp(Math.asin(clamp(off.y / rad, -1, 1)) + pitch + smy * 0.06, 0.08, 1.45);
    camera.position.set(tmpT.x + Math.sin(az) * Math.cos(el) * rad, tmpT.y + Math.sin(el) * rad, tmpT.z + Math.cos(az) * Math.cos(el) * rad);
    camera.lookAt(tmpT);
    // the sub's lights ride with the camera, a little above and to the left
    key.position.copy(camera.position).add(lightOff);
    key.target.position.copy(tmpT);
    // snow drifts down slowly and sways
    if (snow && !REDUCED) {
      const a = snow.geometry.attributes.position, s = snow.userData.seed;
      for (let i = 0; i < s.length; i++) {
        let y = a.array[i * 3 + 1] - (0.0025 + s[i] * 0.004);
        if (y < 0) y += 10;
        a.array[i * 3 + 1] = y;
        a.array[i * 3] += Math.sin(t * .4 + s[i] * 20) * 0.0012;
      }
      a.needsUpdate = true;
    }
    renderer.render(scene, camera);

    if (REDUCED) return;
    // DOM: survey line, intro, steps
    intro.style.opacity = String(1 - ss(0.15, 0.22, p));
    titleLines.forEach((s, i) => s.style.transform = `translateY(${(1 - ss(i * .015, 0.05 + i * .015, p)) * 110}%)`);
    steps.forEach((li, i) => {
      const c = 0.42 + i * 0.17, w = 0.17;
      const o = ss(c - w * .5, c - w * .25, p) * (1 - ss(c + w * .3, c + w * .5, p));
      li.style.opacity = String(o);
      li.style.transform = `translateY(${(1 - o) * 26}px)`;
    });
    dragHint.classList.toggle('on', !MOBILE && p > 0.3 && p < 0.92 && !dragging && Math.abs(yaw) < 0.05);
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!ready || REDUCED) return;
    const r = section.getBoundingClientRect();
    if (r.bottom < -40 || r.top > innerHeight + 40) return;   // only work while on screen
    const t = clock.getElapsedTime();
    const p = forced != null ? forced : progress();
    if (Math.abs(p - eased) > 0.25 || forced != null) eased = p;
    eased += (p - eased) * 0.08;
    if (!dragging) {                                         // spring back with a small overshoot
      vYaw += -yaw * 0.035; vYaw *= 0.86; yaw += vYaw;
      vPitch += -pitch * 0.035; vPitch *= 0.86; pitch += vPitch;
    }
    smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05;
    render(eased, t);
  }
  requestAnimationFrame(frame);
  if (REDUCED) addEventListener('resize', () => { if (ready) { resize(); render(1, 0); } });
})();
