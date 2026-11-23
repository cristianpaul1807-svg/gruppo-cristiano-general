'use strict';
/* ============================================================================
   El motor de la pagina. Sin librerias: aparecer al bajar, la barra de
   progreso, el menu, las fichas de las sedes, los puntos de fe y el idioma.
   ============================================================================ */

/* ============================================================================
   EL WHATSAPP DEL GRUPO.

   Lo pone el administrador general desde el panel («Il sito del gruppo») y
   se guarda en la base de datos. Esta variable es solo el respaldo por si no
   hay base: vacia, el boton sigue a la vista pero apagado y lleva a las
   sedes, en vez de abrir una ventana rota.

   Va al encargado de ESTA web, no a una sede concreta: es para quien no
   entiende la pagina o no sabe a que iglesia ir.
   ============================================================================ */
var WHATSAPP = '';
var WA_MENSAJE = 'Ciao, scrivo dal sito del Gruppo Cristiano.';

var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Lo que guarda el general (portada, WhatsApp, preguntas, vision, historia):
   se pide UNA vez y lo usan todos los trozos de la pagina que lo necesitan. */
var SITO_P = null;
function SITO_UNA_VEZ() {
  if (!SITO_P) SITO_P = (window.ALMACEN && ALMACEN.leerSito) ? ALMACEN.leerSito() : Promise.resolve(null);
  return SITO_P;
}

/* Un texto escrito en el panel -> parrafos y listas, siempre como texto (nunca
   HTML). Linea en blanco = parrafo nuevo; linea que empieza por "- " = punto
   de una lista. */
function BLOQUES(cont, texto) {
  var p = null, ul = null;
  String(texto || '').split(/\r?\n/).forEach(function (l) {
    var lin = l.trim();
    if (!lin) { p = null; ul = null; return; }
    var m = /^[-•]\s+(.*)$/.exec(lin);
    if (m) {
      p = null;
      if (!ul) { ul = document.createElement('ul'); cont.appendChild(ul); }
      var li = document.createElement('li'); li.textContent = m[1]; ul.appendChild(li);
      return;
    }
    ul = null;
    if (!p) { p = document.createElement('p'); cont.appendChild(p); p.textContent = lin; }
    else p.textContent += ' ' + lin;
  });
}
var $ = function (s) { return document.querySelector(s); };

/* --- el idioma de lo que escriben ellos -----------------------------------
   Lo fijo (menus, botones, titulos) esta traducido en I18N, al final. Lo que
   escriben el general y cada iglesia en el panel, por este orden:
     1. lo que ELLOS han escrito en ese idioma (pestañas Español / English);
     2. si lo dejaron vacio, la traduccion automatica del italiano, que hace
        el servidor con DeepL (ALMACEN.traduzioni) y se guarda en TRAD;
     3. si tampoco hay, el italiano: mejor que un hueco. */
function LINGUA() { var l = document.documentElement.lang; return (l === 'es' || l === 'en') ? l : 'it'; }
var TRAD = {};
function TR(t) {
  t = t == null ? '' : String(t);
  var l = LINGUA(), m = TRAD[l];
  return (l !== 'it' && m && m[t]) ? m[t] : t;
}
/* Los contenidos del general guardan "t_it", "t_es", "t_en". */
function CAMPO(o, k) {
  if (!o) return '';
  var l = LINGUA();
  if (l !== 'it' && o[k + '_' + l]) return o[k + '_' + l];
  if (o[k + '_it']) return TR(o[k + '_it']);
  return o[k + '_es'] || o[k + '_en'] || '';
}
/* Lo de las iglesias, eventos y fotos guarda "testo" (italiano), "testo_es"
   y "testo_en". */
function LOC(o, k) {
  if (!o) return '';
  var l = LINGUA();
  return (l !== 'it' && o[k + '_' + l]) || TR(o[k] || '');
}
/* Los dias de la semana de un horario, para cuando la iglesia no ha escrito
   el horario en ese idioma: "Lunedì e venerdì 19:30" -> "Monday and Friday
   19:30". Un diccionario fijo de siete dias, no un traductor. */
var GIORNI = {
  es: { 'domenica': 'domingo', 'lunedì': 'lunes', 'lunedi': 'lunes', 'martedì': 'martes', 'martedi': 'martes',
        'mercoledì': 'miércoles', 'mercoledi': 'miércoles', 'giovedì': 'jueves', 'giovedi': 'jueves',
        'venerdì': 'viernes', 'venerdi': 'viernes', 'sabato': 'sábado', 'e': 'y', 'ore': '', 'alle': 'a las',
        'dalle': 'de', 'ogni': 'cada', 'tutti': 'todos', 'i': 'los', 'giorni': 'días' },
  en: { 'domenica': 'Sunday', 'lunedì': 'Monday', 'lunedi': 'Monday', 'martedì': 'Tuesday', 'martedi': 'Tuesday',
        'mercoledì': 'Wednesday', 'mercoledi': 'Wednesday', 'giovedì': 'Thursday', 'giovedi': 'Thursday',
        'venerdì': 'Friday', 'venerdi': 'Friday', 'sabato': 'Saturday', 'e': 'and', 'ore': '', 'alle': 'at',
        'dalle': 'from', 'ogni': 'every', 'tutti': 'all', 'i': 'the', 'giorni': 'days' }
};
function DIAS(t) {
  var l = LINGUA(), d = GIORNI[l];
  if (!d || !t) return t || '';
  /* "dalle 18 alle 20": ahi "alle" es "hasta", no "a las". */
  if (/\bdalle\b/i.test(t)) { d = Object.assign({}, d); d.alle = l === 'en' ? 'to' : 'a'; }
  /* Solo si TODAS las palabras son dias o enlaces: una frase cualquiera
     ("Domenica pomeriggio in chiesa") se queda como esta. */
  var palabras = String(t).replace(/[\d:.,–·\-\/]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!palabras.length || !palabras.every(function (w) { return d[w.toLowerCase()] !== undefined; })) return t;
  var out = String(t).replace(/[A-Za-zÀ-ÿ]+/g, function (w) {
    var x = d[w.toLowerCase()];
    if (x === undefined) return w;
    if (l === 'es' && w.charAt(0) === w.charAt(0).toUpperCase()) x = x.charAt(0).toUpperCase() + x.slice(1);
    return x;
  });
  return out.replace(/\s{2,}/g, ' ').trim();
}
/* Un horario de la ficha: [que, cuando] en italiano y, si la iglesia los ha
   escrito, {es: [que, cuando], en: [que, cuando]} como tercer elemento. */
function ORARIO(o) {
  var l = LINGUA(), t = (l !== 'it' && o && o[2] && Array.isArray(o[2][l])) ? o[2][l] : [];
  var cuando = o && o[1], auto = TR(cuando);
  return [t[0] || TR((o && o[0]) || ''), t[1] || (auto !== cuando ? auto : DIAS(cuando))];
}
/* El papel de un pastor: ["Nombre", "pastore giovani", {es: "...", en: "..."}]. */
function RUOLO(p) {
  if (!Array.isArray(p)) return '';
  var l = LINGUA();
  return (l !== 'it' && p[2] && p[2][l]) || TR(p[1] || '');
}
/* Una fecha "2026-12-14" escrita en el idioma de la pagina. */
function FECHA(g, opc) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(g || ''));
  if (!m) return '';
  var d = new Date(+m[1], +m[2] - 1, +m[3]);
  var loc = { it: 'it-IT', es: 'es-ES', en: 'en-GB' }[LINGUA()];
  try { return new Intl.DateTimeFormat(loc, opc).format(d); } catch (e) { return g; }
}
function TEXTO(k, alt) { var d = window.__T || {}; return d[k] !== undefined ? d[k] : alt; }

/* --- movimiento al bajar ----------------------------------------------------
   Entrar al llegar, salir hacia el lado al irse por arriba, y volver a entrar
   si se sube. La "pantalla" que se vigila es un poco mas baja por arriba
   (-10 %): asi la salida empieza cuando la pieza aun se ve, y se nota.

   Las direcciones se reparten aqui y no en el HTML: una lista de "esta pieza
   entra por aqui", facil de cambiar sin tocar diez archivos. */
var observarReveal;
(function () {
  var DIRECCION = [
    ['.sec-head', 'izq'],
    ['.trova > .reveal:first-child', 'izq'], ['.regione', 'der'],
    ['.storia', 'izq'], ['.fondatori-h', 'izq'],
    ['.fondatore.d1', 'izq'], ['.fondatore.d2', 'der'], ['.fondatori-pie', 'zoom'],
    ['.predica > .reveal:first-child', 'izq'], ['.predica .acciones', 'der'],
    ['.faq', 'der'], ['.fede', 'der']
  ];
  /* Piezas que no llevaban movimiento y se lo damos: el mapa y la ficha de
     la pagina de cada iglesia, cada una desde su lado. */
  var NUEVAS = [['.sp-mappa', 'der'], ['.sp-info', 'izq']];

  function repartir(raiz) {
    NUEVAS.forEach(function (n) {
      raiz.querySelectorAll(n[0]).forEach(function (el) { el.classList.add('reveal', n[1]); });
    });
    DIRECCION.forEach(function (d) {
      raiz.querySelectorAll(d[0]).forEach(function (el) {
        if (el.classList.contains('reveal') && !/\b(izq|der|zoom)\b/.test(el.className)) el.classList.add(d[1]);
      });
    });
    /* Los puntos de la vision: uno de cada lado, alternando. */
    raiz.querySelectorAll('.lista-num .punto.reveal').forEach(function (el, i) {
      if (!/\b(izq|der)\b/.test(el.className)) el.classList.add(i % 2 ? 'der' : 'izq');
    });
  }

  if (!('IntersectionObserver' in window)) {
    observarReveal = function () {};
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (ent) {
    ent.forEach(function (e) {
      var el = e.target, top = e.rootBounds ? e.rootBounds.top : 0;
      if (e.isIntersecting) {
        el.classList.remove('sale'); el.classList.add('in');
      } else if (e.boundingClientRect.bottom <= top) {
        /* se ha ido por arriba: sale hacia su lado */
        el.classList.remove('in'); el.classList.add('sale');
      } else {
        /* esta por debajo (se ha subido): queda lista para volver a entrar */
        el.classList.remove('in', 'sale');
      }
    });
  }, { threshold: 0, rootMargin: '-10% 0px -6% 0px' });

  repartir(document);
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  /* Las fichas y la galeria se crean despues (y las fichas se vuelven a crear
     al cambiar de idioma). Sin esto nacerian invisibles. */
  observarReveal = function (raiz) {
    repartir(raiz);
    raiz.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  };
})();

