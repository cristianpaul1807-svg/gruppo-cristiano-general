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

    /* --- su foto de portada y su logo, si los ha subido ----------------------
       Las dos vienen de la base de datos: pasan por imagen(), que solo deja
       direcciones https (o una imagen metida en la ficha, en la demo). Sin foto, la portada es la franja crema de siempre. */
    var cop = $('#sp-copertina'), lg = $('#sp-logo'), cab = $('#sp-hero');
    var urlCop = imagen(s.copertina), urlLogo = imagen(s.logo);
    if (cop && cab) {
      if (urlCop) { cop.src = urlCop; cop.hidden = false; cab.classList.add('con-foto'); }
      else { cop.hidden = true; cop.removeAttribute('src'); cab.classList.remove('con-foto'); }
    }
    if (lg) {
      if (urlLogo) {
        lg.src = urlLogo; lg.hidden = false;
        lg.alt = texto('sd_alt_logo', 'Logo della chiesa di') + ' ' + s.citta;
      } else { lg.hidden = true; lg.removeAttribute('src'); }
    }

    /* --- la direccion, bajo el titulo --------------------------------------
       El generador ya la ha escrito. Se vuelve a escribir aqui por si el panel
       la ha cambiado despues del ultimo despliegue. */
    var via = $('#sp-via');
    if (via) {
      /* La calle y el codigo postal vienen de la base de datos, y los puede
         escribir el responsable de la iglesia. Van como TEXTO, nunca como
         HTML: antes iban con innerHTML, y quien escribiese codigo en la
         direccion lo habria ejecutado en el movil de cada visitante — y en el
         del administrador general, cuya sesion vive en este mismo dominio.
         Asi un responsable de sede podia acabar siendo general. */
      via.textContent = '';
      if (dir) {
        via.appendChild(document.createTextNode(s.via));
        var c = document.createElement('span'); c.textContent = s.cap;
        via.appendChild(c);
      } else {
        via.innerHTML = '<span class="x-conf">' + texto('conf', 'da confermare') + '</span>';
      }
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
      if (numero(s)) acc.appendChild(boton('btn', enlaceWa(s), 'WhatsApp'));
    }

    /* El boton flotante, dentro de la pagina de una iglesia, escribe a ESA
       iglesia. En la portada no hay numero general todavia y se queda
       apagado. */
    var wa = document.getElementById('wa');
    if (wa && numero(s)) {
      wa.classList.remove('apagado');
      wa.href = enlaceWa(s);
      wa.target = '_blank'; wa.rel = 'noopener';
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
          var oo = window.ORARIO ? ORARIO(o) : o;
          var dt = document.createElement('dt'); dt.textContent = oo[0];
          var dd = document.createElement('dd'); dd.textContent = oo[1];
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
    var testo = window.LOC ? LOC(s, 'testo') : (s.testo || '');
    if (tx) { tx.textContent = testo; tx.hidden = !testo; }

    /* --- los pastores ---------------------------------------------------------
       Nombre y, si lo tiene, su papel ("pastore giovani"). Todo como texto. */
    var lp = $('#sp-pastori');
    if (lp) {
      lp.textContent = '';
      (Array.isArray(s.pastori) ? s.pastori : []).forEach(function (p) {
        var nombre = Array.isArray(p) ? p[0] : p;
        var papel = Array.isArray(p) ? (window.RUOLO ? RUOLO(p) : p[1]) : '';
        if (!nombre) return;
        var li = document.createElement('li');
        li.textContent = nombre;
        if (papel) {
          var r = document.createElement('span'); r.textContent = papel;
          li.appendChild(r);
        }
        lp.appendChild(li);
      });
      /* La foto de los pastores, si la ha subido la iglesia. */
      var fp = $('#sp-pastori-foto'), urlFp = imagen(s.foto_pastori);
      if (fp) {
        if (urlFp) { fp.src = urlFp; fp.hidden = false; fp.alt = texto('sp_pastori_alt', 'I pastori della chiesa di') + ' ' + s.citta; }
        else { fp.hidden = true; fp.removeAttribute('src'); }
      }
      var bp = $('#sp-pastori-bloque');
      if (bp) bp.hidden = !(lp.children.length || urlFp);
    }

    /* --- hablar con la iglesia ------------------------------------------------
       WhatsApp y llamar salen del mismo numero: si ese numero no tuviese
       WhatsApp, llamar sigue funcionando. */
    var cont = $('#sp-contatti'), red = $('#sp-social');
    if (cont && red) {
      cont.textContent = ''; red.textContent = '';
      if (numero(s)) {
        cont.appendChild(boton('btn piena', enlaceWa(s), 'WhatsApp'));
        var tel = boton('btn', 'tel:+' + numero(s), texto('sp_chiama', 'Chiama'));
        tel.removeAttribute('target'); tel.removeAttribute('rel');
        cont.appendChild(tel);
      }
      if (correoValido(s.email)) {
        var em = boton('btn', 'mailto:' + String(s.email).trim(), texto('sp_email', 'Scrivi un’email'));
        em.removeAttribute('target'); em.removeAttribute('rel');
        cont.appendChild(em);
      }
      var soc = (s.social && typeof s.social === 'object') ? s.social : {};
      ['instagram', 'facebook', 'youtube'].forEach(function (k) {
        var u = seguro(soc[k]);
        if (!u) return;
        var a = document.createElement('a');
        a.href = u; a.target = '_blank'; a.rel = 'noopener';
        a.setAttribute('aria-label', NOMBRES_RED[k] + ' — Gruppo Cristiano ' + s.citta);
        a.innerHTML = ICONOS[k];   // trazo fijo nuestro, no viene de la base
        red.appendChild(a);
      });
      var bc = $('#sp-contatti-bloque');
      if (bc) bc.hidden = !(cont.children.length || red.children.length);
    }

    /* --- donar a esta iglesia ------------------------------------------------- */
    var dn = $('#sp-dona-lista'), sdn = $('#sp-dona');
    if (dn && sdn && window.DONAZIONI) sdn.hidden = !DONAZIONI(dn, s.donazioni);

    /* --- el aviso de ficha vacia ---------------------------------------------
       Una pagina sin direccion ni horarios no puede quedarse muda: quien llega
       tiene que entender que falta por llegar, no pensar que la web esta rota. */
    var vacio = $('#sp-vacio');
    if (vacio) vacio.hidden = !!(dir || (s.orari && s.orari.length));
  }

  /* El numero, listo para wa.me y tel:. En el panel cualquiera lo escribira
     como le salga —"348 839 3936", "+39 348...", "0039..."— y wa.me solo
     entiende digitos con el prefijo del pais delante. Un movil italiano de 10
     cifras que empieza por 3 sin prefijo es lo que se escribe casi siempre:
     se le pone el 39. */
  function numero(s) {
    var d = String((s && s.whatsapp) || '').replace(/[^0-9]/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d.length === 10 && d.charAt(0) === '3') d = '39' + d;
    return d.length >= 8 ? d : '';
  }
  function enlaceWa(s) {
    return 'https://wa.me/' + numero(s) + '?text='
      + encodeURIComponent('Ciao, scrivo dal sito del Gruppo Cristiano ' + s.citta + '.');
  }

  /* Los iconos de las redes: los mismos trazos que el pie de la portada. */
  var ICONOS = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12s0-3.3-.4-4.9a2.6 2.6 0 0 0-1.8-1.8C18.2 4.9 12 4.9 12 4.9s-6.2 0-7.8.4a2.6 2.6 0 0 0-1.8 1.8C2 8.7 2 12 2 12s0 3.3.4 4.9c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.6.4-4.9.4-4.9zM10 15.2V8.8l5.2 3.2z"/></svg>'
  };
  var NOMBRES_RED = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube' };

  /* Un enlace de la base de datos solo vale si es una web normal: un
     "javascript:" en un href se ejecuta al tocarlo. Ver SEGURO en app.js. */
  function seguro(u) {
    return window.SEGURO ? SEGURO(u) : (/^https?:\/\/\S+$/i.test(String(u || '').trim()) ? String(u).trim() : '');
  }
  /* El origen de una imagen: ver IMAGEN en app.js. */
  function imagen(u) { return window.IMAGEN ? IMAGEN(u) : seguro(u); }
  function correoValido(e) {
    return /^[^@\s<>"']+@[^@\s<>"']+\.[^@\s<>"']+$/.test(String(e || '').trim());
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
            d: s.testo_es || ('Gruppo Cristiano ' + s.citta + (dir ? ', ' + dir : '')
               + '. Horarios de las reuniones y cómo llegar.') },
      en: { t: 'Gruppo Cristiano ' + s.citta + ' — Evangelical church in ' + s.citta,
            d: s.testo_en || ('Gruppo Cristiano ' + s.citta + (dir ? ', ' + dir : '')
               + '. Meeting times and how to get there.') }
    };
    var lang = window.LINGUA ? LINGUA() : 'it';
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
    /* Una direccion que no es ninguna iglesia no debe acabar en Google. */
    if (!document.querySelector('meta[name="robots"]')) {
      var m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex'; document.head.appendChild(m);
    }
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
