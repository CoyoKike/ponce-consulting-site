/* About page: English and Spanish text. Other languages get the interface words and a note, and the body stays
   in English, marked lang="en" so screen readers read it with English pronunciation. */
(() => {
  'use strict';
  const EN = {
    skipMain: 'Skip to the main content', navLabel: 'Main', navFind: 'Find help', navAbout: 'About us', navAccess: 'Accessibility', langLabel: 'Language',
    aEyebrow: 'About us', aH1a: 'Neighbors helping', aH1b: 'neighbors find help.',
    aLede: 'Vecina is a small Boston nonprofit. We keep a free, up-to-date map of community programs, in the languages our neighbors speak, and we build it so everyone can use it.',
    sEyebrow: 'Our story', sTitle: 'It started with a stack of flyers.',
    s1: 'In 2019, a librarian and two community health workers compared notes. Each of them kept a folder of flyers, phone numbers and sticky notes to help people find food, a clinic or rent help. Half of the numbers were out of date, and almost none of it was in Haitian Creole, Chinese or Vietnamese.',
    s2: 'They put the folders together into one shared list, then into a map. Today Vecina is run by a team of five and a group of volunteers who call every program on the map twice a year to check that it is still open.',
    doTitle: 'What we do',
    d1t: 'Keep the map current', d1: 'Volunteers check every listing twice a year. Programs can send updates any time, and we confirm them by phone.',
    d2t: 'Speak your language', d2: 'The map works in six languages today. Community members review the wording so it sounds natural, not machine-made.',
    d3t: 'Build for everyone', d3: 'The site is built to meet WCAG 2.1 AA, so it works with a keyboard, a screen reader, a small phone or large text.',
    d4t: 'Train front-line staff', d4: 'We run short trainings for library, clinic and school staff on how to use the map with the people they serve.',
    qA: '“Help should be easy to find,', qB: 'in any language.”', qBy: 'From the Vecina mission statement',
    teamTitle: 'The team',
    r1: 'Executive director', r2: 'Community partnerships', r3: 'Languages and translation', r4: 'Data and accessibility',
    cTitle: 'Work with us', cText: 'Run a program that should be on the map, or want a training for your staff? Write to us.',
    cMail: 'Email hello@vecina.example', cMap: 'Open the map',
    brandHome: 'Vecina, home', note: ''
  };
  const ES = {
    skipMain: 'Ir al contenido principal', navLabel: 'Principal', navFind: 'Buscar ayuda', navAbout: 'Quiénes somos', navAccess: 'Accesibilidad', langLabel: 'Idioma',
    aEyebrow: 'Quiénes somos', aH1a: 'Vecinos que ayudan', aH1b: 'a sus vecinos a encontrar ayuda.',
    aLede: 'Vecina es una pequeña organización sin fines de lucro de Boston. Mantenemos un mapa gratis y actualizado de programas comunitarios, en los idiomas de nuestros vecinos, hecho para que todos lo puedan usar.',
    sEyebrow: 'Nuestra historia', sTitle: 'Todo empezó con una pila de volantes.',
    s1: 'En 2019, una bibliotecaria y dos promotoras de salud compararon notas. Cada una tenía una carpeta con volantes, teléfonos y notas para ayudar a la gente a encontrar comida, una clínica o ayuda con la renta. La mitad de los números ya no servían, y casi nada estaba en criollo haitiano, chino o vietnamita.',
    s2: 'Juntaron las carpetas en una sola lista y luego en un mapa. Hoy Vecina lo lleva un equipo de cinco personas y un grupo de voluntarios que llaman dos veces al año a cada programa del mapa para confirmar que sigue abierto.',
    doTitle: 'Lo que hacemos',
    d1t: 'Mantener el mapa al día', d1: 'Los voluntarios revisan cada programa dos veces al año. Los programas pueden mandar cambios cuando quieran y los confirmamos por teléfono.',
    d2t: 'Hablar tu idioma', d2: 'Hoy el mapa funciona en seis idiomas. Personas de la comunidad revisan el texto para que suene natural, no hecho por máquina.',
    d3t: 'Hecho para todos', d3: 'El sitio está hecho para cumplir WCAG 2.1 AA: funciona con teclado, lector de pantalla, un teléfono pequeño o letra grande.',
    d4t: 'Capacitar al personal', d4: 'Damos capacitaciones cortas al personal de bibliotecas, clínicas y escuelas sobre cómo usar el mapa con las personas que atienden.',
    qA: '“La ayuda debe ser fácil de encontrar,', qB: 'en cualquier idioma.”', qBy: 'De la misión de Vecina',
    teamTitle: 'El equipo',
    r1: 'Directora ejecutiva', r2: 'Alianzas comunitarias', r3: 'Idiomas y traducción', r4: 'Datos y accesibilidad',
    cTitle: 'Trabaja con nosotros', cText: '¿Tienes un programa que debería estar en el mapa o quieres una capacitación para tu personal? Escríbenos.',
    cMail: 'Escribe a hello@vecina.example', cMap: 'Abrir el mapa',
    brandHome: 'Vecina, inicio', note: ''
  };
  const X = window.VECINA_I18N || {};
  const NOTE = { ht: 'Paj sa a disponib an angle ak an panyòl.', pt: 'Esta página está disponível em inglês e espanhol.', zh: '本页目前只有英文和西班牙文版。', vi: 'Trang này hiện chỉ có bằng tiếng Anh và tiếng Tây Ban Nha.' };
  const UI = ['navLabel', 'navFind', 'navAbout', 'navAccess', 'langLabel', 'brandHome'];

  function apply(l) {
    const own = l === 'en' || l === 'es';
    const D = l === 'es' ? ES : EN;
    document.documentElement.lang = l;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n;
      const x = !own && X[l] && X[l].t;
      if (x && UI.includes(k) && x[k]) { el.textContent = x[k]; el.removeAttribute('lang'); return; }
      el.textContent = D[k];
      if (own || UI.includes(k)) el.removeAttribute('lang'); else el.lang = 'en';
    });
    document.querySelectorAll('[data-i18n-label]').forEach(el => el.setAttribute('aria-label', (!own && X[l] && X[l].t[el.dataset.i18nLabel]) || D[el.dataset.i18nLabel]));
    document.querySelector('.brand').setAttribute('aria-label', (!own && X[l] && X[l].t.brandHome) || D.brandHome);
    const n = document.getElementById('langNote'); n.textContent = own ? '' : NOTE[l] || ''; n.lang = l;
    document.getElementById('langSel').value = l;
    try { localStorage.setItem('vecina-lang', l); } catch (e) { /* private mode */ }
  }
  document.getElementById('langSel').addEventListener('change', e => apply(e.target.value));
  const LANGS = ['en', 'es', 'ht', 'pt', 'zh', 'vi'];
  let saved = null; try { saved = localStorage.getItem('vecina-lang'); } catch (e) { /* private mode */ }
  const urlLang = new URLSearchParams(location.search).get('lang');
  apply(LANGS.includes(urlLang) ? urlLang : LANGS.includes(saved) ? saved : 'en');
})();
