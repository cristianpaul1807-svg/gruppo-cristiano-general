/* ============================================================================
   ALMACEN — donde viven las fichas de las sedes.

   Lo usan dos paginas: la publica, para pintar las fichas, y el panel, para
   crearlas y cambiarlas.

   Trabaja de dos maneras y elige sola, segun si abajo hay URL y clave:

     CON BASE DE DATOS. Las fichas las ve todo el mundo, la puerta del panel
     la comprueba el servidor, y al mudarse de dominio no se pierde nada.

     SIN ELLA. Guarda en el navegador. Sirve para enseñar como funciona, pero
     lo que cree alguien lo ve SOLO ESE MOVIL, y el dia que la web cambie de
     dominio se queda atras: lo guardado en un navegador es por origen.

   Para pasar de una manera a la otra se rellenan las dos lineas de abajo.
   Nada mas: ninguna de las dos paginas sabe cual de las dos esta en uso.

   Se habla con Supabase por su API normal, con fetch, en vez de cargar su
   libreria: la web no tiene ni una dependencia y no hace falta estrenar la
   primera para cinco llamadas.
   ============================================================================ */
var SUPABASE = {
  url: 'https://ifmrqbnnvlmnrfbseonr.supabase.co',
  /* La clave anon. Es publica por diseño: va dentro de la pagina y cualquiera
     la ve, asi que no es un secreto y no pasa nada por tenerla aqui escrita.
     Lo que protege son las reglas de la tabla (supabase-setup.sql): con esta
     clave sola se puede LEER lo publicado y nada mas.

     Se usa la clave `anon` de siempre y no la `sb_publishable_...` nueva
     porque esta es un JWT con el rol dentro, y es lo que entienden tanto la
     API de datos como la de entrada sin ninguna duda. */
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXJxYm5udmxtbnJmYnNlb25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxODAzNTQsImV4cCI6MjExMDc1NjM1NH0.b1Zn5xpkgnYDf2PuueiT-pcwrBuW6RUZJP0OwErJ1jo'
};

