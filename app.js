'use strict';
/* ============================================================================
   El motor de la pagina. Sin librerias: aparecer al bajar, la barra de
   progreso, el menu, las fichas de las sedes, los puntos de fe y el idioma.
   ============================================================================ */

/* ============================================================================
   EL WHATSAPP DEL ENCARGADO.

   Cuando llegue el numero se escribe aqui, entre comillas, solo digitos y con
   el 39 delante: '39XXXXXXXXXX'. Mientras este vacio el boton sigue a la
   vista pero apagado y lleva a las sedes, en vez de abrir una ventana rota.

   Va al encargado de ESTA web, no a una sede concreta: es para quien no
   entiende la pagina o no sabe a que iglesia ir.
   ============================================================================ */
var WHATSAPP = '';
var WA_MENSAJE = 'Ciao, scrivo dal sito del Gruppo Cristiano.';

var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var $ = function (s) { return document.querySelector(s); };

/* --- aparicion al bajar ---------------------------------------------------- */
var observarReveal;
(function () {
  var io = new IntersectionObserver(function (ent) {
    ent.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  /* Las fichas se crean despues y se vuelven a crear al cambiar de idioma.
     Sin esto nacerian con opacidad 0 y no apareceria nada. */
  observarReveal = function (raiz) {
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
    if (cue) cue.style.opacity = h.scrollTop > 40 ? '0' : '1';
  }
  document.addEventListener('scroll', function () {
    if (!tic) { requestAnimationFrame(function () { pintar(); tic = false; }); tic = true; }
  }, { passive: true });
  window.addEventListener('resize', pintar);
  pintar();
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

/* --- el boton de WhatsApp -------------------------------------------------- */
(function () {
  var wa = $('#wa');
  if (!wa) return;
  if (WHATSAPP) {
    wa.classList.remove('apagado');
    wa.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(WA_MENSAJE);
    wa.target = '_blank'; wa.rel = 'noopener';
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
    var cabecera;
    if (sede.logo) {
      cabecera = document.createElement(pagina ? 'a' : 'div');
      cabecera.className = 'sede-mappa logo';
      var il = document.createElement('img');
      il.src = RUTA(sede.logo); il.loading = 'lazy';
      il.alt = texto('sd_alt_logo', 'Logo della chiesa di') + ' ' + sede.citta;
      cabecera.appendChild(il);
    } else if (fuenteMapa && dir) {
      cabecera = document.createElement(pagina ? 'a' : 'div');
      cabecera.className = 'sede-mappa';
      var im = document.createElement('img');
      im.width = 1120; im.height = 700; im.loading = 'lazy';
      im.alt = texto('sd_alt', 'Mappa della chiesa di') + ' ' + sede.citta;
      /* Creada desde el panel sin pulsar "Genera la mappa": no hay archivo.
         En vez de un icono roto, la trama con el aviso. */
      im.onerror = (function (cab) {
        return function () {
          cab.textContent = texto('sd_senza_mappa', 'Mappa in attesa dell’indirizzo');
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
      t.className = 'sede-testo'; t.textContent = sede.testo;
      corpo.appendChild(t);
    }

    if (sede.lingue) {
      var cont = document.createElement('div');
      cont.className = 'sede-lingue';
      String(sede.lingue).split(',').forEach(function (l) {
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
        var dt = document.createElement('dt'); dt.textContent = o[0];
        var dd = document.createElement('dd'); dd.textContent = o[1];
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
        v.textContent = texto('sd_ver', 'La chiesa di') + ' ' + sede.citta;
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
    /* La invitacion a mandar los datos de las demas solo tiene sentido en la
       portada. Dentro de una iglesia, lo de al lado son sus hermanas. */
    if (!YO) lista.appendChild(espera());
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

  var dibujarTodo = function () { dibujar(); pintarPie(); };
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
      }
    });
  }
})();

/* ============================================================================
   LOS PUNTOS DE FE
   ============================================================================ */
(function () {
  var cont = document.getElementById('fede-lista');
  if (!cont || !window.FEDE) return;
  function dibujar() {
    var lang = document.documentElement.lang === 'es' ? 'es' : 'it';
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
   IDIOMA — italiano y español.

   El italiano es lo que viene escrito en el HTML; el español vive en este
   diccionario. Los dos se leen de izquierda a derecha, asi que no hace falta
   girar el documento.

   Por que los dos, y esta vez no es una suposicion mia: el grupo se llama
   "Gruppo Cristiano Latino Americano" en su propio documento de vision, y
   ellos mismos dicen "persone di diverse nazioni". Un horario que no se
   entiende es un horario que no sirve.
   ============================================================================ */
var I18N = {
  es: {
    meta_title: "Gruppo Cristiano Latino Americano — Iglesias en Italia",
    meta_desc: "Gruppo Cristiano Latino Americano: iglesias evangélicas en Italia. Nuestras sedes, los horarios de las reuniones y cómo llegar. Italiano y español.",
    marca_sub: "Latino Americano",
    nav_sedi: "Las iglesias", nav_storia: "Quiénes somos", nav_visione: "La visión", nav_fede: "Puntos de fe", nav_domande: "Preguntas",
    hero_h1: 'Una esperanza verdadera,<br>en <em>cada ciudad</em>.',
    hero_p: "«Creemos que este mundo lleno de problemas y sufrimientos necesita una esperanza verdadera.»",
    versetto: "Isaías 55:5",
    hero_cta1: "Encuentra la iglesia más cercana", hero_cta2: "Nuestra visión",
    cue: "Baja",
    sd_eyebrow: "Las iglesias",
    sd_h2: "Un grupo,<br>varias iglesias.",
    sd_p: "Una ficha por cada iglesia. Se toca, y se abre su página: horarios, pastores y cómo llegar.",
    sd_vai: "Cómo llegar", sd_sito: "Ir a su web", sd_orari: "Horarios",
    sd_ver: "La iglesia de", sd_ver_aria: "La iglesia de",
    /* --- la página de cada iglesia --- */
    sp_torna: "Todas las iglesias",
    sp_eyebrow: "Una iglesia del grupo",
    sp_dove: "Dónde estamos", sp_quando: "Cuándo nos reunimos",
    sp_lingue: "Idiomas", sp_contatti: "Hablar con esta iglesia",
    sp_contatti_p: "Escribe por WhatsApp o llama, y te contestamos. Si prefieres venir sin avisar, también: no hace falta avisar para entrar.",
    sp_pastori: "Pastores",
    sd_tutti: "Todas las reuniones",
    sp_chiama: "Llamar",
    sp_email: "Escribir un email",
    sp_altre_h: "Las demás iglesias del grupo",
    sp_altre_p: "El mismo grupo, la misma fe, otra ciudad.",
    sp_chi_h: "Quiénes somos",
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
    st_h2: "Una única familia<br>de comunidades cristianas.",
    st_p1: "En 2003, Aldo y Mariela dieron vida a la comunidad Gruppo Cristiano, con la fundación de la primera iglesia en Parma.",
    st_p2: "Con los años, gracias al crecimiento de la comunidad y a la obra del Señor, se ha desarrollado una realidad cada vez más amplia y multicultural, capaz de acoger a personas de toda edad y procedencia: niños, jóvenes, adultos y mayores, de distintas nacionalidades.",
    st_p3: "Este crecimiento llevó al nacimiento de nuevas comunidades en el territorio, con la apertura de otras iglesias en Fidenza, Reggio Emilia y Marina di Carrara.",
    st_p4: "La visión misionera no se ha detenido en estas realidades. El deseo que sigue motivando a Aldo y Mariela es ver nacer nuevas comunidades cristianas en Italia, para anunciar el Evangelio, alcanzar a nuevas personas y formar discípulos de Jesucristo, contribuyendo así a la expansión del Reino de Dios.",
    st_fond: "Fundadores y pastores principales",
    st_aldo1: "Conoció personalmente al Señor en 1989, iniciando un camino de fe y de crecimiento espiritual que lo llevó a madurar también a través de experiencias de formación y de servicio cristiano.",
    st_aldo2: "Durante tres años colaboró con el movimiento de Los Navegantes en Inglaterra, donde cursó y completó la escuela bíblica organizada por la asociación. En 2010 completó además la formación de la Escuela Bíblica para Responsables de Comunidad de Uomini Nuovi, en Marchirolo (Varese).",
    st_mari1: "Originaria de la República Dominicana, conoció al Señor en 1980. Creció espiritualmente en la Comunidad Cristiana «Casa de Oración», en la República Dominicana. Paralelamente a su camino de fe, se licenció en Psicología en la Universidad Autónoma de Santo Domingo (UASD).",
    st_mari2: "En 1990 llegó a Italia como misionera, continuando su compromiso con el servicio cristiano. En 1995 completó la escuela bíblica de Los Navegantes en Inglaterra, profundizando aún más su formación espiritual y bíblica.",
    st_pie: "Aldo y Mariela comparten una vida dedicada a la fe, al servicio y a la misión cristiana. Son los padres de Rebecca, que junto a su marido Andrea sirve en el Gruppo Cristiano de Parma poniendo a disposición sus dones.",
    vs_eyebrow: "La visión",
    vs_h2: "Qué queremos<br>hacer, y por qué.",
    vs_p: "«Creemos que confiando la propia vida a Jesús, cada uno de nosotros puede obtener la vida eterna, ser cambiado por Dios y cambiar la sociedad.»",
    v1_h: "Alcanzar",
    v1_p: "Alcanzar a toda persona no creyente en Italia, a través de su Palabra, llevando el mensaje de Salvación en Cristo Jesús.",
    v2_h: "Equipar",
    v2_p: "Equipar a cada individuo para hacerlo un cristiano maduro, un instrumento de Dios en cualquier parte del mundo, y una persona preparada para la obra del ministerio.",
    v3_h: "Formar",
    v3_p: "El Gruppo Cristiano Latino Americano pone a disposición de cada creyente:",
    v3_l1: "discipulado — cursos básicos y avanzados",
    v3_l2: "estudios bíblicos",
    v3_l3: "participación en distintas áreas ministeriales",
    v4_h: "Fundar iglesias",
    v4_p: "Tenemos la visión de fundar iglesias, en Italia o en el extranjero, donde Dios nos dé la posibilidad de obrar.",
    v5_h: "La iglesia",
    v5_p: "El cuerpo de Cristo y la comunión de los creyentes: un lugar donde crecer y disfrutar de comunión fraterna, y donde poner a disposición los propios dones.",
    v6_h: "Invertir en el Reino",
    v6_p: "Creemos que el Señor es quien provee a nuestras necesidades, por eso somos gozosos de poder dar lo que tenemos para la edificación de su iglesia — a través del amor, el servicio y la fraternidad.",
    v7_h: "Punto de apoyo",
    v7_p: "Ser un punto de apoyo para quien quiera venir a Italia como misionero, dándole los medios para obrar adecuadamente en nuestra nación.",
    fd_eyebrow: "Puntos de fe",
    fd_h2: "En qué<br>creemos.",
    dm_eyebrow: "Preguntas",
    dm_h2: "Lo que se pregunta<br>quien no ha<br>entrado nunca.",
    dm_p: "Quien no ha estado nunca en una iglesia evangélica no pregunta de teología: pregunta cómo hay que vestirse y cuánto dura. Las preguntas de abajo son las de verdad.",
    q1: "¿Cómo encuentro la iglesia más cercana?",
    a1: "En la sección «Las iglesias» hay una ficha por cada una. Se toca y se abre su página, con los horarios, los pastores y el botón para llegar con el navegador del móvil.",
    q2: "¿Tengo que vestirme de alguna manera?",
    a2: 'No. Se entra como se está.<span class="x-conf">borrador</span>',
    q3: "¿Tengo que avisar antes de ir?",
    a3: 'No, se entra y ya.<span class="x-conf">borrador</span>',
    q4: "¿Tengo que dar una ofrenda?",
    a4: 'No. Nadie te va a pedir nada, y nadie mira quién da y quién no.<span class="x-conf">borrador</span>',
    q5: "¿Qué idiomas se hablan?",
    a5: 'Somos un grupo de personas de distintas naciones. Los idiomas de cada sede están escritos en su ficha.<span class="x-conf">por confirmar</span>',
    q6: "¿Puedo venir con niños?",
    a6: 'Aquí hace falta la respuesta real: si hay un momento para los niños, a qué hora y desde qué edad.<span class="x-conf">por confirmar</span>',
    q7: "Quiero venir a Italia como misionero. ¿Me pueden ayudar?",
    a7: "Sí — es el séptimo punto de nuestra visión. Escríbenos por WhatsApp y hablamos.",
    wa_txt: "Escríbenos",
    foot_dir: "Fidenza · Parma", foot_min: "Isaías 55:5",
    banda: "Prototipo Digitatex · contenidos por confirmar"
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
  /* Las fichas y los puntos de fe los dibuja JS, asi que no los alcanza el
     barrido de [data-i18n]: se vuelven a pintar con el diccionario cargado. */
  if (window.__dibujarSedi) window.__dibujarSedi();
  if (window.__dibujarFede) window.__dibujarFede();
  if (window.__dibujarSede) window.__dibujarSede();
  try { localStorage.setItem('gc_lang', lang); } catch (e) {}
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
  var elegido = [url, guardado].filter(function (l) { return l === 'it' || l === 'es'; })[0] || 'it';
  aplicarIdioma(elegido);
})();