/* --- barra de progreso ----------------------------------------------------- */
(function () {
  var barra = $('#page-progress'), cue = $('#cue'), tic = false;
  function pintar() {
    var h = document.documentElement;
    var total = h.scrollHeight - h.clientHeight;
    var r = total > 0 ? Math.min(Math.max(h.scrollTop / total, 0), 1) : 0;
    barra.style.width = (r * 100) + '%';
    /* el aviso de "Scorri" lo apaga el efecto de la portada, mas abajo */
    if (cue && !$('#hero .hero-pin')) cue.style.opacity = h.scrollTop > 40 ? '0' : '1';
  }
  document.addEventListener('scroll', function () {
    if (!tic) { requestAnimationFrame(function () { pintar(); tic = false; }); tic = true; }
  }, { passive: true });
  window.addEventListener('resize', pintar);
  pintar();
})();

/* ============================================================================
   LA PORTADA — al bajar, la foto se acerca, se oscurece y sale el logo.

   La portada mide 230svh y por dentro lleva una caja pegada arriba. Mientras
   se baja por ella, la caja no se mueve y lo que cambia es lo de dentro, segun
   cuanto se ha bajado (p, de 0 a 1):

     0.00 – 1.00   la foto se acerca un 14 %
     0.08 – 0.36   el titular y los botones se van hacia arriba
     0.30 – 0.78   la foto se oscurece (se sigue viendo debajo)
     0.34 – 0.70   aparece el logo en blanco, solo

   Con "reducir movimiento" no hay nada de esto: el CSS deja la portada de una
   pantalla y se ve el texto.
   ============================================================================ */
(function () {
  var hero = $('#hero');
  var pin = hero && hero.querySelector('.hero-pin');
  if (!pin || reducido) return;

  var video = hero.querySelector('.hero-foto video');
  var medio = video || hero.querySelector('.hero-foto img');
  var oscuro = hero.querySelector('.hero-oscuro');
  var contenido = hero.querySelector('.hero-contenido');
  var final = hero.querySelector('.hero-final');
  var cue = $('#cue');

  function tramo(p, a, b) { return Math.min(Math.max((p - a) / (b - a), 0), 1); }
  function suave(t) { return t * t * (3 - 2 * t); }

  /* SI ALGUN DIA ES UN VIDEO — tres reglas aprendidas en produccion, que no se
     tocan aunque parezcan raras:
       1. Nunca .pause(). Safari pinta su boton de "play" encima de cualquier
          video pausado, llegue como llegue a pausa. El video se queda
          "reproduciendo" a velocidad 0.
       2. playbackRate = 0 DESPUES de que play() se resuelva, no antes.
       3. Nunca llevarlo al final exacto: al llegar salta 'ended' y se para. */
  var listo = false;
  if (video) {
    video.muted = true; video.playsInline = true;
    var cebar = function () {
      var pr = video.play();
      if (pr && pr.then) pr.then(function () { video.playbackRate = 0; listo = true; }).catch(function () {});
      else { video.playbackRate = 0; listo = true; }
    };
    video.addEventListener('loadedmetadata', cebar);
    /* si el navegador lo pausa por su cuenta, se vuelve a cebar */
    video.addEventListener('pause', function () { if (listo) cebar(); });
    if (video.readyState >= 1) cebar();
    /* iOS a veces no deja arrancar un video hasta el primer toque */
    ['touchstart', 'click'].forEach(function (ev) {
      window.addEventListener(ev, cebar, { once: true, passive: true });
    });
  }

  var tic = false;
  function pintar() {
    var r = hero.getBoundingClientRect();
    if (r.bottom < 0) return;                 // ya ha pasado: nada que mover
    var recorrido = hero.offsetHeight - window.innerHeight;
    var p = recorrido > 0 ? Math.min(Math.max(-r.top / recorrido, 0), 1) : 0;

    medio.style.transform = 'scale(' + (1 + 0.14 * suave(p)) + ')';

    var t = suave(tramo(p, 0.08, 0.36));
    contenido.style.opacity = String(1 - t);
    contenido.style.transform = 'translateY(' + (-40 * t) + 'px)';
    /* Sin esto, los botones ya invisibles seguirian recibiendo toques encima
       del logo. */
    contenido.style.pointerEvents = t > 0.6 ? 'none' : '';

    oscuro.style.opacity = String(suave(tramo(p, 0.30, 0.78)));

    var l = suave(tramo(p, 0.34, 0.70));
    final.style.opacity = String(l);
    final.firstElementChild.style.transform = 'scale(' + (0.94 + 0.06 * l) + ')';

    if (cue) cue.style.opacity = p > 0.03 ? '0' : '1';

    if (video && listo && video.duration) {
      try { video.currentTime = Math.min(tramo(p, 0, 0.85) * video.duration, video.duration - 0.05); }
      catch (e) {}
    }
  }
  document.addEventListener('scroll', function () {
    if (!tic) { requestAnimationFrame(function () { pintar(); tic = false; }); tic = true; }
  }, { passive: true });
  window.addEventListener('resize', pintar);
  pintar();
})();

/* --- la foto de portada que sube el general -----------------------------------
   Si el general ha subido una desde el panel, sale esa; si no, la de serie. La
   nueva se descarga primero y se cambia cuando ya esta: asi no hay un momento
   con la portada en blanco, y si falla se queda la de serie. */
(function () {
  var img = document.querySelector('#hero .hero-foto img');
  if (!img || !window.ALMACEN || !ALMACEN.leerSito) return;
  SITO_UNA_VEZ().then(function (s) {
    var url = s && IMAGEN(s.copertina);
    if (!url) return;
    var nueva = new Image();
    nueva.onload = function () {
      var pic = img.parentNode;
      Array.prototype.slice.call(pic.querySelectorAll('source')).forEach(function (x) { pic.removeChild(x); });
      img.removeAttribute('srcset'); img.removeAttribute('sizes');
      img.src = url;
    };
    nueva.src = url;
  });
})();

/* --- menu del movil -------------------------------------------------------- */
(function () {
  var boton = $('.nav-toggle'), menu = $('.navlinks'), fondo = $('.nav-backdrop');
  if (!boton) return;
  function cerrar() {
    menu.classList.remove('open'); fondo.classList.remove('open');
    boton.setAttribute('aria-expanded', 'false');
  }
  boton.addEventListener('click', function () {
    var abierto = menu.classList.toggle('open');
    fondo.classList.toggle('open', abierto);
    boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
  });
  fondo.addEventListener('click', cerrar);
  menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', cerrar); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
})();

/* --- el boton de WhatsApp -------------------------------------------------- 
   En la portada, el numero del grupo, que pone el general en su panel («Il
   sito del gruppo»). Dentro de la pagina de una iglesia no se toca: alli lo
   pone sede.js con el numero de esa iglesia. */
function NUMERO_WA(t) {
  var d = String(t || '').replace(/[^0-9]/g, '');
  if (d.indexOf('00') === 0) d = d.slice(2);
  if (d.length === 10 && d.charAt(0) === '3') d = '39' + d;
  return d.length >= 8 ? d : '';
}
(function () {
  var wa = $('#wa');
  if (!wa || document.body.hasAttribute('data-sede')) return;
  function encender(n) {
    wa.classList.remove('apagado');
    wa.href = 'https://wa.me/' + n + '?text=' + encodeURIComponent(WA_MENSAJE);
    wa.target = '_blank'; wa.rel = 'noopener';
  }
  if (NUMERO_WA(WHATSAPP)) encender(NUMERO_WA(WHATSAPP));
  if (window.ALMACEN && ALMACEN.leerSito) {
    SITO_UNA_VEZ().then(function (s) {
      var n = NUMERO_WA(s && s.whatsapp);
      if (n) encender(n);
    });
  }
})();

/* ============================================================================
   LAS FICHAS DE LAS SEDES
   ============================================================================ */
/* Notas de "esto no esta confirmado" que se pegan a una sede. Hoy no hay
   ninguna: los horarios de Parma y de Fidenza ya los han dado ellos en su
   documento. El mecanismo se queda por si vuelve a hacer falta. */
var NOTE_IT = {};
var NOTAS_SEDE = {};

var SEDI = (window.SEDI_BASE || []).slice();

/* ----------------------------------------------------------------------------
   DONDE ESTA LA RAIZ, Y QUE PAGINAS EXISTEN

   Este mismo archivo dibuja las tarjetas en dos sitios: en la portada, donde
   la raiz es aqui mismo, y dentro de la pagina de una iglesia, donde hay que
   subir un nivel. El HTML lo dice con data-raiz y asi no hay que adivinarlo
   contando barras en location.pathname, que falla en cuanto algo se mueve.

   Toda iglesia con id tiene pagina: las de sedi.js, la suya generada; las
   creadas desde el panel, la pagina comodin (_sede.html), que nginx entrega
   cuando la carpeta no existe. Por eso cualquier tarjeta puede enlazar.
   ---------------------------------------------------------------------------- */
var RAIZ = document.body.getAttribute('data-raiz') || '';

