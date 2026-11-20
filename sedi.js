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
     whatsapp   el numero DE ESA IGLESIA, con prefijo. Sale en su pagina.
                Vacio = no sale el boton. Cada comunidad tiene el suyo: quien
                busca Parma tiene que escribir a Parma.
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
var SEDI_BASE = [
  {
    /* Direccion verificada en OpenStreetMap: Via Galileo Ferraris 14 existe y
       el numero civico cae en 44.859535, 10.087606. */
    id: 'fidenza',
    citta: 'Fidenza',
    via: 'Via Galileo Ferraris 14',
    cap: '43036 Fidenza (PR)',
    web: '',
    testo: '',
    logo: '',
    whatsapp: '',
    orari: [['Incontro', 'Domenica']],
    lingue: '',
    apple: 'I30D78275B47BD836',
    publicada: true
  },
  {
    /* La direccion se escribe como la publican ellos. El punto del mapa es la
       coordenada de su propia ficha de Apple, que en el catastro cae en el
       6b: el edificio esta partido en 6a, 6b y 6c y no hay un "6" a secas.

       Los horarios salen del directorio del Consiglio delle Chiese Cristiane
       di Parma, que es fuente institucional. Estan SIN CONFIRMAR por la
       iglesia: por eso la ficha los marca. */
    id: 'parma',
    citta: 'Parma',
    via: 'Strada Egidio Pini 6',
    cap: '43126 Parma (PR)',
    web: '',
    testo: '',
    logo: '',
    whatsapp: '',
    orari: [['Incontro', 'Domenica 10:30'], ['Preghiera', 'Giovedì 20:30']],
    lingue: '',
    apple: 'I95F8BD462A52E3D3',
    publicada: true
  },
  {
    /* El grupo la da por suya en su propio mapa conceptual, asi que entra.
       La direccion la encontre yo en Apple Maps y NO la han confirmado ellos:
       por eso queda en borrador. El mapa y la pagina estan hechos; el dia que
       lo confirmen, publicada: true y ya esta. */
    id: 'reggio-emilia',
    citta: 'Reggio Emilia',
    via: 'Via Arcangelo Corelli 5',
    cap: '42124 Reggio Emilia (RE)',
    web: '',
    testo: '',
    logo: '',
    whatsapp: '',
    orari: [],
    lingue: '',
    apple: '',
    publicada: false
  }
  /* Las que faltan —Massa-Carrara, y Bologna si existe— NO se escriben aqui:
     las crean ellos desde el panel. Es como van a trabajar a partir de ahora,
     y asi se prueba el camino entero.

     Una iglesia creada desde el panel tiene su pagina al momento, en
     /su-ciudad/, sin desplegar nada: la sirve _sede.html, la pagina comodin.
     Lo unico que le falta respecto a las de aqui es la vista previa propia al
     pegar el enlace en WhatsApp. Para eso se anade aqui y se regenera:

       1. python3 -I herramientas/mapa-sede.py <id> <lat> <lon>
       2. una entrada aqui, con el MISMO id que tenga en el panel
       3. node herramientas/paginas-sede.js */
];
