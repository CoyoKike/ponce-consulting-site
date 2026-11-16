// Maíz Morado: boot. Menu, pickup order, hours and photos all work without WebGL or motion.
import { $, $$, reduce, isPhone, initLang, initScroll, initReveals, initParallax, initLightbox, initHours, flNow, fmtH, L, getLang, hasGL } from './core.js';

const HOURS = { 0: [10, 16], 1: null, 2: [11, 21], 3: [11, 21], 4: [11, 21], 5: [11, 23], 6: [11, 23] };
const money = n => '$' + n.toFixed(2);

/* ================= Menu categories ================= */
function initCats() {
  const cats = $$('.cat'), panels = $$('.cards');
  const show = (name, focus) => {
    cats.forEach(c => { const on = c.dataset.cat === name; c.classList.toggle('is-on', on); c.setAttribute('aria-selected', on); c.tabIndex = on ? 0 : -1; if (on && focus) c.focus(); });
    panels.forEach(p => { const on = p.id === 'c-' + name; p.hidden = !on; p.classList.toggle('is-on', on); });
    if (!reduce && window.gsap) window.gsap.from($$('#c-' + name + ' .card'), { y: 40, opacity: 0, rotate: () => (Math.random() - .5) * 4, duration: .7, stagger: .06, ease: 'back.out(1.6)', clearProps: 'all' });
    window.ScrollTrigger?.refresh();
  };
  cats.forEach((c, i) => {
    c.addEventListener('click', () => show(c.dataset.cat));
    c.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); show(cats[(i + d + cats.length) % cats.length].dataset.cat, true); }
    });
  });
}

