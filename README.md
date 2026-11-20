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
index.html           la portada del grupo
parma/ fidenza/ …    una carpeta por iglesia — GENERADAS, no se editan
estilo.css           el estilo, compartido por todas las páginas
app.js               el motor: fichas, idioma, menú, WhatsApp
sede.js              lo que cambia dentro de la página de una iglesia
sedi.js              LAS FICHAS de partida — es lo que más se toca
fede.js              los diez puntos de fe, en italiano y español
almacen.js           dónde se guardan las fichas  ← aquí van las dos líneas
                     de Supabase
mapa.js              genera el mapa de una sede en el navegador
panel/               el panel del encargado
supabase-setup.sql   la base de datos, para pegar de una vez
media/               logo y mapas
herramientas/        generadores (no se despliegan)
```

## Un repositorio, un sitio por iglesia

Cada comunidad tiene su propia dirección —`gruppocristiano.it/parma`— y a la
vista de quien entra es su sitio: su título, su descripción, su mapa, su
vista previa al pegar el enlace en WhatsApp. Por dentro es un solo proyecto:
un CSS, un menú, un idioma, un panel. **Eso es lo que hace que arreglar algo
una vez lo arregle en las cuatro.**

Las páginas de cada iglesia **se generan**, no se escriben:

```sh
node herramientas/paginas-sede.js
```

Lee `sedi.js` y escribe `parma/index.html` y las demás desde
`herramientas/plantilla-sede.html`. **Editar una a mano no sirve de nada:** la
siguiente generación se la lleva por delante. Se corrige la plantilla y se
vuelve a generar.

### Por qué generadas y no pintadas con JavaScript

Por las vistas previas. Cuando alguien pega el enlace de su iglesia en
WhatsApp —que es por donde va a circular esto— WhatsApp lee el HTML tal cual
llega y **no ejecuta JavaScript**. Si el título y la imagen los pusiera
JavaScript, las cuatro iglesias compartirían la misma vista previa y nadie
sabría cuál le han mandado.

Así que va escrito en el HTML lo que tiene que estar aunque no haya
JavaScript: título, descripción, imagen de vista previa, datos estructurados,
el nombre de la ciudad y la dirección. Lo que cambia —horarios, idiomas, mapa,
botones— lo pinta `sede.js` desde los datos vivos, **para que lo que cambie el
encargado en el panel se vea también ahí**. Si estuviera todo escrito, el panel
cambiaría la tarjeta de la portada y no la página de la iglesia: alguien se
presentaría a una hora que ya no es.

### Añadir una iglesia

**Lo fácil:** desde el panel. Se pega el enlace de Apple Maps o Google Maps de
esa iglesia y salen solas las coordenadas, la calle y el código postal.
Después «Genera la mappa» y la imagen se construye en el propio móvil. Sale al
momento en la portada; **su página propia aparece en el siguiente despliegue**,
cuando se regenere.

**A mano:**

```sh
python3 -I herramientas/mapa-sede.py parma 44.807452 10.293616   # el mapa
# una entrada en sedi.js
node herramientas/paginas-sede.js                                 # su página
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

**Ahora mismo está en modo conectado:** `almacen.js` lleva la URL y la clave
del proyecto de Supabase.

### Quién puede tocar qué

Los dos papeles que ellos mismos dibujaron en su mapa conceptual:

| | Administrador general | Responsable de comunidad |
|---|---|---|
| Crear una iglesia | sí | no |
| Borrar una iglesia | sí | no |
| Cambiar cualquiera | sí | solo la suya |
| Ver todas | sí | sí |

Crear o borrar una iglesia es decidir qué comunidad entra en el grupo, y eso
no es una decisión de contenido — por eso el responsable de sede no puede.

Los permisos viven en la tabla `profilo` y **los crea un trigger** al crear la
cuenta, a partir de la invitación. Desde la web el general solo puede
encender o apagar un acceso: el papel y la sede de una cuenta no se pueden
cambiar desde el panel, para que nadie pueda ascenderse a sí mismo ni pasarse
de iglesia.

**Esconder botones no es la seguridad.** El panel no le enseña a un
responsable los botones de crear o borrar, pero lo que de verdad se lo impide
son las reglas de la base de datos: si alguien se fabricase el botón a mano,
la base de datos le diría que no igual. Está probado.

El propio panel lo dice en pantalla: en modo demo sale un aviso ámbar con las
dos advertencias, y conectado sale uno verde. El aviso que no toca **se borra
del documento** al arrancar, no se esconde con CSS.

El botón **«Porta dentro le schede del sito»** trae las iglesias ya publicadas
para poder editarlas. Sin él, la primera ficha creada desde el panel haría
desaparecer las demás, porque el panel manda sobre lo escrito en `sedi.js`.

### Encenderlo de verdad

El proyecto de Supabase ya existe y `almacen.js` ya lleva su URL y su clave.
Falta:

1. **SQL Editor** → pegar `supabase-setup.sql` entero → **Run**. Se puede
   volver a ejecutar sin romper nada.
2. **Authentication → Sign In / Providers → Email:**
   - «Enable email signups» → **activado**. El panel crea las cuentas por esa
     vía. Lo que impide que cualquiera se registre no es este interruptor,
     es el trigger (abajo).
   - «Confirm email» → **desactivado**. Si no, cada cuenta nueva espera un
     correo de confirmación que el correo de fábrica de Supabase manda a
     razón de 2 por hora.
