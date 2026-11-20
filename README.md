# Gruppo Cristiano General

La web madre del **Gruppo Cristiano Latino Americano**: quiénes son, la
visión, los puntos de fe, y una ficha por cada iglesia del grupo. Cada ficha
lleva a la web de su iglesia cuando esa web exista.

Italiano por defecto, español en el botón IT/ES.

---

## Qué es este trabajo

**Colaboración sin ánimo de lucro.** No se factura y no hay mantenimiento que
cobrar. Cuando esté terminada se les entrega todo: la web vive en el hosting
de ellos, independiente, sin atar nada a Digitatex.

Eso se cumple hoy y está comprobado: ni una ruta absoluta, sin servidor y sin
base de datos. Se copia la carpeta a cualquier alojamiento y funciona.

---

## Cómo está hecho

Archivos estáticos. No hay build, no hay dependencias, no hay nada que
compilar. Desplegar es copiar la carpeta.

```
index.html      la web
app.js          el motor: fichas, idioma, menú, WhatsApp
sedi.js         LAS FICHAS — es lo que más se toca
fede.js         los diez puntos de fe, en italiano y español
almacen.js      dónde se guardan las fichas del panel
mapa.js         genera el mapa de una sede en el navegador
panel/          el panel del encargado
media/          logo y mapas
herramientas/   scripts de Python (no se despliegan)
```

### Añadir una iglesia

**Lo fácil:** desde el panel. Se pega el enlace de Apple Maps o Google Maps de
esa iglesia y salen solas las coordenadas, la calle y el código postal.
Después «Genera la mappa» y la imagen se construye en el propio móvil.

**A mano:** generar el mapa y añadir una entrada en `sedi.js`.

```sh
python3 -I herramientas/mapa-sede.py parma 44.807452 10.293616
```

Las cuentas del script de Python y las de `mapa.js` son **las mismas a
propósito**: 36 teselas, el mismo oscurecido, el mismo marcador. Si dejaran de
coincidir, una ficha hecha desde el panel se vería distinta de una hecha a
mano, y en una rejilla de fichas eso canta.

---

## El panel

`/panel/` — usuario `gruppocristiano`, contraseña `Isaia2026!`

**Dos cosas que hay que decir antes de enseñarlo, y están escritas dentro del
propio panel:**

1. **La contraseña no protege nada todavía.** Está escrita en la página y
   quien sepa abrir el código la ve. Sirve para enseñar cómo funciona, no para
   cerrarlo. La cerradura de verdad necesita que la comprobación pase en un
   servidor.
2. **Las fichas creadas ahí se quedan en ese móvil.** No las ve otro teléfono
   ni quien abre el sitio.

**Las dos se arreglan con lo mismo: una base de datos.** Todo pasa por
`almacen.js` justamente para eso — se reescribe ese archivo y nada más.

El botón **«Porta dentro le schede del sito»** trae las iglesias ya publicadas
para poder editarlas. Sin él, la primera ficha creada desde el panel haría
desaparecer las demás, porque el panel manda sobre lo escrito en `sedi.js`.

---

## Antes de que salga en Google

La web lleva `noindex` **y** un `Disallow: /` en el `robots.txt`. Es a
propósito: vive en un dominio que no es suyo y está sin terminar.

El día que se mude a `gruppocristiano.it` hay que quitar **las dos cosas**:

- la etiqueta `<meta name="robots">` de `index.html` y de `panel/index.html`
- el `Disallow` del `robots.txt`

Si se quita solo una, o Google no la lee, o la lee y la indexa bajo un dominio
que no es el suyo.

Y después: dar de alta el dominio en Google Search Console, y que las fichas
de Google Business de cada iglesia apunten a su web. Eso último vale más que
todo lo demás junto para «chiesa evangelica + ciudad».

---

## Despliegue

Easypanel, construyendo desde el `Dockerfile`. **Puerto 80, environment
vacío.** Se despliega empujando a `main` y pulsando redesplegar.

---

## De dónde salen los datos

Nada aquí está inventado. Lo que no se sabe lleva un aviso amarillo.

| Dato | Fuente |
|---|---|
| Nombre completo | su propio documento de visión, punto 3 |
| Logo y colores (`#0c97f8`, `#034c82`) | el logo maestro, muestreado del PNG |
| Dirección de Fidenza | verificada en OpenStreetMap |
| Dirección de Parma | su ficha de Apple Maps, verificada en OpenStreetMap |
| Horarios de Parma | Consiglio delle Chiese Cristiane di Parma — **sin confirmar por la iglesia** |
| Día de Fidenza | sus propios vídeos de YouTube; la hora no aparece |
| Visión y puntos de fe | su PDF, transcrito literal |
| Mapas | teselas de OpenStreetMap, con su atribución en cada ficha |

**El logo sobre fondo oscuro tenía un problema medido:** el píxel más oscuro
de «CRISTIANO» daba 1,04:1 de contraste y la norma pide 3:1. La web usa una
versión aclarada —mismo tono, luminosidad subida, 4,25:1— y el logo oficial
sin tocar está en `media/logo-ufficiale.png` para cuando haga falta sobre
blanco.