function PAGINA(sede) {
  return sede.id ? RAIZ + sede.id + '/' : '';
}

/* Las rutas de sedi.js se escriben desde la raiz ('media/...'). Una imagen que
   venga del panel es un data URL o una direccion entera, y esas no se tocan. */
function RUTA(p) {
  if (!p || /^(https?:|data:|\/)/.test(p)) return p;
  return RAIZ + p;
}

/* De donde sale el mapa de una sede. Hay dos sitios y no se mezclan:

     - las de sedi.js tienen su mapa en un archivo, media/mappa-<id>.jpg,
       generado con herramientas/mapa-sede.py;
     - las creadas desde el panel lo llevan dentro de la ficha, en `mapa`,
       porque el panel no puede escribir archivos en el servidor.

   Antes se probaba el archivo para cualquier sede, y para las del panel eso
   era una peticion a un archivo que no existe CADA VEZ que salia su tarjeta:
   seis 404 solo en una visita normal. El aviso de "mapa pendiente" salia
   bien, pero cada fallo es una peticion tirada. */
/* Un enlace que viene de la base de datos solo se usa si es una pagina web
   normal. "javascript:..." en un href se EJECUTA al tocarlo: con los campos
   de web y de redes editables por cada responsable, sin esto cualquiera
   podria plantar un enlace que roba la sesion de quien lo toque. */
function SEGURO(url) {
  url = String(url || '').trim();
  return /^https?:\/\/[^\s]+$/i.test(url) ? url : '';
}

/* Lo mismo para el ORIGEN DE UNA IMAGEN (la foto de portada y el logo de cada
   iglesia). Aqui se acepta ademas una imagen metida en la propia ficha
   (data:image/...), que es como las guarda el modo demo: en el src de una
   imagen no puede ejecutar nada. En un enlace no se acepta nunca: un
   "data:text/html" en un href es una pagina falsa servida desde nuestro
   dominio. Y las rutas de sedi.js ("media/...") se sirven desde aqui. */
function IMAGEN(url) {
  url = String(url || '').trim();
  if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+\/=]+$/i.test(url)) return url;
  if (SEGURO(url)) return url;
  if (/^media\/[a-z0-9._\/-]+$/i.test(url)) return RUTA(url);
  return '';
}

function MAPA_DE(sede) {
  if (sede.mapa) return sede.mapa;
  var deArchivo = (window.SEDI_BASE || []).some(function (b) { return b.id === sede.id; });
  return deArchivo ? RUTA('media/mappa-' + sede.id + '.jpg') : '';
}

