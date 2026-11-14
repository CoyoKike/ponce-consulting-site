/* SMJ Global — interaction layer: press-and-release, cursor, magnetic buttons, card tilt, language photo preview, form. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- press down under pressure, spring back on release ---------- */
  const DEPTH = { btn: .9, card: .955, row: .975, link: .86 };
  const kindOf = el => el.classList.contains('press-card') ? 'card' : el.classList.contains('press-row') ? 'row' : el.classList.contains('btn') ? 'btn' : 'link';
  function ring(x, y, big) {
    const r = document.createElement('i'); r.className = 'press-ring' + (big ? ' big' : '');
    r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r);
    gsap.fromTo(r, { scale: .2, opacity: .9 }, { scale: big ? 9 : 4, opacity: 0, duration: big ? 1.1 : .8, ease: 'expo.out', onComplete: () => r.remove() });
  }
  $$('.press, .press-card, .press-row').forEach(el => {
    const k = kindOf(el); let down = false, t0 = 0;
    const media = el.querySelector('.card-media img');
    const pressIn = () => {
      if (down) return; down = true; t0 = performance.now();
      gsap.to(el, { scale: DEPTH[k], y: k === 'card' ? 4 : 0, duration: .55, ease: 'power3.out', overwrite: 'auto' });
      if (k === 'row') gsap.to(el.querySelector('h3'), { x: 18, duration: .5, ease: 'power3.out', overwrite: 'auto' });
      if (media) gsap.to(media, { scale: 1.12, filter: 'contrast(1.25) brightness(.8)', duration: .55, ease: 'power3.out', overwrite: 'auto' });
      el.classList.add('is-pressed');
    };
    const release = (e) => {
      if (!down) return; down = false;
      const held = Math.min(1, (performance.now() - t0) / 600);      // the longer you hold, the bigger the rebound
      gsap.timeline({ overwrite: 'auto' })
        .to(el, Object.assign({ scale: 1 + .03 + held * .04, duration: .14, ease: 'power2.out' }, k === 'card' ? { y: -3 } : {}))
        .to(el, Object.assign({ scale: 1, duration: 1.1, ease: 'elastic.out(1.1, .32)' }, k === 'card' ? { y: 0 } : {}));
      if (k === 'row') gsap.to(el.querySelector('h3'), { x: 0, duration: 1, ease: 'elastic.out(1, .4)' });
      if (media) gsap.to(media, { scale: 1, filter: 'contrast(1) brightness(1)', duration: 1.2, ease: 'elastic.out(1, .4)' });
      el.classList.remove('is-pressed');
      if (e && e.clientX !== undefined && !reduce) ring(e.clientX, e.clientY, k === 'card' || held > .6);
    };
    el.addEventListener('pointerdown', pressIn);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointerleave', () => release());
    el.addEventListener('pointercancel', () => release());
    el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { pressIn(); if (e.key === ' ' && el.tagName !== 'BUTTON') e.preventDefault(); } });
    el.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') { const r = el.getBoundingClientRect(); release({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }); } });
  });

  if (reduce) { initForm(); return; }

  /* ---------- cursor ---------- */
  if (fine) {
    const cur = $('#cursor'), pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const xTo = gsap.quickTo(cur, 'x', { duration: .45, ease: 'power3.out' }), yTo = gsap.quickTo(cur, 'y', { duration: .45, ease: 'power3.out' });
    addEventListener('pointermove', e => { pos.x = e.clientX; pos.y = e.clientY; xTo(pos.x); yTo(pos.y); gsap.to(cur, { opacity: 1, duration: .3, overwrite: 'auto' }); }, { passive: true });
    document.addEventListener('pointerleave', () => gsap.to(cur, { opacity: 0 }));
    addEventListener('pointerdown', () => cur.classList.add('is-down'));
    addEventListener('pointerup', () => cur.classList.remove('is-down'));
    $$('.card').forEach(el => {
      el.addEventListener('pointerenter', () => cur.classList.add('is-view'));
      el.addEventListener('pointerleave', () => cur.classList.remove('is-view'));
    });
    $$('a, button, .press-row, input, select, textarea, canvas').forEach(el => {
      el.addEventListener('pointerenter', () => cur.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => cur.classList.remove('is-hover'));
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (fine) $$('.btn').forEach(b => {
    const xTo = gsap.quickTo(b, 'x', { duration: .6, ease: 'power3.out' }), yTo = gsap.quickTo(b, 'y', { duration: .6, ease: 'power3.out' });
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .28); yTo((e.clientY - r.top - r.height / 2) * .35); });
    b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });

  /* ---------- project cards tilt toward the mouse ---------- */
  if (fine) $$('.card').forEach(c => {
    const m = c.querySelector('.card-media');
    gsap.set(m, { transformPerspective: 900 });
    const rx = gsap.quickTo(m, 'rotationX', { duration: .6, ease: 'power3.out' }), ry = gsap.quickTo(m, 'rotationY', { duration: .6, ease: 'power3.out' });
    c.addEventListener('pointermove', e => { const r = m.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; ry(px * 10); rx(-py * 8); m.style.setProperty('--gx', (px + .5) * 100 + '%'); m.style.setProperty('--gy', (py + .5) * 100 + '%'); });
    c.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });

  /* ---------- studio list: photo follows the cursor ---------- */
  const peek = $('#studioPeek'), pimg = peek.querySelector('img'), list = $('#studioList');
  if (fine) {
    const px = gsap.quickTo(peek, 'x', { duration: .7, ease: 'power3.out' }), py = gsap.quickTo(peek, 'y', { duration: .7, ease: 'power3.out' });
    let lastX = 0;
    list.addEventListener('pointermove', e => { px(e.clientX); py(e.clientY); gsap.to(peek, { rotation: gsap.utils.clamp(-12, 12, (e.clientX - lastX) * .6), duration: .5, overwrite: 'auto' }); lastX = e.clientX; });
    $$('li', list).forEach(li => {
      new Image().src = li.dataset.img;
      li.addEventListener('pointerenter', () => {
        pimg.src = li.dataset.img;
        gsap.to(peek, { opacity: 1, scale: 1, duration: .5, ease: 'expo.out', overwrite: 'auto' });
        gsap.fromTo(pimg, { scale: 1.3 }, { scale: 1, duration: .9, ease: 'expo.out' });
        $$('li', list).forEach(o => gsap.to(o, { opacity: o === li ? 1 : .3, duration: .4 }));
      });
    });
    list.addEventListener('pointerleave', () => { gsap.to(peek, { opacity: 0, scale: .6, duration: .4 }); gsap.to($$('li', list), { opacity: 1, duration: .4 }); });
  }

  initForm();

  /* ---------- demo form ---------- */
  function initForm() {
    const f = $('#contactForm'), err = $('#formErr'), done = $('#formDone');
    f.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#cName').value.trim(), reach = $('#cReach').value.trim();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reach) || reach.replace(/\D/g, '').length >= 10;
      const t = k => (window.SMJ_I18N && SMJ_I18N.t(k)) || '';
      const bad = !name ? t('errName') : !ok ? t('errReach') : '';
      err.textContent = bad;
      if (bad) { if (!reduce) gsap.fromTo(f, { x: -10 }, { x: 0, duration: .6, ease: 'elastic.out(1.2, .3)' }); return; }
      const show = () => { f.hidden = true; done.hidden = false; if (!reduce) gsap.from(done, { y: 40, autoAlpha: 0, duration: 1, ease: 'expo.out' }); };
      reduce ? show() : gsap.to(f, { y: -30, autoAlpha: 0, duration: .5, ease: 'power2.in', onComplete: show });
    });
  }
})();
