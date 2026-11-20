#!/usr/bin/env python3
"""El mapa de la region, para "Trova la tua comunita".

    python3 -I herramientas/mapa-regione.py

Un mapa SIN chinchetas: las pone la pagina encima, en HTML, a partir de la
latitud y la longitud de cada iglesia. Asi una iglesia creada desde el panel
sale en el mapa sin regenerar nada, y cada chincheta es un enlace de verdad
(se toca, lleva a su pagina) y no un dibujo dentro de una foto.

Para poder ponerlas, la pagina tiene que saber exactamente que trozo del
mundo cubre la imagen. El script lo imprime al final: son los cuatro numeros
de data-lon0, data-lon1, data-lat0 y data-lat1 en index.html. Si se regenera
con otros limites, hay que copiarlos alli.

El encuadre va de la costa de Marina di Carrara a Reggio Emilia, con margen:
si mañana nace una iglesia en Modena o en La Spezia, todavia cabe.
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module
sede = import_module('mapa-sede')          # mismas teselas y mismo color

from PIL import Image

ZOOM = 10
# norte, sur, oeste, este
LAT_N, LAT_S = 45.02, 43.86
LON_O, LON_E = 9.30, 11.12


def main():
    xo, yn = sede.grados_a_tesela(LAT_N, LON_O, ZOOM)
    xe, ys = sede.grados_a_tesela(LAT_S, LON_E, ZOOM)
    tx0, ty0, tx1, ty1 = int(xo), int(yn), int(xe), int(ys)

    lienzo = Image.new('RGB', ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for i in range(tx0, tx1 + 1):
        for j in range(ty0, ty1 + 1):
            lienzo.paste(sede.descargar(ZOOM, i, j), ((i - tx0) * 256, (j - ty0) * 256))

    caja = (round((xo - tx0) * 256), round((yn - ty0) * 256),
            round((xe - tx0) * 256), round((ys - ty0) * 256))
    mapa = sede.aclarar(lienzo.crop(caja))

    destino = sede.DESTINO / 'mappa-regione'
    mapa.save(f'{destino}.jpg', quality=80, optimize=True, progressive=True)
    mapa.save(f'{destino}.webp', quality=78, method=6)
    print(f'{destino}.jpg/.webp  {mapa.size[0]}x{mapa.size[1]}')
    print(f'data-lat0="{LAT_N}" data-lat1="{LAT_S}" data-lon0="{LON_O}" data-lon1="{LON_E}"')


if __name__ == '__main__':
    main()