(function () {
  var lista = document.getElementById('sedi-lista');
  if (!lista) return;

  /* Dentro de la pagina de una iglesia, esta lista son LAS DEMAS: la propia
     sobra, que es donde ya esta quien lo mira. */
  var YO = document.body.getAttribute('data-sede') || '';

  function texto(k, alt) { var d = window.__T || {}; return d[k] !== undefined ? d[k] : alt; }

  function tarjeta(sede, i) {
    var dir = sede.via && sede.cap ? sede.via + ', ' + sede.cap + ', Italia' : '';
    var q = encodeURIComponent(dir);
    var art = document.createElement('article');
    art.className = 'sede reveal' + (i ? ' d' + Math.min(i, 3) : '');
    /* Ancla propia: asi se manda a alguien directo a su iglesia con
       .../#sede-parma en vez de "baja y busca". */
    art.id = 'sede-' + (sede.id || (sede.citta || '').toLowerCase().replace(/[^a-z]/g, ''));

    /* Arriba va el logo de esa iglesia si lo tiene y lo quiere; si no, el
       mapa, que es lo normal. Y si no hay ninguno de los dos, una trama con
       el aviso — nunca un hueco negro, que parece un fallo de carga. */
    var fuenteMapa = MAPA_DE(sede);
    var pagina = PAGINA(sede);
    /* Lo de arriba de la tarjeta, por orden de preferencia:
         1. la FOTO de portada que ha subido esa iglesia, con su logo encima;
         2. solo su logo, si no hay foto;
         3. el mapa, que es lo normal;
         4. la trama de "mapa pendiente", si no hay ni direccion.
       Las imagenes que vienen de la base de datos pasan por SEGURO: solo se
       aceptan direcciones https, nada de "javascript:" ni rutas raras. */
    var copertina = IMAGEN(sede.copertina);
    var logo = IMAGEN(sede.logo);
    var cabecera;
    if (copertina) {
      cabecera = document.createElement(pagina ? 'a' : 'div');
      cabecera.className = 'sede-mappa foto';
      var ic = document.createElement('img');
      ic.src = copertina; ic.loading = 'lazy'; ic.width = 1120; ic.height = 700;
      ic.alt = texto('sd_alt_foto', 'La chiesa di') + ' ' + sede.citta;
      cabecera.appendChild(ic);
      if (logo) {
        var se = document.createElement('img');
        se.className = 'sello'; se.src = logo; se.loading = 'lazy';
        se.alt = texto('sd_alt_logo', 'Logo della chiesa di') + ' ' + sede.citta;
        cabecera.appendChild(se);
      }
    } else if (logo) {
      cabecera = document.createElement(pagina ? 'a' : 'div');
      cabecera.className = 'sede-mappa logo';
      var il = document.createElement('img');
      il.src = logo; il.loading = 'lazy';
      il.alt = texto('sd_alt_logo', 'Logo della chiesa di') + ' ' + sede.citta;
      cabecera.appendChild(il);
    } else if (fuenteMapa && dir) {
      cabecera = document.createElement(pagina ? 'a' : 'div');
      /* "mapa": el anillo que late sobre el marcador solo va en los mapas */
      cabecera.className = 'sede-mappa mapa';
      var im = document.createElement('img');
      im.width = 1120; im.height = 700; im.loading = 'lazy';
      im.alt = texto('sd_alt', 'Mappa della chiesa di') + ' ' + sede.citta;
      /* Creada desde el panel sin pulsar "Genera la mappa": no hay archivo.
         En vez de un icono roto, la trama con el aviso. */
      im.onerror = (function (cab) {
        return function () {
          cab.textContent = texto('sd_senza_mappa', 'Mappa in attesa dell’indirizzo');
          cab.classList.remove('mapa');
          cab.classList.add('vuota');
        };
      })(cabecera);
      im.src = fuenteMapa;
      cabecera.appendChild(im);
    } else {
      cabecera = document.createElement(pagina ? 'a' : 'div');
      cabecera.className = 'sede-mappa vuota';
      cabecera.textContent = texto('sd_senza_mappa', 'Mappa in attesa dell’indirizzo');
    }
    /* El mapa ya no abre el navegador: abre LA PAGINA de esa iglesia.

       Es el cambio que pidieron ellos. Cada comunidad tiene su propia
       direccion —gruppocristiano.it/parma— y la tarjeta es la puerta. Dentro
       de esa pagina estan los botones de llegar, que es donde tienen sentido:
       quien toca una tarjeta normalmente quiere saber de esa iglesia, no
       arrancar el coche. */
    if (cabecera.tagName === 'A') {
      cabecera.href = PAGINA(sede);
      cabecera.setAttribute('aria-label', texto('sd_ver_aria', 'La chiesa di') + ' ' + sede.citta);
    }
    art.appendChild(cabecera);

    var corpo = document.createElement('div');
    corpo.className = 'sede-corpo';

    var h = document.createElement('h3');
    h.textContent = sede.citta;
    corpo.appendChild(h);

    var via = document.createElement('p');
    via.className = 'sede-via';
    /* Como texto, no como HTML: la calle y el codigo postal los escribe el
       responsable de cada iglesia desde el panel. El `innerHTML +=` de antes
       metia el codigo postal tal cual en la pagina — cualquier codigo escrito
       ahi se habria ejecutado en el movil de quien abriese la portada. */
    if (dir) {
      via.textContent = sede.via;
      via.appendChild(document.createElement('br'));
      via.appendChild(document.createTextNode(sede.cap));
    }
    else {
      via.innerHTML = texto('sd_senza_via', 'Indirizzo') +
        ' <span class="x-conf">' + texto('conf', 'da confermare') + '</span>';
    }
    corpo.appendChild(via);

    if (sede.testo) {
      var t = document.createElement('p');
      t.className = 'sede-testo'; t.textContent = LOC(sede, 'testo');
      corpo.appendChild(t);
    }

    if (sede.lingue) {
      var cont = document.createElement('div');
      cont.className = 'sede-lingue';
      TR(sede.lingue).split(',').forEach(function (l) {
        l = l.trim(); if (!l) return;
        var s = document.createElement('span'); s.textContent = l; cont.appendChild(s);
      });
      if (cont.children.length) corpo.appendChild(cont);
    }

    var dl = document.createElement('dl');
    dl.className = 'sede-orari';
    if (sede.orari && sede.orari.length) {
      /* En la tarjeta, DOS reuniones y no todas. Parma tiene siete: con todas,
         su tarjeta mediria el doble que la de al lado y la rejilla se
         desordena. La primera es siempre la del domingo —asi estan escritas
         en sedi.js—, que es la que busca quien no ha venido nunca. Las demas
         estan en la pagina de la iglesia, a un toque. */
      var MAX = 2;
      sede.orari.slice(0, MAX).forEach(function (o) {
        var fila = document.createElement('div');
        var oo = ORARIO(o);
        var dt = document.createElement('dt'); dt.textContent = oo[0];
        var dd = document.createElement('dd'); dd.textContent = oo[1];
        fila.appendChild(dt); fila.appendChild(dd); dl.appendChild(fila);
      });
      if (sede.orari.length > MAX && pagina) {
        var mas = document.createElement('a');
        mas.className = 'sede-mas';
        mas.href = pagina;
        mas.textContent = texto('sd_tutti', 'Tutti gli incontri') + ' (' + sede.orari.length + ') →';
        dl.appendChild(mas);
      }
    } else {
      var fila = document.createElement('div');
      var dt = document.createElement('dt'); dt.textContent = texto('sd_orari', 'Orari');
      var dd = document.createElement('dd');
      dd.innerHTML = '<span class="x-conf">' + texto('conf', 'da confermare') + '</span>';
      fila.appendChild(dt); fila.appendChild(dd); dl.appendChild(fila);
    }
    corpo.appendChild(dl);

    var clave = NOTAS_SEDE[sede.id];
    if (clave) {
      var n = document.createElement('p');
      n.className = 'sede-nota';
      n.textContent = texto('sd_nota_' + clave, NOTE_IT[clave] || '');
      if (n.textContent) corpo.appendChild(n);
    }

    if (pagina || dir || sede.web) {
      var acc = document.createElement('div');
      acc.className = 'acciones';
      /* El boton principal es el de entrar en la iglesia. Ahi dentro esta
         todo lo suyo —horarios, mapa, como llegar, con quien hablar— y es lo
         que pidieron: que cada comunidad tenga su sitio.

         Aqui NO van los dos botones de mapas. Una rejilla de cuatro tarjetas
         con tres botones cada una son doce botones en una pantalla de movil,
         y entonces no destaca ninguno. Llegar se decide dentro. */
      if (pagina) {
        var v = document.createElement('a');
        v.className = 'btn piena'; v.href = pagina;
        /* corto y igual en todas: "La chiesa di Reggio Emilia" empujaba el
           otro boton a una segunda linea y las tarjetas no cuadraban */
        v.textContent = texto('sd_ver', 'Vedi la chiesa');
        acc.appendChild(v);
      }
      if (dir) {
        var g = document.createElement('a');
        g.className = 'btn' + (pagina ? '' : ' piena');
        g.target = '_blank'; g.rel = 'noopener';
        g.href = 'https://www.google.com/maps/dir/?api=1&destination=' + q;
        g.textContent = texto('sd_vai', 'Come arrivare');
        acc.appendChild(g);
      }
      /* La web propia de esa iglesia, si algun dia la tiene aparte de esta. */
      if (SEGURO(sede.web)) {
        var w = document.createElement('a');
        w.className = 'btn'; w.href = SEGURO(sede.web);
        w.target = '_blank'; w.rel = 'noopener';
        w.textContent = texto('sd_sito', 'Vai al sito');
        acc.appendChild(w);
      }
      corpo.appendChild(acc);
    }
    art.appendChild(corpo);

    if (fuenteMapa && dir && !sede.logo) {
      var cap = document.createElement('p');
      cap.className = 'sede-cap';
      cap.textContent = texto('sd_attr', 'Mappa © contributori di OpenStreetMap');
      art.appendChild(cap);
    }
    return art;
  }

  function espera() {
    var art = document.createElement('article');
    art.className = 'sede attesa reveal d2';
    var m = document.createElement('div');
    m.className = 'sede-mappa vuota';
    m.textContent = texto('sd_altra_et', 'Altra chiesa');
    art.appendChild(m);
    var c = document.createElement('div');
    c.className = 'sede-corpo';
    var h = document.createElement('h3');
    h.textContent = texto('sd_altra_h', 'Le altre chiese');
    var p = document.createElement('p');
    p.textContent = texto('sd_altra_p',
      'Di ogni chiesa servono il nome, la via con il numero civico, i giorni e le ore, ' +
      'e le lingue che si parlano. Da lì la scheda si costruisce da sola, mappa compresa.');
    c.appendChild(h); c.appendChild(p);
    art.appendChild(c);
    return art;
  }

  function dibujar() {
    lista.textContent = '';
    /* Una ficha en borrador no sale. Es el boton que evita publicar algo a
       medio escribir desde el panel. */
    SEDI.filter(function (s) { return s.publicada !== false && s.id !== YO; })
        .forEach(function (s, i) { lista.appendChild(tarjeta(s, i)); });
    /* La tarjeta de "Le altre chiese" (la que pedia los datos de las demas
       iglesias) ya no sale: era para ellos, cuando faltaban datos, y en una
       web publica queda como una tarjeta a medio hacer. Las comunidades
       nuevas las crean desde el panel y salen aqui solas. */
    if (observarReveal) observarReveal(lista);
  }

  /* El pie lista las ciudades, y se arma solo con las que estan publicadas.
     Escrito a mano era una linea que se queda vieja: se anade una iglesia y
     el pie sigue diciendo "Fidenza · Parma" durante meses sin que nadie lo
     note. Lo que se puede deducir, se deduce. */
  function pintarPie() {
    var pie = document.querySelector('.pie-dir');
    if (!pie) return;
    var ciudades = SEDI.filter(function (s) { return s.publicada !== false; })
                       .map(function (s) { return s.citta; })
                       .filter(Boolean);
    if (ciudades.length) pie.textContent = ciudades.join(' · ');
  }

  /* Las publicadas que tienen coordenadas: las que caben en el mapa y entre
     las que se busca la mas cercana. */
  function conPunto() {
    return SEDI.filter(function (s) {
      return s.publicada !== false && isFinite(parseFloat(s.lat)) && isFinite(parseFloat(s.lon));
    });
  }

  /* Bajo el logo, al final del efecto de la portada: las ciudades. Igual que
     el pie, sale de la lista y no se escribe a mano. */
  function pintarCiudades() {
    var p = document.getElementById('hero-citta');
    if (!p) return;
    p.textContent = SEDI.filter(function (s) { return s.publicada !== false; })
      .map(function (s) { return s.citta; }).filter(Boolean).join(' · ');
  }

  /* --- el mapa de la region ------------------------------------------------
     Cada chincheta es un ENLACE a la pagina de esa comunidad, colocado encima
     de la imagen con su latitud y su longitud. La imagen esta en Mercator
     —la proyeccion de los mapas web—: en horizontal la longitud es lineal,
     en vertical no, y por eso la cuenta de la y lleva el logaritmo. */
  function pintarMapa() {
    var reg = document.getElementById('regione');
    if (!reg) return;
    reg.querySelectorAll('.pin').forEach(function (p) { p.remove(); });
    var N = +reg.dataset.lat0, S = +reg.dataset.lat1, O = +reg.dataset.lon0, E = +reg.dataset.lon1;
    function merc(la) { return Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360)); }
    var puestos = [];
    conPunto().forEach(function (s) {
      var x = (parseFloat(s.lon) - O) / (E - O);
      var y = (merc(N) - merc(parseFloat(s.lat))) / (merc(N) - merc(S));
      /* una comunidad fuera del encuadre (si un dia nace en Milan) sale en
         la lista y en "la mas cercana", pero no en este mapa */
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      var a = document.createElement('a');
      a.className = 'pin'; a.href = PAGINA(s); a.setAttribute('data-id', s.id);
      a.style.left = (x * 100).toFixed(2) + '%';
      a.style.top = (y * 100).toFixed(2) + '%';
      a.setAttribute('aria-label', texto('sd_ver_aria', 'La chiesa di') + ' ' + s.citta);
      var et = document.createElement('span'); et.textContent = s.citta;
      a.appendChild(et);
      a.appendChild(document.createElement('i'));
      puestos.push({ el: a, x: x, y: y });
      reg.appendChild(a);
    });
    /* Fidenza y Parma estan a 20 km: en un movil sus nombres se pisarian. Si
       dos chinchetas estan muy juntas, la de mas abajo lleva el nombre
       debajo en vez de encima. */
    puestos.forEach(function (p) {
      var pegada = puestos.some(function (q) {
        return q !== p && Math.abs(q.x - p.x) < 0.16 && Math.abs(q.y - p.y) < 0.10 && q.y < p.y;
      });
      p.el.classList.toggle('abajo', pegada);
    });
  }

  var dibujarTodo = function () { dibujar(); pintarPie(); pintarCiudades(); pintarMapa(); };

  /* --- "Usa la mia posizione": cual queda mas cerca -------------------------
     La posicion se pide al telefono y se usa ahi mismo: la cuenta de la
     distancia se hace en el propio movil y no se manda a ningun sitio. */
  (function () {
    var boton = document.getElementById('vicina');
    var esito = document.getElementById('trova-esito');
    if (!boton || !esito) return;
    if (!('geolocation' in navigator)) { boton.hidden = true; return; }

    /* distancia en linea recta (haversine). Por carretera es mas: por eso el
       texto dice "in linea d'aria". */
    function km(la1, lo1, la2, lo2) {
      var r = Math.PI / 180, dla = (la2 - la1) * r, dlo = (lo2 - lo1) * r;
      var a = Math.sin(dla / 2) * Math.sin(dla / 2)
        + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dlo / 2) * Math.sin(dlo / 2);
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    boton.addEventListener('click', function () {
      esito.textContent = texto('tr_cerco', 'Cerco la tua posizione…');
      boton.disabled = true;
      navigator.geolocation.getCurrentPosition(function (pos) {
        boton.disabled = false;
        var la = pos.coords.latitude, lo = pos.coords.longitude;
        var lista = conPunto().map(function (s) {
          return { s: s, d: km(la, lo, parseFloat(s.lat), parseFloat(s.lon)) };
        }).sort(function (a, b) { return a.d - b.d; });
        if (!lista.length) { esito.textContent = texto('tr_nessuna', 'Non trovo nessuna comunità sulla mappa.'); return; }
        var c = lista[0];
        /* El nombre viene de la base de datos: va como texto, no como HTML. */
        esito.textContent = texto('tr_res1', 'La più vicina è') + ' ';
        var b = document.createElement('b'); b.textContent = 'Gruppo Cristiano ' + c.s.citta;
        esito.appendChild(b);
        esito.appendChild(document.createTextNode(', ' + texto('tr_res2', 'a circa') + ' '
          + Math.max(1, Math.round(c.d)) + ' ' + texto('tr_res3', 'km in linea d’aria.') + ' '));
        var ir = document.createElement('a');
        ir.href = PAGINA(c.s); ir.textContent = texto('tr_apri', 'Apri la sua pagina →');
        esito.appendChild(ir);
        document.querySelectorAll('#regione .pin').forEach(function (p) {
          p.classList.toggle('cerca', p.getAttribute('data-id') === c.s.id);
        });
      }, function (err) {
        boton.disabled = false;
        esito.textContent = err && err.code === 1
          ? texto('tr_negato', 'Non hai dato il permesso di usare la posizione. Puoi guardare la mappa qui accanto.')
          : texto('tr_errore', 'Non sono riuscito a sapere dove sei. Guarda la mappa qui accanto.');
      }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
    });
  })();
  dibujarTodo();
  window.__dibujarSedi = dibujarTodo;

  /* Si alguien ha creado fichas desde el panel, mandan esas. ALMACEN devuelve
     null cuando no hay nada guardado o cuando el almacen no existe —navegacion
     privada, por ejemplo— y entonces se quedan las escritas. Devolver null y
     no una lista vacia importa: una lista vacia significaria "las he borrado
     todas a proposito". */
  if (window.ALMACEN) {
    ALMACEN.leer().then(function (guardadas) {
      if (guardadas && guardadas.length) {
        SEDI = guardadas;
        dibujar();
        /* Dentro de la pagina de una iglesia hay que repintar tambien lo suyo:
           si el encargado corrige un horario desde el panel, se corrige aqui y
           en la portada a la vez. */
        if (window.__dibujarSede) window.__dibujarSede();
        /* Los eventos dicen de que iglesia son: con la lista nueva, las
           creadas desde el panel tambien tienen nombre. */
        if (window.__dibujarEventi) window.__dibujarEventi();
      }
    });
  }
})();

