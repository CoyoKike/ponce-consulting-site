// Ceiba & Coral Realty: language, smooth scroll, the hero house, listings from listings.json, hours, the showing form.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = matchMedia('(max-width: 900px)').matches;
const root = document.documentElement;
if (reduce) root.classList.add('reduce');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ================= language ================= */
const UI = {
  en: {
    bd: 'bd', ba: 'ba', sqft: 'sq ft', mo: '/mo', status: { 'for-sale': 'For sale', 'for-rent': 'For rent', sold: 'Sold' },
    book: 'Book a showing', sell: 'Sell yours with us', none: 'No homes in this list right now. New ones arrive every week.',
    homeHelp: 'Not sure yet, help me find one', homeSell: 'I want to sell my home',
    skyA: 'Sunset on the bay', skyB: 'Blue hour on the bay',
    open: until => `Open now · until ${until}`, opens: (d, t) => `Closed · opens ${d} ${t}`, opensToday: t => `Opens today at ${t}`,
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    missing: 'Please add your ', fields: { name: 'name', phone: 'phone', email: 'email', date: 'day' }, and: ' and ',
    done: (agent, home, day, time) => `${agent} will call you within the hour to confirm ${home} on ${day}, in the ${time}.`,
    times: { morning: 'morning', afternoon: 'afternoon', evening: 'evening' }, aHome: 'a showing', yourHome: 'a visit to your home',
    title: 'Ceiba & Coral Realty · Miami homes, in your language'
  },
  es: {
    bd: 'hab', ba: 'baños', sqft: 'pies²', mo: '/mes', status: { 'for-sale': 'En venta', 'for-rent': 'En alquiler', sold: 'Vendida' },
    book: 'Agendar una visita', sell: 'Venda la suya con nosotros', none: 'No hay casas en esta lista ahora mismo. Llegan nuevas cada semana.',
    homeHelp: 'Todavía no sé, ayúdenme a encontrar una', homeSell: 'Quiero vender mi casa',
    skyA: 'Atardecer sobre la bahía', skyB: 'Hora azul sobre la bahía',
    open: until => `Abierto ahora · hasta las ${until}`, opens: (d, t) => `Cerrado · abre el ${d} a las ${t}`, opensToday: t => `Abre hoy a las ${t}`,
    days: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    missing: 'Por favor escriba su ', fields: { name: 'nombre', phone: 'teléfono', email: 'correo', date: 'día' }, and: ' y ',
    done: (agent, home, day, time) => `${agent} le llamará dentro de una hora para confirmar ${home} el ${day}, en la ${time}.`,
    times: { morning: 'mañana', afternoon: 'tarde', evening: 'noche' }, aHome: 'la visita', yourHome: 'la visita a su casa',
    title: 'Ceiba & Coral Realty · Casas en Miami, en su idioma'
  }
};
let lang = 'en';
try { lang = new URLSearchParams(location.search).get('lang') || localStorage.getItem('cc-lang') || 'en'; } catch (e) { }
if (lang !== 'es') lang = 'en';
const t = () => UI[lang];

const ATTRS = ['alt', 'placeholder', 'aria-label', 'content'];
$$('[data-es]').forEach(el => { el.dataset.en = el.innerHTML; });
ATTRS.forEach(a => $$(`[data-es-${a}]`).forEach(el => { el.dataset[`en${camel(a)}`] = el.getAttribute(a) ?? ''; }));
function camel(a) { return a.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(''); }

function applyLang(next, first = false) {
  lang = next;
  root.lang = lang;
  try { localStorage.setItem('cc-lang', lang); } catch (e) { }
  $$('[data-es]').forEach(el => {
    const html = lang === 'es' ? el.dataset.es : el.dataset.en;
    if (el.classList.contains('split')) { el.dataset.raw = html; splitWords(el, html); } else el.innerHTML = html;
  });
  ATTRS.forEach(a => $$(`[data-es-${a}]`).forEach(el => el.setAttribute(a, lang === 'es' ? el.getAttribute(`data-es-${a}`) : el.dataset[`en${camel(a)}`])));
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  document.title = t().title;
  if (!first) { renderListings(); fillSelect(); paintHours(); paintSky(true); }
}

