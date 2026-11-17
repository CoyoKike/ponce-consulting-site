/* Gulf Coast: tabs, testimonials and page-specific motion. Loaded before core.js. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // services tabs (arrow keys move between tabs)
  function selectTab(tab) {
    const tabs = $$('[role="tab"]');
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const p = document.getElementById(t.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
    });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  document.addEventListener('click', e => { const t = e.target.closest('[role="tab"]'); if (t) selectTab(t); });
  document.addEventListener('keydown', e => {
    const t = e.target.closest && e.target.closest('[role="tab"]');
    if (!t || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = $$('[role="tab"]'); let i = tabs.indexOf(t);
    i = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[i].focus(); selectTab(tabs[i]); e.preventDefault();
  });

  // testimonials: one at a time, dots, gentle autoplay that stops on interaction
  let q = 0, timer = null;
  function showQuote(n) {
    const qs = $$('.quote'); if (!qs.length) return;
    q = (n + qs.length) % qs.length;
    qs.forEach((el, i) => { el.classList.toggle('is-on', i === q); el.setAttribute('aria-hidden', String(i !== q)); });
    $$('[data-quote]').forEach((d, i) => d.toggleAttribute('aria-current', i === q));
  }
  document.addEventListener('click', e => { const d = e.target.closest('[data-quote]'); if (d) { clearInterval(timer); showQuote(+d.dataset.quote); } });
  document.addEventListener('DOMContentLoaded', () => {
    showQuote(0);
    if (!reduce) timer = setInterval(() => showQuote(q + 1), 8000);
  });

  window.SITE = Object.assign(window.SITE || {}, {
    cardStyle: 'linen',
    navSolidAt: 60,
    motion({ gsap }) {
      const hero = $('[data-hero]');
      if (hero) {
        gsap.to('.hero__copy', { yPercent: -14, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '2% top', end: '26% top', scrub: true } });
        gsap.to('.hero__veil', { autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '45% top', end: '70% top', scrub: true } });
        gsap.to('.hero__cue', { autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '8% top', scrub: true } });
        gsap.from('.hero__copy .eyebrow, .hero__lede, .hero__actions, .titleblock', { y: 24, autoAlpha: 0, duration: 1.6, ease: 'expo.out', stagger: .09, delay: .35 });
      }
      $$('.step').forEach((s, i) => gsap.fromTo(s.querySelector('.step__n'), { '--fill': 0 }, { '--fill': 1, ease: 'none', scrollTrigger: { trigger: s, start: 'top 85%', end: 'top 45%', scrub: true } }));
    }
  });
})();