var ALMACEN = (function () {
  'use strict';

  var conBase = !!(SUPABASE.url && SUPABASE.key);

  /* ==========================================================================
     CON BASE DE DATOS
     ========================================================================== */
  var LLAVE = 'gc_sesion';

  function sesion() {
    try { return JSON.parse(localStorage.getItem(LLAVE) || 'null'); }
    catch (e) { return null; }
  }

  function viva(s) {
    return !!(s && s.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now()));
  }

  function cabeceras(comoEncargado) {
    var s = comoEncargado ? sesion() : null;
    return {
      'apikey': SUPABASE.key,
      'Content-Type': 'application/json',
      /* Sin sesion se usa la clave anon como portador, y entonces la base de
         datos aplica las reglas del publico: solo devuelve lo publicado. */
      'Authorization': 'Bearer ' + (viva(s) ? s.access_token : SUPABASE.key)
    };
  }

  function rest(ruta, opciones, comoEncargado) {
    opciones = opciones || {};
    var h = cabeceras(comoEncargado), k;
    for (k in (opciones.headers || {})) h[k] = opciones.headers[k];
    opciones.headers = h;
    return fetch(SUPABASE.url + '/rest/v1/' + ruta, opciones).then(function (r) {
      /* Se lee el cuerpo como texto y se decide despues, en vez de llamar a
         r.json() directamente.

         El motivo es concreto: al guardar se pide `return=minimal`, y entonces
         la respuesta buena es un 201 SIN CUERPO. r.json() sobre un cuerpo
         vacio no devuelve null, lanza — asi que cada guardado correcto salia
         en pantalla como un error, y el guardado en bloque se paraba a la
         primera ficha aunque las hubiera escrito todas. */
      return r.text().then(function (t) {
        if (!r.ok) {
          /* Los errores vienen en JSON. Se saca la frase y se tira el resto:
             lo que acaba en pantalla tiene que ser legible, no un objeto. */
          var m = t;
          try { var j = JSON.parse(t); m = j.message || j.hint || j.details || t; } catch (e) {}
          throw new Error(m || ('HTTP ' + r.status));
        }
        if (!t) return null;
        try { return JSON.parse(t); } catch (e) { return null; }
      });
    });
  }

  /* La tabla y la pagina usan los mismos nombres de campo a proposito, asi que
     esto es casi una copia. Lo que hace falta es limpiar: la tabla no acepta
     texto de mas de 240, ni cadena vacia donde espera un numero. */
  function aFila(s) {
    function num(v) { return (v === '' || v === null || v === undefined) ? null : Number(v); }
    return {
      id: s.id,
      orden: s.orden || 0,
      citta: s.citta || '',
      via: s.via || '',
      cap: s.cap || '',
      web: s.web || '',
      testo: (s.testo || '').slice(0, 240),
      lingue: s.lingue || '',
      logo: s.logo || '',
      whatsapp: s.whatsapp || '',
      email: s.email || '',
      copertina: s.copertina || '',
      pastori: Array.isArray(s.pastori) ? s.pastori : [],
      social: (s.social && typeof s.social === 'object') ? s.social : {},
      lat: num(s.lat),
      lon: num(s.lon),
      orari: s.orari || [],
      apple: s.apple || '',
      mapa: s.mapa || '',
      publicada: s.publicada !== false
    };
  }

  function deFila(f) {
    return {
      id: f.id, orden: f.orden, citta: f.citta, via: f.via, cap: f.cap,
      web: f.web, testo: f.testo, lingue: f.lingue, logo: f.logo,
      whatsapp: f.whatsapp || '', email: f.email || '', copertina: f.copertina || '',
      pastori: f.pastori || [], social: f.social || {},
      lat: f.lat, lon: f.lon, orari: f.orari || [], apple: f.apple,
      mapa: f.mapa, publicada: f.publicada
    };
  }

  /* ENTRAR CON UN NUMERO DE TELEFONO.
     Supabase solo sabe de correo + contrasena (entrar por telefono exige
     contratar SMS). Asi que un numero se convierte en una direccion interna,
     siempre la misma para el mismo numero, que nunca recibe correo:
       "340 083 7962" -> "tel.393400837962@gruppocristiano.it"
     Va en el dominio principal porque Supabase rechaza direcciones de un
     dominio sin servidor de correo; no se manda nada porque "Confirm email"
     esta apagado. Quien entra escribe su numero como quiera; el panel lo
     ensena como numero. */
  var DOM_TEL = 'gruppocristiano.it';
  function cuenta(entrada) {
    var t = String(entrada || '').trim().toLowerCase();
    if (t.indexOf('@') >= 0) return t;
    var d = t.replace(/[^0-9]/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d.length === 10 && d.charAt(0) === '3') d = '39' + d;
    return d.length >= 8 ? 'tel.' + d + '@' + DOM_TEL : t;
  }
  function mostrar(email) {
    var m = /^tel\.(\d+)@gruppocristiano\.it$/.exec(String(email || ''));
    if (!m) return email || '';
    var d = m[1];
    return d.indexOf('39') === 0 && d.length === 12
      ? '+39 ' + d.slice(2, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8)
      : '+' + d;
  }

  /* Las galerias en modo demo (sin base): en el navegador, como lo demas. */
  function fotosDemo(nuevas) {
    try {
      if (nuevas) { localStorage.setItem('gcf_foto', JSON.stringify(nuevas)); return nuevas; }
      return JSON.parse(localStorage.getItem('gcf_foto') || '[]') || [];
    } catch (e) { return []; }
  }

  /* De lo que se guarda en `sito`, solo los campos conocidos que vengan. */
  function soloLoDado(d) {
    var o = {};
    ['copertina', 'whatsapp'].forEach(function (k) { if (d && d[k] !== undefined) o[k] = String(d[k] || ''); });
    /* Las preguntas: null = volver a las de serie; si no, una lista limpia,
       solo con los campos que se usan y con tope de largo. */
    if (d && d.domande !== undefined) {
      o.domande = d.domande === null ? null : (Array.isArray(d.domande) ? d.domande : []).slice(0, 30)
        .map(function (q) {
          function c(v, n) { return String(v || '').trim().slice(0, n); }
          return { d_it: c(q.d_it, 300), r_it: c(q.r_it, 1500), d_es: c(q.d_es, 300), r_es: c(q.r_es, 1500), conf: !!q.conf };
        }).filter(function (q) { return q.d_it || q.d_es; });
    }
    return o;
  }

  /* ==========================================================================
     SIN ELLA — el almacen del propio navegador
     ========================================================================== */
  var BASE = 'gcf';
  var TIENDA = 'sedi';
  var VERSION = 1;

  function abrir() {
    return new Promise(function (ok, mal) {
      if (!window.indexedDB) { mal(new Error('sin IndexedDB')); return; }
      var p = indexedDB.open(BASE, VERSION);
      p.onupgradeneeded = function () {
        var db = p.result;
        if (!db.objectStoreNames.contains(TIENDA)) {
          db.createObjectStore(TIENDA, { keyPath: 'id' });
        }
      };
      p.onsuccess = function () { ok(p.result); };
      p.onerror = function () { mal(p.error); };
    });
  }

  function conTienda(modo, fn) {
    return abrir().then(function (db) {
      return new Promise(function (ok, mal) {
        var tx = db.transaction(TIENDA, modo);
        var res = fn(tx.objectStore(TIENDA));
        tx.oncomplete = function () { db.close(); ok(res && res.result !== undefined ? res.result : res); };
        tx.onerror = function () { db.close(); mal(tx.error); };
      });
    });
  }

  /* ==========================================================================
     Lo que ve el resto de la web. La forma no cambia entre las dos maneras:
     por eso se puede pasar de una a otra sin tocar nada mas.
     ========================================================================== */
  return {
    /* El panel lo mira para saber si pone la cerradura de verdad o la de
       mentira, y para decirlo en pantalla en vez de que nadie lo sepa. */
    conBase: conBase,
    cuenta: cuenta,
    mostrar: mostrar,

    hayEntrado: function () {
      return conBase ? viva(sesion()) : false;
    },

    entrar: function (correo, clave) {
      if (!conBase) return Promise.reject(new Error('sin base de datos'));
      return fetch(SUPABASE.url + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { 'apikey': SUPABASE.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cuenta(correo), password: clave })
      }).then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok) throw new Error(d.error_description || d.msg || d.error || 'no se ha podido entrar');
          try { localStorage.setItem(LLAVE, JSON.stringify(d)); } catch (e) {}
          return d;
        });
      });
    },

    salir: function () {
      try { localStorage.removeItem(LLAVE); } catch (e) {}
      return Promise.resolve();
    },

    /* Devuelve la lista ordenada, o null.

       null significa "no hay nada guardado, usa lo que viene escrito en la
       pagina" — y NO una lista vacia, que significaria "las han borrado todas
       a proposito". La diferencia importa: con null la web sigue enseñando las
       sedes de sedi.js en vez de quedarse en blanco.

       `todas` lo pide el panel, para ver tambien los borradores. La web
       publica no lo pide, y aunque lo pidiera la base de datos no se los
       daria: la regla del publico solo deja ver lo publicado. */
    leer: function (todas) {
      if (conBase) {
        return rest('sede?select=*&order=orden.asc', {}, !!todas)
          .then(function (filas) {
            if (!filas || !filas.length) return null;
            return filas.map(deFila);
          })
          /* Sin red, la web publica sigue enseñando las sedes escritas. */
          .catch(function () { return null; });
      }
      return conTienda('readonly', function (t) { return t.getAll(); })
        .then(function (lista) {
          if (!lista || !lista.length) return null;
          return lista.sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
        })
        .catch(function () { return null; });
    },

    guardar: function (sede) {
      if (conBase) {
        /* Primero se intenta CORREGIR, y solo si no habia nada se CREA.

           Antes era un solo viaje —un "upsert", insertar y si ya existe
           fusionar— y era un error con los dos papeles: Postgres comprueba
           la regla de INSERTAR tambien en un upsert, aunque la fila exista.
           Como solo el general puede insertar, el responsable de Parma no
           habria podido guardar ni su propia ficha.

           Asi, el responsable solo pasa por la regla de corregir, que le deja
           tocar la suya. Si intentase tocar otra, la correccion no encuentra
           nada que pueda tocar, se intenta crear, y la regla de crear le
           dice que no. */
        var fila = aFila(sede);
        return rest('sede?id=eq.' + encodeURIComponent(fila.id), {
          method: 'PATCH',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(fila)
        }, true).then(function (tocadas) {
          if (tocadas && tocadas.length) return null;
          return rest('sede', {
            method: 'POST',
            headers: { 'Prefer': 'return=minimal' },
            body: JSON.stringify(fila)
          }, true);
        });
      }
      return conTienda('readwrite', function (t) { return t.put(sede); });
    },

    borrar: function (id) {
      if (conBase) {
        return rest('sede?id=eq.' + encodeURIComponent(id), { method: 'DELETE' }, true);
      }
      return conTienda('readwrite', function (t) { return t.delete(id); });
    },

    /* ======================================================================
       LOS ACCESOS
       ====================================================================== */

    /* Quien soy: mi papel y mi sede. El panel lo mira al entrar para saber
       que ensenar. Sin base de datos no hay papeles: el modo demo se
       comporta como general, que es lo que hacia siempre. */
    yo: function () {
      if (!conBase) return Promise.resolve({ ruolo: 'generale', sede: null, attivo: true, demo: true });
      var s = sesion();
      var uid = s && s.user && s.user.id;
      if (!uid) return Promise.resolve(null);
      return rest('profilo?select=ruolo,sede,email,attivo&utente=eq.' + encodeURIComponent(uid), {}, true)
        .then(function (f) { return (f && f[0]) || null; });
    },

    /* Todos los accesos y las invitaciones pendientes. Solo lo puede leer el
       general; a cualquier otro la base de datos le devuelve listas vacias. */
    accessi: function () {
      if (!conBase) return Promise.resolve({ attivi: [], inviti: [] });
      return Promise.all([
        rest('profilo?select=utente,ruolo,sede,email,attivo&order=ruolo.asc,sede.asc', {}, true),
        rest('invito?select=email,ruolo,sede,creato', {}, true)
      ]).then(function (r) { return { attivi: r[0] || [], inviti: r[1] || [] }; });
    },

    /* Crear la cuenta de un responsable.

       Dos pasos, y el orden importa: primero la invitacion, despues el
       registro. El trigger de la base de datos solo deja crear la cuenta si
       la invitacion existe.

       El registro se hace con fetch a pelo y su respuesta se tira: trae una
       sesion para la cuenta NUEVA, y si se guardase, el general quedaria
       conectado como el responsable que acaba de crear. */
    creaAccesso: function (email, clave, ruolo, sede) {
      if (!conBase) return Promise.reject(new Error('Serve la banca dati.'));
      email = cuenta(email);
      var inv = { email: email, ruolo: ruolo, sede: ruolo === 'sede' ? sede : null };

      function limpiar(err) {
        /* Si el registro falla, la invitacion no puede quedarse colgada: con
           ella, cualquiera que supiera ese correo podria registrarse con su
           propia contrasena durante 24 horas. */
        return rest('invito?email=eq.' + encodeURIComponent(email), { method: 'DELETE' }, true)
          .catch(function () {})
          .then(function () { throw err; });
      }

      return rest('invito?on_conflict=email', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(inv)
      }, true).then(function () {
        return fetch(SUPABASE.url + '/auth/v1/signup', {
          method: 'POST',
          headers: { 'apikey': SUPABASE.key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: clave })
        }).then(function (r) {
          return r.text().then(function (t) {
            var d = {}; try { d = JSON.parse(t); } catch (e) {}
            if (!r.ok) {
              var m = d.msg || d.error_description || d.message || d.error || ('HTTP ' + r.status);
              var e2 = new Error(m); e2.codigo = d.error_code || d.code || r.status;
              throw e2;
            }
            return d;
          });
        });
      }).catch(limpiar);
      /* Si lo que fallo fue la propia invitacion no habia nada que limpiar,
         pero borrar algo que no existe no hace dano: un solo camino de error
         es mas facil de seguir que dos. */
    },

    /* ======================================================================
       LAS FOTOS — la portada y el logo de cada iglesia
       ====================================================================== */

    /* Sube una imagen YA ACHICADA (lo hace el panel) a la carpeta de esa
       iglesia y devuelve su direccion publica.

       Nombre con la hora dentro (copertina-1732112345.jpg) y no siempre el
       mismo: asi una foto nueva tiene direccion nueva y ningun movil se queda
       ensenando la vieja guardada. La vieja se borra despues de guardar.

       Sin base de datos (demo), la imagen va dentro de la ficha como data URL,
       igual que el mapa: no hay donde subirla. */
    subirImagen: function (sedeId, tipo, blob) {
      if (!conBase) {
        return new Promise(function (ok, mal) {
          var fr = new FileReader();
          fr.onload = function () { ok(fr.result); };
          fr.onerror = function () { mal(fr.error); };
          fr.readAsDataURL(blob);
        });
      }
      var s = sesion();
      if (!viva(s)) return Promise.reject(new Error('Sessione scaduta.'));
      var ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      var ruta = encodeURIComponent(sedeId) + '/' + tipo + '-' + Date.now() + '.' + ext;
      return fetch(SUPABASE.url + '/storage/v1/object/media/' + ruta, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE.key,
          'Authorization': 'Bearer ' + s.access_token,
          'Content-Type': blob.type,
          'cache-control': '31536000'
        },
        body: blob
      }).then(function (r) {
        return r.text().then(function (t) {
          if (!r.ok) {
            var m = t; try { var j = JSON.parse(t); m = j.message || j.error || t; } catch (e) {}
            throw new Error(m || ('HTTP ' + r.status));
          }
          return SUPABASE.url + '/storage/v1/object/public/media/' + ruta;
        });
      });
    },

    /* Borra una imagen que ya no se usa. Solo si es de NUESTRO almacen: una
       direccion de fuera, o un archivo de media/ de la web, no se toca. Si
       falla no pasa nada: queda un archivo de mas, no una ficha rota. */
    borrarImagen: function (url) {
      if (!conBase || !url) return Promise.resolve();
      var pre = SUPABASE.url + '/storage/v1/object/public/media/';
      if (url.indexOf(pre) !== 0) return Promise.resolve();
      var s = sesion();
      if (!viva(s)) return Promise.resolve();
      return fetch(SUPABASE.url + '/storage/v1/object/media/' + url.slice(pre.length), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE.key, 'Authorization': 'Bearer ' + s.access_token }
      }).catch(function () {});
    },

    /* Deja en la carpeta de una iglesia SOLO las fotos que usa su ficha, y
       borra el resto: las viejas que no se borraron al cambiarlas (sin red
       justo en ese momento, por ejemplo) o subidas a medias. Asi la carpeta
       nunca crece: como mucho, su portada y su logo.

       Importa por el tope de la base de datos: 6 archivos por carpeta. Sin
       limpiar, una carpeta con restos acabaria rechazando la foto nueva. */
    limpiarCarpeta: function (carpeta, enUso) {
      if (!conBase) return Promise.resolve(0);
      var s = sesion();
      if (!viva(s)) return Promise.resolve(0);
      var h = { 'apikey': SUPABASE.key, 'Authorization': 'Bearer ' + s.access_token, 'Content-Type': 'application/json' };
      var pre = SUPABASE.url + '/storage/v1/object/public/media/';
      var usados = (enUso || []).filter(Boolean).map(function (u) {
        return u.indexOf(pre) === 0 ? decodeURIComponent(u.slice(pre.length)) : '';
      });
      return fetch(SUPABASE.url + '/storage/v1/object/list/media', {
        method: 'POST', headers: h,
        body: JSON.stringify({ prefix: carpeta + '/', limit: 100 })
      }).then(function (r) { return r.ok ? r.json() : []; }).then(function (lista) {
        /* Solo los archivos sueltos de la carpeta: la subcarpeta galleria/ sale
           en la lista como una entrada sin id, y se deja en paz (la galeria
           se limpia aparte, con limpiarGaleria). */
        var sobran = (lista || []).filter(function (o) { return o && o.id && o.name.indexOf('/') < 0; })
          .map(function (o) { return carpeta + '/' + o.name; })
          .filter(function (n) { return usados.indexOf(n) < 0 && !/\/\.emptyFolderPlaceholder$/.test(n); });
        if (!sobran.length) return 0;
        return fetch(SUPABASE.url + '/storage/v1/object/media', {
          method: 'DELETE', headers: h, body: JSON.stringify({ prefixes: sobran })
        }).then(function () { return sobran.length; });
      }).catch(function () { return 0; });
    },

    /* ======================================================================
       LAS GALERIAS — fotos con su texto. Una por iglesia y la del grupo
       ('generale'). Las reglas de la base deciden quien toca cual.
       ====================================================================== */
    leerFotos: function (cartella) {
      if (conBase) {
        return rest('foto?select=id,cartella,url,testo,orden&cartella=eq.' + encodeURIComponent(cartella)
          + '&order=orden.asc,creada.asc', {}, false).catch(function () { return []; })
          .then(function (f) { return f || []; });
      }
      return Promise.resolve(fotosDemo().filter(function (f) { return f.cartella === cartella; })
        .sort(function (a, b) { return a.orden - b.orden; }));
    },

    /* Sube la foto (ya achicada) a <cartella>/galleria/ y la apunta. */
    aggiungiFoto: function (cartella, blob, testo) {
      var self = this;
      return self.subirImagen(cartella, 'galleria/foto', blob).then(function (url) {
        var fila = { cartella: cartella, url: url, testo: String(testo || '').slice(0, 200), orden: Date.now() };
        if (!conBase) {
          fila.id = 'f' + Date.now() + Math.random().toString(36).slice(2, 6);
          var todas = fotosDemo(); todas.push(fila); fotosDemo(todas);
          return fila;
        }
        return rest('foto', {
          method: 'POST', headers: { 'Prefer': 'return=representation' }, body: JSON.stringify(fila)
        }, true).then(function (f) { return f && f[0]; }, function (e) {
          /* Si la base no la acepta (el tope de 12, por ejemplo), el archivo
             no se queda huerfano en el almacen. */
          return self.borrarImagen(url).then(function () { throw e; });
        });
      });
    },

    /* Cambia el texto o el orden. Devuelve error si las reglas no dejan. */
    cambiaFoto: function (id, datos) {
      var d = {};
      if (datos.testo !== undefined) d.testo = String(datos.testo || '').slice(0, 200);
      if (datos.orden !== undefined) d.orden = datos.orden;
      if (!conBase) {
        var todas = fotosDemo();
        todas.forEach(function (f) { if (f.id === id) Object.assign(f, d); });
        fotosDemo(todas);
        return Promise.resolve();
      }
      return rest('foto?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH', headers: { 'Prefer': 'return=representation' }, body: JSON.stringify(d)
      }, true).then(function (f) { if (!f || !f.length) throw new Error('non è una foto tua'); });
    },

    togliFoto: function (foto) {
      var self = this;
      if (!conBase) {
        fotosDemo(fotosDemo().filter(function (f) { return f.id !== foto.id; }));
        return Promise.resolve();
      }
      return rest('foto?id=eq.' + encodeURIComponent(foto.id), {
        method: 'DELETE', headers: { 'Prefer': 'return=representation' }
      }, true).then(function (f) {
        if (!f || !f.length) throw new Error('non è una foto tua');
        return self.borrarImagen(foto.url);
      });
    },

    /* Borra de <cartella>/galleria/ los archivos que ya no estan en la galeria
       (restos de una subida cortada). Se llama al abrir la galeria en el panel. */
    limpiarGaleria: function (cartella, fotos) {
      if (!conBase) return Promise.resolve(0);
      var s = sesion();
      if (!viva(s)) return Promise.resolve(0);
      var h = { 'apikey': SUPABASE.key, 'Authorization': 'Bearer ' + s.access_token, 'Content-Type': 'application/json' };
      var pre = SUPABASE.url + '/storage/v1/object/public/media/';
      var usados = (fotos || []).map(function (f) { return decodeURIComponent(String(f.url).slice(pre.length)); });
      var dir = cartella + '/galleria/';
      return fetch(SUPABASE.url + '/storage/v1/object/list/media', {
        method: 'POST', headers: h, body: JSON.stringify({ prefix: dir, limit: 100 })
      }).then(function (r) { return r.ok ? r.json() : []; }).then(function (lista) {
        var sobran = (lista || []).filter(function (o) { return o && o.id && o.name.indexOf('/') < 0; })
          .map(function (o) { return dir + o.name; })
          .filter(function (n) { return usados.indexOf(n) < 0; });
        if (!sobran.length) return 0;
        return fetch(SUPABASE.url + '/storage/v1/object/media', {
          method: 'DELETE', headers: h, body: JSON.stringify({ prefixes: sobran })
        }).then(function () { return sobran.length; });
      }).catch(function () { return 0; });
    },

    /* ======================================================================
       LA WEB DEL GRUPO — lo que sube el general (por ahora, la portada)
       ====================================================================== */

    /* Devuelve {copertina: '...'} o null si no hay nada (y entonces la web
       usa la foto que trae de serie). Sin red, null: nunca deja la portada
       en blanco por un fallo. */
    leerSito: function () {
      if (conBase) {
        return rest('sito?select=copertina,whatsapp,domande&limit=1', {}, false)
          .then(function (f) { return (f && f[0]) || null; })
          .catch(function () { return null; });
      }
      try { return Promise.resolve(JSON.parse(localStorage.getItem('gcf_sito') || 'null')); }
      catch (e) { return Promise.resolve(null); }
    },

    /* Solo el general: la base de datos rechaza a cualquier otro. Se pide la
       fila de vuelta para saber si de verdad se cambio: si las reglas no le
       dejan, PostgREST no da error, devuelve cero filas. */
    guardarSito: function (datos) {
      if (conBase) {
        return rest('sito?id=eq.true', {
          method: 'PATCH',
          headers: { 'Prefer': 'return=representation' },
          /* Solo lo que se pasa: guardar el numero no borra la foto, ni al reves. */
          body: JSON.stringify(soloLoDado(datos))
        }, true).then(function (f) {
          if (!f || !f.length) throw new Error('solo l\'amministratore generale può cambiarla');
          return f[0];
        });
      }
      var antes = {};
      try { antes = JSON.parse(localStorage.getItem('gcf_sito') || '{}') || {}; } catch (e) {}
      var todo = Object.assign({ copertina: '', whatsapp: '', domande: null }, antes, soloLoDado(datos));
      try { localStorage.setItem('gcf_sito', JSON.stringify(todo)); } catch (e) {}
      return Promise.resolve(todo);
    },

    /* Anular una invitacion que se quedo a medias. */
    annullaInvito: function (email) {
      if (!conBase) return Promise.resolve();
      return rest('invito?email=eq.' + encodeURIComponent(String(email).toLowerCase()),
        { method: 'DELETE' }, true);
    },

    /* Quitar o devolver un acceso. No se borra la cuenta: se apaga. Asi, si
       vuelve, se le enciende y sigue con su misma contrasena. */
    cambiaAccesso: function (utente, attivo) {
      if (!conBase) return Promise.reject(new Error('Serve la banca dati.'));
      return rest('profilo?utente=eq.' + encodeURIComponent(utente), {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ attivo: !!attivo })
      }, true);
    },

    /* Cada uno cambia SU contrasena. La del general la eligen juntos el dia
       que se crea, pero luego cada responsable debe poder poner la suya. */
    cambiaPassword: function (nueva) {
      if (!conBase) return Promise.reject(new Error('Serve la banca dati.'));
      var s = sesion();
      if (!viva(s)) return Promise.reject(new Error('Sessione scaduta.'));
      return fetch(SUPABASE.url + '/auth/v1/user', {
        method: 'PUT',
        headers: {
          'apikey': SUPABASE.key, 'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + s.access_token
        },
        body: JSON.stringify({ password: nueva })
      }).then(function (r) {
        return r.text().then(function (t) {
          var d = {}; try { d = JSON.parse(t); } catch (e) {}
          if (!r.ok) throw new Error(d.msg || d.error_description || d.message || ('HTTP ' + r.status));
          return d;
        });
      });
    },

    /* Para el boton de "volver a como estaba": deja la lista vacia y la web
       publica vuelve a las sedes escritas en sedi.js. */
    vaciar: function () {
      if (conBase) {
        /* PostgREST no borra sin filtro, a proposito, para que nadie vacie una
           tabla por error. Este filtro lo cumplen todas las filas. */
        return rest('sede?id=neq.__ninguna__', { method: 'DELETE' }, true);
      }
      return conTienda('readwrite', function (t) { return t.clear(); });
    }
  };
})();