/* ============================================================================
   LA GALERIA — la del grupo en la portada, la de cada iglesia en su pagina.
   Las fotos y su texto vienen de la base de datos; si no hay ninguna, la
   seccion sigue escondida. Todo se pinta con nodos de texto: el texto de una
   foto lo escribe un responsable y nunca se mete como HTML.
   ============================================================================ */
(function () {
  var sec = document.getElementById('galleria');
  var cont = document.getElementById('galleria-lista');
  if (!sec || !cont || !window.ALMACEN || !ALMACEN.leerFotos) return;
  var cartella = document.body.getAttribute('data-sede') || 'generale';
  var fotos = [];

  /* --- el visor ------------------------------------------------------------ */
  var visor = null, actual = 0, xIni = null;
  function crearVisor() {
    visor = document.createElement('div');
    visor.className = 'visor'; visor.setAttribute('role', 'dialog'); visor.setAttribute('aria-modal', 'true');
    var top = document.createElement('div'); top.className = 'visor-top';
    var cuenta = document.createElement('span'); cuenta.className = 'visor-cuenta';
    var x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Chiudi');
    top.appendChild(cuenta); top.appendChild(x);
    var centro = document.createElement('div'); centro.className = 'visor-centro';
    var img = document.createElement('img'); img.alt = '';
    var ant = document.createElement('button'); ant.type = 'button'; ant.className = 'ant'; ant.textContent = '‹'; ant.setAttribute('aria-label', 'Precedente');
    var sig = document.createElement('button'); sig.type = 'button'; sig.className = 'sig'; sig.textContent = '›'; sig.setAttribute('aria-label', 'Successiva');
    centro.appendChild(img); centro.appendChild(ant); centro.appendChild(sig);
    var pie = document.createElement('p'); pie.className = 'visor-pie';
    visor.appendChild(top); visor.appendChild(centro); visor.appendChild(pie);
    document.body.appendChild(visor);
    x.addEventListener('click', cerrar);
    ant.addEventListener('click', function () { ir(-1); });
    sig.addEventListener('click', function () { ir(1); });
    visor.addEventListener('click', function (e) { if (e.target === visor || e.target === centro) cerrar(); });
    /* pasar con el dedo */
    centro.addEventListener('touchstart', function (e) { xIni = e.touches[0].clientX; }, { passive: true });
    centro.addEventListener('touchend', function (e) {
      if (xIni === null) return;
      var dx = e.changedTouches[0].clientX - xIni; xIni = null;
      if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1);
    });
    document.addEventListener('keydown', function (e) {
      if (!visor.classList.contains('abierto')) return;
      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowLeft') ir(-1);
      if (e.key === 'ArrowRight') ir(1);
    });
  }
  function pintarVisor() {
    var f = fotos[actual];
    visor.querySelector('img').src = f.src;
    visor.querySelector('img').alt = f.testo || '';
    visor.querySelector('.visor-pie').textContent = f.testo || '';
    visor.querySelector('.visor-cuenta').textContent = (actual + 1) + ' / ' + fotos.length;
    var una = fotos.length < 2;
    visor.querySelector('.ant').hidden = una; visor.querySelector('.sig').hidden = una;
  }
  function abrir(i) {
    if (!visor) crearVisor();
    actual = i; pintarVisor();
    visor.classList.add('abierto');
    document.body.style.overflow = 'hidden';
    visor.querySelector('.visor-top button').focus();
  }
  function cerrar() {
    visor.classList.remove('abierto');
    document.body.style.overflow = '';
  }
  function ir(d) { actual = (actual + d + fotos.length) % fotos.length; pintarVisor(); }

  /* --- la rejilla ---------------------------------------------------------- */
  /* Se vuelve a pintar al cambiar de idioma: cada foto puede llevar su
     texto en los tres. */
  var crudas = [];
  function pintar() {
    fotos = crudas.map(function (f) { return { src: IMAGEN(f.url), testo: LOC(f, 'testo') }; })
      .filter(function (f) { return f.src; });
    cont.textContent = '';
    if (!fotos.length) { sec.hidden = true; return; }
    fotos.forEach(function (f, i) {
      var fig = document.createElement('figure');
      var b = document.createElement('button'); b.type = 'button';
      b.setAttribute('aria-label', f.testo || ('Foto ' + (i + 1)));
      var img = document.createElement('img');
      img.src = f.src; img.alt = f.testo || ''; img.loading = 'lazy'; img.decoding = 'async';
      b.appendChild(img);
      b.addEventListener('click', function () { abrir(i); });
      fig.appendChild(b);
      if (f.testo) {
        var cap = document.createElement('figcaption'); cap.textContent = f.testo;
        fig.appendChild(cap);
      }
      fig.className = 'reveal zoom d' + Math.min(i % 4 + 1, 4);
      cont.appendChild(fig);
    });
    sec.hidden = false;
    if (observarReveal) observarReveal(cont);
  }
  window.__dibujarGaleria = pintar;
  ALMACEN.leerFotos(cartella).then(function (lista) { crudas = lista || []; pintar(); });
})();

/* ============================================================================
   LAS PREGUNTAS — las del general si las ha guardado (sito.domande), si no
   las de serie (domande.js). Texto puro, nunca HTML: las escribe una persona
   desde el panel. En español, la version española si la tiene; si no, la
   italiana, mejor que un hueco.
   ============================================================================ */
(function () {
  var cont = document.getElementById('faq');
  if (!cont) return;
  var lista = window.DOMANDE_BASE || [];
  function dibujar() {
    cont.textContent = '';
    var sec = document.getElementById('domande');
    if (sec) sec.hidden = !lista.length;
    lista.forEach(function (q) {
      var d = CAMPO(q, 'd'), r = CAMPO(q, 'r');
      if (!d) return;
      var det = document.createElement('details');
      var s = document.createElement('summary'); s.textContent = d;
      var p = document.createElement('p'); p.className = 'risposta'; p.textContent = r || '';
      if (q.conf) {
        var x = document.createElement('span'); x.className = 'x-conf';
        x.textContent = TEXTO('faq_conf', 'da confermare');
        p.appendChild(x);
      }
      det.appendChild(s); det.appendChild(p);
      cont.appendChild(det);
    });
  }
  window.__dibujarFaq = dibujar;
  dibujar();
  if (window.ALMACEN && ALMACEN.leerSito) {
    SITO_UNA_VEZ().then(function (s) {
      if (s && Array.isArray(s.domande)) { lista = s.domande; dibujar(); }
    });
  }
})();

/* ============================================================================
   LA HISTORIA, LOS FUNDADORES Y LA VISION — de serie (contenuti.js) o los que
   guarde el general (sito.storia, sito.visione). En español, la version
   española de cada texto si la tiene; si no, la italiana.
   ============================================================================ */
(function () {
  var stTesto = document.getElementById('storia-testo'), fond = document.getElementById('fondatori');
  var pie = document.getElementById('fondatori-pie');
  var vIntro = document.getElementById('visione-intro'), vLista = document.getElementById('visione-lista');
  if (!stTesto && !vLista) return;
  var storia = window.STORIA_BASE || null, visione = window.VISIONE_BASE || null;
  function en(o, k) { return CAMPO(o, k); }
  function dibujar() {
    if (storia && stTesto) {
      stTesto.textContent = ''; BLOQUES(stTesto, en(storia, 'testo'));
      fond.textContent = '';
      (storia.fondatori || []).forEach(function (f, i) {
        var a = document.createElement('article');
        a.className = 'fondatore reveal ' + (i % 2 ? 'der d2' : 'izq d1');
        var src = IMAGEN(f.foto);
        if (src) {
          var im = document.createElement('img'); im.className = 'fondatore-foto';
          im.src = src; im.alt = f.nome || ''; im.loading = 'lazy'; a.appendChild(im);
        }
        var h = document.createElement('h4'); h.textContent = f.nome || ''; a.appendChild(h);
        var cuerpo = document.createElement('div'); BLOQUES(cuerpo, en(f, 't')); a.appendChild(cuerpo);
        fond.appendChild(a);
      });
      var fh = document.querySelector('.fondatori-h');
      if (fh) fh.hidden = !(storia.fondatori || []).length;
      pie.textContent = en(storia, 'pie'); pie.hidden = !pie.textContent;
      if (observarReveal) observarReveal(fond);
    }
    if (visione && vLista) {
      vIntro.textContent = en(visione, 'intro'); vIntro.hidden = !vIntro.textContent;
      vLista.textContent = '';
      (visione.punti || []).forEach(function (q, i) {
        var d = document.createElement('div');
        d.className = 'punto reveal' + (i % 3 ? ' d' + (i % 3) : '');
        d.setAttribute('data-n', i + 1);
        var h = document.createElement('h3'); h.textContent = en(q, 't'); d.appendChild(h);
        BLOQUES(d, en(q, 'p'));
        vLista.appendChild(d);
      });
      var sec = document.getElementById('visione');
      if (sec) sec.hidden = !(visione.punti || []).length;
      if (observarReveal) observarReveal(vLista);
    }
  }
  window.__dibujarContenidos = dibujar;
  dibujar();
  SITO_UNA_VEZ().then(function (s) {
    var cambio = false;
    if (s && s.storia && typeof s.storia === 'object') { storia = s.storia; cambio = true; }
    if (s && s.visione && typeof s.visione === 'object') { visione = s.visione; cambio = true; }
    if (cambio) dibujar();
  });
})();

