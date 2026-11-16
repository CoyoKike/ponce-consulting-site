// EN/ES toggle. English is the page's own text; Spanish sits next to it in data-es attributes.
// The choice is remembered in localStorage under the site's own key.
const ATTRS = ['alt', 'aria-label', 'placeholder', 'content', 'title'];

export function initLang(storeKey, onChange) {
  const sel = ['[data-es]', ...ATTRS.map(a => `[data-es-${a}]`)].join(',');
  const els = [...document.querySelectorAll(sel)];
  els.forEach(el => {
    if (el.hasAttribute('data-es')) el.dataset.en = el.innerHTML;
    ATTRS.forEach(a => { if (el.hasAttribute('data-es-' + a)) el.setAttribute('data-en-' + a, el.getAttribute(a) || ''); });
  });
  let lang = 'en';
  try { lang = localStorage.getItem(storeKey) === 'es' ? 'es' : 'en'; } catch (e) {}
  const apply = (l, save) => {
    lang = l;
    els.forEach(el => {
      if (el.hasAttribute('data-es')) el.innerHTML = l === 'es' ? el.dataset.es : el.dataset.en;
      ATTRS.forEach(a => { if (el.hasAttribute('data-es-' + a)) el.setAttribute(a, el.getAttribute(`data-${l}-${a}`)); });
    });
    document.documentElement.lang = l;
    if (save) { try { localStorage.setItem(storeKey, l); } catch (e) {} }
    onChange && onChange(l);
  };
  document.querySelectorAll('.lang').forEach(b => b.addEventListener('click', () => apply(lang === 'es' ? 'en' : 'es', true)));
  apply(lang, false);
  return { get: () => lang };
}
