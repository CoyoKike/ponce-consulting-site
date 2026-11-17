/* Casa Solana Realty: the team, the agent profiles and page-specific motion.
   Loaded before core.js. To change an agent, edit the list below (README explains each field). */
window.SITE = Object.assign(window.SITE || {}, {
  cardStyle: 'tile',
  viewLabel: ['View home', 'Ver casa'],
  gridTail(n) {
    if (n % 3 === 0) return '';
    const es = document.documentElement.lang === 'es';
    return `<a class="card card--tail" href="#contact" data-intent-link="showing" data-reveal>
      <span class="eyebrow">${es ? 'Antes del cartel' : 'Before the sign goes up'}</span>
      <b>${es ? '¿No ve la casa que busca?' : "Don't see the right house?"}</b>
      <span>${es ? 'Muchas casas de nuestros vecinos se venden antes de anunciarse. Díganos qué busca y le avisamos primero.' : 'Many of our neighbors sell before they ever list. Tell us what you need and you hear about it first.'}</span>
      <i aria-hidden="true"></i></a>`;
  },
  navSolidAt: 60,
  agents: [
    {
      id: 'marisela', name: 'Marisela Solana', initials: 'MS', color: '#c4573a',
      role: { en: 'Founder · Broker', es: 'Fundadora · Corredora' },
      focus: { en: 'Pool homes and lakefront in Miami Lakes', es: 'Casas con piscina y frente al lago en Miami Lakes' },
      areas: 'Miami Lakes · Doral Isles · Country Club of Miami',
      langs: { en: 'Spanish, English', es: 'Español, inglés' },
      phone: '(305) 555-0118', tel: '+13055550118', email: 'marisela@casasolana.com',
      photo: '',
      bio: {
        en: 'Marisela opened Casa Solana in 2004 after ten years processing mortgages at a community bank, which is why she reads every appraisal before her buyers do. She has lived on the same Miami Lakes lake for twenty years and still walks it at six every morning.',
        es: 'Marisela abrió Casa Solana en 2004 después de diez años tramitando hipotecas en un banco comunitario; por eso lee cada tasación antes que sus compradores. Vive frente al mismo lago de Miami Lakes desde hace veinte años y todavía lo camina a las seis de la mañana.'
      },
      regions: ['lakes'], pin: [-31, -52]
    },
    {
      id: 'andres', name: 'Andrés Solana', initials: 'AS', color: '#c99232',
      role: { en: 'Investors · Multifamily', es: 'Inversionistas · Multifamiliares' },
      focus: { en: 'Duplexes, fourplexes and small buildings in Hialeah', es: 'Dúplex, cuádruplex y edificios pequeños en Hialeah' },
      areas: 'Hialeah · Hialeah Gardens · Palm Springs North',
      langs: { en: 'Spanish, English', es: 'Español, inglés' },
      phone: '(786) 555-0127', tel: '+17865550127', email: 'andres@casasolana.com',
      photo: '',
      bio: {
        en: "Marisela's son. Andrés runs the numbers before the tour: rent rolls, insurance, the real cost of a new roof. He owns two duplexes on East 4th Avenue and manages them himself, so he knows what a tenant calls about at midnight.",
        es: 'El hijo de Marisela. Andrés saca las cuentas antes de la visita: rentas, seguro, lo que de verdad cuesta un techo nuevo. Tiene dos dúplex en la avenida 4 del Este y los administra él mismo, así que sabe por qué llama un inquilino a medianoche.'
      },
      regions: ['hialeah'], pin: [30, -42]
    },
    {
      id: 'yanelis', name: 'Yanelis Cabrera', initials: 'YC', color: '#1f8a7a',
      role: { en: 'First-time buyers', es: 'Primera vivienda' },
      focus: { en: 'FHA, down-payment help and first homes', es: 'FHA, ayuda para el pago inicial y primeras casas' },
      areas: 'Westchester · Miami Springs · Fontainebleau',
      langs: { en: 'Spanish, English', es: 'Español, inglés' },
      phone: '(305) 555-0163', tel: '+13055550163', email: 'yanelis@casasolana.com',
      photo: '',
      bio: {
        en: 'Yanelis bought her first house in Westchester at 26 with an FHA loan and a county assistance program, and she has walked dozens of families through the same paperwork since. She keeps a checklist in Spanish that her clients pass on to their cousins.',
        es: 'Yanelis compró su primera casa en Westchester a los 26 con un préstamo FHA y un programa de ayuda del condado, y desde entonces ha guiado a muchas familias por los mismos papeles. Tiene una lista de pasos en español que sus clientes le pasan a sus primos.'
      },
      regions: ['west', 'springs'], pin: [-14, 51]
    },
    {
      id: 'daniel', name: 'Daniel Ortega Rivas', initials: 'DO', color: '#3f63c4',
      role: { en: 'Relocation · Rentals', es: 'Mudanzas · Alquileres' },
      focus: { en: 'Moving from Venezuela, Colombia or Cuba to Doral', es: 'Mudarse a Doral desde Venezuela, Colombia o Cuba' },
      areas: 'Downtown Doral · Doral · Fontainebleau',
      langs: { en: 'Spanish, English, Portuguese', es: 'Español, inglés, portugués' },
      phone: '(786) 555-0189', tel: '+17865550189', email: 'daniel@casasolana.com',
      photo: '',
      bio: {
        en: 'Daniel moved from Caracas to Doral in 2015 and rented for three years before he could buy. He helps families do it in the right order: a lease that builds a rental history, the school zone first, then the purchase, with lenders who work with foreign income.',
        es: 'Daniel llegó de Caracas a Doral en 2015 y alquiló tres años antes de poder comprar. Ayuda a las familias a hacerlo en el orden correcto: un alquiler que construya historial, primero la zona escolar y después la compra, con prestamistas que trabajan con ingresos del exterior.'
      },
      regions: ['doral'], pin: [-27, -9]
    }
  ],
  motion({ gsap, $, $$ }) {
    const hero = $('[data-hero]');
    if (hero) {
      const setNav = () => { window.SITE.navSolidAt = hero.offsetHeight - 90; };
      setNav(); addEventListener('resize', setNav);
      gsap.to('.hero__copy', { yPercent: -14, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '8% top', end: '22% top', scrub: true } });
      gsap.from('.hero__eyebrow, .hero__lede, .hero__actions, .hero__team', { y: 26, autoAlpha: 0, duration: 1.5, ease: 'expo.out', stagger: .08, delay: .35 });
      gsap.fromTo('.hero__progress i', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true } });
    }
    $$('.tile-rule').forEach(el => gsap.fromTo(el, { backgroundPositionX: '0px' }, { backgroundPositionX: '-240px', ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } }));
  }
});

