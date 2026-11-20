/* ============================================================================
   GENERADOR DE LAS PAGINAS DE CADA IGLESIA

       node herramientas/paginas-sede.js

   Lee sedi.js y escribe una carpeta por iglesia con su index.html dentro:
   parma/index.html, fidenza/index.html... Asi cada comunidad tiene su propia
   direccion —gruppocristiano.it/parma— y a la vista de quien entra es su
   sitio, aunque por dentro sea un solo proyecto.

   POR QUE SE GENERAN Y NO SE PINTAN CON JAVASCRIPT

   Por las vistas previas. Cuando alguien pega el enlace de su iglesia en
   WhatsApp —que es por donde va a circular esto—, WhatsApp lee el HTML tal
   cual llega y NO ejecuta JavaScript. Si el titulo y la imagen los pusiera
   JavaScript, las cuatro iglesias compartirian la misma vista previa y nadie
   sabria cual le han mandado. Google si ejecuta JavaScript, pero peor y mas
   tarde.

   Asi que lo que va escrito aqui es lo que tiene que estar aunque no haya
   JavaScript: titulo, descripcion, imagen de vista previa, datos
   estructurados, el nombre de la ciudad y la direccion. Todo lo demas
   —horarios, idiomas, mapa, botones— lo pinta sede.js desde los datos vivos,
   para que lo que cambie el encargado en el panel se vea tambien aqui.

   SE PUEDE EJECUTAR LAS VECES QUE HAGA FALTA. Sobrescribe lo que haya.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const DOMINIO = 'https://www.gruppocristiano.it';

/* --- leer sedi.js ------------------------------------------------------------
   sedi.js es JavaScript normal que declara una variable, asi que se ejecuta y
   se mira que ha dejado. Nada de intentar leerlo con expresiones regulares:
   el dia que alguien escriba una coma rara, un parser casero se equivoca en
   silencio y publica una pagina mal. */
function leerSedi() {
  const codigo = fs.readFileSync(path.join(RAIZ, 'sedi.js'), 'utf8');
  const caja = {};
  new Function('window', codigo + '\nwindow.__out = SEDI_BASE;')(caja);
  if (!Array.isArray(caja.__out)) throw new Error('sedi.js no ha dejado una lista');
  return caja.__out;
}

/* --- las coordenadas ---------------------------------------------------------
   No estan en sedi.js —la ficha publica no las necesita, el mapa ya esta
   dibujado— pero los datos estructurados si: es lo que hace que Google ponga
   el punto en el sitio. Viven aqui, junto al generador que las usa. */
const COORD = {
  'fidenza':       [44.859535, 10.087606],
  'parma':         [44.807452, 10.293616],
  'reggio-emilia': [44.706067, 10.607343]
};

/* --- escapar -----------------------------------------------------------------
   Lo que entra aqui viene de sedi.js, que escribimos nosotros, pero una
   plantilla que mete texto en HTML sin escapar es una bomba de relojeria: el
   dia que un nombre lleve un & o unas comillas, la pagina se rompe o se abre
   un agujero. Se escapa siempre. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* --- el pie, sacado de la portada --------------------------------------------
   Para que no haya dos pies distintos. Se copia el de index.html y se le
   suben las rutas un nivel. */
