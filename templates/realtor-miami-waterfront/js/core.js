/* Shared site logic: language, listings, residence viewer, forms, smooth scroll, motion.
   Spanish copy lives next to the English in the HTML:
     data-es="..."            text
     data-es-html="..."       text with tags (<em>, <br>)
     data-es-placeholder / data-es-aria-label / data-es-alt / data-es-title   attributes */
(() => {
  const root = document.documentElement;
  const SITE = window.SITE || {};
  const KEY = (SITE.key || 'realtor') + ':lang';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.REDUCED = reduce;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------------- language ---------------- */
  const ATTRS = ['placeholder', 'aria-label', 'alt', 'title', 'content'];
  let lang = 'en';
  try { lang = localStorage.getItem(KEY) || SITE.defaultLang || 'en'; } catch (e) { lang = SITE.defaultLang || 'en'; }
  const t = (en, es) => (lang === 'es' && es ? es : en);
  window.t = t;

  function applyLang(next) {
    lang = next === 'es' ? 'es' : 'en';
    root.lang = lang;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    $$('[data-es]').forEach(el => {
      if (el.dataset.en === undefined) el.dataset.en = el.textContent;
      el.textContent = lang === 'es' ? el.dataset.es : el.dataset.en;
    });
    $$('[data-es-html]').forEach(el => {
      if (el.dataset.enHtml === undefined) el.dataset.enHtml = el.innerHTML;
      el.innerHTML = lang === 'es' ? el.dataset.esHtml : el.dataset.enHtml;
    });
    ATTRS.forEach(a => {
      const k = 'es' + a.replace(/(^|-)(\w)/g, (m, d, c) => c.toUpperCase());
      $$(`[data-es-${a}]`).forEach(el => {
        const enK = 'en' + k.slice(2);
        if (el.dataset[enK] === undefined) el.dataset[enK] = el.getAttribute(a) || '';
        el.setAttribute(a, lang === 'es' ? el.dataset[k] : el.dataset[enK]);
      });
    });
    $$('[data-lang-btn]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.langBtn === lang));
    });
    $$('.lang-toggle').forEach(b => b.setAttribute('aria-label', lang === 'es' ? 'Switch to English' : 'Cambiar a español'));
    if (SITE.titles) document.title = SITE.titles[lang];
    renderListings();
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
    if (window.ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh());
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-lang-btn]');
    if (b) { applyLang(b.dataset.langBtn); return; }
    const tg = e.target.closest('.lang-toggle');
    if (tg) applyLang(lang === 'es' ? 'en' : 'es');
  });

  /* ---------------- listings ---------------- */
  let LISTINGS = [];
  const STATUS = {
    'for-sale': ['For sale', 'En venta'],
    'new': ['New listing', 'Nueva'],
    'coming-soon': ['Coming soon', 'Próximamente'],
    'pending': ['Under contract', 'Bajo contrato'],
    'sold': ['Sold', 'Vendida'],
    'for-rent': ['For lease', 'En alquiler']
  };
  const L = v => (v && typeof v === 'object' && !Array.isArray(v) ? (v[lang] || v.en || '') : (v || ''));
  const money = n => {
    if (typeof n !== 'number') return n || '';
    return new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  };
  const num = n => new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US').format(n);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  window.LX = { money, num, L, esc, STATUS, get lang() { return lang; }, get listings() { return LISTINGS; } };

  function specs(l) {
    const out = [];
    if (l.beds != null) out.push(`<span><b>${l.beds}</b> ${t(l.beds === 1 ? 'bed' : 'beds', l.beds === 1 ? 'hab.' : 'hab.')}</span>`);
    if (l.baths != null) out.push(`<span><b>${l.baths}</b> ${t('baths', 'baños')}</span>`);
    if (l.sqft != null) out.push(`<span><b>${num(l.sqft)}</b> ${t('sq ft', 'pies²')}</span>`);
    return out.join('');
  }

  function cardHTML(l, i) {
    const st = STATUS[l.status] || [l.status, l.status];
    const img = l.thumb || (l.photos && l.photos[0]) || '';
    const img2 = (l.photos && l.photos[1]) || '';
    const tpl = SITE.cardStyle || 'default';
    return `<article class="card card--${tpl} card--${esc(l.status)}" data-reveal style="--i:${i}">
      <button class="card__hit" type="button" data-open="${esc(l.id)}" data-cursor="${t('View', 'Ver')}" aria-label="${esc(t('View residence: ', 'Ver propiedad: ') + L(l.title))}"></button>
      <figure class="card__media">
        <img class="card__img" src="${esc(img)}" alt="${esc(L(l.alt) || L(l.title))}" loading="lazy" decoding="async" width="760" height="507">
        ${img2 ? `<img class="card__img card__img--2" src="${esc(img2)}" alt="" loading="lazy" decoding="async" aria-hidden="true" width="760" height="507">` : ''}
        <span class="card__status">${esc(t(st[0], st[1]))}</span>
      </figure>
      <div class="card__body">
        <p class="card__hood">${esc(l.neighborhood || '')}</p>
        <h3 class="card__title">${esc(L(l.title))}</h3>
        <p class="card__price">${esc(money(l.price))}${l.status === 'for-rent' ? `<small>${t('/mo', '/mes')}</small>` : ''}</p>
        <p class="card__specs">${specs(l)}</p>
        <span class="card__more" aria-hidden="true">${t('View residence', 'Ver propiedad')}<i></i></span>
      </div>
    </article>`;
  }

  let filter = 'all';
  function renderListings() {
    const grid = $('[data-listings]');
    if (!grid || !LISTINGS.length) return;
    const list = LISTINGS.filter(l => filter === 'all' || (filter === 'active' ? l.status !== 'sold' : l.status === filter));
    grid.innerHTML = list.map(cardHTML).join('') || `<p class="empty">${t('Nothing here right now. Ask about off-market homes.', 'Nada por ahora. Pregunte por propiedades fuera del mercado.')}</p>`;
    const sel = $('[data-showing-select]');
    if (sel) {
      const cur = sel.value;
      sel.innerHTML = `<option value="">${t('Any home / not sure yet', 'Cualquier casa / aún no sé')}</option>` +
        LISTINGS.filter(l => l.status !== 'sold').map(l => `<option value="${esc(l.id)}">${esc(L(l.title))} · ${esc(l.neighborhood || '')}</option>`).join('');
      sel.value = cur;
    }
    // the grid height changed: pinned sections further down must re-measure
    if (window.ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh());
    if (window.gsap && !reduce) {
      gsap.fromTo($$('.card', grid), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: grid, start: 'top 85%', once: true } });
    }
  }
  document.addEventListener('click', e => {
    const f = e.target.closest('[data-filter]');
    if (!f) return;
    filter = f.dataset.filter;
    $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === f)));
    renderListings();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });

  fetch('listings.json', { cache: 'no-cache' })
    .then(r => r.json())
    .then(d => { LISTINGS = (d.listings || d).filter(l => l && l.id); renderListings(); openFromHash(); document.dispatchEvent(new CustomEvent('listingsready', { detail: LISTINGS })); })
    .catch(() => {
      const grid = $('[data-listings]');
      if (grid) grid.innerHTML = `<p class="empty">${t('Listings load when the site is online.', 'Las propiedades se cargan cuando el sitio está en línea.')}</p>`;
    });

  /* ---------------- residence viewer ---------------- */
  const dlg = $('#residence');
  let cur = null, idx = 0, lastFocus = null;
  function openListing(id) {
    const l = LISTINGS.find(x => x.id === id);
    if (!l || !dlg) return;
    cur = l; idx = 0; lastFocus = document.activeElement;
    const st = STATUS[l.status] || [l.status, l.status];
    const photos = l.photos || [];
    $('[data-r="status"]', dlg).textContent = t(st[0], st[1]);
    $('[data-r="status"]', dlg).className = 'rv__status rv__status--' + l.status;
    $('[data-r="title"]', dlg).textContent = L(l.title);
    $('[data-r="where"]', dlg).textContent = [l.address, l.neighborhood].filter(Boolean).join(' · ');
    $('[data-r="price"]', dlg).textContent = money(l.price) + (l.status === 'for-rent' ? t(' /mo', ' /mes') : '');
    $('[data-r="specs"]', dlg).innerHTML = specs(l) + (l.lot ? `<span><b>${esc(L(l.lot))}</b></span>` : '') + (l.year ? `<span>${t('Built', 'Año')} <b>${esc(l.year)}</b></span>` : '');
    $('[data-r="summary"]', dlg).textContent = L(l.summary);
    const feats = (l.features && (l.features[lang] || l.features.en)) || [];
    $('[data-r="features"]', dlg).innerHTML = feats.map(f => `<li>${esc(f)}</li>`).join('');
    $('[data-r="slides"]', dlg).innerHTML = photos.map((p, i) => `<img src="${esc(p)}" alt="${esc(L(l.title))}, ${t('photo', 'foto')} ${i + 1} ${t('of', 'de')} ${photos.length}" ${i ? 'loading="lazy"' : ''} decoding="async" class="${i === 0 ? 'is-on' : ''}">`).join('');
    $('[data-r="thumbs"]', dlg).innerHTML = photos.map((p, i) => `<button type="button" data-go="${i}" aria-label="${t('Photo', 'Foto')} ${i + 1}" ${i === 0 ? 'aria-current="true"' : ''}><img src="${esc(p.replace(/\.webp$/, '-s.webp'))}" onerror="this.onerror=null;this.src='${esc(p)}'" alt="" loading="lazy"></button>`).join('');
    $('[data-r="count"]', dlg).textContent = `01 / ${String(photos.length).padStart(2, '0')}`;
    const book = $('[data-r="book"]', dlg);
    book.hidden = l.status === 'sold';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    const closeBtn = $('[data-r="close"]', dlg); if (closeBtn) closeBtn.focus({ preventScroll: true });
    root.classList.add('is-locked');
    if (window.__lenis) window.__lenis.stop();
    if (history.replaceState) history.replaceState(null, '', '#home/' + l.id);
    if (window.gsap && !reduce) {
      gsap.fromTo($('.rv__panel', dlg), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, ease: 'expo.out' });
      gsap.fromTo($('.rv__stage', dlg), { clipPath: 'inset(8% 8% 8% 8%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.out' });
    }
  }
  function go(n) {
    if (!cur) return;
    const imgs = $$('[data-r="slides"] img', dlg);
    if (!imgs.length) return;
    idx = (n + imgs.length) % imgs.length;
    imgs.forEach((im, i) => im.classList.toggle('is-on', i === idx));
    $$('[data-r="thumbs"] button', dlg).forEach((b, i) => b.toggleAttribute('aria-current', i === idx));
    $('[data-r="count"]', dlg).textContent = `${String(idx + 1).padStart(2, '0')} / ${String(imgs.length).padStart(2, '0')}`;
  }
  function closeListing() {
    if (!dlg || !dlg.open) return;
    dlg.close();
  }
  if (dlg) {
    dlg.addEventListener('close', () => {
      root.classList.remove('is-locked');
      if (window.__lenis) window.__lenis.start();
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      cur = null;
    });
    dlg.addEventListener('click', e => {
      if (e.target === dlg || e.target.closest('[data-r="close"]')) closeListing();
      const g = e.target.closest('[data-go]'); if (g) go(+g.dataset.go);
      if (e.target.closest('[data-r="prev"]')) go(idx - 1);
      if (e.target.closest('[data-r="next"]')) go(idx + 1);
      if (e.target.closest('[data-r="book"]')) {
        const id = cur && cur.id;
        closeListing();
        setForm('showing', id);
        const c = $('#contact');
        if (c) { window.__lenis ? window.__lenis.scrollTo(c, { offset: -40 }) : c.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
      }
    });
    dlg.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') go(idx + 1);
      if (e.key === 'ArrowLeft') go(idx - 1);
    });
    let sx = null;
    dlg.addEventListener('touchstart', e => { if (e.target.closest('.rv__stage')) sx = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1)); sx = null; });
  }
  document.addEventListener('click', e => {
    const o = e.target.closest('[data-open]');
    if (o) { e.preventDefault(); openListing(o.dataset.open); }
  });
  function openFromHash() {
    const m = location.hash.match(/^#home\/(.+)$/);
    if (m) openListing(decodeURIComponent(m[1]));
  }
  window.openListing = openListing;

  /* ---------------- forms ---------------- */
  function setForm(kind, listingId) {
    const r = $(`[name="intent"][value="${kind}"]`);
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
    const sel = $('[data-showing-select]');
    if (sel && listingId) sel.value = listingId;
  }
  window.setForm = setForm;
  document.addEventListener('change', e => {
    if (e.target.name !== 'intent') return;
    const form = e.target.closest('form');
    $$('[data-intent]', form).forEach(g => {
      const on = g.dataset.intent === e.target.value;
      g.hidden = !on;
      $$('input,select,textarea', g).forEach(i => { i.disabled = !on; });
    });
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-intent-link]');
    if (a) setForm(a.dataset.intentLink);
  });
  $$('form[data-lead]').forEach(form => {
    const init = $('[name="intent"]:checked', form);
    if (init) init.dispatchEvent(new Event('change', { bubbles: true }));
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const name = (form.elements.name && form.elements.name.value.split(' ')[0]) || '';
      const done = $('[data-done]', form.parentElement);
      form.hidden = true;
      if (done) {
        done.hidden = false;
        const n = $('[data-done-name]', done); if (n) n.textContent = name;
        done.focus();
      }
    });
  });
  $$('[data-reset]').forEach(b => b.addEventListener('click', () => {
    const wrap = b.closest('[data-done]'); const form = $('form[data-lead]', wrap.parentElement);
    form.reset(); form.hidden = false; wrap.hidden = true;
    const init = $('[name="intent"]:checked', form); if (init) init.dispatchEvent(new Event('change', { bubbles: true }));
  }));

  /* ---------------- nav ---------------- */
  const nav = $('.nav');
  const menuBtn = $('.nav__burger');
  const menu = $('#menu');
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    menu.toggleAttribute('inert', !open);
    root.classList.toggle('is-menu', open);
    if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
  }
  if (menu) menu.setAttribute('inert', '');
  if (menuBtn) menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2 || id.startsWith('#home/')) return;
    const tgt = document.querySelector(id);
    if (!tgt) return;
    e.preventDefault();
    setMenu(false);
    if (a.dataset.intentLink) setForm(a.dataset.intentLink);
    if (window.__lenis) window.__lenis.scrollTo(tgt, { offset: 0, duration: 1.6 });
    else tgt.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    if (tgt.tabIndex < 0 && !tgt.hasAttribute('tabindex')) tgt.setAttribute('tabindex', '-1');
    setTimeout(() => tgt.focus({ preventScroll: true }), reduce ? 0 : 900);
  });
  let lastY = 0;
  function onScroll(y) {
    if (!nav) return;
    nav.classList.toggle('is-solid', y > (SITE.navSolidAt || 80));
    nav.classList.toggle('is-hidden', y > 600 && y > lastY + 2 && !root.classList.contains('is-menu'));
    if (y < lastY - 2) nav.classList.remove('is-hidden');
    lastY = y;
  }

  /* ---------------- motion ---------------- */
  function wrapWords(el) {
    if (el.dataset.split === 'done') return;
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const o = document.createElement('span'); o.className = 'w';
            const i = document.createElement('span'); i.className = 'w__i'; i.textContent = p;
            o.appendChild(i); frag.appendChild(o);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    el.dataset.split = 'done';
  }

  function initMotion() {
    const hasG = window.gsap && window.ScrollTrigger;
    if (!hasG) { root.classList.add('no-motion'); return; }
    gsap.registerPlugin(ScrollTrigger);
    if (reduce) { root.classList.add('no-motion'); window.addEventListener('scroll', () => onScroll(scrollY), { passive: true }); return; }

    if (window.Lenis) {
      const lenis = new Lenis({ duration: 1.25, easing: x => Math.min(1, 1.001 - Math.pow(2, -10 * x)), smoothWheel: true });
      window.__lenis = lenis;
      lenis.on('scroll', e => { ScrollTrigger.update(); onScroll(e.scroll); });
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else window.addEventListener('scroll', () => onScroll(scrollY), { passive: true });

    // headline word reveals
    $$('[data-split]').forEach(el => {
      wrapWords(el);
      gsap.fromTo($$('.w__i', el), { yPercent: 110 }, {
        yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: .045,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
    document.addEventListener('langchange', () => {
      $$('[data-split]').forEach(el => { el.dataset.split = ''; wrapWords(el); gsap.set($$('.w__i', el), { yPercent: 0 }); });
    });
    $$('[data-reveal]').forEach(el => {
      if (el.closest('[data-listings]')) return;
      gsap.fromTo(el, { y: 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out', delay: (+el.dataset.reveal || 0) * .08, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    $$('[data-parallax]').forEach(el => {
      const amt = +el.dataset.parallax || 12;
      gsap.fromTo(el, { yPercent: -amt / 2 }, { yPercent: amt / 2, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('[data-clip]').forEach(el => {
      gsap.fromTo(el, { clipPath: 'inset(14% 10% 14% 10%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 35%', scrub: true } });
    });
    $$('[data-line]').forEach(el => {
      gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
    if (typeof SITE.motion === 'function') SITE.motion({ gsap, ScrollTrigger, $, $$ });
  }

  /* cursor label for listing cards (fine pointers only) */
  function initCursor() {
    if (reduce || !window.matchMedia('(pointer: fine)').matches) return;
    const c = document.createElement('div');
    c.className = 'cursor'; c.setAttribute('aria-hidden', 'true'); c.innerHTML = '<span></span>';
    document.body.appendChild(c);
    let x = 0, y = 0, cx = 0, cy = 0;
    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY;
      const h = e.target.closest && e.target.closest('[data-cursor]');
      c.classList.toggle('is-on', !!h);
      if (h) c.firstChild.textContent = h.dataset.cursor;
    }, { passive: true });
    (function loop() { cx += (x - cx) * .2; cy += (y - cy) * .2; c.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
  }

  /* year */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  applyLang(lang);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { initMotion(); initCursor(); });
  else { initMotion(); initCursor(); }
  addEventListener('load', () => {
    root.classList.add('is-loaded');
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
})();