/* ============================================================================
   LOS EVENTOS — los proximos. En la portada, los de todas las iglesias y los
   del grupo, juntos y por fecha; en la pagina de una iglesia, los suyos. Los
   pone cada uno desde su panel, con el enlace al post de Instagram o Facebook
   donde lo anuncian. Los pasados ya no llegan (los filtra ALMACEN).
   ============================================================================ */
(function () {
  var sec = document.getElementById('eventi'), cont = document.getElementById('eventi-lista');
  if (!sec || !cont || !window.ALMACEN || !ALMACEN.leerEventi) return;
  var YO = document.body.getAttribute('data-sede') || '';
  var mas = document.getElementById('eventi-mas');
  var social = document.getElementById('eventi-social');
  var navEv = document.getElementById('nav-eventi');
  var lista = [], abiertos = false, MAX = 6;

  function sedeDe(c) {
    for (var i = 0; i < SEDI.length; i++) if (SEDI[i].id === c) return SEDI[i];
    return null;
  }

  function tarjeta(e, i) {
    var s = sedeDe(e.cartella);
    /* En la portada, un evento de una iglesia que ya no esta no sale. */
    if (!YO && e.cartella !== 'generale' && (!s || s.publicada === false)) return null;
    var art = document.createElement('article');
    art.className = 'evento reveal ' + (i % 2 ? 'der' : 'izq');

    var fecha = document.createElement('div'); fecha.className = 'ev-data';
    var dia = document.createElement('b'); dia.textContent = FECHA(e.giorno, { day: 'numeric' });
    var mes = document.createElement('span'); mes.textContent = FECHA(e.giorno, { month: 'short' }).replace('.', '');
    fecha.appendChild(dia); fecha.appendChild(mes);
    art.appendChild(fecha);

    var cuerpo = document.createElement('div'); cuerpo.className = 'ev-corpo';
    if (!YO) {
      var chi;
      if (e.cartella === 'generale' || !s) {
        chi = document.createElement('span'); chi.textContent = TEXTO('ev_gruppo', 'Tutto il gruppo');
      } else {
        chi = document.createElement('a'); chi.href = PAGINA(s); chi.textContent = 'Gruppo Cristiano ' + s.citta;
      }
      chi.className = 'ev-chi';
      cuerpo.appendChild(chi);
    }
    var h = document.createElement('h3'); h.textContent = LOC(e, 'titolo'); cuerpo.appendChild(h);
    var cuando = document.createElement('p'); cuando.className = 'ev-quando';
    var largo = FECHA(e.giorno, { weekday: 'long', day: 'numeric', month: 'long' });
    cuando.textContent = [largo.charAt(0).toUpperCase() + largo.slice(1), TR(e.ora)].filter(Boolean).join(' · ');
    cuerpo.appendChild(cuando);
    if (e.luogo) {
      var lu = document.createElement('p'); lu.className = 'ev-luogo'; lu.textContent = TR(e.luogo);
      cuerpo.appendChild(lu);
    }
    if (LOC(e, 'testo')) {
      var tx = document.createElement('div'); tx.className = 'ev-testo';
      BLOQUES(tx, LOC(e, 'testo')); cuerpo.appendChild(tx);
    }
    var link = SEGURO(e.link);
    if (link) {
      var acc = document.createElement('div'); acc.className = 'acciones';
      var b = document.createElement('a'); b.className = 'btn'; b.href = link;
      b.target = '_blank'; b.rel = 'noopener'; b.textContent = TEXTO('ev_link', 'Vedi l’annuncio');
      acc.appendChild(b); cuerpo.appendChild(acc);
    }
    art.appendChild(cuerpo);

    var foto = IMAGEN(e.foto);
    if (foto) {
      var fa = document.createElement('a'); fa.className = 'ev-foto';
      fa.href = foto; fa.target = '_blank'; fa.rel = 'noopener';
      var im = document.createElement('img'); im.src = foto; im.loading = 'lazy';
      im.alt = TEXTO('ev_foto_alt', 'Locandina:') + ' ' + LOC(e, 'titolo');
      fa.appendChild(im); art.appendChild(fa);
      art.classList.add('con-foto');
    }
    return art;
  }

  /* Dentro de la pagina de una iglesia: sus redes, que es donde publican los
     anuncios. Salen aunque no haya eventos: asi la seccion nunca queda muda. */
  function pintarSocial() {
    if (!social) return false;
    social.textContent = '';
    var s = sedeDe(YO), soc = (s && s.social) || {};
    var redes = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube']]
      .filter(function (r) { return SEGURO(soc[r[0]]); });
    if (!redes.length) return false;
    var p = document.createElement('p');
    p.textContent = TEXTO('ev_social', 'Gli annunci li pubblichiamo anche su') + ' ';
    redes.forEach(function (r, i) {
      var a = document.createElement('a'); a.href = SEGURO(soc[r[0]]);
      a.target = '_blank'; a.rel = 'noopener'; a.textContent = r[1];
      if (i) p.appendChild(document.createTextNode(' · '));
      p.appendChild(a);
    });
    social.appendChild(p);
    return true;
  }

  function pintar() {
    cont.textContent = '';
    var hechas = 0;
    lista.forEach(function (e) {
      var t = tarjeta(e, hechas);
      if (!t) return;
      if (!YO && !abiertos && hechas >= MAX) t.hidden = true;
      cont.appendChild(t); hechas++;
    });
    var conRedes = YO ? pintarSocial() : false;
    var vacio = document.getElementById('eventi-vuoto');
    if (vacio) vacio.hidden = !!hechas;
    sec.hidden = !hechas && !conRedes;
    if (navEv) navEv.hidden = !hechas;
    if (mas) {
      mas.hidden = YO || abiertos || hechas <= MAX;
      mas.textContent = TEXTO('ev_tutti', 'Vedi tutti gli eventi') + ' (' + hechas + ')';
    }
    if (observarReveal) observarReveal(cont);
  }
  if (mas) mas.addEventListener('click', function () { abiertos = true; pintar(); });

  window.__dibujarEventi = pintar;
  ALMACEN.leerEventi(YO || null).then(function (l) { lista = l || []; pintar(); });
})();

/* ============================================================================
   LAS DONACIONES — PayPal y/o transferencia. Las del grupo las pone el
   general («Il sito del gruppo»); las de cada iglesia, su responsable. Todo
   como texto: el IBAN y el nombre los escribe una persona en el panel.
   ============================================================================ */
