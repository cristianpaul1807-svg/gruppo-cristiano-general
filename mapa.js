/* ============================================================================
   MAPA — el mismo mapa oscuro que genera herramientas/mapa-sede.py, pero
   hecho en el navegador para que quien use el panel no necesite nada
   instalado: pone la coordenada y sale la imagen.

   Las cuentas son las mismas que en el script, a proposito: si un dia las dos
   dejan de coincidir, la ficha que se hizo desde el panel se vera distinta de
   la que se hizo a mano, y eso en una rejilla de fichas canta.

   Por que se genera una IMAGEN y no se incrusta un mapa:
     - Un recuadro incorporado que no carga deja el icono de pagina rota en
       medio del diseno. Una imagen o se ve o se ve.
     - Ni una peticion a terceros desde la pagina del visitante.
     - El color: las teselas de OpenStreetMap son claras y la pagina es
       oscura. Aqui se oscurecen UNA vez. Un filtro CSS habria invertido
       tambien el marcador.

   Las teselas son de OpenStreetMap y hay que citarlas: cada ficha lleva
   "Mappa © contributori di OpenStreetMap" debajo. Son 36 teselas por sede,
   que es un uso normal de una persona mirando un sitio.
   ============================================================================ */
var MAPA = (function () {
  'use strict';

  var ZOOM = 17;
  var COLS = 6, FILAS = 6;
  var ANCHO = 1120, ALTO = 700;

  function gradosATesela(lat, lon, z) {
    var n = Math.pow(2, z);
    var x = (lon + 180) / 360 * n;
    var r = lat * Math.PI / 180;
    var y = (1 - Math.asinh(Math.tan(r)) / Math.PI) / 2 * n;
    return { x: x, y: y };
  }

  function tesela(z, x, y) {
    return new Promise(function (ok, mal) {
      var im = new Image();
      /* Sin esto el lienzo queda "manchado" y no se puede exportar la imagen.
         tile.openstreetmap.org responde con Access-Control-Allow-Origin. */
      im.crossOrigin = 'anonymous';
      im.onload = function () { ok(im); };
      im.onerror = function () { mal(new Error('tessera ' + z + '/' + x + '/' + y)); };
      im.src = 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
    });
  }

  /* Invierte, dessatura y tira hacia el azul de la pagina (#0b0d12). Son las
     mismas constantes que el script de Python. */
  function oscurecer(ctx, w, h) {
    var d = ctx.getImageData(0, 0, w, h);
    var p = d.data;
    for (var i = 0; i < p.length; i += 4) {
      var r = 1 - p[i] / 255, g = 1 - p[i + 1] / 255, b = 1 - p[i + 2] / 255;
      var gris = (r + g + b) / 3;
      r = r * 0.45 + gris * 0.55;
      g = g * 0.45 + gris * 0.55;
      b = b * 0.45 + gris * 0.55;
      r = r * 0.78 + 0.043 * 0.9;
      g = g * 0.78 + 0.055 * 0.9;
      b = b * 0.78 + 0.078 * 0.9;
      p[i]     = Math.max(0, Math.min(255, r * 255));
      p[i + 1] = Math.max(0, Math.min(255, g * 255));
      p[i + 2] = Math.max(0, Math.min(255, b * 255));
    }
    ctx.putImageData(d, 0, 0);
  }

  function marcador(ctx, px, py) {
    [[38, 0.15], [27, 0.27], [17, 0.46]].forEach(function (a) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(66,148,245,' + a[1] + ')';
      ctx.arc(px, py, a[0], 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.beginPath(); ctx.fillStyle = '#ffffff'; ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.fillStyle = '#3e8bdf'; ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.fill();
  }

  return {
    ancho: ANCHO,
    alto: ALTO,
    /* Devuelve un JPEG en data URL, listo para guardar y para poner en un
       <img>. avisar(hechas, total) sirve para la barra de progreso. */
    generar: function (lat, lon, avisar) {
      var f = gradosATesela(lat, lon, ZOOM);
      var tx = Math.floor(f.x), ty = Math.floor(f.y);
      var x0 = tx - (COLS >> 1), y0 = ty - (FILAS >> 1);

      var lienzo = document.createElement('canvas');
      lienzo.width = COLS * 256; lienzo.height = FILAS * 256;
      var ctx = lienzo.getContext('2d');

      var tareas = [], hechas = 0, total = COLS * FILAS;
      for (var i = 0; i < COLS; i++) {
        for (var j = 0; j < FILAS; j++) {
          (function (i, j) {
            tareas.push(
              tesela(ZOOM, x0 + i, y0 + j).then(function (im) {
                ctx.drawImage(im, i * 256, j * 256);
                hechas++; if (avisar) avisar(hechas, total);
              })
            );
          })(i, j);
        }
      }

      return Promise.all(tareas).then(function () {
        var px = (f.x - x0) * 256, py = (f.y - y0) * 256;
        var izq = Math.max(0, Math.min(lienzo.width - ANCHO, Math.round(px - ANCHO / 2)));
        var arr = Math.max(0, Math.min(lienzo.height - ALTO, Math.round(py - ALTO / 2)));

        var fin = document.createElement('canvas');
        fin.width = ANCHO; fin.height = ALTO;
        var c2 = fin.getContext('2d');
        c2.drawImage(lienzo, izq, arr, ANCHO, ALTO, 0, 0, ANCHO, ALTO);
        oscurecer(c2, ANCHO, ALTO);
        marcador(c2, px - izq, py - arr);
        return fin.toDataURL('image/jpeg', 0.84);
      });
    }
  };
})();
