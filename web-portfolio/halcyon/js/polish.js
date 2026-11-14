// Layer 4 — Polish: loader, heading reveals, scroll-speed skew, journey progress, active nav
const { gsap, ScrollTrigger, SplitText } = window;

/* Loader counts real image loads, then the curtain lifts */
export function loader(extra = []) {
  const el = document.querySelector('.loader'), num = el.querySelector('.loader__num'), bar = el.querySelector('.loader__bar span');
  el.style.display = 'flex';
  const imgs = ['assets/img/nebula.jpg', 'assets/img/launch.jpg', 'assets/img/orbit.jpg'];
  const total = imgs.length + extra.length;
  const p = { v: 0 }; let done = 0;
  const target = () => (done / total) * 100;
  const show = () => { num.textContent = Math.round(p.v); bar.style.transform = `scaleX(${p.v / 100})`; };
  gsap.ticker.add(show);
  return new Promise(resolve => {
    const step = () => gsap.to(p, { v: target(), duration: .9, ease: 'power2.out', overwrite: true, onComplete: () => { if (done === total) finish(); } });
    imgs.forEach(src => { const i = new Image(); i.onload = i.onerror = () => { done++; step(); }; i.src = src; });
    extra.forEach(pr => Promise.resolve(pr).catch(() => {}).then(() => { done++; step(); }));
    const safety = setTimeout(() => { done = total; step(); }, 9000);
    let finished = false;
    function finish() {
      if (finished) return; finished = true;
      clearTimeout(safety);
      const tl = gsap.timeline({ onComplete: () => { gsap.ticker.remove(show); el.remove(); } });
      tl.to('.loader__count, .loader__bar', { yPercent: -120, opacity: 0, duration: .7, ease: 'power3.in' }, .2)
        .to('.loader__word', { letterSpacing: '.6em', opacity: 0, duration: .9, ease: 'power3.in' }, .1)
        .add(resolve, .75)
        .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 1.2, ease: 'expo.inOut' }, .7);
    }
  });
}

export function initPolish() {
  // headings: lines slide up out of a mask
  document.querySelectorAll('.h2, .reserve__title').forEach(h => {
    if (h.classList.contains('reserve__title')) return;
    const s = new SplitText(h, { type: 'lines', linesClass: 'hl', mask: 'lines' });
    gsap.from(s.lines, { yPercent: 110, duration: 1.4, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%' } });
  });

  // big type leans with scroll speed
  const skewTo = gsap.quickTo('.h2, .manifesto__text, .footer__big', 'skewY', { duration: .5, ease: 'power3.out' });
  ScrollTrigger.create({ onUpdate: self => skewTo(gsap.utils.clamp(-2.5, 2.5, self.getVelocity() / -700)) });

  // journey progress bar
  const bar = document.querySelector('.journey__progress span');
  if (bar) ScrollTrigger.create({ trigger: '.journey', start: 'top top', end: () => '+=' + (document.querySelector('.journey__track').scrollWidth - innerWidth),
    onUpdate: s => bar.style.transform = `scaleX(${s.progress})` });

  // active nav link
  ['craft', 'journey', 'destinations', 'voyages'].forEach(id => {
    const link = document.querySelector(`.nav__links a[href="#${id}"]`);
    const el = document.getElementById(id), craft = id === 'craft';
    ScrollTrigger.create({ trigger: craft ? el.parentElement : el, start: craft ? 'top -60%' : 'top 50%', end: 'bottom 50%', onToggle: s => link.classList.toggle('is-active', s.isActive) });
  });

  // chapter images: soft zoom on hover
  document.querySelectorAll('.chapter__img').forEach(f => {
    const img = f.querySelector('img');
    f.addEventListener('pointerenter', () => gsap.to(img, { filter: 'brightness(1.12) saturate(1.15)', duration: .6 }));
    f.addEventListener('pointerleave', () => gsap.to(img, { filter: 'brightness(1) saturate(1)', duration: .6 }));
  });
}
