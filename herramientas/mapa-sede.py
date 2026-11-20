#!/usr/bin/env python3
"""Genera el mapa oscuro de una sede, igual que el de Fidenza.

    python3 -I herramientas/mapa-sede.py parma 44.801485 10.327904

Deja el JPG en prototipi/gcf/media/mappa-<nombre>.jpg, listo para ponerlo en
el array SEDI de la pagina.

Por que una imagen y no un mapa incrustado:
  - Un iframe que no carga —red de oficina, bloqueador, conexion mala— deja
    el icono de pagina rota en medio del diseno. Una imagen o se ve o se ve.
  - Ni una peticion a terceros desde la pagina del visitante.
  - El color: las teselas de OpenStreetMap son claras y la pagina es oscura.
    Aqui se oscurecen UNA vez, al montarlas. Un filtro CSS habria invertido
    tambien el marcador.

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


def oscurecer(img):
    """Invierte, dessatura y tira hacia el azul de la pagina (#0b0d12)."""
    a = np.asarray(img).astype(float) / 255.0
    inv = 1.0 - a
    gris = inv.mean(axis=2, keepdims=True)
    a = inv * 0.45 + gris * 0.55
    a = a * 0.78 + np.array([0.043, 0.055, 0.078]) * 0.9
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype('uint8'))


def marcador(img, px, py):
    d = ImageDraw.Draw(img, 'RGBA')
    for r, alfa in ((38, 38), (27, 68), (17, 118)):
        d.ellipse((px - r, py - r, px + r, py + r), fill=(66, 148, 245, alfa))
    d.ellipse((px - 8, py - 8, px + 8, py + 8), fill=(255, 255, 255, 255))
    d.ellipse((px - 5.5, py - 5.5, px + 5.5, py + 5.5), fill=(62, 139, 223, 255))


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
    recorte = oscurecer(lienzo.crop((izq, arr, izq + ANCHO, arr + ALTO)))
    marcador(recorte, px - izq, py - arr)

    DESTINO.mkdir(parents=True, exist_ok=True)
    salida = DESTINO / f'mappa-{nombre}.jpg'
    recorte.save(salida, quality=84, optimize=True, progressive=True)
    print(f'{salida}  ({recorte.size[0]}x{recorte.size[1]})')
    print(f'marcador en {round((px-izq)/ANCHO*100)}% , {round((py-arr)/ALTO*100)}%')


if __name__ == '__main__':
    main()