/* ================= Pickup order ================= */
function initOrder() {
  const cart = new Map(); // id -> { qty }
  const tray = $('.tray'), list = $('.tray__list'), empty = $('.tray__empty'), form = $('.tray__form'), done = $('.tray__done');
  const fab = $('.fab'), sum = $('.tray__sum'), err = $('.tray__err');
  const card = id => $(`.card[data-id="${id}"]`);
  const nameOf = id => $('h3', card(id)).textContent;
  const priceOf = id => parseFloat(card(id).dataset.price);
  let last = null;

  const slots = () => {
    const sel = form.elements.when, { day, h } = flNow(); sel.innerHTML = '';
    const t = HOURS[day];
    const add = (v, label) => { const o = document.createElement('option'); o.value = v; o.textContent = label; sel.append(o); };
    if (t && h < t[1] - 0.25) {
      let s = Math.max(t[0], Math.ceil((h + 0.25) * 4) / 4);
      add('asap', L('As soon as possible (about 15 min)', 'Lo antes posible (unos 15 min)'));
      for (; s <= t[1] - 0.25; s += 0.25) add(s, L('Today at ', 'Hoy a las ') + fmtH(s));
    } else {
      let d = (day + 1) % 7; while (!HOURS[d]) d = (d + 1) % 7;
      const names = L(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']);
      for (let s = HOURS[d][0] + 0.25; s <= HOURS[d][1] - 0.25; s += 0.25) add('d' + s, `${names[d]}, ${fmtH(s)}`);
    }
  };
  const render = () => {
    list.innerHTML = '';
    let n = 0, total = 0;
    cart.forEach((v, id) => {
      n += v.qty; total += v.qty * priceOf(id);
      const li = document.createElement('li'); li.className = 'tline';
      li.innerHTML = `<img src="${$('img', card(id)).getAttribute('src')}" alt=""><div><b>${nameOf(id)}</b><span>${money(priceOf(id))}</span></div>
        <div class="qty"><button type="button" data-d="-1" aria-label="${L('One fewer', 'Uno menos')} ${nameOf(id)}">−</button><output aria-live="polite">${v.qty}</output><button type="button" data-d="1" aria-label="${L('One more', 'Uno más')} ${nameOf(id)}">+</button></div>`;
      li.dataset.id = id;
      $$('button', li).forEach(b => b.addEventListener('click', () => {
        change(id, +b.dataset.d);
        const same = $(`.tline[data-id="${id}"] [data-d="${b.dataset.d}"]`, list);
        (same || $('.tline button', list) || $('.tray__close')).focus();
      }));
      list.append(li);
    });
    empty.hidden = n > 0; form.hidden = n === 0 || !done.hidden;
    sum.textContent = money(total);
    fab.hidden = n === 0;
    $('.fab__n').textContent = n; $('.fab__t').textContent = money(total);
    $$('.card').forEach(c => { const q = cart.get(c.dataset.id)?.qty || 0; c.classList.toggle('in-cart', q > 0); c.dataset.qty = q || ''; });
  };
  const change = (id, d) => {
    const q = (cart.get(id)?.qty || 0) + d;
    if (q <= 0) cart.delete(id); else cart.set(id, { qty: Math.min(q, 30) });
    render();
  };
  $$('.card .add').forEach(b => b.addEventListener('click', () => {
    const c = b.closest('.card');
    change(c.dataset.id, 1);
    if (!reduce && window.gsap) {
      window.gsap.fromTo(b, { scale: .7 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
      window.gsap.fromTo(fab, { scale: 1.25 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
    }
  }));
  const open = () => {
    last = document.activeElement; slots(); render();
    tray.hidden = false; document.body.classList.add('tray-on'); window.__lenis?.stop();
    requestAnimationFrame(() => tray.classList.add('is-open'));
    $('.tray__close').focus();
  };
  const close = () => {
    tray.classList.remove('is-open'); document.body.classList.remove('tray-on'); window.__lenis?.start();
    setTimeout(() => { tray.hidden = true; }, reduce ? 0 : 350);
    last?.focus?.();
  };
  $$('.tray-open').forEach(b => b.addEventListener('click', open));
  $('.tray__close').addEventListener('click', close);
  tray.addEventListener('click', e => { if (e.target === tray) close(); });
  addEventListener('keydown', e => {
    if (tray.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = $$('button:not([hidden]), input, select, [tabindex="-1"]:not([hidden])', tray).filter(x => x.offsetParent !== null);
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const nm = form.elements.name, ph = form.elements.phone;
    [nm, ph].forEach(i => { i.classList.remove('is-bad'); i.removeAttribute('aria-invalid'); });
    let msg = '';
    if (!nm.value.trim()) { msg = L('Add a name for the order.', 'Agrega un nombre para el pedido.'); nm.classList.add('is-bad'); nm.setAttribute('aria-invalid', 'true'); nm.focus(); }
    else if (ph.value.replace(/\D/g, '').length < 10) { msg = L('Add a phone number so we can text you when it is ready.', 'Agrega un teléfono para avisarte cuando esté listo.'); ph.classList.add('is-bad'); ph.setAttribute('aria-invalid', 'true'); ph.focus(); }
    err.textContent = msg;
    if (msg) return;
    const num = 100 + Math.floor(Math.random() * 800), when = form.elements.when.selectedOptions[0].textContent;
    done.innerHTML = `<p class="done__big">#${num}</p><h3>${L('Got it, ', '¡Listo, ')}${nm.value.trim().split(' ')[0]}${L('!', '!')}</h3>
      <p>${L(`Your order is on the comal. Pickup: ${when.toLowerCase()}. We will text you when it is bagged. Pay at the counter.`, `Tu pedido ya está en el comal. Recoger: ${when.toLowerCase()}. Te mandamos mensaje cuando esté listo. Pagas en el mostrador.`)}</p>
      <button type="button" class="btn btn--line done__new">${L('Start a new order', 'Hacer otro pedido')}</button>`;
    done.hidden = false; form.hidden = true; list.hidden = true; done.focus();
    $('.done__new', done).addEventListener('click', () => { cart.clear(); done.hidden = true; list.hidden = false; render(); close(); });
  });
  document.addEventListener('langchange', () => { if (!tray.hidden) { slots(); render(); } });
  render();
}

/* ================= La masa: sticky steps ================= */
function initMasa() {
  const steps = $$('.mstep'), dots = $$('.masa__dots li');
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(ents => ents.forEach(en => {
    if (!en.isIntersecting) return;
    const k = +en.target.dataset.step;
    steps.forEach((s, i) => s.classList.toggle('is-on', i === k));
    dots.forEach((d, i) => d.classList.toggle('is-on', i <= k));
  }), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));
  steps[0].classList.add('is-on');
}

/* ================= Motion ================= */
function initMotion(getHero) {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST) { getHero()?.intro(); return; }
  if (!reduce) {
    gsap.from('.hero__title .line > span', { y: 90, opacity: 0, rotate: 6, duration: 1.4, stagger: .12, ease: 'expo.out', delay: .15 });
    gsap.from(['.hero__tag', '.hero__lede', '.hero__actions'], { y: 30, opacity: 0, duration: 1.1, stagger: .08, delay: .45, ease: 'expo.out' });
    gsap.from('.hero__sticker', { scale: 0, rotate: -90, duration: 1.4, delay: .7, ease: 'back.out(1.7)' });
  }
  getHero()?.intro();
  if (reduce) { initParallax(); return; }
  // hero: walk forward under the flags as you scroll
  ST.create({ trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: s => getHero()?.setScroll(s.progress) });
  gsap.to('.hero__copy', { y: () => -innerHeight * .25, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__sticker', { rotate: 220, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  // marquee speeds up with scroll velocity
  const row = $('.marquee__row'); let x = 0, v = 0;
  ST.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onUpdate: s => { v = Math.min(12, Math.abs(s.getVelocity()) / 300); } });
  gsap.ticker.add(() => { x -= 0.6 + v; v *= 0.92; const w = row.scrollWidth / 2; if (-x > w) x += w; row.style.transform = `translate3d(${x}px,0,0)`; });
  // photo strips slide opposite ways
  gsap.fromTo('.strip--a', { x: () => -innerWidth * .05 }, { x: () => -(innerWidth * .35), ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.strip--b', { x: () => -(innerWidth * .35) }, { x: () => -innerWidth * .05, ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true } });
  // review notes land with a little spin
  $$('.note').forEach((n, i) => gsap.fromTo(n, { rotate: (i % 2 ? 1 : -1) * 10 }, { rotate: [-2.5, 2, -1.5, 3][i], ease: 'none', scrollTrigger: { trigger: n, start: 'top bottom', end: 'top 55%', scrub: true } }));
  initParallax();
}

/* ================= Boot ================= */
initLang('maiz-morado');
initCats();
initOrder();
initMasa();
initHours(HOURS);
initLightbox();
initReveals();
initScroll();

let hero = null;
(async () => {
  if (hasGL) {
    try {
      const { initPapel } = await import('./papel.js');
      hero = initPapel($('.hero__gl'), { reduce });
      document.documentElement.classList.add('has-gl');
    } catch (e) { console.warn('3D hero unavailable', e); }
  }
  initMotion(() => hero);
})();
