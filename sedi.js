/* ============================================================================
   LAS SEDES — las fichas de cada iglesia del grupo.

   Este archivo lo cargan las dos paginas: la publica, para pintar las fichas,
   y el panel, para poder traerlas dentro y editarlas.

   Vive aparte y no dentro de index.html por una razon practica: el panel
   necesita saber que sedes ensena el sitio. Si no lo supiera, la primera
   ficha creada desde el panel haria desaparecer estas — el panel manda sobre
   lo escrito — y eso no se entiende, parece que se han borrado solas.

   LO QUE LLEVA CADA FICHA
     id         nombre del archivo del mapa: media/mappa-<id>.jpg
                Se genera con:
                  python3 -I herramientas/mapa-sede.py <id> <lat> <lon>
                Sin mapa, se deja en null y la ficha ensena una trama con el
                aviso, no un hueco negro.
     citta      el nombre que lee la gente. Es el titulo de la ficha.
     via        calle y numero
     cap        codigo postal, ciudad y provincia
     web        la direccion de la web de ESA iglesia, cuando exista.
                Mientras no exista se deja vacio y la ficha no ensena el boton.
     testo      la descripcion. Tope 240 caracteres; el panel avisa a partir
                de 180, porque de ahi sale tambien lo que lee Google.
     logo       'media/logo-<id>.png' si esa iglesia tiene el suyo y quiere
                que salga. Vacio = sale el mapa, que es lo normal.
     whatsapp   el numero DE ESA IGLESIA, con prefijo. Sale en su pagina como
                dos botones, WhatsApp y llamar, y es tambien el del boton
                flotante dentro de su pagina. Vacio = no salen. Cada comunidad
                tiene el suyo: quien busca Parma tiene que escribir a Parma.
     email      el correo de esa iglesia. Boton "Scrivi un'email".
     pastori    lista de [nombre, papel]. El papel puede ir vacio:
                [['Daniel Lana', ''], ['Samuele Lorenzini', 'pastore giovani']]
     social     { instagram, facebook, youtube } — los que tenga. Los que
                falten no salen.
     lat, lon   donde cae en el mapa. Las usa "Trova la tua comunita" para
                poner su chincheta en el mapa de la region y para calcular
                cual tiene mas cerca quien pulsa "Usa la mia posizione".
     orari      lista de pares [que, cuando]
     lingue     que idiomas se hablan en esa sede. No es un adorno en este
                grupo: se llaman Latino Americano y para una familia recien
                llegada esto decide si viene o no.
     apple      identificador de su ficha en Apple Maps. Con el, el boton
                abre LA FICHA de la iglesia —con su nombre y su categoria— en
                vez de geocodificar una direccion y caer donde caiga.
     publicada  false = preparada pero no sale. Es el boton que evita el
                accidente de publicar una ficha a medio escribir.

   El boton de llegar busca por DIRECCION y no por coordenada, a proposito: el
   pin de Fidenza que circula en Apple Maps esta 50 m desviado, y buscando por
   direccion cada movil geocodifica con su propio mapa y llega a la puerta.
   ============================================================================ */
/* TODO LO DE ABAJO VIENE DE ELLOS: "Informazioni chiese Gruppo Cristiano",
   el documento que mandaron con los datos de cada iglesia. Se ha copiado tal
   cual salvo tres cosas, y las tres estan marcadas donde ocurren:

     - el orden de los horarios: primero el culto del domingo, que es lo que
       busca quien no ha venido nunca; despues el resto, de lunes a sabado;
     - los enlaces de Instagram traian un codigo de seguimiento detras
       (?fqnt=...), que se quita: es de quien compartio el enlace, no del
       perfil;
     - erratas evidentes de teclado: "Lunedl" por "Lunedì".

   El orden de las iglesias es el de su documento: Parma primero, que es
   donde empezo todo en 2003.

   El numero de "Contatto" va en `whatsapp`, y la pagina de cada iglesia lo
   ensena como dos botones: WhatsApp y llamar. Si ese numero no tuviese
   WhatsApp, llamar sigue funcionando. */
