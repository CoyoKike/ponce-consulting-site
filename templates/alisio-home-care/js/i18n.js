// Alisio · EN/ES. English lives in the HTML; Spanish lives here. The English text is read from the page the
// first time we switch, so the two can't drift. Strings built in JS (estimate, form, labels) are in DYN.
(function () {
  var ES = {
    'meta.title': 'Alisio Home Care · Limpieza de casas y condos en el sur de la Florida',
    'meta.desc': 'Limpieza recurrente, a fondo, de mudanza y post-obra para condos y casas desde Boca Raton hasta Coral Gables. El mismo equipo en cada visita, productos de origen vegetal y un reporte con fotos antes de cerrar.',
    'skip': 'Saltar al contenido',
    'nav.home': 'Alisio Home Care, volver arriba',
    'nav.main': 'Principal',
    'nav.mobile': 'Menú',
    'nav.lang': 'Idioma',
    'nav.open': 'Abrir menú',
    'nav.services': 'Servicios',
    'nav.process': 'Cómo funciona',
    'nav.estimate': 'Precios',
    'nav.area': 'Dónde limpiamos',
    'nav.reviews': 'Opiniones',
    'menu.text': 'Llámanos o escríbenos, de lunes a sábado',
    'cta.book': 'Reserva una limpieza',
    'cta.estimate': 'Calcula tu precio',

    'hero.kicker': 'Limpieza de casas y condos · de Boca Raton a Coral Gables',
    'hero.title': '<span class="line"><span>Limpio, hasta</span></span> <span class="line"><span><em>en las juntas.</em></span></span>',
    'hero.lede': 'Limpieza recurrente y a fondo para hogares del sur de la Florida. El mismo equipo de dos personas en cada visita, productos de origen vegetal y una foto de cada cuarto antes de cerrar con llave.',
    'hero.notesLabel': 'Lo que incluye cada visita',
    'hero.n1': 'El mismo equipo cada vez',
    'hero.n2': 'Sin fragancia si lo pides',
    'hero.n3': 'Nos encargamos del COI del edificio',
    'hero.cue': 'Baja',

    'ap.kicker': 'Cómo limpiamos',
    'ap.statement': 'De arriba hacia abajo, de seco a mojado, <em>cuarto por cuarto.</em> El mismo orden en cada visita, para que nada se quede sin hacer y siempre sepas quién toca a tu puerta.',
    'ap.alt1': 'Un sillón blanco en una sala tranquila, con el sol de la tarde entrando por cortinas transparentes',
    'ap.alt2': 'Manos con guantes alisando una pila de toallas blancas recién dobladas',
    'ap.p1': 'Empezamos limpiando condos frente a la playa en Fort Lauderdale, donde el salitre deja una capa en cada puerta corrediza y el aire acondicionado mete polvo en cada rejilla. Seguimos limpiando así: primero rejillas y rieles, los vidrios antes que los pisos, y una lista pegada dentro del carrito para que nada dependa de la memoria.',
    'ap.p2': 'Cada cliente tiene un equipo fijo de dos personas. Aprenden dónde se esconde el perro, qué gabinete se traba y cómo te gusta doblar las toallas. Si alguien se enferma, te avisamos la noche anterior y mandamos a alguien que ya leyó tus notas.',
    'ap.f1t': 'Productos',
    'ap.f1d': 'Limpiadores de origen vegetal, aspiradora HEPA y microfibra por colores. Sin fragancia si lo pides.',
    'ap.f2t': 'Llaves',
    'ap.f2d': 'Caja de seguridad, recepción o recogida de llaves. Las marcamos con un número, nunca con una dirección.',
    'ap.f3t': 'Edificios',
    'ap.f3d': 'Enviamos el certificado de seguro a la administración de tu edificio antes de la primera visita.',

    'sv.kicker': 'Servicios',
    'sv.title': 'Elige un ritmo, <em>o solo un buen reinicio.</em>',
    'sv.from': 'desde',
    'sv.t1': 'Limpieza recurrente',
    'sv.d1': 'Cada semana, cada dos semanas o cada mes. Cocina, baños, polvo, pisos, camas tendidas y la basura afuera. El mismo equipo, la misma lista, el mismo día de la semana.',
    'sv.a1': 'Una mujer limpiando la mesa en una cocina luminosa',
    'sv.t2': 'Limpieza a fondo',
    'sv.d2': 'La primera visita de la mayoría de los hogares. Zócalos, marcos de puertas, rejillas, frentes de gabinetes, juntas de la ducha restregadas y la suciedad acumulada detrás del inodoro y debajo del lavamanos.',
    'sv.a2': 'Una mano limpiando una encimera de granito con un paño y un atomizador',
    'sv.t3': 'Mudanzas, entrada y salida',
    'sv.d3': 'Limpieza de casa vacía por dentro de cada gabinete, gaveta, clóset y electrodoméstico. Coordinada con tu contrato, tu cierre o la reserva del ascensor del edificio.',
    'sv.a3': 'Un comedor vacío y soleado con puertas de vidrio que dan a un balcón',
    'sv.t4': 'Después de obra',
    'sv.d4': 'Tras una remodelación, quitamos el polvo fino de cada repisa, rejilla y lámpara. Las gotas de pintura y los restos de calcomanías salen del vidrio, y las marcas de cinta, del piso.',
    'sv.a4': 'Un baño de mármol recién terminado con mueble flotante y bañera',
    'sv.t5': 'Cambios de huésped en alquileres',
    'sv.d5': 'Puesta a punto entre huéspedes según tu horario de salida. Cambio de sábanas, cocina reabastecida según tu lista y fotos para que sepas que todo está listo para la próxima llegada.',
    'sv.a5': 'Una cama recién tendida con dos toallas blancas dobladas a los pies',
    'sv.addons': 'Agrégalo a cualquier visita',
    'ad.oven': 'Dentro del horno',
    'ad.fridge': 'Dentro del refrigerador',
    'ad.windows': 'Ventanas por dentro',
    'ad.base': 'Zócalos a mano',
    'ad.lanai': 'Lavado de balcón o terraza',
    'ad.laundry': 'Ropa lavada y doblada',
    'ad.cab': 'Dentro de los gabinetes de cocina',

    'pr.kicker': 'Cómo funciona',
    'pr.title': 'Cuatro pasos, <em>y las mismas caras.</em>',
    'pr.alt': 'Dos manos con guantes limpiando una encimera blanca junto al fregadero',
    'pr.t1': 'Reserva',
    'pr.d1': 'Elige un día en línea o escríbenos. Cuéntanos de tus mascotas, el estacionamiento, el código del portón y lo que necesite un cuidado especial.',
    'pr.t2': 'Llega tu equipo',
    'pr.d2': 'Dos personas que vas a conocer, puntuales y con sus propios productos y equipos. Si no estás, usan tu caja de seguridad o la recepción.',
    'pr.t3': 'Cuarto por cuarto',
    'pr.d3': 'Una lista escrita para cada cuarto. De arriba hacia abajo, primero lo seco y luego lo mojado, y los pisos al final, de salida.',
    'pr.t4': 'Revisión y fotos',
    'pr.d4': '¿Estás en casa? La recorren juntos. ¿No estás? Te llega una foto de cada cuarto antes de que cierren. Si algo se nos pasó, volvemos en menos de 24 horas.',

    'ck.kicker': 'Qué incluye',
    'ck.title': 'En cada visita, <em>en cada cuarto.</em>',
    'ck.rooms': 'Cuartos',
    'ck.k': 'Cocina', 'ck.b': 'Baños', 'ck.r': 'Dormitorios', 'ck.l': 'Áreas comunes',
    'ck.k1': 'Encimeras y salpicadero limpios y desinfectados',
    'ck.k2': 'Estufa desengrasada, perillas y frente de la campana',
    'ck.k3': 'Microondas por dentro y por fuera, frentes del refrigerador y lavaplatos',
    'ck.k4': 'Frentes y jaladeras de gabinetes repasados',
    'ck.k5': 'Fregadero restregado, llave pulida y desagüe refrescado',
    'ck.k6': 'Piso aspirado y trapeado, basura afuera con bolsa nueva',
    'ck.b1': 'Ducha y bañera restregadas, vidrio secado con escurridor',
    'ck.b2': 'Inodoro por dentro, por fuera y detrás de la base',
    'ck.b3': 'Lavamanos, mueble y espejo sin marcas',
    'ck.b4': 'Grifería sin sarro y pulida',
    'ck.b5': 'Toallas dobladas o colgadas, papel repuesto',
    'ck.b6': 'Piso aspirado y trapeado de borde a borde',
    'ck.r1': 'Camas tendidas, sábanas cambiadas si las dejas a la mano',
    'ck.r2': 'Mesas de noche, lámparas, cuadros y cabeceras sin polvo',
    'ck.r3': 'Aspas del ventilador y rejillas del aire sin polvo',
    'ck.r4': 'Espejos y superficies de vidrio limpias',
    'ck.r5': 'Piso de los clósets aspirado',
    'ck.r6': 'Pisos aspirados y trapeados, debajo de la cama hasta donde alcanzamos',
    'ck.l1': 'Muebles sin polvo y cojines acomodados',
    'ck.l2': 'Rieles de puertas corredizas aspirados, vidrio a la altura de la mano',
    'ck.l3': 'Controles, interruptores y manijas desinfectados',
    'ck.l4': 'Repisas y adornos sin polvo, pieza por pieza',
    'ck.l5': 'Alfombras aspiradas, pisos trapeados',
    'ck.l6': 'Balcón barrido y muebles de exterior limpios',

    'es.kicker': 'Precios',
    'es.title': 'Un estimado <em>en diez segundos.</em>',
    'es.beds': 'Dormitorios',
    'es.baths': 'Baños',
    'es.type': 'Tipo de limpieza',
    'es.weekly': 'Semanal',
    'es.biweekly': 'Cada 2 semanas',
    'es.monthly': 'Mensual',
    'es.deep': 'A fondo',
    'es.move': 'Mudanza',
    'es.extras': 'Extras',
    'es.estimate': 'Precio estimado por visita',
    'es.note': 'Confirmamos el precio final después de una videollamada rápida o unas cuantas fotos.',

    'wk.kicker': 'Hogares recientes',
    'wk.title': 'El momento <em>después de irnos.</em>',
    'wk.a1': 'Un sofá blanco y una planta alta en una sala luminosa con pisos de mármol',
    'wk.c1': 'Sala, Aventura', 'wk.s1': 'Cada dos semanas',
    'wk.a2': 'Un baño de mármol con bañera de pie y un mueble largo blanco',
    'wk.c2': 'Baño principal, Coral Gables', 'wk.s2': 'A fondo',
    'wk.a3': 'Una pila de toallas beige dobladas sobre un banquito blanco',
    'wk.c3': 'Clóset de blancos, Hollywood', 'wk.s3': 'Cambio de huésped',
    'wk.a4': 'Una sala minimalista con sofás blancos y cortinas altas y transparentes',
    'wk.c4': 'Condo, Brickell', 'wk.s4': 'Semanal',
    'wk.a5': 'Un sofá blanco curvo junto a una mesa de centro redonda de vidrio en un cuarto soleado',
    'wk.c5': 'Sala familiar, Weston', 'wk.s5': 'Mudanza de entrada',
    'ba.title': 'Un baño de visitas en Miami Beach, <em>antes y después.</em>',
    'ba.text': 'Manchas de agua dura en el vidrio de la ducha, una capa de jabón en el espejo y suciedad en las juntas del piso. Una limpieza a fondo, unas tres horas.',
    'ba.after': 'Después: el baño con el vidrio de la ducha transparente, el espejo brillante y el mármol blanco limpio',
    'ba.before': 'Antes: el mismo baño con el vidrio manchado, el espejo opaco y los pisos sin brillo',
    'ba.b': 'Antes', 'ba.a': 'Después',
    'ba.label': 'Comparación de antes y después',

    'ar.kicker': 'Dónde limpiamos',
    'ar.title': 'De Boca <em>a los Gables.</em>',
    'ar.lede': 'Los equipos salen cada mañana desde Fort Lauderdale y recorren la costa en ambas direcciones. Si vives entre dos de estas ciudades, escríbenos. Lo más probable es que ya limpiemos en tu calle.',
    'ar.pb': 'Condado de Palm Beach',
    'ar.br': 'Condado de Broward',
    'ar.md': 'Condado de Miami-Dade',
    'ar.maptitle': 'Mapa de la costa del sur de la Florida, de Boca Raton a Coral Gables, con las ciudades donde trabajamos',
    'ar.ocean': 'Océano Atlántico',
    'ar.cap': 'Los equipos salen de Fort Lauderdale cada mañana',

    'rv.kicker': 'Opiniones',
    'rv.title': 'Lo que dicen <em>nuestros clientes.</em>',
    'rv.q1': 'Las mismas dos personas cada dos jueves desde hace un año. Marisol sabe que la gata se esconde debajo de la cama de visitas y aspira alrededor de ella. Las juntas de nuestra ducha volvieron a ser blancas.',
    'rv.q2': 'Le mandaron el certificado de seguro al administrador del edificio antes de que yo lo pidiera. Piso treinta y dos, cero drama, y el vidrio de la terraza impecable.',
    'rv.q3': 'Alquilamos nuestro apartamento de dos cuartos casi todos los fines de semana. Las fotos me llegan antes del mediodía y las camas siempre quedan perfectas.',
    'rv.q4': 'Limpieza de salida un viernes, inspección del dueño el sábado y me devolvieron todo el depósito. Hasta las rejillas del horno quedaron limpias.',
    'rv.q5': 'Pedí productos sin fragancia por el asma de mi hijo. No huele a perfume, solo a limpio, y se han acordado en cada visita desde entonces.',
    'rv.q6': 'Después de remodelar la cocina había polvo encima del polvo, hasta dentro de las lámparas. Dos días después nadie diría que pasó un contratista por aquí.',

    'fq.kicker': 'Bueno saber',
    'fq.title': 'Antes de <em>la primera visita.</em>',
    'fq.q1': '¿Tengo que estar en casa?',
    'fq.a1': 'No. La mayoría de los clientes deja una llave en la recepción o nos da el código de una caja de seguridad. Marcamos las llaves con un número, nunca con tu nombre ni tu dirección.',
    'fq.q2': '¿Traen sus propios productos?',
    'fq.a2': 'Sí. Limpiadores de origen vegetal, aspiradora HEPA, trapeadores y microfibra por colores, para que los paños del baño nunca toquen tu cocina. Si prefieres tus productos, déjalos a la vista y los usamos.',
    'fq.q3': 'Mi edificio pide un certificado de seguro.',
    'fq.a3': 'Mándanos el correo de la administración y el texto que necesiten. Normalmente enviamos el certificado el mismo día y lo dejamos en archivo para las siguientes visitas.',
    'fq.q4': '¿Y si algo se queda sin hacer?',
    'fq.a4': 'Avísanos dentro de las 24 horas. El mismo equipo regresa a arreglarlo, sin costo.',
    'fq.q5': 'Tenemos mascotas. ¿Hay problema?',
    'fq.a5': 'Para nada. Cuéntanos sus nombres, dónde les gusta esconderse y qué puertas deben quedar cerradas. Lo anotamos en tu lista para que cada visita sea igual.',

    'bk.kicker': 'Reserva',
    'bk.title': 'Reserva una <em>limpieza.</em>',
    'bk.lede': 'Cuéntanos un poco de tu casa. Te escribimos en menos de dos horas hábiles con horarios disponibles y el precio antes de que llegue nadie.',
    'bk.call': 'Llama o escribe',
    'bk.hours': 'Horario',
    'bk.hoursv': 'Lun a vie 7:30 a.m. a 6 p.m. · Sáb 8 a.m. a 2 p.m.',
    'bk.name': 'Tu nombre',
    'bk.namePh': 'Ana Rivera',
    'bk.phone': 'Celular',
    'bk.email': 'Correo',
    'bk.optional': '(opcional)',
    'bk.emailPh': 'tu@ejemplo.com',
    'bk.zip': 'Código postal',
    'bk.service': 'Tipo de limpieza',
    'bk.o1': 'Recurrente, cada 2 semanas',
    'bk.o2': 'Recurrente, semanal',
    'bk.o3': 'Recurrente, mensual',
    'bk.o4': 'Limpieza a fondo',
    'bk.o5': 'Mudanza de entrada o salida',
    'bk.o6': 'Después de obra',
    'bk.o7': 'Cambio de huésped en alquiler',
    'bk.day': 'Día preferido',
    'bk.d0': 'Cualquier día entre semana',
    'bk.d1': 'Lunes', 'bk.d2': 'Martes', 'bk.d3': 'Miércoles', 'bk.d4': 'Jueves', 'bk.d5': 'Viernes', 'bk.d6': 'Sábado',
    'bk.home': 'Tu casa',
    'bk.homePh': '2 dormitorios, 2 baños, condo',
    'bk.notes': '¿Algo que debamos saber?',
    'bk.notesPh': 'Código del portón, estacionamiento, mascotas, el cuarto que más lo necesita',
    'bk.ff': 'Productos sin fragancia, por favor',
    'bk.again': 'Enviar otra solicitud',

    'ft.tag': 'Limpieza de casas y condos en Broward, Miami-Dade y el sur de Palm Beach.',
    'ft.contact': 'Contacto',
    'ft.text': 'Llama o escribe',
    'ft.hours': 'Horario',
    'ft.h1': 'Lun a vie, 7:30 a.m. a 6 p.m.',
    'ft.h2': 'Sábado, 8 a.m. a 2 p.m.',
    'ft.explore': 'Explora',
    'ft.based': 'Con base en Fort Lauderdale, Florida'
  };

  var DYN = {
    en: {
      hours: 'About {h} hours for a team of two',
      hoursMove: 'About {h} hours for a team of two, empty home',
      bedsHome: '{b} bedrooms, {a} bathrooms',
      bed1: '1 bedroom', bedN: '{n} bedrooms', bath1: '1 bathroom', bathN: '{n} bathrooms',
      thanksT: 'Thank you, {name}.',
      thanksP: 'We will text {phone} within two business hours with a few times that work for your {service}. Talk soon.',
      errName: 'Please tell us your name.',
      errPhone: 'Please enter a 10-digit phone number.',
      errEmail: 'That email does not look right.',
      errZip: 'Please enter a 5-digit ZIP code.',
      baValue: '{n}% before',
      menuOpen: 'Open menu', menuClose: 'Close menu'
    },
    es: {
      hours: 'Unas {h} horas con un equipo de dos',
      hoursMove: 'Unas {h} horas con un equipo de dos, casa vacía',
      bed1: '1 dormitorio', bedN: '{n} dormitorios', bath1: '1 baño', bathN: '{n} baños',
      thanksT: 'Gracias, {name}.',
      thanksP: 'Te escribimos al {phone} en menos de dos horas hábiles con algunos horarios para tu {service}. Hablamos pronto.',
      errName: 'Por favor dinos tu nombre.',
      errPhone: 'Escribe un número de 10 dígitos.',
      errEmail: 'Ese correo no parece correcto.',
      errZip: 'Escribe un código postal de 5 dígitos.',
      baValue: '{n}% antes',
      menuOpen: 'Abrir menú', menuClose: 'Cerrar menú'
    }
  };

  var EN = {};
  var captured = false;
  var listeners = [];
  var lang = document.documentElement.lang === 'es' ? 'es' : 'en';

  function each(sel, fn) { var n = document.querySelectorAll(sel); for (var i = 0; i < n.length; i++) fn(n[i]); }
  function attrPairs(el) { return el.getAttribute('data-i18n-attr').split(',').map(function (p) { return p.split(':'); }); }

  function capture() {
    if (captured) return; captured = true;
    each('[data-i18n]', function (el) { var k = el.getAttribute('data-i18n'); if (!(k in EN)) EN[k] = el.textContent; });
    each('[data-i18n-html]', function (el) { var k = el.getAttribute('data-i18n-html'); if (!(k in EN)) EN[k] = el.innerHTML; });
    each('[data-i18n-attr]', function (el) { attrPairs(el).forEach(function (p) { var k = p[1]; if (!(k in EN)) EN[k] = el.getAttribute(p[0]) || ''; }); });
  }

  function apply(next) {
    capture();
    lang = next === 'es' ? 'es' : 'en';
    var dict = lang === 'es' ? ES : EN;
    var get = function (k) { return k in dict ? dict[k] : EN[k]; };
    document.documentElement.lang = lang;
    each('[data-i18n]', function (el) { var v = get(el.getAttribute('data-i18n')); if (v != null) el.textContent = v; });
    each('[data-i18n-html]', function (el) { var v = get(el.getAttribute('data-i18n-html')); if (v != null) el.innerHTML = v; });
    each('[data-i18n-attr]', function (el) { attrPairs(el).forEach(function (p) { var v = get(p[1]); if (v != null) el.setAttribute(p[0], v); }); });
    each('.lang__btn', function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    try { localStorage.setItem('alisio-lang', lang); } catch (e) {}
    listeners.forEach(function (fn) { try { fn(lang); } catch (e) {} });
  }

  function t(key, vars) {
    var s = (DYN[lang] && DYN[lang][key]) || DYN.en[key] || key;
    if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  window.I18N = {
    get lang() { return lang; },
    set: apply,
    t: t,
    onChange: function (fn) { listeners.push(fn); }
  };

  function boot() {
    capture();
    if (lang === 'es') apply('es');
    each('.lang__btn', function (b) { b.addEventListener('click', function () { if (b.getAttribute('data-lang') !== lang) apply(b.getAttribute('data-lang')); }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
