/* Brújula · English / Spanish.
   English is written in the page. Any element with data-es="…" swaps its content; data-es-alt, data-es-aria-label,
   data-es-placeholder, data-es-content and data-es-title swap that attribute. The choice is kept in localStorage
   and can be forced with ?lang=es. Scripts listen for the "langchange" event. */
(() => {
  const KEY = 'brujula-lang', ATTRS = ['alt', 'aria-label', 'placeholder', 'content', 'title'];
  const $$ = s => [...document.querySelectorAll(s)];
  let current = 'en';

  // remember the English once
  $$('[data-es]').forEach(el => { if (!el.hasAttribute('data-en')) el.dataset.en = el.tagName === 'TITLE' ? el.textContent : el.innerHTML; });
  ATTRS.forEach(a => $$(`[data-es-${a}]`).forEach(el => { if (!el.hasAttribute(`data-en-${a}`)) el.setAttribute(`data-en-${a}`, el.getAttribute(a) || ''); }));

  function set(lang, save = true) {
    current = lang === 'es' ? 'es' : 'en';
    document.documentElement.lang = current;
    $$('[data-es]').forEach(el => {
      const v = el.dataset[current];
      if (v == null) return;
      if (el.tagName === 'TITLE') document.title = v; else el.innerHTML = v;
    });
    ATTRS.forEach(a => $$(`[data-es-${a}]`).forEach(el => el.setAttribute(a, el.getAttribute(`data-${current}-${a}`))));
    $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === current)));
    if (save) try { localStorage.setItem(KEY, current); } catch (e) {}
    document.dispatchEvent(new CustomEvent('langchange', { detail: current }));
  }

  let start = 'en';
  try { start = new URLSearchParams(location.search).get('lang') || localStorage.getItem(KEY) || 'en'; } catch (e) {}
  set(start, false);
  document.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) set(b.dataset.lang); });

  window.i18n = { get lang() { return current; }, set, t: (en, es) => current === 'es' ? es : en };
})();