function pie() {
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const a = html.indexOf('<footer>');
  const b = html.indexOf('</footer>');
  if (a < 0 || b < 0) throw new Error('no encuentro el pie en index.html');
  return html.slice(a, b + 9).replace(/(src|href)="media\//g, '$1="../media/');
}

/* --- la ficha de datos estructurados de UNA iglesia -------------------------- */
function jsonld(s) {
  const ficha = {
    '@context': 'https://schema.org',
    '@type': 'Church',
    name: 'Gruppo Cristiano ' + s.citta,
    parentOrganization: {
      '@type': 'Church',
      name: 'Gruppo Cristiano Latino Americano',
      url: DOMINIO + '/'
    },
    url: DOMINIO + '/' + s.id + '/'
  };
  if (s.via && s.cap) {
    /* "43126 Parma (PR)" -> codigo postal, ciudad y provincia */
    const m = /^(\d{5})\s+(.+?)(?:\s*\(([A-Z]{2})\))?$/.exec(s.cap.trim());
    ficha.address = {
      '@type': 'PostalAddress',
      streetAddress: s.via,
      postalCode: m ? m[1] : '',
      addressLocality: m ? m[2] : s.citta,
      addressRegion: m && m[3] ? m[3] : '',
      addressCountry: 'IT'
    };
  }
  const c = COORD[s.id];
  if (c) ficha.geo = { '@type': 'GeoCoordinates', latitude: c[0], longitude: c[1] };
  if (s.orari && s.orari.length) {
    /* Los horarios en texto libre ("Domenica 10:30") NO se traducen a
       openingHours: el formato de schema.org pide dia y hora en un formato
       fijo, y convertirlos a ojo es inventar. Cuando la iglesia confirme los
       horarios de verdad se hace bien. */
  }
  return JSON.stringify(ficha, null, 2);
}

/* --- una pagina --------------------------------------------------------------- */
function pagina(plantilla, s, elPie) {
  const dir = s.via && s.cap;
  const titulo = 'Gruppo Cristiano ' + s.citta + ' — Chiesa evangelica a ' + s.citta;

  /* La descripcion sale de lo que haya, en este orden: la que escribieron
     ellos, la direccion, o una general. Nunca se queda vacia: una pagina sin
     descripcion la rellena Google con lo primero que pilla. */
  let desc;
  if (s.testo) desc = s.testo;
  else if (dir) desc = 'Gruppo Cristiano ' + s.citta + ', chiesa evangelica in ' + s.via
    + ', ' + s.cap + '. Orari degli incontri e come arrivare.';
  else desc = 'Gruppo Cristiano ' + s.citta + ', una delle chiese del Gruppo Cristiano '
    + 'Latino Americano in Italia.';

  /* El mismo titulo y la misma descripcion en espanol. Van dentro de la
     pagina porque el cambio de idioma pasa sin recargar, y sin esto la
     pagina de Parma se quedaria con el titulo del grupo entero. */
  const tituloEs = 'Gruppo Cristiano ' + s.citta + ' — Iglesia evangélica en ' + s.citta;
  let descEs;
  if (s.testo) descEs = s.testo;
  else if (dir) descEs = 'Gruppo Cristiano ' + s.citta + ', iglesia evangélica en ' + s.via
    + ', ' + s.cap + '. Horarios de las reuniones y cómo llegar.';
  else descEs = 'Gruppo Cristiano ' + s.citta + ', una de las iglesias del Gruppo Cristiano '
    + 'Latino Americano en Italia.';
  const meta = JSON.stringify({
    it: { t: titulo, d: desc },
    es: { t: tituloEs, d: descEs }
  }, null, 2);

  const viaHtml = dir
    ? esc(s.via) + '<span>' + esc(s.cap) + '</span>'
    : '<span class="x-conf">da confermare</span>';

  /* La vista previa es el mapa de esa iglesia. Si no hay mapa —porque todavia
     no hay direccion— se usa el logo del grupo, que al menos se reconoce. */
  const img = COORD[s.id] ? DOMINIO + '/media/mappa-' + s.id + '.jpg'
                          : DOMINIO + '/media/logo-ufficiale.png';

  const valores = {
    ID: esc(s.id),
    CITTA: esc(s.citta),
    VIA_HTML: viaHtml,
    TITOLO: esc(titulo),
    OG_TITOLO: esc('Gruppo Cristiano ' + s.citta),
    DESC: esc(desc),
    URL: DOMINIO + '/' + s.id + '/',
    OG_IMG: img,
    JSONLD: jsonld(s),
    META: meta,
    FOOTER: elPie
  };

  /* Se sustituye con una funcion y no con una cadena a proposito: en la forma
     de cadena, replace trata $& y $1 como referencias al trozo encontrado. Un
     texto con un dolar y un ampersand —en una descripcion escrita por ellos,
     por ejemplo— saldria cambiado sin que nadie entienda por que.

     Y se avisa de un hueco que la plantilla pide y aqui no existe: eso es una
     errata, y en silencio acaba en la pagina como {{LO_QUE_SEA}}. */
  return plantilla.replace(/\{\{([A-Z_]+)\}\}/g, function (todo, clave) {
    if (!(clave in valores)) throw new Error('la plantilla pide {{' + clave + '}} y no lo tengo');
    return valores[clave];
  });
}

/* --- adelante ------------------------------------------------------------------ */
const plantilla = fs.readFileSync(path.join(__dirname, 'plantilla-sede.html'), 'utf8');
const elPie = pie();
const sedi = leerSedi();

/* La frase que llevan dentro todas las paginas que hace este generador. Sirve
   para reconocer las suyas: solo se borra lo que el generador sabe que ha
   escrito el. */
const MARCA = 'NO SE EDITA ESTE ARCHIVO POR SEDE';

sedi.forEach(function (s) {
  if (!s.id) { console.log('  (saltada: una sede sin id)'); return; }
  const carpeta = path.join(RAIZ, s.id);
  const archivo = path.join(carpeta, 'index.html');

  /* UN BORRADOR NO TIENE PAGINA. Si la tuviese, se podria abrir escribiendo
     su direccion a mano aunque no salga en la portada — y un borrador suele
     llevar justo lo que no esta confirmado, como la direccion de Reggio
     Emilia. Si la publican desde el panel, la sirve la pagina comodin al
     momento; la propia llega en la siguiente generacion.

     Si una iglesia PASA a borrador y tenia pagina, se quita: pero solo si es
     una pagina hecha por este generador y no hay nada mas en la carpeta. Lo
     que haya puesto alguien a mano no se toca. */
  if (s.publicada === false) {
    if (fs.existsSync(archivo)) {
      const contenido = fs.readFileSync(archivo, 'utf8');
      const solo = fs.readdirSync(carpeta).length === 1;
      if (contenido.includes(MARCA) && solo) {
        fs.rmSync(carpeta, { recursive: true });
        console.log('  ' + s.id + '/   QUITADA — esta en borrador');
      } else {
        console.log('  ¡OJO! ' + s.id + '/ esta en borrador pero su carpeta tiene cosas que no son mias. Revisala a mano.');
      }
    } else {
      console.log('  ' + s.id + '   (borrador: sin pagina)');
    }
    return;
  }

  fs.mkdirSync(carpeta, { recursive: true });
  fs.writeFileSync(archivo, pagina(plantilla, s, elPie), 'utf8');
  console.log('  ' + s.id + '/index.html   ' + s.citta);
});

/* --- la pagina comodin ---------------------------------------------------------
   _sede.html sirve a cualquier iglesia que NO tenga pagina generada: las que
   se crean desde el panel. nginx la entrega cuando alguien abre /su-ciudad/ y
   esa carpeta no existe. Lleva la plantilla tal cual, con lo generico donde
   las demas llevan lo suyo; sede.js la rellena leyendo la ciudad de la
   direccion y los datos de la base de datos.

   Lo unico que no puede tener es la vista previa propia en WhatsApp: WhatsApp
   no ejecuta JavaScript y ve "Gruppo Cristiano" a secas. Para eso hay que
   anadir la iglesia a sedi.js y regenerar. */
const comodin = plantilla.replace(/\{\{([A-Z_]+)\}\}/g, function (todo, clave) {
  const v = {
    ID: '',                     // vacio: lo pone el script del principio del body
    CITTA: '',
    VIA_HTML: '',
    TITOLO: 'Gruppo Cristiano Latino Americano',
    OG_TITOLO: 'Gruppo Cristiano',
    DESC: 'Una delle chiese del Gruppo Cristiano Latino Americano in Italia.',
    URL: DOMINIO + '/',
    OG_IMG: DOMINIO + '/media/logo-ufficiale.png',
    JSONLD: JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Church',
      name: 'Gruppo Cristiano Latino Americano', url: DOMINIO + '/'
    }, null, 2),
    META: 'null',               // lo rellena sede.js cuando sabe que iglesia es
    FOOTER: elPie
  };
  if (!(clave in v)) throw new Error('la plantilla pide {{' + clave + '}} y el comodin no lo tiene');
  return v[clave];
});
fs.writeFileSync(path.join(RAIZ, '_sede.html'), comodin, 'utf8');
console.log('  _sede.html   (comodin para las creadas desde el panel)');

/* Una pagina que sobra es peor que una que falta: queda viva, en Google, con
   una iglesia que ya no esta. Se avisa de las carpetas de sedes que ya no
   estan en sedi.js, pero no se borran solas — borrar sin preguntar es como se
   pierde trabajo. */
const vivas = sedi.map(function (s) { return s.id; });
fs.readdirSync(RAIZ, { withFileTypes: true })
  .filter(function (e) {
    return e.isDirectory() && !e.name.startsWith('.')
      && ['media', 'herramientas', 'panel', 'node_modules'].indexOf(e.name) < 0
      && fs.existsSync(path.join(RAIZ, e.name, 'index.html'))
      && vivas.indexOf(e.name) < 0;
  })
  .forEach(function (e) {
    console.log('  ¡OJO! la carpeta ' + e.name + '/ ya no esta en sedi.js. Borrala a mano.');
  });

console.log('\n' + sedi.filter(function (s) { return s.publicada !== false; }).length
  + ' paginas escritas, mas el comodin.');