/* split a heading into words so each word can rise into view; keeps inline tags like <em> */
function splitWords(el, html = el.innerHTML) {
  const tmp = document.createElement('div'); tmp.innerHTML = html;
  const out = [];
  const walk = (node, wrapOpen = '', wrapClose = '') => {
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach(w => { if (!w) return; out.push(/^\s+$/.test(w) ? ' ' : `<span class="w"><span>${wrapOpen}${w}${wrapClose}</span></span>`); });
      else if (n.nodeName === 'BR') out.push('<br>');
      else { const tag = n.nodeName.toLowerCase(); walk(n, `${wrapOpen}<${tag}>`, `</${tag}>${wrapClose}`); }
    });
  };
  walk(tmp);
  el.innerHTML = out.join('');
  el.classList.add('is-split');
}
$$('.split').forEach(el => splitWords(el));
$$('.lang button').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang)));

/* ================= listings ================= */
let LIST = [], filter = 'all';
const grid = $('.grid');
const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const num = n => new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US').format(n);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderListings() {
  const L = t();
  const items = LIST.filter(x => filter === 'all' || x.status === filter);
  if (!items.length) { grid.innerHTML = `<p class="card__blurb">${L.none}</p>`; return; }
  grid.innerHTML = items.map((x, i) => {
    const sold = x.status === 'sold', rent = x.status === 'for-rent';
    const small = x.photo.replace(/\.webp$/, '-800.webp');
    const big = i === 0 && !isPhone;
    return `<article class="card${sold ? ' is-sold' : ''}" data-id="${esc(x.id)}">
      <figure class="card__img"><img src="${esc(big ? x.photo : small)}" srcset="${esc(small)} 800w, ${esc(x.photo)} 1400w" sizes="${big ? '(max-width: 900px) 92vw, 64vw' : '(max-width: 900px) 92vw, 32vw'}" alt="${esc(x[`photo_alt_${lang}`])}" loading="lazy" width="800" height="600">
        <span class="card__status card__status--${esc(x.status)}">${L.status[x.status]}</span></figure>
      <div class="card__body">
        <div class="card__top"><p class="card__price">${money(x.price)}${rent ? `<small>${L.mo}</small>` : ''}</p><p class="card__hood">${esc(x.neighborhood)}</p></div>
        <h3 class="card__title">${esc(x[`title_${lang}`])}</h3>
        <p class="card__addr">${esc(x.address)}</p>
        <p class="card__blurb">${esc(x[`blurb_${lang}`])}</p>
        <ul class="card__specs"><li><b>${x.beds}</b> ${L.bd}</li><li><b>${x.baths}</b> ${L.ba}</li><li><b>${num(x.sqft)}</b> ${L.sqft}</li></ul>
        <a class="card__cta" href="#book" data-pick="${sold ? '__sell' : esc(x.id)}">${sold ? L.sell : L.book} <span aria-hidden="true">→</span></a>
      </div></article>`;
  }).join('');
  if (window.gsap && !reduce) gsap.from(grid.children, { y: 26, opacity: 0, duration: .8, stagger: .06, ease: 'power3.out', clearProps: 'all' });
  window.ScrollTrigger?.refresh();
}
function fillSelect() {
  const sel = $('#f-home'), keep = sel.value, L = t();
  const opts = LIST.filter(x => x.status !== 'sold').map(x => `<option value="${esc(x.id)}">${esc(x[`title_${lang}`])} · ${esc(x.neighborhood)}</option>`);
  sel.innerHTML = `<option value="__help">${L.homeHelp}</option>${opts.join('')}<option value="__sell">${L.homeSell}</option>`;
  if (keep && [...sel.options].some(o => o.value === keep)) sel.value = keep;
}
grid.addEventListener('click', e => { const a = e.target.closest('[data-pick]'); if (a) { $('#f-home').value = a.dataset.pick; } });
$$('.chip').forEach(c => c.addEventListener('click', () => {
  filter = c.dataset.filter;
  $$('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === c)));
  renderListings();
}));
fetch('listings.json').then(r => r.json()).then(d => { LIST = d; renderListings(); fillSelect(); }).catch(() => { grid.innerHTML = ''; });

/* ================= hours, in Miami time ================= */
const HOURS = { 0: [11, 17], 1: [9, 19], 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [10, 18] };
function miamiNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), h: +p.hour + +p.minute / 60 };
}
const fmtH = h => lang === 'es' ? `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'a. m.' : 'p. m.'}` : `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'am' : 'pm'}`;
function paintHours() {
  const { day, h } = miamiNow(), L = t(), el = $('[data-open]');
  $$('.hours tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.day === day));
  const today = HOURS[day];
  el.classList.toggle('is-open', h >= today[0] && h < today[1]);
  if (h >= today[0] && h < today[1]) el.textContent = L.open(fmtH(today[1]));
  else if (h < today[0]) el.textContent = L.opensToday(fmtH(today[0]));
  else { const d = (day + 1) % 7; el.textContent = L.opens(L.days[d], fmtH(HOURS[d][0])); }
}

/* ================= form ================= */
const form = $('.form'), msg = $('.form__msg');
const dateIn = $('#f-date');
{ const d = new Date(); d.setDate(d.getDate() + 1); dateIn.min = new Date().toISOString().slice(0, 10); dateIn.value = d.toISOString().slice(0, 10); }
form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('is-bad'));
form.addEventListener('submit', e => {
  e.preventDefault();
  const L = t(), bad = [];
  [['name', v => v.trim().length > 1], ['phone', v => v.replace(/\D/g, '').length >= 10], ['email', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)], ['date', v => !!v]].forEach(([n, ok]) => {
    const i = form.elements[n];
    if (!ok(i.value)) { i.closest('.field').classList.add('is-bad'); i.setAttribute('aria-invalid', 'true'); bad.push(L.fields[n]); } else i.removeAttribute('aria-invalid');
  });
  if (bad.length) {
    msg.textContent = L.missing + (bad.length > 1 ? bad.slice(0, -1).join(', ') + L.and + bad.at(-1) : bad[0]) + '.';
    form.querySelector('[aria-invalid]')?.focus();
    return;
  }
  msg.textContent = '';
  const pick = form.elements.home.value, x = LIST.find(l => l.id === pick);
  const agent = pick === '__sell' ? 'Inés' : !x ? 'Rafael' : x.neighborhood === 'Key Biscayne' || x.price > 4e6 ? 'Camila' : x.neighborhood === 'Brickell' ? 'Joaquín' : 'Rafael';
  const home = x ? `“${x[`title_${lang}`]}”` : pick === '__sell' ? L.yourHome : L.aHome;
  const day = new Date(dateIn.value + 'T12:00').toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  $('.form__who').textContent = form.elements.name.value.trim().split(/\s+/)[0];
  $('.form__done-text').textContent = L.done(agent, home, day, L.times[form.elements.time.value]);
  const done = $('.form__done'); done.hidden = false; done.focus();
  if (window.gsap && !reduce) gsap.from(done, { clipPath: 'inset(100% 0 0 0)', duration: .9, ease: 'expo.inOut' });
});
$('.form__again').addEventListener('click', () => { form.reset(); $('.form__done').hidden = true; dateIn.value = dateIn.min; fillSelect(); form.elements.name.focus(); });