3. **El primer administrador general**, el único que se crea a mano:
   ```sql
   insert into public.invito (email, ruolo)
   values ('correo-del-administrador@ejemplo.com', 'generale');
   ```
   y después, en menos de 24 horas, Authentication → Users → **Add user**
   con ese correo y una contraseña, marcando **Auto Confirm User**.
4. A partir de ahí, **todo desde el panel**.
5. **Comprobarlo:** entrar con un responsable de sede y ver que solo aparece
   SU iglesia. Y crear una ficha y abrirla desde otro teléfono.

La clave anon es pública por diseño: va dentro de la página. Lo que protege
son las reglas de la tabla, que están en el SQL.

### Cómo se dan los accesos

El administrador general entra en `/panel/`, baja a **Accessi**, elige la
iglesia, escribe el correo y la contraseña —el botón «Genera» hace una que se
puede dictar sin equivocarse— y pulsa **Crea accesso**. Sale un recuadro con
lo que hay que apuntar. **La contraseña se enseña esa única vez.**

Por dentro son dos pasos, y es lo que hace que funcione sin tener en la página
la llave de administrador de Supabase (que permitiría a cualquiera que mirase
el código crear cuentas):

1. el panel apunta una **invitación** para ese correo, con su papel y su sede;
2. registra la cuenta por la vía normal, y un **trigger** en la base de datos
   comprueba la invitación: si está, crea la cuenta con su permiso; **si no
   está, la rechaza entera**.

Así el registro está abierto, pero solo funciona para quien haya invitado el
general. Las invitaciones caducan en 24 horas, y si un registro falla el panel
borra la suya para que no quede una puerta abierta.

**Quitar un acceso** no borra la cuenta: la apaga. Si esa persona vuelve, se
le enciende con un botón y sigue con su misma contraseña. Nadie puede
apagarse a sí mismo — si fuese el único general, no podría volver a entrar
nadie.

**Cada uno puede cambiar su contraseña** con el botón «La mia password».

**Si alguien la olvida**, mientras no haya correo con código: está el `update`
al final de `supabase-setup.sql`, para ejecutar desde el editor SQL.

### Cuando el correo esté listo

Hoy se entra con correo y contraseña. Cuando el DNS de
`accessi.gruppocristiano.it` esté verificado en Resend (ver
`herramientas/correo.md`), se cambia a **código de 6 dígitos al correo**: el
general solo escribe el correo, y a esa persona le llega un código cada vez
que quiera entrar. Las invitaciones y los permisos no cambian: cambia la
puerta, no lo que hay detrás.

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

## Despliegue en Easypanel

Es un repositorio aparte de Digitatex, así que **app aparte** — no una ruta
dentro de la web de Digitatex. Eso es lo que hace que la mudanza a su dominio
sea después solo un cambio de DNS.

**Project:** `gruppocristiano` (nuevo, no el de Digitatex)
**Service → App**, nombre `web`

| Pestaña | Campo | Valor |
|---|---|---|
| Source | Type | **GitHub** |
| | Owner / Repo | `cristianpaul1807-svg` / `gruppo-cristiano-general` |
| | Branch | `main` |
| | Build path | `/` |
| Build | Type | **Dockerfile** |
| | File | `Dockerfile` |
| Environment | — | **vacío** |
| Domains | Port | **80** |
| | Host | `gruppocristiano.digitatex.com` |
| | HTTPS | sí (Let's Encrypt) |

El repositorio es privado: Easypanel necesita su token de GitHub con acceso a
él. Si el deploy dice «Cannot find public repository and your Github token is
invalid», es eso y no el nombre del repo.

Antes del primer deploy, en el DNS de `digitatex.com`: un registro **A** de
`gruppocristiano` apuntando a la IP del servidor.

Después, cada cambio es empujar a `main` y pulsar **Deploy**. El HTML, el panel
y los `.js` no se cachean a propósito, así que un cambio se ve al recargar; las
imágenes de `media/` sí, una semana.

---

## De dónde salen los datos

Nada aquí está inventado. Lo que no se sabe lleva un aviso amarillo.

| Dato | Fuente |
|---|---|
| Qué comunidades son | su mapa conceptual: Parma, Fidenza, Reggio Emilia, Massa-Carrara |
| Nombre completo | su propio documento de visión, punto 3 |
| Logo y colores (`#0c97f8`, `#034c82`) | el logo maestro, muestreado del PNG |
| Dirección de Fidenza | verificada en OpenStreetMap |
| Dirección de Parma | su ficha de Apple Maps, verificada en OpenStreetMap |
| Horarios de Parma | Consiglio delle Chiese Cristiane di Parma — **sin confirmar por la iglesia** |
| Día de Fidenza | sus propios vídeos de YouTube; la hora no aparece |
| Visión y puntos de fe | su PDF, transcrito literal |
| Dirección de Reggio Emilia | Apple Maps — **sin confirmar**, por eso en borrador |
| Massa-Carrara | solo el nombre. Sin dirección, en borrador |
| Bologna | **no aparece en su mapa conceptual.** Fuera hasta que se aclare |
| Mapas | teselas de OpenStreetMap, con su atribución en cada ficha |

**El logo sobre fondo oscuro tenía un problema medido:** el píxel más oscuro
de «CRISTIANO» daba 1,04:1 de contraste y la norma pide 3:1. La web usa una
versión aclarada —mismo tono, luminosidad subida, 4,25:1— y el logo oficial
sin tocar está en `media/logo-ufficiale.png` para cuando haga falta sobre
blanco.
