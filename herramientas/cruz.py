#!/usr/bin/env python3
"""La cruz sobre fondo infinito de la portada del Gruppo Cristiano.

    python3 -I herramientas/cruz.py

Deja prototipi/gcf/media/croce.jpg y croce-480.jpg.

Por que generada y no una foto de banco:
  - Una foto de banco es de otro. Una iglesia que pone en su portada la cruz
    de un archivo de imagenes esta enseñando la cruz de otra iglesia.
  - Los colores. El azul de esta pagina sale del logo del grupo, muestreado
    del PNG. Ninguna foto de archivo va a traer ese azul, y una portada donde
    la imagen y el logo no se hablan se nota aunque no se sepa por que.
  - Y asi se puede rehacer: cambiar el angulo, el tamano o el color es
    cambiar un numero aqui, no buscar otra foto durante media hora.

El "fondo infinito" es el del estudio: suelo y pared sin linea de union, un
degradado continuo con el objeto flotando en el. Aqui no hay geometria 3D de
verdad — hay un frontal, un costado y una sombra, que es todo lo que hace
falta para que el ojo lea volumen.
"""

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / 'media'

# Se dibuja al triple y se baja: es la unica forma de que los bordes salgan
# limpios sin meter antialias a mano en cada forma.
ESCALA = 2
ANCHO, ALTO = 1600, 1000
W, H = ANCHO * ESCALA, ALTO * ESCALA

INK = (11, 13, 18)          # --ink, el fondo de la pagina
BLU = (62, 139, 223)        # --blu, el pez del logo
BLU_OSCURO = (30, 74, 126)  # --blu-dark, el arco de abajo
BONE = (238, 242, 247)      # --bone


def fondo():
    """Suelo y pared sin linea entre medias, y el resplandor detras."""
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    x = np.linspace(0, 1, W, dtype=np.float32)[None, :]

    # El degradado se estira a lo ancho AQUI y no mas abajo. Si se deja como
    # columna, `base` sale con forma (alto, 1, 3) y todo lo que venga despues
    # —el resplandor, el vineteado— no puede sumarse encima.
    t = np.broadcast_to(y ** 1.25, (H, W))

    # El suelo del ciclorama llega bastante mas claro que la pared. Con la
    # primera version —de 0,72 a 1,45 del tinta— el degradado no se veia: el
    # tinta es casi negro y multiplicarlo por poco mas de uno sigue siendo
    # casi negro. Aqui el suelo sube hacia el azul oscuro del logo, que es lo
    # que hace que se lea como un fondo y no como un rectangulo negro.
    arriba = (np.array(INK, dtype=np.float32) / 255.0) * 0.55
    abajo = (np.array(INK, dtype=np.float32) / 255.0 * 0.55
             + np.array(BLU_OSCURO, dtype=np.float32) / 255.0 * 0.30)
    base = (arriba[None, None, :] * (1 - t)[:, :, None]
            + abajo[None, None, :] * t[:, :, None])

    # El resplandor va DETRAS de la cruz, un poco por encima del centro: es lo
    # que la separa del fondo sin tener que ponerle un borde.
    cx, cy, r = 0.5, 0.46, 0.46
    d = np.sqrt(((x - cx) * (W / H)) ** 2 + (y - cy) ** 2) / r
    halo = np.clip(1 - d, 0, 1) ** 2.1
    tinte = np.array(BLU_OSCURO, dtype=np.float32) / 255.0
    base += halo[:, :, None] * tinte[None, None, :] * 0.60

    # Vineteado: el ojo va al centro sin que nadie se lo diga.
    dv = np.sqrt(((x - 0.5) * 1.05) ** 2 + ((y - 0.5) * 1.25) ** 2)
    base *= np.clip(1.06 - dv[:, :, None] * 0.72, 0.18, 1.0)

    return np.clip(base, 0, 1)


def formas():
    """Las dos barras: frontal y costado. Devuelve mascaras en 0..1."""
    cx = W * 0.5
    anc_v, alt_v = W * 0.062, H * 0.60      # palo
    anc_h, alt_h = W * 0.215, H * 0.098     # travesano
    arriba_v = H * 0.17
    y_h = arriba_v + alt_v * 0.255

    frontal = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(frontal)
    d.rectangle([cx - anc_v / 2, arriba_v, cx + anc_v / 2, arriba_v + alt_v], fill=255)
    d.rectangle([cx - anc_h / 2, y_h, cx + anc_h / 2, y_h + alt_h], fill=255)

    # El costado: la misma silueta desplazada. Es lo que da el grosor.
    dx, dy = W * 0.021, -H * 0.012
    costado = Image.new('L', (W, H), 0)
    d2 = ImageDraw.Draw(costado)
    d2.rectangle([cx - anc_v / 2 + dx, arriba_v + dy, cx + anc_v / 2 + dx, arriba_v + alt_v + dy], fill=255)
    d2.rectangle([cx - anc_h / 2 + dx, y_h + dy, cx + anc_h / 2 + dx, y_h + alt_h + dy], fill=255)
    # Solo lo que asoma por fuera del frontal.
    costado = Image.fromarray(
        np.clip(np.asarray(costado).astype(int) - np.asarray(frontal).astype(int), 0, 255).astype('uint8'))

    return frontal, costado, (cx, arriba_v + alt_v, anc_h)