function DONAZIONI(cont, d) {
  cont.textContent = '';
  d = (d && typeof d === 'object') ? d : {};
  var pp = SEGURO(d.paypal), iban = String(d.iban || '').replace(/\s+/g, '').toUpperCase();
  if (!pp && !iban) return false;
  function el(tag, cls, txt) {
    var e = document.createElement(tag); if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt; return e;
  }
  if (pp) {
    var c1 = el('div', 'dona-card reveal izq');
    c1.appendChild(el('h3', '', 'PayPal'));
    c1.appendChild(el('p', '', TEXTO('dn_paypal_p', 'Con carta o con il tuo conto PayPal. Ci vuole un minuto.')));
    var b = el('a', 'btn oro'); b.href = pp; b.target = '_blank'; b.rel = 'noopener';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
    b.appendChild(el('span', '', TEXTO('dn_paypal', 'Dona con PayPal')));
    var acc = el('div', 'acciones'); acc.appendChild(b); c1.appendChild(acc);
    cont.appendChild(c1);
  }
  /* Un boton que copia un texto y dice "Copiato ✓" un momento. */
  function copiar(btn, valor, txt) {
    btn.addEventListener('click', function () {
      function ok() {
        btn.textContent = TEXTO('dn_copiato', 'Copiato ✓');
        setTimeout(function () { btn.textContent = txt(); }, 2200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(valor).then(ok, function () {});
      else {
        var t = document.createElement('textarea'); t.value = valor; document.body.appendChild(t);
        t.select(); try { document.execCommand('copy'); ok(); } catch (e) {} document.body.removeChild(t);
      }
    });
  }
  if (iban) {
    var c2 = el('div', 'dona-card reveal der');
    c2.appendChild(el('h3', '', TEXTO('dn_bonifico', 'Bonifico bancario')));
    var dl = el('dl', 'dona-dati');
    function fila(k, v, cls) {
      if (!v) return null;
      var f = el('div'); f.appendChild(el('dt', '', k)); var dd = el('dd', cls || '', v); f.appendChild(dd); dl.appendChild(f);
      return dd;
    }
    fila(TEXTO('dn_intest', 'Intestato a'), d.intestatario);
    fila('IBAN', iban.replace(/(.{4})/g, '$1 ').trim(), 'iban');
    /* La causale NO se traduce: es lo que quien dona copia tal cual en su
       transferencia, para que la iglesia la reconozca en el banco. Lo que
       se traduce es la frase de encima. Sin causale escrita en el panel,
       la de siempre en Italia. */
    var causale = String(d.causale || '').trim() || 'Donazione liberale';
    var ddc = fila(TEXTO('dn_causale', 'Nella causale scrivi'), '«' + causale + '»', 'causale');
    var cc = el('button', 'mini-copia', TEXTO('dn_copia_c', 'Copia')); cc.type = 'button';
    copiar(cc, causale, function () { return TEXTO('dn_copia_c', 'Copia'); });
    ddc.appendChild(cc);
    c2.appendChild(dl);
    var cp = el('button', 'btn', TEXTO('dn_copia', 'Copia l’IBAN')); cp.type = 'button';
    copiar(cp, iban, function () { return TEXTO('dn_copia', 'Copia l’IBAN'); });
    var acc2 = el('div', 'acciones'); acc2.appendChild(cp); c2.appendChild(acc2);
    cont.appendChild(c2);
  }
  if (observarReveal) observarReveal(cont);
  return true;
}

/* Las del grupo, en la portada. */
(function () {
  var sec = document.getElementById('dona'), cont = document.getElementById('dona-lista');
  if (!sec || !cont) return;
  var datos = null, nav = document.getElementById('nav-dona');
  function pintar() {
    var hay = DONAZIONI(cont, datos);
    sec.hidden = !hay;
    if (nav) nav.hidden = !hay;
  }
  window.__dibujarDona = pintar;
  SITO_UNA_VEZ().then(function (s) { datos = s && s.donazioni; pintar(); });
})();

/* ============================================================================
   LOS PUNTOS DE FE
   ============================================================================ */
(function () {
  var cont = document.getElementById('fede-lista');
  if (!cont || !window.FEDE) return;
  function dibujar() {
    var lang = LINGUA();
    cont.textContent = '';
    FEDE.forEach(function (p, i) {
      var d = p[lang] || p.it;
      var det = document.createElement('details');
      var sum = document.createElement('summary');
      sum.textContent = d.t;
      sum.setAttribute('data-n', (i + 1) + '.');
      var res = document.createElement('p');
      res.className = 'risposta';
      res.textContent = d.p;
      if (d.r) {
        var rif = document.createElement('span');
        rif.className = 'rif'; rif.textContent = d.r;
        res.appendChild(rif);
      }
      det.appendChild(sum); det.appendChild(res);
      cont.appendChild(det);
    });
  }
  dibujar();
  window.__dibujarFede = dibujar;
})();

/* ============================================================================
   IDIOMA — italiano, español e ingles.

   El italiano es lo que viene escrito en el HTML; el español y el ingles
   viven en este diccionario. Los tres se leen de izquierda a derecha, asi que
   no hace falta girar el documento. El ingles lo pidieron ellos: para quien
   llega de fuera y no habla ninguno de los otros dos.

   Por que los dos, y esta vez no es una suposicion mia: el grupo se llama
   "Gruppo Cristiano Latino Americano" en su propio documento de vision, y
   ellos mismos dicen "persone di diverse nazioni". Un horario que no se
   entiende es un horario que no sirve.
   ============================================================================ */
var I18N = {
  es: {
    meta_title: "Gruppo Cristiano Latino Americano — Iglesias en Italia",
    meta_desc: "Gruppo Cristiano Latino Americano: iglesias evangélicas en Italia. Nuestras sedes, los horarios de las reuniones y cómo llegar. Italiano, español e inglés.",
    nav_sedi: "Las comunidades", nav_storia: "Quiénes somos", nav_visione: "La visión", nav_fede: "Puntos de fe", nav_domande: "Preguntas",
    hero_h1: "Una única familia de comunidades cristianas.",
    hero_p: "«Creemos que este mundo lleno de problemas y sufrimientos necesita una esperanza verdadera.»",
    versetto: "Isaías 55:5",
    hero_cta1: "Encuentra una comunidad", hero_cta2: "Quiénes somos",
    cue: "Baja",
    sd_eyebrow: "Las comunidades",
    sd_h2: "Nuestras comunidades",
    sd_p: "Toca una ficha y se abre la página de esa iglesia: horarios, pastores y cómo llegar.",
    sd_vai: "Cómo llegar", sd_sito: "Ir a su web", sd_orari: "Horarios",
    sd_ver: "Ver la iglesia", sd_ver_aria: "La iglesia de",
    /* --- la página de cada iglesia --- */
    sp_torna: "Todas las comunidades",
    sp_eyebrow: "Una iglesia del grupo",
    sp_dove: "Dónde estamos", sp_quando: "Cuándo nos reunimos",
    sp_lingue: "Idiomas", sp_contatti: "Hablar con esta iglesia",
    sp_contatti_p: "Escribe por WhatsApp o llama, y te contestamos. Si prefieres venir sin avisar, también: no hace falta avisar para entrar.",
    sp_pastori: "Pastores",
    nav_pred: "Predicaciones",
    sd_alt_foto: "La iglesia de",
    /* --- encuentra tu comunidad --- */
    tr_eyebrow: "Encuentra tu comunidad",
    tr_h2: "¿Cuál te queda más&nbsp;cerca?",
    tr_p: "Pulsa el botón: el teléfono te dice qué iglesia del grupo tienes más cerca, y a cuántos kilómetros.",
    tr_btn: "Usar mi ubicación",
    tr_priv: "Tu ubicación se queda en tu teléfono: nadie la recibe ni la guarda.",
    tr_cerco: "Buscando tu ubicación…",
    tr_res1: "La más cercana es",
    tr_res2: "a unos",
    tr_res3: "km en línea recta.",
    tr_apri: "Abrir su página →",
    tr_negato: "No has dado permiso para usar la ubicación. Puedes mirar el mapa de al lado.",
    tr_errore: "No he podido saber dónde estás. Mira el mapa de al lado.",
    tr_nessuna: "No encuentro ninguna comunidad en el mapa.",
    /* --- predicaciones --- */
    pr_eyebrow: "Predicaciones",
    pr_h2: "Escucha los mensajes.", pr_btn: "Escúchalos en Spotify",
    pr_p: "Las reuniones y los mensajes del Gruppo Cristiano, en audio en Spotify: para escucharlos cuando quieras, también en el coche o mientras caminas.",
    sd_tutti: "Todas las reuniones",
    sp_chiama: "Llamar",
    sp_email: "Escribir un email",
    sp_altre_h: "Las demás iglesias del grupo",
    sp_altre_p: "El mismo grupo, la misma fe, otra ciudad.",
    sp_chi_h: "Quiénes somos", gal_eyebrow: "Galería", gal_h2: "La vida del grupo.", sp_gal_h2: "La vida de la comunidad.",
    sp_chi_p: "Esta iglesia forma parte del Gruppo Cristiano Latino Americano. La visión, los puntos de fe y la historia son los del grupo entero.",
    sp_chi_btn: "La visión del grupo",
    sp_nf_h: "Esta iglesia no está",
    sp_nf_p: "Esta dirección no corresponde a ninguna iglesia del grupo. Aquí abajo están todas las que hay.",
    sp_senza_h: "Esta página está esperando sus datos",
    sp_senza_p: "De esta iglesia faltan la dirección, los horarios y los idiomas. En cuanto lleguen, la página se rellena sola.",
    sd_aria: "Indicaciones para", sd_alt: "Mapa de la iglesia de",
    sd_alt_logo: "Logo de la iglesia de",
    sd_senza_mappa: "Mapa esperando la dirección", sd_senza_via: "Dirección",
    sd_attr: "Mapa © colaboradores de OpenStreetMap",
    sd_altra_et: "Otra iglesia", sd_altra_h: "Las demás iglesias",
    sd_altra_p: "De cada iglesia hacen falta el nombre, la calle con el número, los días y las horas, y los idiomas que se hablan. A partir de ahí la ficha se construye sola, con su mapa.",
    sd_nota_ora_fidenza: "El día sale de vuestros vídeos. La hora no: esa sigue faltando.",
    sd_nota_ora_parma: "Horarios tomados del sitio del Consiglio delle Chiese Cristiane di Parma. Por confirmar.",
    conf: "por confirmar",
    /* --- quiénes somos: su historia, traducida del documento que mandaron --- */
    st_eyebrow: "Quiénes somos",
    st_h2: "Nuestra historia.",
    st_fond: "Fundadores y pastores principales",
    vs_eyebrow: "La visión",
    vs_h2: "Qué queremos<br>hacer, y por qué.",
    fd_eyebrow: "Puntos de fe",
    fd_h2: "En qué<br>creemos.",
    dm_eyebrow: "Preguntas",
    dm_h2: "Lo que se pregunta<br>quien no ha<br>entrado nunca.",
    faq_conf: "por confirmar", dm_p: "Quien no ha estado nunca en una iglesia evangélica no pregunta de teología: pregunta cómo hay que vestirse y cuánto dura. Las preguntas de abajo son las de verdad.",
    wa_txt: "Escríbenos",
    foot_dir: "Fidenza · Parma", foot_min: "Isaías 55:5", foot_panel: "Área reservada",
    /* --- eventos y donaciones --- */
    nav_eventi: "Eventos", nav_dona: "Donar",
    ev_eyebrow: "Próximos eventos", ev_h2: "Lo que pasa en el grupo.",
    ev_p: "Las citas de todas nuestras iglesias, en un solo sitio.",
    sp_ev_h2: "Lo que pasa aquí.", ev_gruppo: "Todo el grupo", ev_link: "Ver el anuncio",
    ev_tutti: "Ver todos los eventos", ev_vuoto: "Por ahora no hay eventos programados.",
    ev_social: "Los anuncios los publicamos también en", ev_foto_alt: "Cartel:",
    dn_eyebrow: "Donaciones", dn_h2: "Apoya la obra.",
    dn_p: "Si quieres contribuir a la misión del grupo, puedes hacerlo así. Toda ofrenda es libre y voluntaria.",
    sp_dn_h2: "Apoya esta iglesia.",
    dn_paypal_p: "Con tarjeta o con tu cuenta PayPal. Se tarda un minuto.", dn_paypal: "Dona con PayPal",
    dn_bonifico: "Transferencia bancaria", dn_intest: "A nombre de", dn_causale: "En el concepto escribe",
    dn_copia: "Copiar el IBAN", dn_copiato: "Copiado ✓", dn_copia_c: "Copiar",
    sp_pastori_alt: "Los pastores de la iglesia de",
    foot_trad: "Algunos textos se traducen automáticamente del italiano.",
    banda: "Prototipo Digitatex · contenidos por confirmar"
  },
  en: {
    meta_title: "Gruppo Cristiano Latino Americano — Churches in Italy",
    meta_desc: "Gruppo Cristiano Latino Americano: evangelical churches in Italy. Our churches, meeting times and how to get there. Italian, Spanish and English.",
    nav_sedi: "Communities", nav_storia: "About us", nav_visione: "Our vision", nav_fede: "Statement of faith", nav_domande: "Questions",
    hero_h1: "One family of Christian communities.",
    hero_p: "«We believe that this world, so full of problems and suffering, needs a true hope.»",
    versetto: "Isaiah 55:5",
    hero_cta1: "Find a community", hero_cta2: "About us",
    cue: "Scroll",
    sd_eyebrow: "Communities",
    sd_h2: "Our communities",
    sd_p: "Tap a card to open that church's page: meeting times, pastors and how to get there.",
    sd_vai: "Get directions", sd_sito: "Visit website", sd_orari: "Times",
    sd_ver: "See the church", sd_ver_aria: "The church in",
    sp_torna: "All communities",
    sp_eyebrow: "A church of the group",
    sp_dove: "Where we are", sp_quando: "When we meet",
    sp_lingue: "Languages", sp_contatti: "Talk to this church",
    sp_contatti_p: "Write on WhatsApp or call, and we'll get back to you. If you'd rather just come along, that's fine too: you don't need to let us know to come in.",
    sp_pastori: "Pastors",
    nav_pred: "Sermons",
    sd_alt_foto: "The church in",
    tr_eyebrow: "Find your community",
    tr_h2: "Which one is closest&nbsp;to you?",
    tr_p: "Press the button: your phone tells you which church of the group is closest to you, and how many kilometres away it is.",
    tr_btn: "Use my location",
    tr_priv: "Your location stays on your phone: nobody receives or stores it.",
    tr_cerco: "Finding your location…",
    tr_res1: "The closest is",
    tr_res2: "about",
    tr_res3: "km as the crow flies.",
    tr_apri: "Open its page →",
    tr_negato: "You didn't allow us to use your location. You can look at the map next to this.",
    tr_errore: "We couldn't find where you are. Have a look at the map next to this.",
    tr_nessuna: "We can't find any community on the map.",
    pr_eyebrow: "Sermons",
    pr_h2: "Listen to the messages.", pr_btn: "Listen on Spotify",
    pr_p: "The meetings and messages of the Gruppo Cristiano, as audio on Spotify: listen whenever you like, in the car or while you walk.",
    sd_tutti: "All meetings",
    sp_chiama: "Call",
    sp_email: "Send an email",
    sp_altre_h: "The other churches of the group",
    sp_altre_p: "The same group, the same faith, another city.",
    sp_chi_h: "About us", gal_eyebrow: "Gallery", gal_h2: "Life in the group.", sp_gal_h2: "Life in the community.",
    sp_chi_p: "This church is part of the Gruppo Cristiano Latino Americano. The vision, the statement of faith and the history are those of the whole group.",
    sp_chi_btn: "The group's vision",
    sp_nf_h: "This church isn't here",
    sp_nf_p: "This address doesn't match any church of the group. All of them are listed below.",
    sp_senza_h: "This page is waiting for its details",
    sp_senza_p: "This church's address, meeting times and languages are still missing. As soon as they arrive, the page fills itself in.",
    sd_aria: "Directions to", sd_alt: "Map of the church in",
    sd_alt_logo: "Logo of the church in",
    sd_senza_mappa: "Map waiting for the address", sd_senza_via: "Address",
    sd_attr: "Map © OpenStreetMap contributors",
    sd_altra_et: "Another church", sd_altra_h: "The other churches",
    sd_altra_p: "For each church we need the name, the street and number, the days and times, and the languages spoken. From there the card builds itself, map included.",
    sd_nota_ora_fidenza: "The day comes from your videos. The time doesn't: that is still missing.",
    sd_nota_ora_parma: "Times taken from the website of the Consiglio delle Chiese Cristiane di Parma. To be confirmed.",
    conf: "to be confirmed",
    st_eyebrow: "About us",
    st_h2: "Our story.",
    st_fond: "Founders and senior pastors",
    vs_eyebrow: "Our vision",
    vs_h2: "What we want<br>to do, and why.",
    fd_eyebrow: "Statement of faith",
    fd_h2: "What we<br>believe.",
    dm_eyebrow: "Questions",
    dm_h2: "What people ask<br>before coming<br>for the first time.",
    faq_conf: "to be confirmed", dm_p: "Someone who has never been to an evangelical church doesn't ask about theology: they ask what to wear and how long it lasts. The questions below are the real ones.",
    wa_txt: "Write to us",
    foot_dir: "Fidenza · Parma", foot_min: "Isaiah 55:5", foot_panel: "Private area",
    nav_eventi: "Events", nav_dona: "Give",
    ev_eyebrow: "Upcoming events", ev_h2: "What's happening in the group.",
    ev_p: "The events of all our churches, in one place.",
    sp_ev_h2: "What's on here.", ev_gruppo: "The whole group", ev_link: "See the announcement",
    ev_tutti: "See all events", ev_vuoto: "There are no upcoming events at the moment.",
    ev_social: "We also post our announcements on", ev_foto_alt: "Poster:",
    dn_eyebrow: "Donations", dn_h2: "Support the work.",
    dn_p: "If you would like to contribute to the mission of the group, this is how. Every gift is free and voluntary.",
    sp_dn_h2: "Support this church.",
    dn_paypal_p: "By card or with your PayPal account. It takes a minute.", dn_paypal: "Give with PayPal",
    dn_bonifico: "Bank transfer", dn_intest: "Account holder", dn_causale: "In the payment reference write",
    dn_copia: "Copy the IBAN", dn_copiato: "Copied ✓", dn_copia_c: "Copy",
    sp_pastori_alt: "The pastors of the church in",
    foot_trad: "Some texts are translated automatically from Italian.",
    banda: "Digitatex prototype · content to be confirmed"
  }
};

function aplicarIdioma(lang) {
  var d = I18N[lang];
  window.__T = d || {};
  /* El italiano no tiene diccionario —es lo que viene escrito en el HTML— asi
     que la primera vez que se traduce se guarda el original. Sin esto, volver
     al italiano es imposible. */
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    if (el.dataset.it === undefined) el.dataset.it = el.innerHTML;
    var k = el.getAttribute('data-i18n');
    el.innerHTML = (d && d[k] !== undefined) ? d[k] : el.dataset.it;
  });
  document.documentElement.lang = lang;
  var md = document.querySelector('meta[name="description"]');
  if (!aplicarIdioma.orig) aplicarIdioma.orig = { t: document.title, d: md ? md.content : '' };
  /* Cada pagina de iglesia tiene su propio titulo —"Gruppo Cristiano Parma"—
     y no puede heredar el del grupo al cambiar de idioma. Si la pagina
     declara __META manda ella; si no, el diccionario general. */
  var mio = window.__META && window.__META[lang];
  document.title = mio ? mio.t : (d ? d.meta_title : aplicarIdioma.orig.t);
  if (md) md.content = mio ? mio.d : (d ? d.meta_desc : aplicarIdioma.orig.d);
  document.querySelectorAll('.langsw button').forEach(function (b) {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  RIDISEGNA();
  /* Lo que dejaron vacio en este idioma: la primera vez que se pide, se
     traen las traducciones automaticas y se vuelve a pintar con ellas. */
  if (lang !== 'it' && !TRAD[lang] && window.ALMACEN && ALMACEN.traduzioni) {
    TRAD[lang] = {};
    ALMACEN.traduzioni(lang).then(function (m) {
      TRAD[lang] = m || {};
      if (LINGUA() === lang && Object.keys(TRAD[lang]).length) RIDISEGNA();
    });
  }
  try { localStorage.setItem('gc_lang', lang); } catch (e) {}
}

/* Lo que dibuja JS no lo alcanza el barrido de [data-i18n]: se vuelve a pintar
   con el diccionario cargado. */
function RIDISEGNA() {
  ['__dibujarSedi', '__dibujarFede', '__dibujarFaq', '__dibujarContenidos', '__dibujarSede',
   '__dibujarGaleria', '__dibujarEventi', '__dibujarDona'].forEach(function (k) {
    if (window[k]) window[k]();
  });
}

(function () {
  document.querySelectorAll('.langsw button').forEach(function (b) {
    b.addEventListener('click', function () { aplicarIdioma(b.dataset.lang); });
  });
  var url = new URLSearchParams(location.search).get('lang');
  var guardado = null;
  try { guardado = localStorage.getItem('gc_lang'); } catch (e) {}
  /* Por defecto italiano: las iglesias estan en Italia y la calle por la que
     pasa la gente es italiana. El español esta para quien lo necesita. */
  var elegido = [url, guardado].filter(function (l) { return l === 'it' || l === 'es' || l === 'en'; })[0] || 'it';
  aplicarIdioma(elegido);
})();
