/* Raíces — English / Spanish. Runs before site.js so animations split the translated words. */
(() => {
  let lang = 'en';
  try { lang = localStorage.getItem('raices-lang') || 'en'; } catch (e) {}
  window.RAICES_LANG = lang;
  const ES = {
    "Skip to content": "Ir al contenido",
    "Programs": "Programas", "Homes": "Viviendas", "About": "Nosotros", "Contact": "Contacto",
    "Donate": "Donar", "Menu": "Menú",
    "Cedar Hill": "Cedar Hill", "Since 1981": "Desde 1981",
    "Here": "Aquí", "to stay.": "nos quedamos.",
    "Homes, jobs and small business help for the families of Cedar Hill.": "Vivienda, empleo y apoyo a pequeños negocios para las familias de Cedar Hill.",
    "Find a home": "Buscar vivienda", "See programs": "Ver programas", "Scroll": "Desliza",
    "Our mission": "Nuestra misión",
    "To keep Cedar Hill": "Que Cedar Hill siga siendo",
    "home": "hogar",
    "for the families who built it, with homes they can afford, work that pays and shops that stay open.": "para las familias que lo construyeron, con viviendas que puedan pagar, trabajos que paguen bien y negocios que sigan abiertos.",
    "A family arrives": "Llega una familia", "Rents keep": "Las rentas siguen", "climbing.": "subiendo.",
    "We find them a home": "Les encontramos un hogar", "One that stays": "Uno que sigue siendo", "affordable.": "asequible.",
    "They build a living": "Se ganan la vida", "A better job.": "Un mejor trabajo.", "A shop of their own.": "Un negocio propio.",
    "And they stay": "Y se quedan", "stays theirs.": "sigue siendo suyo.",
    "Arrive": "Llegar", "Home": "Hogar", "Grow": "Crecer", "Stay": "Quedarse",
    "Help for": "Apoyo para", "every chapter.": "cada etapa.",
    "Housing": "Vivienda", "Affordable Rentals": "Rentas asequibles", "Waitlist open": "Lista de espera abierta", "See buildings →": "Ver edificios →",
    "First-Time Homebuyers": "Compradores de primera vivienda", "Spring class open": "Clase de primavera abierta", "Save a seat →": "Reserva tu lugar →",
    "Jobs": "Empleo", "Career Coaching": "Orientación laboral", "Open year-round": "Abierto todo el año", "Meet a coach →": "Conoce a un orientador →",
    "Money": "Dinero", "Free Tax Prep": "Preparación de impuestos gratis", "Opens Feb 1": "Abre el 1 de febrero", "Book a time →": "Haz una cita →",
    "Business": "Negocios", "Small Business Loans": "Préstamos para pequeños negocios", "Rolling — up to $50K": "Todo el año — hasta $50K", "Check rates →": "Ver tasas →",
    "Organizing": "Organización", "Tenant Organizing": "Organización de inquilinos", "Meets monthly": "Se reúne cada mes", "Next meeting →": "Próxima reunión →",
    "Affordable homes built and kept": "Viviendas asequibles construidas y conservadas",
    "Families coached last year": "Familias asesoradas el año pasado",
    "Million in tax refunds returned": "Millones en reembolsos de impuestos",
    "Local businesses backed": "Negocios locales apoyados",
    "“No bank would look at me.": "“Ningún banco me hacía caso.", "Raíces did.”": "Raíces sí.”",
    "Homes & waitlists": "Viviendas y listas de espera", "Find a home": "Encuentra una vivienda", "you can afford.": "que puedas pagar.",
    "Search buildings": "Buscar edificios",
    "Open": "Abierto", "Coming soon": "Muy pronto", "Closed": "Cerrado",
    "From $1,150": "Desde $1,150", "From $890": "Desde $890", "From $1,420": "Desde $1,420", "From $1,040": "Desde $1,040", "From $1,280": "Desde $1,280",
    "/mo": "/mes", "Own from $289K": "Compra desde $289K",
    "1–3 BR · Families · up to 60% AMI": "1–3 hab. · Familias · hasta 60% del AMI",
    "Studio–1 BR · Seniors 62+": "Estudio–1 hab. · Mayores de 62",
    "2–3 BR · Families · lottery in March": "2–3 hab. · Familias · sorteo en marzo",
    "1–2 BR · Mixed income": "1–2 hab. · Ingresos mixtos",
    "1–3 BR · 64 new homes in 2027": "1–3 hab. · 64 viviendas nuevas en 2027",
    "2–3 BR · First-time buyers": "2–3 hab. · Primeros compradores",
    "Join the waitlist →": "Únete a la lista →", "Apply now →": "Aplica ahora →", "Get notified →": "Avísame →", "See details →": "Ver detalles →", "Take the class →": "Toma la clase →",
    "Keep Cedar Hill": "Que Cedar Hill siga siendo", "home.": "hogar.",
    "Once": "Una vez", "Monthly": "Mensual", "Give $100 monthly": "Donar $100 al mes",
    "Aug 16 · Linden Street": "16 de agosto · Linden Street", "Volunteer": "Voluntariado", "Volunteer with us": "Sé voluntario con nosotros",
    "Community development · Cedar Hill · Since 1981": "Desarrollo comunitario · Cedar Hill · Desde 1981",
    "About us": "Quiénes somos", "Our team": "Nuestro equipo", "Back to top ↑": "Volver arriba ↑",
    "Open it in WordPress ↗": "Abrir en WordPress ↗",
    "About Raíces": "Sobre Raíces", "Neighbors": "Vecinos", "since 1981.": "desde 1981.",
    "We started as twelve tenants on Linden Street who refused to be pushed out. Today we are 48 staff and 2,000 members.": "Empezamos como doce inquilinos de Linden Street que se negaron a ser desalojados. Hoy somos 48 empleados y 2,000 miembros.",
    "Our story": "Nuestra historia", "Forty years of": "Cuarenta años", "staying put.": "sin movernos.",
    "Twelve tenants on Linden Street organize against a mass eviction,": "Doce inquilinos de Linden Street se organizan contra un desalojo masivo,", "and win.": "y ganan.",
    "We buy and repair our first building: 24 homes that are": "Compramos y reparamos nuestro primer edificio: 24 viviendas que", "still affordable today.": "siguen siendo asequibles hoy.",
    "Free tax prep opens in a church basement. Forty families come": "Abre la preparación de impuestos gratis en el sótano de una iglesia. Llegan cuarenta familias", "the first year.": "el primer año.",
    "The small business fund makes its first loan,": "El fondo para pequeños negocios hace su primer préstamo,", "to a bakery on Centre Street.": "a una panadería en Centre Street.",
    "Our 1,100th affordable home opens": "Abre nuestra vivienda asequible número 1,100", "at Calder Square.": "en Calder Square.",
    "The people who": "La gente que", "show up.": "da la cara.",
    "“I grew up three blocks from our first building.": "“Crecí a tres cuadras de nuestro primer edificio.",
    "Nobody should have to leave the place that raised them.”": "Nadie debería tener que dejar el lugar que lo vio crecer.”",
    "Executive Director": "Directora ejecutiva",
    "Joined Raíces as a tenant organizer in 1998 and has led it since 2012.": "Llegó a Raíces como organizadora de inquilinos en 1998 y la dirige desde 2012.",
    "Director of Housing": "Director de vivienda",
    "Oversees our 1,100 homes and the 200 more in the pipeline. Former Raíces resident.": "Supervisa nuestras 1,100 viviendas y las 200 que vienen. Fue residente de Raíces.",
    "Director of Family Prosperity": "Directora de prosperidad familiar",
    "Grew our free tax clinic from 40 returns to 3,000 a year.": "Hizo crecer nuestra clínica de impuestos de 40 declaraciones a 3,000 al año.",
    "Small Business Lending": "Préstamos a pequeños negocios",
    "Has closed 140 microloans for the shops on Linden and Centre Street.": "Ha cerrado 140 microcréditos para los negocios de Linden y Centre Street.",
    "Director of Organizing": "Directora de organización",
    "Started knocking doors at 19. Now trains 60 tenant leaders a year.": "Empezó tocando puertas a los 19. Hoy forma a 60 líderes de inquilinos al año.",
    "Finance & Operations": "Finanzas y operaciones",
    "Keeps the books clean and the lights on. CPA, twenty years in nonprofits.": "Mantiene las cuentas claras y las luces prendidas. Contadora pública, veinte años en organizaciones sin fines de lucro.",
    "Homeownership Counselor": "Asesora de vivienda propia",
    "Has walked 400 first-time buyers to the closing table, in English and Spanish.": "Ha acompañado a 400 compradores primerizos hasta el cierre, en inglés y en español.",
    "Board of directors": "Junta directiva",
    "Chair": "Presidente", "Vice Chair": "Vicepresidenta", "Treasurer": "Tesorero", "Secretary": "Secretaria", "Member": "Miembro",
    "Retired teacher, Cedar Hill homeowner since 1976": "Maestro jubilado, propietario en Cedar Hill desde 1976",
    "Linden Street Commons resident": "Residente de Linden Street Commons",
    "Credit union lender": "Oficial de préstamos de una cooperativa de crédito",
    "Parent leader at the Eastside school": "Madre líder en la escuela Eastside",
    "Owns a bakery on Centre Street": "Dueña de una panadería en Centre Street",
    "Tenant organizer at Calder Square": "Organizador de inquilinos en Calder Square",
    "Come by.": "Ven a vernos.", "Se habla español.": "We speak English too.",
    "Visit": "Visítanos", "Monday to Friday, 9 to 5": "Lunes a viernes, de 9 a 5",
    "Call": "Llámanos", "Hablamos español": "Hablamos español", "Walk-in help": "Ayuda sin cita",
    "No appointment needed": "No necesitas cita",
    "Housing help: weekdays 9 to 5": "Ayuda con vivienda: entre semana de 9 a 5",
    "Free tax prep: Tue & Thu, 5 to 8": "Impuestos gratis: martes y jueves, de 5 a 8",
    "Send a message": "Envíanos un mensaje", "Your name": "Tu nombre", "Email or phone": "Correo o teléfono",
    "I need help with": "Necesito ayuda con", "Finding a home": "Encontrar vivienda", "A job or training": "Empleo o capacitación",
    "Taxes or money": "Impuestos o dinero", "My business": "Mi negocio", "Something else": "Otra cosa",
    "Message": "Mensaje", "Send": "Enviar", "Good to know": "Bueno saber",
    "Do I need an appointment?": "¿Necesito cita?",
    "No. Walk in during office hours and someone will help you the same day.": "No. Ven en horario de oficina y alguien te atiende el mismo día.",
    "Does it cost anything?": "¿Cuesta algo?",
    "Never. Every Raíces program is free for Cedar Hill residents.": "Nunca. Todos los programas de Raíces son gratis para los residentes de Cedar Hill.",
    "Can I get help in Spanish?": "¿Me pueden atender en español?",
    "Yes. Most of our staff speak Spanish, and we can arrange Haitian Creole, Portuguese and Vietnamese.": "Sí. Casi todo nuestro equipo habla español, y también podemos atenderte en criollo haitiano, portugués y vietnamita.",
    "How do waitlists work?": "¿Cómo funcionan las listas de espera?",
    "Fill out one form and we add you to every building you qualify for. We call you when a home opens.": "Llenas un solo formulario y te anotamos en todos los edificios para los que calificas. Te llamamos cuando haya una vivienda.",
  };
  // the hero "Find a home" button vs the homes heading share English text; the heading has its own key above
  ES["Find a home"] = "Buscar vivienda";
  const HEAD = { "Find a home": "Encuentra una vivienda" };
  window.RAICES_T = s => (lang === 'es' && ES[s]) || s;

  if (lang === 'es') {
    document.documentElement.lang = 'es';
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('script,style,svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes = []; while (walk.nextNode()) nodes.push(walk.currentNode);
    nodes.forEach(n => {
      const raw = n.nodeValue, key = raw.replace(/\s+/g, ' ').trim(); if (!key) return;
      const inHeading = n.parentElement.closest('h2') && HEAD[key];
      const tr = inHeading ? HEAD[key] : ES[key];
      if (tr) n.nodeValue = raw.replace(raw.trim(), tr);
    });
    document.querySelectorAll('[placeholder]').forEach(el => { const t = ES[el.getAttribute('placeholder')]; if (t) el.setAttribute('placeholder', t); });
  }

  /* the EN / ES switch */
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.setAttribute('aria-label', lang === 'es' ? 'Switch to English' : 'Cambiar a español');
    b.querySelectorAll('[data-l]').forEach(s => s.classList.toggle('on', s.dataset.l === lang));
    b.addEventListener('click', () => { try { localStorage.setItem('raices-lang', lang === 'es' ? 'en' : 'es'); } catch (e) {} location.reload(); });
  });
})();
