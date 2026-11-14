// Motion: GSAP + ScrollTrigger + Lenis. The build section is pinned and scrolling drives the
// tower from the hero to the keys; the site log, counters, text and photos move at their own depths.
export function initMotion({ ready, getRide, reduce }) {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const nav = $('.nav'), loader = $('.loader');
  const setBar = () => nav.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', setBar, { passive: true }); setBar();
  if (!gsap || !ST) { loader?.remove(); return; }
  gsap.registerPlugin(ST);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const STOPS = 5;

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: .07, smoothWheel: true, wheelMultiplier: .85 });
    window.__lenis = lenis;
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const build = $('.build');
  const fToY = f => build.offsetTop + (build.offsetHeight - innerHeight) * (f / STOPS);
  window.__fToY = fToY;
  const goTo = y => lenis ? lenis.scrollTo(y, { duration: 2.4, easing: t => 1 - Math.pow(1 - t, 4) }) : scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    let y = null;
    if (id === '#top') y = 0;
    else if (id === '#build' || id === '#stop-1') y = reduce ? $('[data-stop="1"]').getBoundingClientRect().top + scrollY - 120 : fToY(1);
    else if ($(id)) y = $(id).getBoundingClientRect().top + scrollY - (id === '#contact' ? 40 : 0);
    if (y === null) return;
    e.preventDefault(); goTo(y);
  }));

  /* ---------- loader: the elevation line drawing completes while the model loads ---------- */
  const num = $('.loader__num'), plan = $('.loader__plan path');
  const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  intro.from('.hero__title .line > span', { yPercent: 110, duration: 1.5, stagger: .12 }, 0)
    .from(['.stop--hero .eyebrow', '.hero__lede', '.hero__actions'], { y: 24, opacity: 0, duration: 1.2, stagger: .08 }, .3)
    .from(['.hero__meta', '.hero__scroll'], { opacity: 0, duration: 1.2 }, .6)
    .from('.nav', { y: -16, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, .35);
  if (loader && !reduce) {
    const c = { v: 0 };
    const upd = () => { num.textContent = Math.round(c.v); plan.style.strokeDashoffset = 1400 * (1 - c.v / 100); };
    const fill = gsap.to(c, { v: 86, duration: 1.8, ease: 'power2.out', onUpdate: upd });
    Promise.race([ready, new Promise(r => setTimeout(r, 9000))]).then(() => {
      fill.kill();
      gsap.timeline()
        .to(c, { v: 100, duration: .45, ease: 'power2.inOut', onUpdate: upd })
        .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' })
        .add(() => { getRide()?.intro(); intro.play(); }, '-=.6')
        .set(loader, { display: 'none' });
    });
  } else { loader?.remove(); ready.then(r => r?.intro(true)); intro.progress(1); }

  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });

  /* ---------- the build: stops, site log, live counters ---------- */
  const stops = $$('.stop');
  const log = $('.log'), logM = $('.log__m'), now = $('.log__now'), rows = $$('.log__row'), counter = $('.build__n');
  const V = k => $(`[data-v="${k}"]`), B = k => $(`[data-bar="${k}"]`);
  const vP = V('piles'), vL = V('level'), vG = V('glass'), vD = V('days');
  const bP = B('piles'), bL = B('level'), bG = B('glass'), bD = B('days');
  // schedule month for each point of the ride (ground 0-3, structure 3-11, envelope 8-14, handover 12-18)
  const MONTH = [[0, 0], [1, 2], [2, 8], [3, 13], [4, 17.6], [5, 18]];
  const monthAt = f => { for (let i = 1; i < MONTH.length; i++) if (f <= MONTH[i][0]) { const [a, ma] = MONTH[i - 1], [b, mb] = MONTH[i]; return ma + (mb - ma) * (f - a) / (b - a); } return 18; };
  const kids = stops.map(el => [...el.querySelectorAll(':scope > :not(.stop__photo)')]);
  let lastStop = -1;

  function readouts(f) {
    const r = getRide();
    const st = r ? r.buildAt(f) : null;
    if (!st) return;
    const piles = Math.round(48 * clamp(st.piles));
    const lvl = Math.round(clamp(st.s - 1, 0, 22));
    const glass = Math.round(100 * clamp(st.glass / 22));
    const days = Math.round(11 * clamp((f - 3.6) / .7));
    if (Math.abs(f - 1) < .5) { vP.textContent = piles; bP.style.width = (piles / 48 * 100) + '%'; }
    if (Math.abs(f - 2) < .5) { vL.textContent = String(lvl).padStart(2, '0'); bL.style.width = (lvl / 22 * 100) + '%'; }
    if (Math.abs(f - 3) < .5) { vG.textContent = glass; bG.style.width = glass + '%'; }
    if (f > 3.5) { vD.textContent = days; bD.style.width = (days / 11 * 100) + '%'; }
    const m = monthAt(f);
    logM.textContent = String(Math.floor(m)).padStart(2, '0');
    now.style.transform = `translateX(${(m / 18 * (now.parentElement.clientWidth - now.offsetLeft)).toFixed(1)}px)`;
    rows.forEach(row => { const [a, b] = [+getComputedStyle(row.querySelector('i')).getPropertyValue('--a'), +getComputedStyle(row.querySelector('i')).getPropertyValue('--b')]; row.classList.toggle('is-on', m >= a && m < b && f > .6); row.classList.toggle('is-done', m >= b); });
  }

  function setStops(f) {
    stops.forEach((el, i) => {
      let o;
      if (i === 0) o = 1 - clamp((f - .08) / .22);
      else if (i === stops.length - 1) o = clamp((f - (i - .32)) / .1);   // the last stop stays up until the work section takes over
      else o = Math.min(clamp((f - (i - .32)) / .1), 1 - clamp((f - (i + .2)) / .12));
      el.style.opacity = o;
      el.classList.toggle('is-active', o > .01);
      if (i === 0) { el.style.transform = `translate3d(0, ${(-f * 160).toFixed(1)}px, 0) scale(${1 - f * .06})`; return; }
      el.style.translate = `0 ${(Math.min(f - i, i === stops.length - 1 ? .2 : 9) * -90).toFixed(1)}px`;
      if (o > 0) {
        const arr = clamp((f - (i - .32)) / .3), lv = i === stops.length - 1 ? 0 : clamp((f - (i + .19)) / .16);
        kids[i].forEach((c, j) => {
          const aj = 1 - Math.pow(1 - clamp(arr * 1.7 - j * .11), 3), lj = clamp(lv * 1.5 - j * .08);
          c.style.transform = `translate3d(${((1 - aj) * 80).toFixed(1)}px, ${(-lj * 36).toFixed(1)}px, 0)`;
          c.style.opacity = (aj * (1 - lj)).toFixed(3);
        });
      }
      const ph = el.querySelector('.stop__photo');
      if (ph) {
        // the photo rides up past the card at its own speed, never over the site log
        let ty = (f - i) * -260;
        if (o > 0 && getComputedStyle(ph).display !== 'none') {
          const prev = +(ph.dataset.ty || 0), top = ph.getBoundingClientRect().top - prev;
          ty = Math.max(ty, log.getBoundingClientRect().bottom + 16 - top);
        }
        ph.dataset.ty = ty;
        ph.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0)`;
        ph.firstElementChild.style.transform = `translate3d(0, ${((f - i) * 40 - 8).toFixed(1)}%, 0)`;
      }
    });
    log.style.opacity = clamp((f - .55) / .3);
    const cur = f > .7 ? Math.round(clamp(f, 1, 4)) : 0;
    if (cur !== lastStop) { lastStop = cur; counter.textContent = String(cur).padStart(2, '0'); }
    readouts(f);
  }

  if (!reduce) {
    ST.create({
      trigger: build, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: self => { const f = self.progress * STOPS; getRide()?.setF(f); setStops(f); },
    });
    // the canvas keeps rendering under the work section only while it can still be seen
    ST.create({ trigger: '.work', start: 'top top', onEnter: () => getRide()?.run(false), onLeaveBack: () => getRide()?.run(true) });
    setStops(0);
    ready.then(() => setStops(ST.getAll()[0]?.progress * STOPS || 0));
  } else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const s = +e.target.dataset.stop; getRide()?.jump(s); readouts(s); } }), { rootMargin: '-45% 0px -45% 0px' });
    stops.forEach(s => io.observe(s));
  }

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

  /* ---------- sections ---------- */
  $$('.split').forEach(h => {
    h.innerHTML = h.innerHTML.replace(/(<em>.*?<\/em>)|([^<\s]+)/g, (m, em) => em
      ? em.replace(/<em>(.*?)<\/em>/, (x, t) => '<em>' + t.split(' ').map(w => `<span class="w"><span>${w}</span></span>`).join(' ') + '</em>')
      : `<span class="w"><span>${m}</span></span>`);
    gsap.from(h.querySelectorAll('.w > span'), { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: h, start: 'top 85%' } });
  });
  // work cards: photo, card and text travel at three speeds; schedule bars grow in when seen
  $$('.card').forEach((card, i) => {
    const img = card.querySelector('img');
    gsap.fromTo(img, { yPercent: -16 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo(card, { y: 60 + (i % 2) * 70 }, { y: (i % 2) * -30, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom 30%', scrub: true } });
    gsap.from(card.querySelectorAll('.card__body > *'), { y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: card, start: 'top 75%' } });
    const bars = card.querySelectorAll('.sched__row');
    bars.forEach(b => b.style.setProperty('--grow', 0));
    ST.create({ trigger: card, start: 'top 70%', once: true, onEnter: () => bars.forEach((b, k) => setTimeout(() => b.style.setProperty('--grow', 1), 250 + k * 220)) });
  });
  gsap.fromTo('.contact__side', { y: 70 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 20%', scrub: true } });
  $$('.contact .lede, .contact__side > .panel, .contact__pick, .form').forEach((el, i) => {
    gsap.from(el, { y: 70, opacity: 0, duration: 1.3, ease: 'expo.out', delay: (i % 4) * .08, scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  gsap.fromTo('.foot__big', { xPercent: 8 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  addEventListener('load', () => ST.refresh());
}