var SEDI_BASE = [
  {
    /* La direccion la dan ellos como "Via pini 6"; el nombre oficial de la
       calle es Strada Egidio Pini (OpenStreetMap). Su ficha de Google cae a
       15 m del punto de nuestro mapa: el mismo edificio.

       Las redes de Parma son las del grupo entero: es la iglesia madre. */
    id: 'parma',
    lat: 44.807452, lon: 10.293616,
    citta: 'Parma',
    via: 'Strada Egidio Pini 6',
    cap: '43126 Parma (PR)',
    web: '',
    testo: '',
    logo: '',
    whatsapp: '+39 348 839 3936',
    email: 'gruppocristiano@gmail.com',
    pastori: [['Daniel Lana', ''], ['Samuele Lorenzini', 'pastore giovani']],
    social: {
      instagram: 'https://www.instagram.com/gruppocristiano',
      facebook: 'https://www.facebook.com/GruppoCristiano',
      youtube: 'https://www.youtube.com/@gruppocristiano'
    },
    orari: [
      ['Incontro domenicale', 'Domenica 10:30 – 12:30'],
      ['Preghiera', 'Lunedì 20:00 – 21:30'],
      ['Preghiera', 'Mercoledì 6:00 – 6:30'],
      ['Studio biblico', 'Giovedì 20:00 · ogni 14 giorni'],
      ['Cellule', 'Venerdì · ogni 14 giorni'],
      ['Adolescenti', 'Sabato 16:30 – 18:00 · secondo calendario'],
      ['Giovani', 'Sabato 18:30 – 20:00 · secondo calendario']
    ],
    lingue: '',
    apple: 'I95F8BD462A52E3D3',
    publicada: true
  },
  {
    /* Ellos dicen "Via Ferraris 14/15". El 14 de Via Galileo Ferraris esta
       verificado en OpenStreetMap y es donde va nuestro mapa.

       OJO: la chincheta de SU ficha de Google cae 50 m mas alla, en otra
       calle (Via Pietro Rigoni, comprobado). Por eso "Come arrivare" busca
       la direccion escrita y no abre su ficha de Google: mandaria a la gente
       a la calle de al lado. Hay que decirselo para que la muevan — o si la
       entrada de verdad esta por Via Rigoni, que lo digan, y se cambia aqui.

       El correo es personal (de su pastor), no uno de la iglesia como los de
       las otras tres. Esta porque lo han dado ellos para esto. */
    id: 'fidenza',
    lat: 44.859535, lon: 10.087606,
    citta: 'Fidenza',
    via: 'Via Galileo Ferraris 14/15',
    cap: '43036 Fidenza (PR)',
    web: '',
    testo: '',
    logo: '',
    whatsapp: '+39 329 308 3663',
    email: 'crisbus10@gmail.com',
    pastori: [['Cristian Bustamante', ''], ['Roxana Bravo', '']],
    social: {
      instagram: 'https://www.instagram.com/gruppo_cristiano_fidenza',
      facebook: 'https://www.facebook.com/share/1DYJvmT9N7/'
    },
    orari: [
      ['Culto', 'Domenica 10:00'],
      ['Corso di musica', 'Martedì 19:30 – 20:30 · aperto a tutti'],
      ['Preghiera comunitaria', 'Martedì 20:30'],
      ['Discepolato', 'Giovedì 20:00'],
      /* En su documento la hora se queda a medias: "Incontro PreADO e ADO,
         ore" y nada mas. Se pone sin hora en vez de inventarla. */
      ['PreADO e ADO', 'Venerdì · ogni 2 settimane']
    ],
    lingue: '',
    apple: 'I30D78275B47BD836',
    publicada: true
  },
  {
    /* Confirmada por partida doble: la dan ellos ("Via A. Corelli 5") y la
       chincheta de su ficha de Google cae EXACTAMENTE en el punto que yo
       habia encontrado en Apple Maps, a 0 m. Sale de borrador. */
    id: 'reggio-emilia',
    lat: 44.706067, lon: 10.607343,
    citta: 'Reggio Emilia',
    via: 'Via Arcangelo Corelli 5',
    cap: '42124 Reggio Emilia (RE)',
    web: '',
    testo: '',
    logo: '',
    whatsapp: '+39 340 083 7962',
    email: 'gruppocristianore@gmail.com',
    pastori: [['Danny Menendez', ''], ['Jessica Tafur', '']],
    social: {
      instagram: 'https://www.instagram.com/gruppocristianore',
      facebook: 'https://www.facebook.com/gruppocristianore',
      youtube: 'https://www.youtube.com/@GruppoCristianoRE-22'
    },
    orari: [
      ['Incontro domenicale', 'Domenica 10:30'],
      ['Studio biblico', 'Mercoledì 19:30'],
      ['Preghiera', 'Venerdì 19:30'],
      ['Uomini e donne', 'Terzo venerdì del mese · in stanze separate'],
      ['Coppie', 'Sabato 17:00 · ogni 2 mesi']
    ],
    lingue: '',
    apple: '',
    publicada: true
  }
  ,
  {
    /* De su documento: "Via Venezia 45, Marina di Carrara". La chincheta de
       su ficha de Google cae a 30 m del 45 en OpenStreetMap, en la esquina
       con Via Marzabotto: el mismo sitio.

       Dan DOS numeros: 340 829 2483 y 348 4567 606. En la web cabe uno por
       iglesia (WhatsApp y llamar): va el primero, que es el que ponen
       delante. Si el de WhatsApp es el otro, se cambia desde el panel.

       Instagram traia un codigo de seguimiento detras (?hvrq=...): fuera.
       Erratas de su documento corregidas: "Dominica", "Lunedl", "Venerdl". */
    id: 'massa-carrara',
    lat: 44.041434, lon: 10.032270,
    citta: 'Massa-Carrara',
    via: 'Via Venezia 45',
    cap: '54033 Marina di Carrara (MS)',
    web: '',
    testo: '',
    logo: '',
    whatsapp: '+39 340 829 2483',
    email: 'gruppocristianomc@gmail.com',
    pastori: [['Leonel Caceres', ''], ['Maribel Caceres', '']],
    social: {
      instagram: 'https://www.instagram.com/gruppocristianomc',
      facebook: 'https://www.facebook.com/share/1WrMxCXBH5/'
    },
    orari: [
      ['Culto di adorazione', 'Domenica 10:30'],
      ['Scuola biblica', 'Domenica 9:30'],
      ['Studio biblico', 'Mercoledì 19:00'],
      ['Preghiera online', 'Lunedì e venerdì 19:30']
    ],
    lingue: '',
    apple: '',
    publicada: true
  }
  /* BOLOGNA no es del grupo: su propio documento cuenta la historia entera
     —Parma en 2003, despues Fidenza, Reggio Emilia y Marina di Carrara— y no
     la nombra.

     UNA IGLESIA NUEVA se crea desde el panel y tiene su pagina al momento, en
     /su-ciudad/, sin desplegar nada: la sirve _sede.html, la pagina comodin.
     Lo unico que le falta respecto a las de aqui es la vista previa propia al
     pegar el enlace en WhatsApp. Para eso se anade aqui y se regenera:

       1. python3 -I herramientas/mapa-sede.py <id> <lat> <lon>
       2. una entrada aqui, con el MISMO id que tenga en el panel
       3. node herramientas/paginas-sede.js */
];
