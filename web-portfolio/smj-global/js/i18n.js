/* SMJ Global — language layer: EN / ES / FR / HT. English is read from the page; each entry below lists
   the translations for every element a selector matches, in page order. Choice is kept in localStorage and ?lang=. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NAMES = { en: 'English', es: 'Español', fr: 'Français', ht: 'Kreyòl Ayisyen' };

  const T = {
    es: {
      title: 'SMJ Global Multiservice LLC | Apoyo paralegal y administrativo',
      desc: 'SMJ Global Multiservice LLC ofrece apoyo paralegal y administrativo profesional para su proceso de autorización de trabajo y documentación en los EE. UU. Servicio en English, Español, Français y Kreyòl Ayisyen.',
      stages: ['Contacto', 'Escuchamos', 'Preparamos', 'Próximos pasos'],
      errName: 'Escriba su nombre.', errReach: 'Escriba un teléfono o correo electrónico.',
      els: {
        '.skip': ['Saltar al contenido'],
        '.nav-links a': ['Cómo funciona', 'Servicios', 'Nuestro papel', 'Idiomas'],
        '.btn > span': ['Contáctenos', 'Contáctenos', 'Cómo ayudamos', 'Enviar'],
        '.eyebrow span': ['Apoyo paralegal', 'Apoyo administrativo', 'Cuatro idiomas'],
        '.hero-title .line > span': ['Sus metas.', '<em>Nuestro apoyo.</em>'],
        '.hero-lede': ['Brindamos apoyo paralegal y administrativo profesional para ayudarle con su proceso de autorización de trabajo y documentación en los EE. UU.'],
        '.scroll-cue span': ['Desplace'],
        '.label': ['01 / Quiénes somos', '02 / Paso uno', '03 / Paso dos', '04 / Paso tres', '05 / Paso cuatro', '06 / Servicios', '07 / Nuestro papel', '08 / Idiomas', '09 / Contacto'],
        '#statementText': ['Los trámites en un país nuevo pueden ser abrumadores. Le ayudamos a organizar sus documentos, completar sus formularios con cuidado y avanzar en cada paso con confianza, en el idioma en que se sienta más cómodo.'],
        '.journey-step h2': ['Todo camino comienza <em>con un primer paso.</em>', 'Primero <em>escuchamos.</em>', 'Cada página, <em>en orden.</em>', 'Listo para <em>lo que sigue.</em>'],
        '.journey-step > p:not(.label)': [
          'No tiene que resolverlo solo. Cuéntenos dónde está y adónde quiere llegar.',
          'Nos sentamos con usted, en su idioma, y entendemos lo que necesita antes de llenar cualquier cosa.',
          'Le ayudamos a reunir y organizar sus documentos y a completar sus formularios con cuidado, y luego los revisamos con usted.',
          'Usted se va con copias, fechas claras y próximos pasos, para que siempre sepa en qué punto está su trámite.'],
        '.gauge-row span': ['Paso', 'Etapa'],
        '.h-big': ['Cómo <em>ayudamos</em>', 'Claros sobre <em>lo que hacemos.</em>', 'Hablamos <em>su idioma.</em>'],
        '.card-body span': ['01 · Documentos', '02 · Formularios', '03 · Enfoque', '04 · Oficina', '05 · Idiomas'],
        '.card-body h3': ['Preparación de documentos', 'Apoyo con formularios y solicitudes', 'Autorización de trabajo y documentación', 'Asistencia administrativa', 'Servicio multilingüe'],
        '.card-body p': [
          'Le ayudamos a reunir, organizar y preparar los documentos que su proceso requiere, de forma ordenada y completa.',
          'Ayuda cuidadosa para llenar formularios y solicitudes, revisados con usted antes de enviarlos.',
          'Apoyo para mantener completos y en orden los documentos de su autorización de trabajo y documentación en los EE. UU.',
          'Copias, citas, seguimientos y registros organizados, para que nada importante se quede atrás.',
          'English, Español, Français y Kreyòl Ayisyen, para que entienda cada paso.'],
        '.disc h3': ['Apoyo paralegal', 'Apoyo administrativo', 'Orientación en cada paso', 'Su idioma'],
        '.disc p': [
          'Preparamos y organizamos los documentos que su proceso requiere.',
          'Copias, registros, citas y seguimientos, con cuidado.',
          'Le explicamos lo que se necesita y le mantenemos organizado de principio a fin.',
          'English, Español, Français y Kreyòl Ayisyen.'],
        '.notice p': ['Importante', 'No somos abogados ni un bufete de abogados. No damos asesoría legal y no podemos representarle ante ninguna agencia del gobierno. Para asesoría legal, consulte a un abogado con licencia.'],
        '.values li': ['Profesionales.', 'Confiables.', '<em>Su confianza importa.</em>'],
        '.marquee-row span': ['Profesionales · Confiables · Su confianza importa · ', 'Profesionales · Confiables · Su confianza importa · ', 'Sus metas · Nuestro apoyo · Sus metas · Nuestro apoyo · ', 'Sus metas · Nuestro apoyo · Sus metas · Nuestro apoyo · '],
        '.contact-title': ['<span>Hable</span> <em>con nosotros.</em>'],
        '.contact-form label > span': ['Nombre', 'Teléfono o correo', 'Idioma preferido', 'Necesito ayuda con', 'Mensaje'],
        '#cType option': ['Preparación de documentos', 'Formularios y solicitudes', 'Documentos de autorización de trabajo', 'Asistencia administrativa', 'Otra cosa'],
        '.form-note': ['Formulario de muestra. Todavía no se envía nada.'],
        '#formDone h3': ['Gracias.'], '#formDone p': ['Esta es una muestra, así que no se envió nada.'],
        '.contact-list dt': ['Teléfono', 'Correo', 'Oficina', 'Horario'],
        '.contact-list dd.ph': ['Dirección o área de servicio', 'Lun a vie, 9:00 a 5:00'],
        '.foot-tag p': ['Sus metas. <em>Nuestro apoyo.</em>', 'Profesionales. Confiables. Su confianza importa.'],
        '.foot-legal': ['SMJ Global Multiservice LLC ofrece únicamente apoyo paralegal y administrativo. No somos abogados ni un bufete de abogados, no damos asesoría legal y no podemos representarle ante ninguna agencia del gobierno. Para asesoría legal, consulte a un abogado con licencia.'],
        '.foot-row a': ['Volver arriba ↑'],
        '.credits': ['Fotos: colaboradores de Unsplash (Licencia Unsplash); National Park Service y USCapitol (dominio público); colaboradores de Wikimedia Commons (CC0). Todas convertidas a blanco y negro.'],
        '.cursor b': ['Ver'],
      },
    },
    fr: {
      title: 'SMJ Global Multiservice LLC | Soutien parajuridique et administratif',
      desc: 'SMJ Global Multiservice LLC offre un soutien parajuridique et administratif professionnel pour vos démarches d’autorisation de travail et de documentation aux États-Unis. Service en English, Español, Français et Kreyòl Ayisyen.',
      stages: ['Premier contact', 'Écoute', 'Préparation', 'Prochaines étapes'],
      errName: 'Indiquez votre nom.', errReach: 'Indiquez un téléphone ou un e-mail.',
      els: {
        '.skip': ['Aller au contenu'],
        '.nav-links a': ['Comment ça marche', 'Services', 'Notre rôle', 'Langues'],
        '.btn > span': ['Contactez-nous', 'Contactez-nous', 'Comment nous aidons', 'Envoyer'],
        '.eyebrow span': ['Soutien parajuridique', 'Soutien administratif', 'Quatre langues'],
        '.hero-title .line > span': ['Vos objectifs.', '<em>Notre soutien.</em>'],
        '.hero-lede': ['Nous offrons un soutien parajuridique et administratif professionnel pour vous aider dans vos démarches d’autorisation de travail et de documentation aux États-Unis.'],
        '.scroll-cue span': ['Défiler'],
        '.label': ['01 / Qui sommes-nous', '02 / Étape un', '03 / Étape deux', '04 / Étape trois', '05 / Étape quatre', '06 / Services', '07 / Notre rôle', '08 / Langues', '09 / Contact'],
        '#statementText': ['Les démarches dans un nouveau pays peuvent sembler écrasantes. Nous vous aidons à organiser vos documents, à remplir vos formulaires avec soin et à avancer à chaque étape en toute confiance, dans la langue où vous êtes le plus à l’aise.'],
        '.journey-step h2': ['Chaque parcours commence <em>par un premier pas.</em>', 'D’abord, <em>nous écoutons.</em>', 'Chaque page, <em>en ordre.</em>', 'Prêt pour <em>la suite.</em>'],
        '.journey-step > p:not(.label)': [
          'Vous n’avez pas à tout gérer seul. Dites-nous où vous en êtes et où vous voulez aller.',
          'Nous prenons le temps de vous rencontrer, dans votre langue, pour comprendre vos besoins avant de remplir quoi que ce soit.',
          'Nous vous aidons à rassembler et organiser vos documents et à remplir vos formulaires avec soin, puis nous les relisons avec vous.',
          'Vous repartez avec des copies, des dates claires et les prochaines étapes, pour toujours savoir où en est votre dossier.'],
        '.gauge-row span': ['Étape', 'Phase'],
        '.h-big': ['Comment nous <em>aidons</em>', 'Clairs sur <em>ce que nous faisons.</em>', 'Nous parlons <em>votre langue.</em>'],
        '.card-body span': ['01 · Documents', '02 · Formulaires', '03 · Priorité', '04 · Bureau', '05 · Langues'],
        '.card-body h3': ['Préparation de documents', 'Aide aux formulaires et demandes', 'Autorisation de travail et documentation', 'Assistance administrative', 'Service multilingue'],
        '.card-body p': [
          'Nous vous aidons à rassembler, organiser et préparer les documents requis pour votre démarche, de façon soignée et complète.',
          'Une aide attentive pour remplir vos formulaires et demandes, relus avec vous avant l’envoi.',
          'Un soutien pour que les documents de votre autorisation de travail et de votre documentation aux États-Unis soient complets et en ordre.',
          'Copies, rendez-vous, suivis et dossiers organisés, pour que rien d’important ne soit oublié.',
          'English, Español, Français et Kreyòl Ayisyen, pour que vous compreniez chaque étape.'],
        '.disc h3': ['Soutien parajuridique', 'Soutien administratif', 'Accompagnement à chaque étape', 'Votre langue'],
        '.disc p': [
          'Préparer et organiser les documents requis pour votre démarche.',
          'Copies, dossiers, rendez-vous et suivis, traités avec soin.',
          'Nous vous expliquons ce qui est nécessaire et vous aidons à rester organisé du début à la fin.',
          'English, Español, Français et Kreyòl Ayisyen.'],
        '.notice p': ['À noter', 'Nous ne sommes ni avocats ni un cabinet d’avocats. Nous ne donnons pas de conseils juridiques et ne pouvons pas vous représenter devant un organisme gouvernemental. Pour un conseil juridique, veuillez consulter un avocat agréé.'],
        '.values li': ['Professionnels.', 'Fiables.', '<em>Votre confiance compte.</em>'],
        '.marquee-row span': ['Professionnels · Fiables · Votre confiance compte · ', 'Professionnels · Fiables · Votre confiance compte · ', 'Vos objectifs · Notre soutien · Vos objectifs · Notre soutien · ', 'Vos objectifs · Notre soutien · Vos objectifs · Notre soutien · '],
        '.contact-title': ['<span>Contactez-</span><em>nous.</em>'],
        '.contact-form label > span': ['Nom', 'Téléphone ou e-mail', 'Langue préférée', 'J’ai besoin d’aide pour', 'Message'],
        '#cType option': ['Préparation de documents', 'Formulaires et demandes', 'Dossier d’autorisation de travail', 'Assistance administrative', 'Autre chose'],
        '.form-note': ['Formulaire d’aperçu. Rien n’est encore envoyé.'],
        '#formDone h3': ['Merci.'], '#formDone p': ['Ceci est un aperçu, rien n’a été envoyé.'],
        '.contact-list dt': ['Téléphone', 'E-mail', 'Bureau', 'Horaires'],
        '.contact-list dd.ph': ['Adresse ou zone desservie', 'Lun. au ven., 9 h à 17 h'],
        '.foot-tag p': ['Vos objectifs. <em>Notre soutien.</em>', 'Professionnels. Fiables. Votre confiance compte.'],
        '.foot-legal': ['SMJ Global Multiservice LLC offre uniquement un soutien parajuridique et administratif. Nous ne sommes ni avocats ni un cabinet d’avocats, nous ne donnons pas de conseils juridiques et nous ne pouvons pas vous représenter devant un organisme gouvernemental. Pour un conseil juridique, veuillez consulter un avocat agréé.'],
        '.foot-row a': ['Retour en haut ↑'],
        '.credits': ['Photos : contributeurs Unsplash (licence Unsplash) ; National Park Service et USCapitol (domaine public) ; contributeurs Wikimedia Commons (CC0). Toutes converties en noir et blanc.'],
        '.cursor b': ['Voir'],
      },
    },
    ht: {
      title: 'SMJ Global Multiservice LLC | Sipò paralegal ak administratif',
      desc: 'SMJ Global Multiservice LLC bay sipò paralegal ak administratif pwofesyonèl pou pwosesis otorizasyon travay ak dokiman ou Ozetazini. Sèvis an English, Español, Français ak Kreyòl Ayisyen.',
      stages: ['Kontakte nou', 'Nou koute', 'Nou prepare', 'Pwochen etap'],
      errName: 'Ekri non ou.', errReach: 'Ekri yon nimewo telefòn oswa yon imel.',
      els: {
        '.skip': ['Ale nan kontni an'],
        '.nav-links a': ['Kijan sa mache', 'Sèvis', 'Wòl nou', 'Lang'],
        '.btn > span': ['Kontakte nou', 'Kontakte nou', 'Kijan nou ede', 'Voye'],
        '.eyebrow span': ['Sipò paralegal', 'Sipò administratif', 'Kat lang'],
        '.hero-title .line > span': ['Objektif ou.', '<em>Sipò nou.</em>'],
        '.hero-lede': ['Nou bay sipò paralegal ak administratif pwofesyonèl pou ede w ak pwosesis otorizasyon travay ak dokiman ou Ozetazini.'],
        '.scroll-cue span': ['Desann'],
        '.label': ['01 / Kiyès nou ye', '02 / Premye etap', '03 / Dezyèm etap', '04 / Twazyèm etap', '05 / Katriyèm etap', '06 / Sèvis', '07 / Wòl nou', '08 / Lang', '09 / Kontak'],
        '#statementText': ['Papye nan yon nouvo peyi ka lou anpil. Nou ede w òganize dokiman ou, ranpli fòm ou yo avèk swen epi avanse nan chak etap avèk konfyans, nan lang ou pi alèz la.'],
        '.journey-step h2': ['Chak chemen kòmanse <em>ak yon premye pa.</em>', 'Nou koute w <em>anvan.</em>', 'Chak paj, <em>nan lòd.</em>', 'Pare pou <em>sa k ap vini.</em>'],
        '.journey-step > p:not(.label)': [
          'Ou pa bezwen fè l pou kont ou. Di nou kote ou ye ak kote ou vle rive.',
          'Nou chita avè w, nan lang ou, pou nou konprann sa ou bezwen anvan nou ranpli anyen.',
          'Nou ede w rasanble epi òganize dokiman ou yo, ranpli fòm ou yo avèk swen, epi nou revize yo avè w.',
          'Ou pati ak kopi, dat ki klè ak pwochen etap yo, konsa ou toujou konnen ki kote bagay yo ye.'],
        '.gauge-row span': ['Etap', 'Faz'],
        '.h-big': ['Kijan nou <em>ede</em>', 'Klè sou <em>sa nou fè.</em>', 'Nou pale <em>lang ou.</em>'],
        '.card-body span': ['01 · Dokiman', '02 · Fòm', '03 · Priyorite', '04 · Biwo', '05 · Lang'],
        '.card-body h3': ['Preparasyon dokiman', 'Èd ak fòm ak aplikasyon', 'Otorizasyon travay ak dokiman', 'Asistans administratif', 'Sèvis an plizyè lang'],
        '.card-body p': [
          'Nou ede w rasanble, òganize epi prepare dokiman pwosesis ou a mande yo, byen pwòp e konplè.',
          'Èd avèk atansyon pou ranpli fòm ak aplikasyon, nou revize yo avè w anvan ou soumèt yo.',
          'Sipò pou kenbe papye otorizasyon travay ak dokiman ou Ozetazini yo konplè e an lòd.',
          'Kopi, randevou, swivi ak dosye ki òganize, pou anyen enpòtan pa pèdi.',
          'English, Español, Français ak Kreyòl Ayisyen, pou ou konprann chak etap.'],
        '.disc h3': ['Sipò paralegal', 'Sipò administratif', 'Gid nan chak etap', 'Lang ou'],
        '.disc p': [
          'Nou prepare epi òganize papye pwosesis ou a mande yo.',
          'Kopi, dosye, randevou ak swivi, avèk swen.',
          'Nou eksplike w sa ki nesesè epi nou ede w rete òganize depi nan kòmansman rive nan fen.',
          'English, Español, Français ak Kreyòl Ayisyen.'],
        '.notice p': ['Tanpri remake', 'Nou pa avoka e nou pa yon biwo avoka. Nou pa bay konsèy legal e nou pa ka reprezante w devan okenn ajans gouvènman. Pou konsèy legal, tanpri konsilte yon avoka ki gen lisans.'],
        '.values li': ['Pwofesyonèl.', 'Serye.', '<em>Konfyans ou enpòtan.</em>'],
        '.marquee-row span': ['Pwofesyonèl · Serye · Konfyans ou enpòtan · ', 'Pwofesyonèl · Serye · Konfyans ou enpòtan · ', 'Objektif ou · Sipò nou · Objektif ou · Sipò nou · ', 'Objektif ou · Sipò nou · Objektif ou · Sipò nou · '],
        '.contact-title': ['<span>Kontakte</span> <em>nou.</em>'],
        '.contact-form label > span': ['Non', 'Telefòn oswa imel', 'Lang ou prefere', 'Mwen bezwen èd ak', 'Mesaj'],
        '#cType option': ['Preparasyon dokiman', 'Fòm ak aplikasyon', 'Papye otorizasyon travay', 'Asistans administratif', 'Lòt bagay'],
        '.form-note': ['Fòm egzanp. Anyen pa voye pou kounye a.'],
        '#formDone h3': ['Mèsi.'], '#formDone p': ['Sa a se yon egzanp, kidonk anyen pa t voye.'],
        '.contact-list dt': ['Telefòn', 'Imel', 'Biwo', 'Lè'],
        '.contact-list dd.ph': ['Adrès oswa zòn sèvis', 'Lendi rive vandredi, 9:00 rive 5:00'],
        '.foot-tag p': ['Objektif ou. <em>Sipò nou.</em>', 'Pwofesyonèl. Serye. Konfyans ou enpòtan.'],
        '.foot-legal': ['SMJ Global Multiservice LLC bay sèlman sipò paralegal ak administratif. Nou pa avoka e nou pa yon biwo avoka, nou pa bay konsèy legal e nou pa ka reprezante w devan okenn ajans gouvènman. Pou konsèy legal, tanpri konsilte yon avoka ki gen lisans.'],
        '.foot-row a': ['Retounen anlè ↑'],
        '.credits': ['Foto: kontribitè Unsplash (Lisans Unsplash); National Park Service ak USCapitol (domèn piblik); kontribitè Wikimedia Commons (CC0). Tout konvèti an nwa e blan.'],
        '.cursor b': ['Gade'],
      },
    },
  };

  /* English comes straight from the page, captured before anything else touches it */
  const metaDesc = $('meta[name="description"]');
  const EN = { title: document.title, desc: metaDesc.content, stages: ['Reach out', 'We listen', 'We prepare', 'Next steps'],
    errName: 'Enter your name.', errReach: 'Enter a phone number or email.', els: {} };
  Object.keys(T.es.els).forEach(sel => { EN.els[sel] = $$(sel).map(el => el.innerHTML); });
  T.en = EN;

  let cur = 'en';
  function apply(lang) {
    const d = T[lang] || EN;
    Object.entries(d.els).forEach(([sel, list]) => $$(sel).forEach((el, i) => { if (list[i] !== undefined) el.innerHTML = list[i]; }));
    document.title = d.title; metaDesc.content = d.desc;
    const gs = $('#gStage'); if (gs) gs.textContent = d.stages[0];
    document.documentElement.lang = lang;
    $$('#langSwitch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    const sel = $('#cLang'); if (sel) sel.selectedIndex = ['en', 'es', 'fr', 'ht'].indexOf(lang);
    cur = lang;
    try { localStorage.setItem('smj-lang', lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent('smj:lang', { detail: lang }));
  }

  /* switching: a black curtain with the language name sweeps over, the page changes underneath */
  const curtain = $('#langCurtain'), word = $('#langCurtainWord');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false;
  function setLang(lang) {
    if (!T[lang] || lang === cur || busy) return;
    if (reduce || !window.gsap) { apply(lang); return; }
    busy = true; word.textContent = NAMES[lang];
    gsap.timeline({ onComplete: () => { busy = false; } })
      .set(curtain, { visibility: 'visible', clipPath: 'inset(100% 0 0 0)' })
      .set(word, { yPercent: 60, autoAlpha: 0 })
      .to(curtain, { clipPath: 'inset(0% 0 0 0)', duration: .6, ease: 'expo.inOut' })
      .to(word, { yPercent: 0, autoAlpha: 1, duration: .5, ease: 'expo.out' }, '-=.2')
      .add(() => apply(lang))
      .to(word, { yPercent: -60, autoAlpha: 0, duration: .4, ease: 'power2.in' }, '+=.25')
      .to(curtain, { clipPath: 'inset(0 0 100% 0)', duration: .7, ease: 'expo.inOut' }, '-=.15')
      .set(curtain, { visibility: 'hidden' });
  }

  $$('[data-lang]').forEach(el => el.addEventListener('click', () => setLang(el.dataset.lang)));

  window.SMJ_I18N = { set: setLang, get: () => cur, t: k => (T[cur] || EN)[k] };

  /* start in the saved or linked language (no curtain on first load) */
  let start = new URLSearchParams(location.search).get('lang');
  if (!T[start]) { try { start = localStorage.getItem('smj-lang'); } catch (e) {} }
  if (T[start] && start !== 'en') apply(start);
})();
