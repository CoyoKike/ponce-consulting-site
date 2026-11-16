/* The color bar: pick a shade and a finish, the five nails repaint, and the bottle in the hero takes the shade too. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const hand = $('.try__hand');
  if (!hand) return;
  const FIN = { gloss: ['gloss', 'brillo'], matte: ['matte', 'mate'], chrome: ['chrome', 'cromo'] };
  const setText = (el, en, es) => { el.dataset.en = en; el.dataset.es = es; el.innerHTML = document.documentElement.lang === 'es' ? es : en; };

  const sws = $$('.sw');
  sws.forEach((b, i) => {
    b.addEventListener('click', () => {
      sws.forEach(x => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; });
      hand.style.setProperty('--c', b.dataset.c);
      $('.try__n').textContent = b.dataset.name;
      const hs = $('.hero__shade-n'); if (hs) hs.textContent = b.dataset.name;
      const hc = $('.hero__chip'); if (hc) hc.style.background = b.dataset.c;
      window.dispatchEvent(new CustomEvent('lacquer', { detail: b.dataset.c }));
      if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.fromTo('.nail', { y: 26, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out' });
    });
    b.addEventListener('keydown', e => {
      const k = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!k) return; e.preventDefault(); const n = sws[(i + k + sws.length) % sws.length]; n.focus(); n.click();
    });
    b.tabIndex = i === 0 ? 0 : -1;
  });
  $$('.fin').forEach(b => b.addEventListener('click', () => {
    $$('.fin').forEach(x => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
    hand.dataset.finish = b.dataset.f;
    const [en, es] = FIN[b.dataset.f];
    setText($('.try__f'), en, es);
  }));
  hand.style.setProperty('--c', sws[0].dataset.c);
})();
