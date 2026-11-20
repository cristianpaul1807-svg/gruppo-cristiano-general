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

  function dibujar() {
    var s = buscar();
    if (!s) return;

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
      var fuente = s.mapa || (s.id ? '../media/mappa-' + s.id + '.jpg' : '');
      if (fuente && dir) {
        var a = document.createElement('a');
        a.href = 'https://www.google.com/maps/dir/?api=1&destination=' + q;
        a.target = '_blank'; a.rel = 'noopener';
        a.setAttribute('aria-label', texto('sd_aria', 'Indicazioni per') + ' ' + s.citta);
        var im = document.createElement('img');
        im.src = fuente; im.width = 1120; im.height = 700;
        im.alt = texto('sd_alt', 'Mappa della chiesa di') + ' ' + s.citta;
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

  dibujar();
  /* Al cambiar de idioma, app.js vuelve a pintar lo que dibuja JavaScript. */
  window.__dibujarSede = dibujar;
})();
