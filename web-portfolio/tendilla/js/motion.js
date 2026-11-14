// Layer 2: motion. GSAP + ScrollTrigger + Lenis.
// The journey section is pinned: scrolling moves the camera down the aorta and along the coronary
// arteries, and each service waits at its stop. Text, photo and heart sit at different depths, so
// they move at different speeds. After the ride, sections rise in with layered parallax.
export function initMotion({ ready, getHeart, reduce }) {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const nav = $('.nav'), loader = $('.loader');
  const setBar = () => nav.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', setBar, { passive: true }); setBar();
  if (!gsap || !ST) { loader?.remove(); return; }
  gsap.registerPlugin(ST);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: .06, smoothWheel: true, wheelMultiplier: .85 });
    window.__lenis = lenis;
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const journey = $('.journey');
  const fToY = f => journey.offsetTop + (journey.offsetHeight - innerHeight) * (f / 6);
  const goTo = y => lenis ? lenis.scrollTo(y, { duration: 2.2, easing: t => 1 - Math.pow(1 - t, 4) }) : scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    let y = null;
    if (id === '#top') y = 0;
    else if (id === '#journey' || id === '#stop-1') y = reduce ? $('[data-stop="1"]').getBoundingClientRect().top + scrollY - 90 : fToY(1);
    else if ($(id)) y = $(id).getBoundingClientRect().top + scrollY - (id === '#contact' ? 40 : 0);
    if (y === null) return;
    e.preventDefault(); goTo(y);
  }));

  /* ---------- loader: a heartbeat trace draws while the model loads ---------- */
  const num = $('.loader__num'), trace = $('.loader__trace path');
  const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  intro.from('.hero__title .line > span', { yPercent: 110, duration: 1.5, stagger: .12 }, 0)
    .from(['.stop--hero .eyebrow', '.hero__lede', '.hero__actions'], { y: 24, opacity: 0, duration: 1.2, stagger: .08 }, .3)
    .from(['.hero__meta', '.hero__scroll'], { opacity: 0, duration: 1.2 }, .6)
    .from('.nav', { y: -16, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, .35);
  if (loader && !reduce) {
    const c = { v: 0 };
    const upd = () => { num.textContent = Math.round(c.v); trace.style.strokeDashoffset = 300 * (1 - c.v / 100); };
    const fill = gsap.to(c, { v: 86, duration: 1.8, ease: 'power2.out', onUpdate: upd });
    Promise.race([ready, new Promise(r => setTimeout(r, 8000))]).then(() => {
      fill.kill();
      gsap.timeline()
        .to(c, { v: 100, duration: .45, ease: 'power2.inOut', onUpdate: upd })
        .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' })
        .add(() => { getHeart()?.intro(); intro.play(); }, '-=.6')
        .set(loader, { display: 'none' });
    });
  } else { loader?.remove(); ready.then(() => getHeart()?.intro(true)); intro.progress(1); }

  /* ---------- top progress line ---------- */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });

  /* ---------- the journey ---------- */
  const stops = $$('.stop');
  const route = $('.route'), mmv = $('.route__mmv'), counter = $('.journey__n');
  const items = $$('.route__list li');
  let routeReady = false, rLen = 0;
  function buildMap(h) {
    // project the real route (front view) into the little map
    const P = [];
    for (let i = 0; i <= 240; i++) { const p = h.project(i / 240); P.push([50 + p.x * 62, 58 - p.y * 62]); }
    const d = 'M' + P.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    $('.route__all').setAttribute('d', d); $('.route__done').setAttribute('d', d);
    rLen = $('.route__done').getTotalLength();
    $('.route__done').style.strokeDasharray = rLen;
    const g = $('.route__stops');
    h.stops.slice(1, 6).forEach((u, i) => {
      const p = h.project(u);
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', 50 + p.x * 62); c.setAttribute('cy', 58 - p.y * 62); c.setAttribute('r', 2.6); c.dataset.i = i + 1;
      g.append(c);
    });
    h.onFrame = (s, u, live, f) => {
      $('.route__done').style.strokeDashoffset = rLen * (1 - u);
      const p = h.project(u); const tip = $('.route__tip');
      tip.setAttribute('cx', 50 + p.x * 62); tip.setAttribute('cy', 58 - p.y * 62);
      mmv.textContent = Math.round(u * h.lenMM);
      liveUpdate(live, f);
    };
    routeReady = true;
  }

  /* ---------- live readouts: every stop has its own moving numbers ---------- */
  const V = k => $(`[data-v="${k}"]`);
  const vHr1 = V('hr1'), vEf = V('ef'), vHr3 = V('hr3'), vSt = V('stent'), vLdl = V('ldl');
  const beatDot = $('.live__beat'), ring = $('.live__ring .fg'), barSt = $('[data-bar="stent"]'), barLdl = $('[data-bar="ldl"]');
  const outE = x => 1 - Math.pow(1 - x, 3);
  const ecgC = $('.ecg'), ecgX = ecgC.getContext('2d');
  let ecgW = 0, ecgH = 0, ex = 0, ePrev = null, eLast = 0;
  const sizeEcg = () => { const r = ecgC.getBoundingClientRect(); ecgW = r.width; ecgH = r.height; ecgC.width = r.width * devicePixelRatio; ecgC.height = r.height * devicePixelRatio; ecgX.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); ex = 0; };
  addEventListener('resize', sizeEcg);
  const ecgY = ph => { const g = (m, s, a) => a * Math.exp(-Math.pow((ph - m) / s, 2)) + a * Math.exp(-Math.pow((ph - 1 - m) / s, 2)); return g(.9, .028, .13) + g(.028, .007, -.12) + g(.042, .008, 1) + g(.058, .007, -.28) + g(.3, .045, .26); };
  // a bedside monitor sweep: the trace writes itself left to right in step with the 3D heart
  function drawEcg(ph, now) {
    if (!ecgW) sizeEcg();
    if (!ecgW) return;
    const dt = Math.min(.05, eLast ? (now - eLast) / 1000 : 0); eLast = now;
    const speed = ecgW / 2.6, x1 = ex + speed * dt;
    let p0 = ePrev ?? ph, p1 = ph; if (p1 < p0) p1 += 1;
    ecgX.clearRect(ex, 0, Math.min(18, ecgW - ex) + (x1 - ex), ecgH);
    ecgX.strokeStyle = '#ff4a3a'; ecgX.lineWidth = 1.6; ecgX.lineJoin = 'round'; ecgX.shadowColor = 'rgba(255,60,40,.8)'; ecgX.shadowBlur = 6;
    ecgX.beginPath();
    const n = Math.max(1, Math.ceil(x1 - ex));
    for (let k = 0; k <= n; k++) {
      const x = ex + (x1 - ex) * k / n, phk = (p0 + (p1 - p0) * k / n) % 1;
      const y = ecgH * .66 - ecgY(phk) * ecgH * .55;
      k ? ecgX.lineTo(x, y) : ecgX.moveTo(x, y);
    }
    ecgX.stroke();
    ex = x1; ePrev = ph;
    if (ex >= ecgW) { ex = 0; ecgX.clearRect(0, 0, 18, ecgH); }
  }
  function liveUpdate(live, f) {
    const a = (i, len = .28) => clamp((f - (i - .3)) / len);
    if (Math.abs(f - 1) < .45) { vHr1.textContent = Math.round(live.bpm); beatDot.style.transform = `scale(${1 + live.lub * .6})`; beatDot.style.boxShadow = `0 0 0 ${live.lub * 10}px rgba(255,59,47,${.35 * live.lub})`; }
    if (Math.abs(f - 2) < .45) { const e = outE(a(2)); vEf.textContent = Math.round(62 * e); ring.style.strokeDashoffset = 100 - 62 * e; }
    if (Math.abs(f - 3) < .45) { vHr3.textContent = Math.round(live.bpm); drawEcg(live.ph, performance.now()); }
    if (Math.abs(f - 4) < .45) { vSt.textContent = (3 * live.stent).toFixed(1); barSt.style.width = (100 * live.stent) + '%'; }
    if (Math.abs(f - 5) < .45) { const e = outE(a(5)); vLdl.textContent = Math.round(162 - 92 * e); barLdl.style.width = (100 * (162 - 92 * e) / 162) + '%'; }
  }
  if (reduce) { vEf.textContent = 62; ring.style.strokeDashoffset = 38; vSt.textContent = '3.0'; barSt.style.width = '100%'; vLdl.textContent = 70; barLdl.style.width = '43%'; vHr3.textContent = 64;
    requestAnimationFrame(() => { sizeEcg(); let ph = 0; for (let k = 0; k < 200; k++) { ph = (ph + .012) % 1; drawEcg(ph, k * 16); } }); }

  // text arrives with the camera: each line slides in from the side, staggered, then lifts away
  const kids = stops.map(el => [...el.querySelectorAll(':scope > :not(.stop__photo)')]);

  let lastStop = -1;
  function setStops(f) {
    const near = Math.round(clamp(f, 0, 5));
    stops.forEach((el, i) => {
      let o;
      if (i === 0) o = 1 - clamp((f - .1) / .22);
      // the card's box arrives with its first line and is gone by the time its last line has left,
      // so there is never an empty box between stops
      else o = Math.min(clamp((f - (i - .32)) / .1), 1 - clamp((f - (i + .17)) / .12));
      const dy = (f - i) * -90;
      el.style.opacity = o;
      el.classList.toggle('is-active', o > .01);
      if (i === 0) { el.style.transform = `translate3d(0, ${(-f * 160).toFixed(1)}px, 0) scale(${1 - f * .06})`; }
      else {
        el.style.translate = `0 ${dy.toFixed(1)}px`;
        if (o > 0) {
          const arr = clamp((f - (i - .32)) / .3), lv = clamp((f - (i + .16)) / .16);
          kids[i].forEach((c, j) => {
            const aj = 1 - Math.pow(1 - clamp(arr * 1.7 - j * .11), 3), lj = clamp(lv * 1.5 - j * .08);
            c.style.transform = `translate3d(${((1 - aj) * 80).toFixed(1)}px, ${(-lj * 36).toFixed(1)}px, 0)`;
            c.style.opacity = (aj * (1 - lj)).toFixed(3);
          });
        }
        const ph = el.querySelector('.stop__photo');
        if (ph) {
          // the photo rides up past the card, but never over the route panel above it
          let ty = (f - i) * -260;
          if (o > 0 && getComputedStyle(ph).display !== 'none') {
            const prev = +(ph.dataset.ty || 0), top = ph.getBoundingClientRect().top - prev;
            const rb = route.getBoundingClientRect().bottom + 16;
            ty = Math.max(ty, rb - top);
          }
          ph.dataset.ty = ty;
          ph.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0)`; ph.firstElementChild.style.transform = `translate3d(0, ${((f - i) * 40 - 8).toFixed(1)}%, 0)`;
        }
      }
    });
    route.style.opacity = Math.min(clamp((f - .55) / .3), 1 - clamp((f - 5.3) / .22));
    const cur = f > .7 && f < 5.5 ? near : 0;
    if (cur !== lastStop) {
      lastStop = cur;
      counter.textContent = String(cur).padStart(2, '0');
      items.forEach(li => li.classList.toggle('is-on', +li.dataset.i === cur));
      $$('.route__stops circle').forEach(c => c.classList.toggle('is-on', +c.dataset.i <= cur && cur > 0));
    }
  }

  if (!reduce) {
    ST.create({
      trigger: journey, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: self => { const f = self.progress * 6; getHeart()?.setF(f); setStops(f); },
      onLeave: () => getHeart()?.run(false),
      onEnterBack: () => getHeart()?.run(true),
    });
    setStops(0);
  } else {
    // reduced motion: no flying. Each stop is a plain block; the heart jumps to its stop.
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) getHeart()?.jump(+e.target.dataset.stop); }), { rootMargin: '-45% 0px -45% 0px' });
    stops.forEach(s => io.observe(s));
    const io2 = new IntersectionObserver(es => es.forEach(e => getHeart()?.run(e.isIntersecting)));
    io2.observe(journey);
  }
  ready.then(h => { if (h) buildMap(h); });

  /* ---------- active nav link ---------- */
  const links = $$('.nav__links a');
  const secs = links.map(a => $(a.getAttribute('href')));
  const markActive = () => {
    const y = scrollY + innerHeight * .4;
    let on = -1;
    secs.forEach((s, i) => { if (s && s.offsetTop <= y) on = i; });
    if (scrollY < fToY(.6) && on === 0) on = -1;
    links.forEach((a, i) => a.classList.toggle('is-active', i === on));
  };
  addEventListener('scroll', markActive, { passive: true }); markActive();

  if (reduce) return;

  /* ---------- sections: headings rise word by word, things arrive at different depths ---------- */
  $$('.split').forEach(h => {
    h.innerHTML = h.innerHTML.replace(/(<em>.*?<\/em>)|([^<\s]+)/g, (m, em) => em
      ? em.replace(/<em>(.*?)<\/em>/, (x, t) => '<em>' + t.split(' ').map(w => `<span class="w"><span>${w}</span></span>`).join(' ') + '</em>')
      : `<span class="w"><span>${m}</span></span>`);
    gsap.from(h.querySelectorAll('.w > span'), { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: h, start: 'top 85%' } });
  });
  $$('.par').forEach(el => {
    const img = el.querySelector('img');
    gsap.fromTo(img, { yPercent: -12 }, { yPercent: 2, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo(el, { y: 80 }, { y: -40, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // the contact column sits a little deeper than the form, so the two drift apart as you arrive
  gsap.fromTo('.contact__side', { y: 70 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 20%', scrub: true } });
  $$('.contact .lede, .contact__side > .panel, .contact .warn, .contact__pick, .form').forEach((el, i) => {
    gsap.from(el, { y: 70, opacity: 0, duration: 1.3, ease: 'expo.out', delay: (i % 4) * .08, scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  gsap.fromTo('.foot__big', { xPercent: 8 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  addEventListener('load', () => ST.refresh());
}
