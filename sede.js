/* ============================================================================
   LA PAGINA DE UNA IGLESIA.

   Cada comunidad tiene su propia direccion —gruppocristiano.it/parma— y a la
   vista de quien entra es su sitio. Por dentro es un solo proyecto: el mismo
   CSS, el mismo menu, los mismos idiomas. Eso es lo que hace que arreglar algo
   una vez lo arregle en las cuatro.

   QUE ESCRIBE EL GENERADOR Y QUE ESCRIBE ESTE ARCHIVO

   El generador (herramientas/paginas-sede.js) deja escrito en el HTML lo que
   tiene que estar ahi aunque no haya JavaScript, y lo que leen Google y las
   vistas previas de WhatsApp: el titulo, la descripcion, la imagen de
   previsualizacion, la ficha de datos estructurados, el nombre de la ciudad y
   la direccion.

   Este archivo pinta lo que cambia: horarios, idiomas, descripcion, el mapa y
   los botones. Lo pinta desde la misma fuente que la portada —sedi.js, o lo
   que haya en la base de datos si el panel lo ha cambiado—, asi que cuando el
   encargado corrige un horario se corrige en los dos sitios a la vez.

   Si estuviera todo escrito en el HTML, el panel cambiaria la tarjeta de la
   portada y no la pagina de la iglesia. Esa es exactamente la clase de fallo
   que nadie ve hasta que alguien se presenta a una hora que ya no es.
   ============================================================================ */