/* ================= mobile menu ================= */
const menuBtn = $('.nav__menu'), mnav = $('#mnav');
const setMenu = open => { menuBtn.setAttribute('aria-expanded', String(open)); mnav.hidden = !open; document.body.classList.toggle('menu-open', open); open ? lenis?.stop() : lenis?.start(); };
menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
mnav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !mnav.hidden) { setMenu(false); menuBtn.focus(); } });

/* ================= hero: clock + sky label follow the dusk ================= */
let heroP = 0;
function paintSky(force) {
  const mins = 18 * 60 + 41 + Math.round(heroP * 48);   // 6:41 pm to 7:29 pm
  const hh = Math.floor(mins / 60), mm = mins % 60;
  $('.hero__time').textContent = lang === 'es' ? `${hh - 12}:${String(mm).padStart(2, '0')} p. m.` : `${hh - 12}:${String(mm).padStart(2, '0')} pm`;
  const label = heroP > .55 ? t().skyB : t().skyA, sky = $('.hero__sky');
  if (force || sky.textContent !== label) sky.textContent = label;
}

/* ================= boot: libraries load deferred, then motion ================= */
let lenis = null;
function boot() {
  applyLang(lang, true); paintHours(); setInterval(paintHours, 60000); paintSky(true);
  const G = window.gsap, ST = window.ScrollTrigger;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: .09, smoothWheel: true });
    window.__lenis = lenis;
    if (G && ST) { lenis.on('scroll', ST.update); G.ticker.add(t => lenis.raf(t * 1000)); G.ticker.lagSmoothing(0); }
    else { const r = t => { lenis.raf(t); requestAnimationFrame(r); }; requestAnimationFrame(r); }
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const id = a.getAttribute('href'); if (id.length > 1 && $(id)) { e.preventDefault(); lenis.scrollTo(id === '#top' ? 0 : $(id), { offset: id === '#top' ? 0 : -70, duration: 1.4 }); } }));
  }
  if (G && ST) G.registerPlugin(ST);

  /* nav: white over the hero, sand once past it; tucks away while reading down */
  const nav = $('.nav'), hero = $('.hero');
  let lastY = 0;
  const onScroll = y => {
    const past = y > hero.offsetHeight - 90;
    nav.classList.toggle('is-solid', past);
    nav.classList.toggle('is-hidden', past && y > lastY + 4 && y > hero.offsetHeight + 300 && mnav.hidden);
    if (y < lastY - 4 || !past) nav.classList.remove('is-hidden');
    lastY = y;
  };
  lenis ? lenis.on('scroll', e => onScroll(e.scroll)) : addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  onScroll(scrollY);

  /* hero 3D */
  const canvas = $('.hero__canvas');
  const done = () => root.classList.add('loaded');
  setTimeout(done, 3500);
  import('./hero3d.js').then(m => m.initHero(canvas, { reduce, isPhone })).then(h => {
    window.__hero = h;
    done();
    if (reduce) { h.setProgress(.42); return; }
    new IntersectionObserver(([en]) => en.isIntersecting ? h.start() : h.stop()).observe(canvas);
    addEventListener('pointermove', e => h.setPointer(e.clientX / innerWidth - .5, e.clientY / innerHeight - .5), { passive: true });
    if (G && ST) ST.create({ trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: s => { heroP = s.progress; h.setProgress(s.progress); paintSky(); } });
  }).catch(err => { console.error(err); done(); });

  if (!G || !ST || reduce) return;

  /* hero copy: title rises in, then gives way to the evening line */
  G.from('.hero__title .line > span', { yPercent: 110, duration: 1.3, stagger: .1, ease: 'expo.out', delay: .5 });
  G.from(['.hero__copy .eyebrow', '.hero__lede', '.hero__actions', '.hero__card'], { y: 20, opacity: 0, duration: 1, stagger: .08, ease: 'power3.out', delay: .8 });
  const tl = G.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: .6 } });
  tl.to('.hero__copy', { opacity: 0, y: -40, duration: .22, ease: 'none' }, .18)
    .to('.hero__scroll', { opacity: 0, duration: .1 }, .05)
    .fromTo('.hero__later', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: .2, ease: 'none' }, .52)
    .to('.hero__later', { duration: .28 }, .72);

  /* headings rise word by word; blocks fade up */
  $$('.split:not(.hero__title)').forEach(el => {
    ST.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => G.fromTo(el.querySelectorAll('.w > span'), { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: .035, ease: 'expo.out' }) });
    G.set(el.querySelectorAll('.w > span'), { yPercent: 110 });
  });
  const ups = ['.statement__photo', '.chips', '.svc__item', '.agent', '.reviews__track', '.form', '.visit__addr', '.visit__open', '.hours', '.visit__links', '.map', '.book__lede', '.book__direct', '.foot__cols'];
  ups.forEach(s => $$(s).forEach(el => G.from(el, { y: 36, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } })));
  G.to('.statement__photo img', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'bottom top', scrub: true } });
  G.from('.foot__word', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 85%', once: true } });

  /* neighborhoods: vertical scroll drives the row sideways on desktop */
  const mm = G.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const track = $('.hoods__track');
    const dist = () => Math.max(0, track.scrollWidth - (innerWidth - track.getBoundingClientRect().left + G.getProperty(track, 'x')));
    const tw = G.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.hoods', start: 'top top', end: () => '+=' + dist(), pin: '.hoods__pin', scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 } });
    $$('.hood figure img').forEach(img => G.fromTo(img, { xPercent: 6 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: img, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } }));
    /* reviews: a slow endless row */
    const rt = $('.reviews__track');
    [...rt.children].forEach(f => { const c = f.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.classList.add('is-clone'); rt.appendChild(c); });
    const loop = G.to(rt, { xPercent: -50, duration: 60, ease: 'none', repeat: -1 });
    rt.addEventListener('mouseenter', () => loop.timeScale(.15)); rt.addEventListener('mouseleave', () => loop.timeScale(1));
    rt.addEventListener('focusin', () => loop.pause()); rt.addEventListener('focusout', () => loop.play());
    return () => { loop.kill(); G.set(rt, { xPercent: 0 }); $$('.review.is-clone').forEach(c => c.remove()); };
  });
  addEventListener('load', () => ST.refresh());
}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
