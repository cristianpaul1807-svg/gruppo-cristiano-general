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
index.html           la web
app.js               el motor: fichas, idioma, menú, WhatsApp
sedi.js              LAS FICHAS de partida — es lo que más se toca
fede.js              los diez puntos de fe, en italiano y español
almacen.js           dónde se guardan las fichas del panel  ← aquí van las
                     dos líneas de Supabase
mapa.js              genera el mapa de una sede en el navegador
panel/               el panel del encargado
supabase-setup.sql   la base de datos, para pegar de una vez
media/               logo y mapas
herramientas/        scripts de Python (no se despliegan)
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

`/panel/`. Tiene **dos modos y elige solo**, según si `almacen.js` lleva URL y
clave de Supabase. No hay que tocar nada más para pasar de uno a otro: ni el
panel ni la web saben cuál está en uso.

| | Sin base de datos | Con base de datos |
|---|---|---|
| Entrada | usuario `gruppocristiano` / `Isaia2026!`, escritos en la página | correo y contraseña, comprobados por el servidor |
| Quién ve lo que se crea | **solo ese móvil** | todo el mundo, al momento |
| Al mudar de dominio | se pierde | se mantiene |
| Para qué sirve | enseñar cómo funciona | usarlo de verdad |

El propio panel lo dice en pantalla: en modo demo sale un aviso ámbar con las
dos advertencias, y conectado sale uno verde. El aviso que no toca **se borra
del documento** al arrancar, no se esconde con CSS.

El botón **«Porta dentro le schede del sito»** trae las iglesias ya publicadas
para poder editarlas. Sin él, la primera ficha creada desde el panel haría
desaparecer las demás, porque el panel manda sobre lo escrito en `sedi.js`.

### Encenderlo de verdad

1. Proyecto nuevo en Supabase (plan gratuito, dos proyectos por cuenta).
2. SQL Editor → pegar `supabase-setup.sql` entero → Run. Se puede volver a
   ejecutar sin romper nada.
3. Authentication → Providers → Email: **desactivar «Enable email signups»**.
   Si no, cualquiera que encuentre `/panel/` se hace una cuenta y edita la web
   de la iglesia.
4. Authentication → Users → Add user: la cuenta del encargado, con **Auto
   Confirm User** marcado.
5. Settings → API: copiar Project URL y clave anon en las dos líneas de
   `almacen.js`. Nada más.
6. **Comprobarlo:** crear una ficha y abrirla desde otro teléfono. Si desde el
   otro teléfono no se ve, algo de lo anterior no se hizo.

La clave anon es pública por diseño: va dentro de la página. Lo que protege
son las reglas de la tabla, que están en el SQL.

---

## Antes de enseñárselo a ellos

Mientras no tengan su dominio, la web vive en uno nuestro y **ellos entran al
panel** para cambiar información y añadir fichas. Eso convierte en obligatorio
lo que antes era «el paso siguiente»:

- **La base de datos es imprescindible**, no una mejora. Sin ella, el
  encargado añade una ficha desde su móvil y nadie más la ve: el panel no
  serviría para nada.
- **La contraseña escrita en la página ya no es una demo.** En una dirección
  pública, quien encuentre `/panel/` y mire el código entra.
- **Lo guardado en el navegador no sobrevive la mudanza.** Es por origen: al
  pasar de nuestro dominio a `gruppocristiano.it` se queda atrás. Lo que está
  en la base de datos, no.
- **El `noindex` y el `Disallow` se quedan.** «Que lo vean ellos» no es «que
  lo indexe Google», y sigue siendo lo acordado hasta que tengan su dominio.

Mejor en un **subdominio propio** (`gruppocristiano.digitatex.com`) y en su
propia app de Easypanel, no dentro de la web de Digitatex. Así la mudanza
después es solo un cambio de DNS: está comprobado que no hay ni una ruta
absoluta en todo el proyecto.

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
