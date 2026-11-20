#!/usr/bin/env python3
"""Genera el mapa de una sede, en el estilo claro de la web.

    python3 -I herramientas/mapa-sede.py parma 44.801485 10.327904

Deja el JPG en media/mappa-<nombre>.jpg.

Por que una imagen y no un mapa incrustado:
  - Un iframe que no carga —red de oficina, bloqueador, conexion mala— deja
    el icono de pagina rota en medio del diseno. Una imagen o se ve o se ve.
  - Ni una peticion a terceros desde la pagina del visitante.
  - El color: las teselas de OpenStreetMap vienen muy saturadas —verdes,
    amarillos, rosas— y en una pagina blanca, azul marino y dorada gritan. Aqui
    se suavizan UNA vez, al montarlas: un poco de gris y un poco del blanco
    calido de la pagina. Un filtro CSS habria tenido el marcador tambien.

    (Hasta el rediseno en claro se oscurecian, para la pagina negra.)

Las teselas son de OpenStreetMap y hay que citarlas: la pagina lleva
"Mappa (c) contributori di OpenStreetMap" debajo de cada mapa. Son unas pocas
teselas por sede, que es un uso normal; no se descarga nada en masa.
"""

import io
import math
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw
import numpy as np

ZOOM = 17
# 6x6 y no 6x4: con cuatro filas el lienzo mide 1024 de alto, el recorte 700, y
# el centro solo se puede mover 162 px. Si el punto cae cerca del borde de su
# tesela, el recorte topa y el marcador se queda descentrado — medido: 57% y
# 59% en Parma y Reggio. Y el anillo que late va clavado al 50%/50% en el CSS,
# asi que se separaria del punto. Con seis filas sobra sitio y el marcador cae
# siempre en el centro exacto.
COLS, FILAS = 6, 6
ANCHO, ALTO = 1120, 700
RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / 'media'
# OpenStreetMap pide que un cliente automatico se identifique y deje un
# contacto. Va la direccion del estudio y NO el correo de nadie: este archivo
# acaba en el repositorio de cada cliente, y con el acabaria el correo de
# quien lo escribio. Que un sitio pida contacto no es motivo para repartir la
# direccion personal de nadie; una URL cumple igual.
AGENTE = 'Digitatex-prototype/1.0 (+https://digitatex.com)'


def grados_a_tesela(lat, lon, z):
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n
    y = (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n
    return x, y


def descargar(z, x, y):
    url = f'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    r = subprocess.run(['curl', '-sS', '--max-time', '30', '-A', AGENTE, url],
                       capture_output=True)
    if r.returncode != 0 or not r.stdout:
        raise SystemExit(f'fallo al bajar {url}: {r.stderr[:160]!r}')
    return Image.open(io.BytesIO(r.stdout)).convert('RGB')


# Las MISMAS cifras que mapa.js, que hace lo mismo en el movil desde el panel.
# Si se cambian aqui, se cambian alli: una iglesia creada desde el panel tiene
# que verse igual que las de aqui al lado.
GRIS = 0.38                                    # cuanto se desatura
FONDO = np.array([0.984, 0.980, 0.969])        # #fbfaf7, el fondo de la pagina
VELO = 0.12                                    # cuanto se tira hacia el


def aclarar(img):
    """Desatura un poco y lleva hacia el blanco calido de la pagina."""
    a = np.asarray(img).astype(float) / 255.0
    gris = a.mean(axis=2, keepdims=True)
    a = a * (1 - GRIS) + gris * GRIS
    a = a * (1 - VELO) + FONDO * VELO
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype('uint8'))


def marcador(img, px, py):
    d = ImageDraw.Draw(img, 'RGBA')
    # el azul oscuro del logo (#034c82), que sobre el mapa claro se ve de lejos
    for r, alfa in ((38, 34), (27, 60), (17, 105)):
        d.ellipse((px - r, py - r, px + r, py + r), fill=(3, 76, 130, alfa))
    d.ellipse((px - 9, py - 9, px + 9, py + 9), fill=(255, 255, 255, 255))
    d.ellipse((px - 6, py - 6, px + 6, py + 6), fill=(3, 76, 130, 255))


def main():
    if len(sys.argv) != 4:
        raise SystemExit('uso: mapa-sede.py <nombre> <lat> <lon>')
    nombre, lat, lon = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])

    fx, fy = grados_a_tesela(lat, lon, ZOOM)
    tx, ty = int(fx), int(fy)
    x0, y0 = tx - COLS // 2, ty - FILAS // 2

    lienzo = Image.new('RGB', (COLS * 256, FILAS * 256))
    for i in range(COLS):
        for j in range(FILAS):
            lienzo.paste(descargar(ZOOM, x0 + i, y0 + j), (i * 256, j * 256))

    px, py = (fx - x0) * 256, (fy - y0) * 256
    izq = max(0, min(lienzo.size[0] - ANCHO, int(px - ANCHO / 2)))
    arr = max(0, min(lienzo.size[1] - ALTO, int(py - ALTO / 2)))
    recorte = aclarar(lienzo.crop((izq, arr, izq + ANCHO, arr + ALTO)))
    marcador(recorte, px - izq, py - arr)

    DESTINO.mkdir(parents=True, exist_ok=True)
    salida = DESTINO / f'mappa-{nombre}.jpg'
    recorte.save(salida, quality=84, optimize=True, progressive=True)
    print(f'{salida}  ({recorte.size[0]}x{recorte.size[1]})')
    print(f'marcador en {round((px-izq)/ANCHO*100)}% , {round((py-arr)/ALTO*100)}%')


if __name__ == '__main__':
    main()
