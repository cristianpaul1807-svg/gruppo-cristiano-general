/* ============================================================================
   ALMACEN — donde viven las fichas de las sedes.

   Lo usan dos paginas: la publica, para pintar las fichas, y el panel, para
   crearlas y cambiarlas.

   Hoy guarda en IndexedDB, que es el almacen del propio navegador. Y hay que
   decir claro lo que eso significa, porque en una reunion es la pregunta que
   sale:

     Las fichas que cree alguien desde su movil las ve ESE movil. Un visitante
     cualquiera sigue viendo las que vienen escritas en la pagina. Para que
     las vea todo el mundo hace falta almacenamiento de verdad —una base de
     datos— y eso es el paso siguiente, no este.

   Por eso todo pasa por aqui y no esta repartido por las dos paginas: el dia
   que se cambie a una base de datos de verdad se reescribe este archivo y
   nada mas. La forma de las tres funciones no cambia.

   Y todo va envuelto en try/catch: en navegacion privada el almacen puede no
   existir o dar error, y entonces la pagina publica tiene que seguir
   enseñando las fichas escritas, no romperse.
   ============================================================================ */
var ALMACEN = (function () {
  'use strict';

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

  return {
    /* Devuelve la lista ordenada. Si falla cualquier cosa devuelve null, que
       significa "no hay nada guardado, usa lo que viene escrito en la pagina"
       — y NO una lista vacia, que significaria "el usuario las borro todas". */
    leer: function () {
      return conTienda('readonly', function (t) { return t.getAll(); })
        .then(function (lista) {
          if (!lista || !lista.length) return null;
          return lista.sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
        })
        .catch(function () { return null; });
    },

    guardar: function (sede) {
      return conTienda('readwrite', function (t) { return t.put(sede); });
    },

    borrar: function (id) {
      return conTienda('readwrite', function (t) { return t.delete(id); });
    },

    /* Para el boton de "volver a como estaba": deja la tienda vacia y la
       pagina publica vuelve a las fichas escritas en el codigo. */
    vaciar: function () {
      return conTienda('readwrite', function (t) { return t.clear(); });
    }
  };
})();
