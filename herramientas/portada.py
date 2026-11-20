"""
La foto de la portada, limpia y en los tamanos que hacen falta.

    python3 -I herramientas/portada.py <foto-original> 

La foto que mandaron es una captura de un carrusel de Instagram y lleva
encima la pastilla "6/10" (la diapositiva 6 de 10). Se tapa copiando la pared
lisa que tiene justo a la izquierda, con el borde difuminado. No se recorta la
foto: recortando por arriba se perdia la punta de la cruz, que asoma justo
debajo de la pastilla.

Salen dos tamanos, cada uno en JPEG y en WebP: el grande para ordenador y uno
de 800 para el movil, que pesa la mitad y en una pantalla de telefono no se
distingue.
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

SALIDA = 'media'

def limpiar(im):
    # La pastilla, medida sobre la captura: x 1048-1163, y 12-88, esquinas
    # redondas. Se tapa un poco mas (3 px) para no dejar el halo del borde.
    x0, y0, x1, y1 = 1045, 9, 1166, 91
    ancho = x1 - x0
    # el parche: la misma franja de pared, desplazada a la izquierda
    parche = im.crop((x0 - ancho - 2, y0, x0 - 2, y1))
    # La pared se aclara un poco hacia la derecha, y el trozo copiado de la
    # izquierda quedaba un pelo mas oscuro: a 3x aumentos se veia el contorno
    # de la pastilla. Se iguala su tono con el anillo de pared que la rodea,
    # y se suaviza (la pared esta desenfocada; el parche no debe estar mas
    # nitido que ella).
    import numpy as np
    a = np.asarray(im).astype(float)
    anillo = np.zeros(a.shape[:2], bool)
    anillo[y0 - 6:y1 + 6, x0 - 6:x1 + 6] = True
    anillo[y0:y1, x0:x1] = False
    anillo[:, 1166:] = False           # fuera la luz del techo de la derecha
    pa = np.asarray(parche).astype(float)
    pa = pa + (a[anillo].mean(axis=0) - pa.reshape(-1, 3).mean(axis=0))
    parche = Image.fromarray(np.clip(pa, 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))
    capa = im.copy()
    capa.paste(parche, (x0, y0))
    mascara = Image.new('L', im.size, 0)
    ImageDraw.Draw(mascara).rounded_rectangle((x0, y0, x1, y1), radius=40, fill=255)
    mascara = mascara.filter(ImageFilter.GaussianBlur(2.5))
    return Image.composite(capa, im, mascara)

def main(origen):
    im = Image.open(origen).convert('RGB')
    if im.size != (1206, 747):
        sys.exit('Esta limpieza esta medida para la captura de 1206x747. '
                 'Con la foto original (sin la pastilla de Instagram) no hace falta: '
                 'basta con hacer los tamanos.')
    im = limpiar(im)
    for ancho, nombre in [(im.width, 'portada'), (800, 'portada-800')]:
        t = im if ancho == im.width else im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
        t.save(f'{SALIDA}/{nombre}.jpg', quality=84, optimize=True, progressive=True)
        t.save(f'{SALIDA}/{nombre}.webp', quality=80, method=6)
        print(f'{SALIDA}/{nombre}.jpg / .webp  {t.size}')

if __name__ == '__main__':
    main(sys.argv[1])
