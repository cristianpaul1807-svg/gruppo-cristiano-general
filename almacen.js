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
      lat: f.lat, lon: f.lon, orari: f.orari || [], apple: f.apple,
      mapa: f.mapa, publicada: f.publicada
    };
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

    hayEntrado: function () {
      return conBase ? viva(sesion()) : false;
    },

    entrar: function (correo, clave) {
      if (!conBase) return Promise.reject(new Error('sin base de datos'));
      return fetch(SUPABASE.url + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { 'apikey': SUPABASE.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo, password: clave })
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
        /* Un solo viaje para crear y para corregir: si el id ya existe, se
           fusiona. Asi el panel no tiene que saber si la ficha es nueva. */
        return rest('sede?on_conflict=id', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(aFila(sede))
        }, true);
      }
      return conTienda('readwrite', function (t) { return t.put(sede); });
    },

    borrar: function (id) {
      if (conBase) {
        return rest('sede?id=eq.' + encodeURIComponent(id), { method: 'DELETE' }, true);
      }
      return conTienda('readwrite', function (t) { return t.delete(id); });
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