(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const A = window.SITE.agents;
  const L = v => (v && typeof v === 'object' ? (v[document.documentElement.lang === 'es' ? 'es' : 'en'] || v.en) : v || '');
  const t = (en, es) => (document.documentElement.lang === 'es' ? es : en);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function render() {
    // hero chips
    const chips = $('[data-team-chips]');
    if (chips) chips.innerHTML = A.map((a, i) => `<li><button type="button" class="chip" data-agent-chip="${i}" style="--ac:${a.color}"><i aria-hidden="true"></i><span>${esc(a.name.split(' ')[0])}</span><small>${esc(L(a.role))}</small></button></li>`).join('');
    // team grid
    const team = $('[data-team]');
    if (team) team.innerHTML = A.map((a, i) => `
      <article class="agent" style="--ac:${a.color}" data-reveal="${i}">
        <button type="button" class="agent__hit" data-agent-open="${a.id}" aria-label="${esc(t('Profile: ', 'Perfil: ') + a.name)}" data-cursor="${t('Profile', 'Perfil')}"></button>
        <figure class="agent__portrait">${a.photo ? `<img src="${esc(a.photo)}" alt="${esc(a.name)}" loading="lazy">` : `<span class="mono" aria-hidden="true">${esc(a.initials)}</span>`}</figure>
        <p class="agent__role">${esc(L(a.role))}</p>
        <h3 class="agent__name">${esc(a.name)}</h3>
        <p class="agent__focus">${esc(L(a.focus))}</p>
        <p class="agent__areas">${esc(a.areas)}</p>
        <span class="agent__more" aria-hidden="true">${t('Read profile', 'Ver perfil')}<i></i></span>
      </article>`).join('');
    // listing filter by agent
    const fl = $('[data-agent-filters]');
    if (fl) fl.innerHTML = A.map(a => `<button type="button" data-filter="agent:${a.id}" aria-pressed="false" style="--ac:${a.color}"><i aria-hidden="true"></i>${esc(a.name.split(' ')[0])}</button>`).join('');
    // form select
    const sel = $('[data-agent-select]');
    if (sel) { const v = sel.value; sel.innerHTML = `<option value="">${t('Whoever is free first', 'Quien esté libre primero')}</option>` + A.map(a => `<option value="${a.id}">${esc(a.name)} · ${esc(L(a.role))}</option>`).join(''); sel.value = v; }
    focusAgent(curAgent, true);
  }

  // hero panel follows the scroll story
  let curAgent = -1;
  function focusAgent(i, force) {
    if (i === curAgent && !force) return;
    curAgent = i;
    $$('[data-agent-chip]').forEach(b => b.classList.toggle('is-on', +b.dataset.agentChip === i));
    const card = $('[data-hero-agent]');
    if (!card) return;
    if (i < 0) { card.classList.remove('is-on'); return; }
    const a = A[i];
    card.style.setProperty('--ac', a.color);
    card.innerHTML = `
      <p class="ha__n"><span>${String(i + 1).padStart(2, '0')}</span> / ${String(A.length).padStart(2, '0')}</p>
      <p class="ha__role">${esc(L(a.role))}</p>
      <h2 class="ha__name">${esc(a.name)}</h2>
      <p class="ha__focus">${esc(L(a.focus))}</p>
      <p class="ha__areas">${esc(a.areas)}</p>
      <div class="ha__actions">
        <button type="button" class="btn btn--solid btn--sm" data-agent-open="${a.id}"><span>${t('Profile', 'Perfil')}</span><i aria-hidden="true"></i></button>
        <a class="btn btn--line btn--sm" href="#listings" data-agent-listings="${a.id}"><span>${t('Listings', 'Propiedades')}</span><i aria-hidden="true"></i></a>
      </div>`;
    card.classList.add('is-on');
  }
  document.addEventListener('agentfocus', e => focusAgent(e.detail));

  // agent profile dialog
  const dlg = $('#agent');
  let last = null;
  function openAgent(id) {
    const a = A.find(x => x.id === id); if (!a || !dlg) return;
    last = document.activeElement;
    dlg.style.setProperty('--ac', a.color);
    $('[data-a="mono"]', dlg).innerHTML = a.photo ? `<img src="${esc(a.photo)}" alt="${esc(a.name)}">` : `<span aria-hidden="true">${esc(a.initials)}</span>`;
    $('[data-a="role"]', dlg).textContent = L(a.role);
    $('[data-a="name"]', dlg).textContent = a.name;
    $('[data-a="focus"]', dlg).textContent = L(a.focus);
    $('[data-a="bio"]', dlg).textContent = L(a.bio);
    $('[data-a="areas"]', dlg).textContent = a.areas;
    $('[data-a="langs"]', dlg).textContent = L(a.langs);
    $('[data-a="phone"]', dlg).innerHTML = `<a href="tel:${a.tel}">${esc(a.phone)}</a>`;
    $('[data-a="wa"]', dlg).innerHTML = `<a href="https://wa.me/${a.tel.replace('+', '')}">WhatsApp</a>`;
    $('[data-a="email"]', dlg).innerHTML = `<a href="mailto:${a.email}">${esc(a.email)}</a>`;
    $('[data-a="book"]', dlg).dataset.agentBook = a.id;
    $('[data-a="list"]', dlg).dataset.agentListings = a.id;
    dlg.showModal();
    $('[data-a="close"]', dlg).focus({ preventScroll: true });
    document.documentElement.classList.add('is-locked');
    if (window.__lenis) window.__lenis.stop();
    if (window.gsap && !window.REDUCED) gsap.fromTo($('.ap__card', dlg), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, ease: 'expo.out' });
  }
  window.openAgent = openAgent;
  if (dlg) {
    dlg.addEventListener('close', () => { document.documentElement.classList.remove('is-locked'); if (window.__lenis) window.__lenis.start(); if (last && last.focus) last.focus(); });
    dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-a="close"]')) dlg.close(); });
  }
  const go = sel => { const el = $(sel); if (!el) return; window.__lenis ? window.__lenis.scrollTo(el, { offset: -20, duration: 1.4 }) : el.scrollIntoView({ behavior: window.REDUCED ? 'auto' : 'smooth' }); };
  document.addEventListener('click', e => {
    const o = e.target.closest('[data-agent-open]');
    if (o) { e.preventDefault(); openAgent(o.dataset.agentOpen); return; }
    const c = e.target.closest('[data-agent-chip]');
    if (c) { openAgent(A[+c.dataset.agentChip].id); return; }
    const b = e.target.closest('[data-agent-book]');
    if (b) { e.preventDefault(); if (dlg && dlg.open) dlg.close(); window.setForm && window.setForm('showing'); window.setAgent && window.setAgent(b.dataset.agentBook); go('#contact'); return; }
    const l = e.target.closest('[data-agent-listings]');
    if (l) {
      e.preventDefault(); e.stopPropagation();
      if (dlg && dlg.open) dlg.close();
      const f = $(`[data-filter="agent:${l.dataset.agentListings}"]`); if (f) f.click();
      go('#listings');
    }
  }, true);

  document.addEventListener('langchange', render);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
