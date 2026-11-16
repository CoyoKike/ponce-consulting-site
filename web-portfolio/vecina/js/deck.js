/* Vecina deck: the six accessibility points as gilded cards, fanned like a hand of tarot cards.
   The list stays a plain ordered list for screen readers; the fan is only visual. Previous / Next bring a card to the front,
   so does clicking a card behind. Cards are dealt face down and turn over when the deck scrolls into view. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const ART = {
    key: `<svg viewBox="0 0 160 120" aria-hidden="true" focusable="false"><g fill="none" stroke="url(#vg)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="18" y="34" width="124" height="62" rx="10"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<rect class="k" style="animation-delay:${i * .35}s" x="${28 + i * 18}" y="44" width="12" height="12" rx="3"/>`).join('')}
      ${[0, 1, 2, 3, 4].map(i => `<rect class="k" style="animation-delay:${.2 + i * .35}s" x="${37 + i * 18}" y="61" width="12" height="12" rx="3"/>`).join('')}
      <rect x="46" y="78" width="68" height="10" rx="3"/>
      <path class="tab" d="M112 20h22m-6-6 6 6-6 6M138 12v16"/></g></svg>`,
    ear: `<svg viewBox="0 0 160 120" aria-hidden="true" focusable="false"><g fill="none" stroke="url(#vg)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M44 48h14l18-16v56L58 72H44z"/>
      <path class="w w1" d="M90 46a20 20 0 0 1 0 28"/><path class="w w2" d="M100 36a34 34 0 0 1 0 48"/><path class="w w3" d="M110 26a48 48 0 0 1 0 68"/></g></svg>`,
    contrast: `<svg viewBox="0 0 160 120" aria-hidden="true" focusable="false"><g fill="none" stroke="url(#vg)" stroke-width="2">
      <circle cx="80" cy="60" r="38"/><g class="spin"><path d="M80 22a38 38 0 0 1 0 76z" fill="url(#vg)" stroke="none" opacity=".9"/></g>
      <text x="80" y="114" text-anchor="middle" fill="#f6d99a" stroke="none" font-family="Fraunces, serif" font-size="13" font-style="italic">4.5 : 1</text></g></svg>`,
    zoom: `<svg viewBox="0 0 160 120" aria-hidden="true" focusable="false"><g fill="none" stroke="url(#vg)" stroke-width="2" stroke-linecap="round">
      <path d="M24 34h70M24 48h56M24 62h64M24 76h44" opacity=".55"/>
      <g class="lens"><circle cx="100" cy="58" r="24"/><path d="M117 75l18 18"/><path d="M90 58h20M100 48v20"/></g></g></svg>`,
    globe: `<svg viewBox="0 0 160 120" aria-hidden="true" focusable="false"><g fill="none" stroke="url(#vg)" stroke-width="2">
      <circle cx="80" cy="60" r="40"/><path d="M40 60h80M46 40h68M46 80h68"/>
      <ellipse class="mer m1" cx="80" cy="60" rx="18" ry="40"/><ellipse class="mer m2" cx="80" cy="60" rx="32" ry="40"/></g>
      <g fill="#f6d99a" font-family="Fraunces, serif" font-size="12" font-style="italic"><text x="10" y="22">Aa</text><text x="134" y="24">ñ</text><text x="12" y="112">文</text><text x="134" y="110">ê</text></g></svg>`,
    motion: `<svg viewBox="0 0 160 120" aria-hidden="true" focusable="false"><g fill="none" stroke="url(#vg)" stroke-width="2" stroke-linecap="round">
      <path class="calm" d="M14 60 C 34 18, 54 102, 74 60 S 114 18, 134 60 S 150 80, 152 60"/>
      <circle cx="80" cy="60" r="4" fill="url(#vg)" stroke="none"/></g></svg>`
  };
  const DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><linearGradient id="vg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1cc"/><stop offset=".45" stop-color="#f0c878"/><stop offset="1" stop-color="#b8852a"/></linearGradient></defs></svg>';

  let front = 0, n = 0, items = [], sayFn = () => '';
  const list = () => document.getElementById('checks');

  function layout() {
    const wide = innerWidth > 700;
    items.forEach((el, i) => {
      const k = (i - front + n) % n;               // 0 = front, then alternating right/left behind it
      const side = k === 0 ? 0 : (k % 2 ? 1 : -1), step = Math.ceil(k / 2);
      const x = side * step * (wide ? 70 : 34), r = side * step * 7, y = step * 14, s = 1 - step * .06;
      el.style.setProperty('--x', `${x}px`); el.style.setProperty('--y', `${y}px`);
      el.style.setProperty('--r', `${r}deg`); el.style.setProperty('--s', s);
      el.style.zIndex = String(20 - k);
      el.classList.toggle('is-front', k === 0);
      el.setAttribute('aria-current', k === 0 ? 'true' : 'false');
    });
  }
  function go(i, say) {
    front = (i + n) % n; layout();
    const h = items[front].querySelector('h4').textContent;
    const box = document.getElementById('deckCount');
    box.innerHTML = `<span aria-hidden="true">${ROMAN[front]} <i>/</i> ${ROMAN[n - 1]}</span><span class="sr-only">${say ? sayFn(front + 1, n, h) : ''}</span>`;
  }

  window.VecinaDeck = {
    render(checks, deckOf) {
      const ol = list(); if (!ol) return;
      n = checks.length;
      ol.innerHTML = DEFS + checks.map(([art, h, p, crit], i) => `
        <li class="tcard" data-i="${i}">
          <span class="tcard__frame" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="tcard__glare" aria-hidden="true"></span>
          <span class="tcard__back" aria-hidden="true"><span class="tcard__medal"><span>V</span></span></span>
          <p class="tcard__kicker"><span aria-hidden="true">${ROMAN[i]} · </span>WCAG ${crit}</p>
          <div class="tcard__art">${ART[art]}</div>
          <h4 class="tcard__title">${h}</h4>
          <p class="tcard__sub">${p}</p>
        </li>`).join('');
      items = [...ol.querySelectorAll('.tcard')];
      sayFn = deckOf;
      go(Math.min(front, n - 1), false);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const deck = document.getElementById('deck'); if (!deck) return;
    document.getElementById('deckNext').addEventListener('click', () => go(front + 1, true));
    document.getElementById('deckPrev').addEventListener('click', () => go(front - 1, true));
    // clicking a card behind the front one brings it forward (mouse convenience; the buttons do the same)
    deck.addEventListener('click', e => { const c = e.target.closest('.tcard'); if (c && !c.classList.contains('is-front')) go(+c.dataset.i, true); });
    addEventListener('resize', layout);

    // deal: face down and stacked until the deck is in view, then fan out and turn over one by one
    if (reduce) { deck.classList.remove('is-dealing'); return; }
    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      io.disconnect();
      items.forEach((c, i) => c.style.setProperty('--deal', `${(n - 1 - ((i - front + n) % n)) * 0.12}s`));
      deck.classList.remove('is-dealing');
    }, { threshold: 0.35 });
    io.observe(deck);

    // foil glare and a little tilt on the front card, following the pointer
    deck.addEventListener('pointermove', e => {
      const c = deck.querySelector('.tcard.is-front'); if (!c) return;
      const r = c.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      c.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`); c.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
      c.style.setProperty('--ga', `${(110 + px * 60).toFixed(0)}deg`);
      c.style.setProperty('--tx', `${((py - .5) * -8).toFixed(2)}deg`); c.style.setProperty('--ty', `${((px - .5) * 10).toFixed(2)}deg`);
      c.style.setProperty('--glare', '1');
    });
    deck.addEventListener('pointerleave', () => items.forEach(c => { c.style.setProperty('--glare', '0'); c.style.setProperty('--tx', '0deg'); c.style.setProperty('--ty', '0deg'); }));
  });
})();