def pintar():
    lienzo = fondo()
    frontal, costado, (cx, pie, anc_h) = formas()
    mf = np.asarray(frontal).astype(np.float32) / 255.0
    mc = np.asarray(costado).astype(np.float32) / 255.0

    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    xx = np.linspace(0, 1, W, dtype=np.float32)[None, :]

    # --- sombra en el suelo, antes que la cruz -----------------------------
    # Dos sombras y no una: la de contacto, pequena y oscura justo bajo el
    # pie, y la larga y difusa. Con una sola, o la cruz flota o la mancha se
    # ve como un ovalo pintado.
    sombra = Image.new('L', (W, H), 0)
    ds = ImageDraw.Draw(sombra)
    ds.ellipse([cx - anc_h * 0.95, pie - H * 0.012, cx + anc_h * 0.95, pie + H * 0.085], fill=120)
    sombra = sombra.filter(ImageFilter.GaussianBlur(W * 0.030))
    contacto = Image.new('L', (W, H), 0)
    ImageDraw.Draw(contacto).ellipse(
        [cx - anc_h * 0.20, pie - H * 0.008, cx + anc_h * 0.20, pie + H * 0.016], fill=230)
    contacto = contacto.filter(ImageFilter.GaussianBlur(W * 0.006))
    ms = np.maximum(np.asarray(sombra), np.asarray(contacto)).astype(np.float32) / 255.0
    lienzo *= (1 - ms[:, :, None] * 0.88)

    # --- reflejo: la cruz vuelta del reves, muy apagada --------------------
    # Se pega con coordenadas y no con una transformacion afin. La afin de PIL
    # es el mapeo INVERSO, asi que el signo va al reves de lo que uno escribe:
    # la primera version puso el reflejo ENCIMA de la cruz, como un fantasma.
    # Pegar el recorte justo debajo del pie no tiene ese problema.
    caja = frontal.getbbox()
    recorte = frontal.crop(caja)
    alto_ref = max(1, int((caja[3] - caja[1]) * 0.45))   # aplastado: es suelo, no espejo
    vuelta = recorte.transpose(Image.FLIP_TOP_BOTTOM).resize(
        (caja[2] - caja[0], alto_ref), Image.LANCZOS)
    ref = Image.new('L', (W, H), 0)
    ref.paste(vuelta, (caja[0], int(pie)))
    ref = ref.filter(ImageFilter.GaussianBlur(W * 0.005))
    mr = np.asarray(ref).astype(np.float32) / 255.0
    desv = np.clip((yy - pie / H) / 0.16, 0, 1)
    mr *= np.clip(1 - desv, 0, 1)
    col_ref = np.array(BONE, dtype=np.float32) / 255.0
    lienzo = lienzo * (1 - mr[:, :, None] * 0.16) + col_ref[None, None, :] * mr[:, :, None] * 0.16

    # --- el costado, mas oscuro --------------------------------------------
    col_c = (np.array(BONE, dtype=np.float32) / 255.0 * 0.34
             + np.array(BLU_OSCURO, dtype=np.float32) / 255.0 * 0.30)
    lienzo = lienzo * (1 - mc[:, :, None]) + col_c[None, None, :] * mc[:, :, None]

    # --- el frontal ---------------------------------------------------------
    # La luz entra por arriba a la izquierda: claro arriba, apagado abajo, y
    # un punto mas claro en el borde izquierdo.
    luz = (1.0 - yy * 0.42) * (1.0 - (xx - 0.5) * 0.30)
    borde = np.clip(1 - np.abs(xx - (cx / W - 0.030)) / 0.012, 0, 1) ** 2
    luz = luz + borde * 0.22
    col_f = np.array(BONE, dtype=np.float32) / 255.0
    frente = np.clip(col_f[None, None, :] * luz[:, :, None], 0, 1)
    # Un velo azul muy leve, para que la cruz pertenezca al fondo y no parezca
    # recortada y pegada encima.
    frente = frente * 0.93 + np.array(BLU, dtype=np.float32) / 255.0 * 0.07
    lienzo = lienzo * (1 - mf[:, :, None]) + frente * mf[:, :, None]

    # --- grano ---------------------------------------------------------------
    # Un degradado liso se ve a bandas en una pantalla de movil. El grano las
    # rompe; es el mismo truco de siempre y pesa cero.
    rng = np.random.default_rng(7)
    lienzo += (rng.random((H, W, 1), dtype=np.float32) - 0.5) * 0.012

    img = Image.fromarray((np.clip(lienzo, 0, 1) * 255).astype('uint8'))
    return img.resize((ANCHO, ALTO), Image.LANCZOS)


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    im = pintar()
    g = DESTINO / 'croce.jpg'
    im.save(g, quality=88, optimize=True, progressive=True)
    im.resize((480, 300), Image.LANCZOS).save(DESTINO / 'croce-480.jpg', quality=82, optimize=True)
    print(g, im.size, f'{g.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