(function () {
  'use strict';

  var ID = document.body.getAttribute('data-sede');
  if (!ID) return;

  function $(s) { return document.querySelector(s); }
  function texto(k, alt) { var d = window.__T || {}; return d[k] !== undefined ? d[k] : alt; }

  function buscar() {
    var lista = window.SEDI || window.SEDI_BASE || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === ID) return lista[i];
    return null;
  }

  var GENERICA = document.body.hasAttribute('data-generica');

  /* Un borrador no sale por ninguna puerta: ni en la lista de la portada ni
     escribiendo su direccion a mano. */
  function visible(s) { return !!(s && s.publicada !== false); }

  function dibujar() {
    var s = buscar();
    if (!visible(s)) { noEncontrada(); return; }

    /* En la pagina comodin el nombre no viene escrito: se pone aqui, y con el
       el titulo de la pestana y el de los dos idiomas. */
    if (GENERICA) ponerNombre(s);

    var dir = s.via && s.cap ? s.via + ', ' + s.cap + ', Italia' : '';
    var q = encodeURIComponent(dir);

    /* --- la direccion, bajo el titulo --------------------------------------
       El generador ya la ha escrito. Se vuelve a escribir aqui por si el panel
       la ha cambiado despues del ultimo despliegue. */
    var via = $('#sp-via');
    if (via) {
      if (dir) via.innerHTML = s.via + '<span>' + s.cap + '</span>';
      else via.innerHTML = '<span class="x-conf">' + texto('conf', 'da confermare') + '</span>';
    }

    /* --- los botones de arriba --------------------------------------------- */
    var acc = $('#sp-acc');
    if (acc) {
      acc.textContent = '';
      if (dir) {
        acc.appendChild(boton('btn piena',
          'https://www.google.com/maps/dir/?api=1&destination=' + q,
          texto('sd_vai', 'Come arrivare')));
        /* Con el identificador de su ficha, Apple abre LA IGLESIA —con su
           nombre y su categoria— en vez de geocodificar una calle y caer
           donde caiga. */
        acc.appendChild(boton('btn', s.apple
          ? 'https://maps.apple.com/place?place-id=' + encodeURIComponent(s.apple)
            + '&address=' + q + '&name=' + encodeURIComponent('Gruppo Cristiano ' + s.citta)
          : 'https://maps.apple.com/?address=' + q,
          'Apple Maps'));
      }
      if (s.whatsapp) {
        acc.appendChild(boton('btn',
          'https://wa.me/' + String(s.whatsapp).replace(/[^0-9]/g, '')
            + '?text=' + encodeURIComponent('Ciao, scrivo dal sito del Gruppo Cristiano ' + s.citta + '.'),
          'WhatsApp'));
      }
    }

    /* --- el mapa ------------------------------------------------------------ */
    var mapa = $('#sp-mappa');
    if (mapa) {
      mapa.textContent = '';
      /* La misma regla que las tarjetas (app.js): archivo solo para las de
         sedi.js, el de la ficha para las del panel. */
      var fuente = window.MAPA_DE ? MAPA_DE(s) : (s.mapa || '');
      if (fuente && dir) {
        var a = document.createElement('a');
        a.href = 'https://www.google.com/maps/dir/?api=1&destination=' + q;
        a.target = '_blank'; a.rel = 'noopener';
        a.setAttribute('aria-label', texto('sd_aria', 'Indicazioni per') + ' ' + s.citta);
        var im = document.createElement('img');
        im.width = 1120; im.height = 700;
        im.alt = texto('sd_alt', 'Mappa della chiesa di') + ' ' + s.citta;
        /* Una iglesia creada desde el panel sin pulsar "Genera la mappa" no
           tiene imagen: en vez de un icono roto, el aviso de mapa pendiente. */
        im.onerror = function () {
          mapa.textContent = '';
          var v0 = document.createElement('div');
          v0.className = 'sede-mappa vuota';
          v0.textContent = texto('sd_senza_mappa', 'Mappa in attesa dell’indirizzo');
          mapa.appendChild(v0);
        };
        im.src = fuente;
        a.appendChild(im);
        mapa.appendChild(a);
        var cap = document.createElement('p');
        cap.className = 'sede-cap';
        cap.textContent = texto('sd_attr', 'Mappa © contributori di OpenStreetMap');
        mapa.appendChild(cap);
      } else {
        var v = document.createElement('div');
        v.className = 'sede-mappa vuota';
        v.textContent = texto('sd_senza_mappa', 'Mappa in attesa dell’indirizzo');
        mapa.appendChild(v);
      }
    }

    /* --- horarios ----------------------------------------------------------- */
    var orari = $('#sp-orari');
    if (orari) {
      orari.textContent = '';
      if (s.orari && s.orari.length) {
        s.orari.forEach(function (o) {
          var f = document.createElement('div');
          var dt = document.createElement('dt'); dt.textContent = o[0];
          var dd = document.createElement('dd'); dd.textContent = o[1];
          f.appendChild(dt); f.appendChild(dd); orari.appendChild(f);
        });
      } else {
        var f2 = document.createElement('div');
        var dt2 = document.createElement('dt');
        dt2.textContent = texto('sd_orari', 'Orari');
        var dd2 = document.createElement('dd');
        dd2.innerHTML = '<span class="x-conf">' + texto('conf', 'da confermare') + '</span>';
        f2.appendChild(dt2); f2.appendChild(dd2); orari.appendChild(f2);
      }
      /* La nota de "esto no lo habeis confirmado vosotros" viaja con la sede:
         si esta en la tarjeta de la portada tiene que estar aqui tambien. */
      var nota = $('#sp-nota');
      if (nota) {
        var clave = (window.NOTAS_SEDE || {})[s.id];
        var t = clave ? texto('sd_nota_' + clave, (window.NOTE_IT || {})[clave] || '') : '';
        nota.textContent = t;
        nota.hidden = !t;
      }
    }

    /* --- idiomas ------------------------------------------------------------ */
    var ling = $('#sp-lingue');
    if (ling) {
      ling.textContent = '';
      String(s.lingue || '').split(',').forEach(function (l) {
        l = l.trim(); if (!l) return;
        var e = document.createElement('span'); e.textContent = l; ling.appendChild(e);
      });
      var bloque = $('#sp-lingue-bloque');
      if (bloque) bloque.hidden = !ling.children.length;
    }

    /* --- descripcion --------------------------------------------------------- */
    var tx = $('#sp-testo');
    if (tx) { tx.textContent = s.testo || ''; tx.hidden = !s.testo; }

    /* --- el aviso de ficha vacia ---------------------------------------------
       Una pagina sin direccion ni horarios no puede quedarse muda: quien llega
       tiene que entender que falta por llegar, no pensar que la web esta rota. */
    var vacio = $('#sp-vacio');
    if (vacio) vacio.hidden = !!(dir || (s.orari && s.orari.length));
  }

  function boton(clase, href, txt) {
    var a = document.createElement('a');
    a.className = clase; a.href = href;
    a.target = '_blank'; a.rel = 'noopener';
    a.textContent = txt;
    return a;
  }

  /* --- el nombre, en la pagina comodin ------------------------------------- */
  function ponerNombre(s) {
    var em = document.querySelector('.hero-sede h1 em');
    if (em) em.textContent = s.citta;
    var dir = s.via && s.cap ? s.via + ', ' + s.cap : '';
    window.__META = {
      it: { t: 'Gruppo Cristiano ' + s.citta + ' — Chiesa evangelica a ' + s.citta,
            d: s.testo || ('Gruppo Cristiano ' + s.citta + (dir ? ', ' + dir : '')
               + '. Orari degli incontri e come arrivare.') },
      es: { t: 'Gruppo Cristiano ' + s.citta + ' — Iglesia evangélica en ' + s.citta,
            d: s.testo || ('Gruppo Cristiano ' + s.citta + (dir ? ', ' + dir : '')
               + '. Horarios de las reuniones y cómo llegar.') }
    };
    var lang = document.documentElement.lang === 'es' ? 'es' : 'it';
    document.title = window.__META[lang].t;
    var md = document.querySelector('meta[name="description"]');
    if (md) md.content = window.__META[lang].d;
  }

  /* --- una direccion que no es ninguna iglesia -----------------------------
     /loquesea/ tambien cae en la pagina comodin. Hay que decir que ahi no hay
     nada, y no dejar una portada vacia que parezca una iglesia sin datos. */
  function noEncontrada() {
    var h1 = document.querySelector('.hero-sede h1');
    if (h1) h1.textContent = texto('sp_nf_h', 'Questa chiesa non c’è');
    var via = $('#sp-via');
    if (via) via.textContent = texto('sp_nf_p',
      'Questo indirizzo non corrisponde a nessuna chiesa del gruppo. Qui sotto ci sono tutte quelle che ci sono.');
    ['#sp-dettagli', '#sp-chi', '#sp-acc', '.hero-sede .eyebrow'].forEach(function (sel) {
      var e = document.querySelector(sel); if (e) e.hidden = true;
    });
    document.title = 'Gruppo Cristiano';
    window.__dibujarSede = noEncontrada;   // al cambiar de idioma, el aviso, no la ficha
  }

  /* --- arrancar --------------------------------------------------------------
     Si la iglesia esta en sedi.js se pinta ya, y cuando llegan los datos de la
     base de datos app.js la vuelve a pintar con lo ultimo.

     Si NO esta —una creada desde el panel— hay que esperar a la base de datos
     para saber siquiera como se llama. Se pide aqui directamente en vez de
     esperar a app.js, porque app.js no avisa si la lista vuelve vacia, y la
     pagina se quedaria muda para siempre. */
  window.__dibujarSede = dibujar;
  if (visible(buscar())) {
    dibujar();
  } else if (window.ALMACEN) {
    /* No esta, o esta en borrador en sedi.js. Puede que en la base de datos
       si este publicada —la publicaron desde el panel—: se pregunta antes de
       decir que no existe. */
    ALMACEN.leer().then(function (lista) {
      if (lista && lista.length) window.SEDI = lista;
      if (visible(buscar())) dibujar(); else noEncontrada();
    });
  } else {
    noEncontrada();
  }
})();
