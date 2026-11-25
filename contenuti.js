/* ============================================================================
   CONTENIDOS DE SERIE — la vision y «Chi siamo» (historia y fundadores).

   Los cambia el administrador general desde el panel («Il sito del gruppo») y
   se guardan en la base de datos (sito.visione, sito.storia). En cuanto los
   guarda una vez, la web usa los suyos. Mientras no, salen estos, que son su
   texto de siempre, en italiano, español e ingles lado a lado.

   Formato del texto: una linea en blanco separa parrafos; una linea que
   empieza por "- " es un punto de una lista.
   ============================================================================ */
var VISIONE_BASE = {
  "intro_it": "«Crediamo che affidando la propria vita a Gesù, ognuno di noi può ottenere la vita eterna, essere cambiato da Dio e cambiare la società.»",
  "intro_es": "«Creemos que confiando la propia vida a Jesús, cada uno de nosotros puede obtener la vida eterna, ser cambiado por Dios y cambiar la sociedad.»",
  "punti": [
    {
      "t_it": "Raggiungere",
      "p_it": "Raggiungere ogni tipo di persona non credente in Italia, attraverso la Sua Parola, portando il messaggio di Salvezza in Cristo Gesù.",
      "t_es": "Alcanzar",
      "p_es": "Alcanzar a toda persona no creyente en Italia, a través de su Palabra, llevando el mensaje de Salvación en Cristo Jesús.",
      "t_en": "Reach",
      "p_en": "To reach every kind of unbelieving person in Italy, through his Word, bringing the message of Salvation in Christ Jesus."
    },
    {
      "t_it": "Equipaggiare",
      "p_it": "Equipaggiare ogni individuo per renderlo un cristiano maturo, uno strumento di Dio ovunque nel mondo, e una persona pronta all'opera del ministero.",
      "t_es": "Equipar",
      "p_es": "Equipar a cada individuo para hacerlo un cristiano maduro, un instrumento de Dios en cualquier parte del mundo, y una persona preparada para la obra del ministerio.",
      "t_en": "Equip",
      "p_en": "To equip every individual to become a mature Christian, an instrument of God anywhere in the world, and a person ready for the work of ministry."
    },
    {
      "t_it": "Formare",
      "p_it": "Il Gruppo Cristiano mette a disposizione di ogni credente:\n- discepolato — corsi basici e avanzati\n- studi biblici\n- coinvolgimento in diverse aree ministeriali",
      "t_es": "Formar",
      "p_es": "El Gruppo Cristiano pone a disposición de cada creyente:\n- discipulado — cursos básicos y avanzados\n- estudios bíblicos\n- participación en distintas áreas ministeriales",
      "t_en": "Train",
      "p_en": "The Gruppo Cristiano offers every believer:\n- discipleship — basic and advanced courses\n- Bible studies\n- involvement in different areas of ministry"
    },
    {
      "t_it": "Fondare chiese",
      "p_it": "Abbiamo la visione di fondare chiese, in Italia o all'estero, dove Dio ci darà la possibilità di operare.",
      "t_es": "Fundar iglesias",
      "p_es": "Tenemos la visión de fundar iglesias, en Italia o en el extranjero, donde Dios nos dé la posibilidad de obrar.",
      "t_en": "Plant churches",
      "p_en": "We have the vision of planting churches, in Italy or abroad, wherever God gives us the opportunity to work."
    },
    {
      "t_it": "La chiesa",
      "p_it": "Il corpo di Cristo e la comunione dei credenti: un luogo dove crescere e godere di comunione fraterna, e dove mettere a disposizione i propri doni.",
      "t_es": "La iglesia",
      "p_es": "El cuerpo de Cristo y la comunión de los creyentes: un lugar donde crecer y disfrutar de comunión fraterna, y donde poner a disposición los propios dones.",
      "t_en": "The church",
      "p_en": "The body of Christ and the fellowship of believers: a place to grow and enjoy brotherly fellowship, and to put one's gifts at the service of others."
    },
    {
      "t_it": "Investire nel Regno",
      "p_it": "Crediamo che il Signore è Colui che provvede alle nostre necessità, perciò siamo gioiosi di poter dare quello che abbiamo per l'edificazione della Sua chiesa — attraverso l'amore, il servizio e la fratellanza.",
      "t_es": "Invertir en el Reino",
      "p_es": "Creemos que el Señor es quien provee a nuestras necesidades, por eso somos gozosos de poder dar lo que tenemos para la edificación de su iglesia — a través del amor, el servicio y la fraternidad.",
      "t_en": "Invest in the Kingdom",
      "p_en": "We believe that the Lord is the one who provides for our needs, so we are joyful to be able to give what we have for the building up of his church — through love, service and brotherhood."
    },
    {
      "t_it": "Punto d'appoggio",
      "p_it": "Essere un punto di appoggio per chiunque voglia venire in Italia come missionario, fornendogli i mezzi per operare adeguatamente nella nostra nazione.",
      "t_es": "Punto de apoyo",
      "p_es": "Ser un punto de apoyo para quien quiera venir a Italia como misionero, dándole los medios para obrar adecuadamente en nuestra nación.",
      "t_en": "A place of support",
      "p_en": "To be a place of support for anyone who wants to come to Italy as a missionary, giving them the means to work effectively in our nation."
    }
  ],
  "intro_en": "«We believe that by entrusting their life to Jesus, each one of us can receive eternal life, be changed by God and change society.»"
};

var STORIA_BASE = {
  "testo_it": "Nel 2003, Aldo e Mariela hanno dato vita alla comunità Gruppo Cristiano, con la fondazione della prima chiesa a Parma.\n\nNel corso degli anni, grazie alla crescita della comunità e all’opera del Signore, si è sviluppata una realtà sempre più ampia e multiculturale, capace di accogliere persone di ogni età e provenienza: bambini, giovani, adulti e anziani, appartenenti a diverse nazionalità.\n\nQuesta crescita ha portato alla nascita di nuove comunità sul territorio, con l’apertura di altre chiese a Fidenza, Reggio Emilia e Marina di Carrara.\n\nLa visione missionaria non si è fermata a queste realtà. Il desiderio che continua a motivare Aldo e Mariela è quello di vedere nascere nuove comunità cristiane in Italia, per annunciare il Vangelo, raggiungere nuove persone e formare discepoli di Gesù Cristo, contribuendo così alla diffusione del Regno di Dio.",
  "testo_es": "En 2003, Aldo y Mariela dieron vida a la comunidad Gruppo Cristiano, con la fundación de la primera iglesia en Parma.\n\nCon los años, gracias al crecimiento de la comunidad y a la obra del Señor, se ha desarrollado una realidad cada vez más amplia y multicultural, capaz de acoger a personas de toda edad y procedencia: niños, jóvenes, adultos y mayores, de distintas nacionalidades.\n\nEste crecimiento llevó al nacimiento de nuevas comunidades en el territorio, con la apertura de otras iglesias en Fidenza, Reggio Emilia y Marina di Carrara.\n\nLa visión misionera no se ha detenido en estas realidades. El deseo que sigue motivando a Aldo y Mariela es ver nacer nuevas comunidades cristianas en Italia, para anunciar el Evangelio, alcanzar a nuevas personas y formar discípulos de Jesucristo, contribuyendo así a la expansión del Reino de Dios.",
  "fondatori": [
    {
      "nome": "Leonardo (Aldo) Cerasino",
      "foto": "",
      "t_it": "Ha conosciuto personalmente il Signore nel 1989, iniziando un percorso di fede e crescita spirituale che lo ha portato a maturare anche attraverso esperienze di formazione e servizio cristiano.\n\nPer tre anni ha collaborato con il movimento dei Navigatori in Inghilterra, dove ha frequentato e completato la scuola biblica organizzata dall’associazione. Nel 2010 ha inoltre completato il percorso formativo presso la Scuola Biblica per Responsabili di Comunità di Uomini Nuovi, a Marchirolo (Varese).",
      "t_es": "Conoció personalmente al Señor en 1989, iniciando un camino de fe y de crecimiento espiritual que lo llevó a madurar también a través de experiencias de formación y de servicio cristiano.\n\nDurante tres años colaboró con el movimiento de Los Navegantes en Inglaterra, donde cursó y completó la escuela bíblica organizada por la asociación. En 2010 completó además la formación de la Escuela Bíblica para Responsables de Comunidad de Uomini Nuovi, en Marchirolo (Varese).",
      "t_en": "He came to know the Lord personally in 1989, beginning a journey of faith and spiritual growth that also led him to mature through Christian training and service.\n\nFor three years he worked with The Navigators in England, where he attended and completed the Bible school run by the organisation. In 2010 he also completed the training at the Bible School for Community Leaders of Uomini Nuovi, in Marchirolo (Varese)."
    },
    {
      "nome": "Mariela De Los Santos",
      "foto": "",
      "t_it": "Originaria della Repubblica Dominicana, ha conosciuto il Signore nel 1980. È cresciuta spiritualmente presso la Comunità Cristiana «Casa de Oración», nella Repubblica Dominicana. Parallelamente al suo cammino di fede, ha conseguito una laurea in Psicologia presso l’Università Autonoma di Santo Domingo (UASD).\n\nNel 1990 è arrivata in Italia come missionaria, proseguendo il suo impegno nel servizio cristiano. Nel 1995 ha completato la scuola biblica dei Navigatori in Inghilterra, approfondendo ulteriormente la propria formazione spirituale e biblica.",
      "t_es": "Originaria de la República Dominicana, conoció al Señor en 1980. Creció espiritualmente en la Comunidad Cristiana «Casa de Oración», en la República Dominicana. Paralelamente a su camino de fe, se licenció en Psicología en la Universidad Autónoma de Santo Domingo (UASD).\n\nEn 1990 llegó a Italia como misionera, continuando su compromiso con el servicio cristiano. En 1995 completó la escuela bíblica de Los Navegantes en Inglaterra, profundizando aún más su formación espiritual y bíblica.",
      "t_en": "Originally from the Dominican Republic, she came to know the Lord in 1980. She grew spiritually at the «Casa de Oración» Christian Community in the Dominican Republic. Alongside her walk of faith, she earned a degree in Psychology from the Autonomous University of Santo Domingo (UASD).\n\nIn 1990 she came to Italy as a missionary, continuing her commitment to Christian service. In 1995 she completed The Navigators' Bible school in England, further deepening her spiritual and biblical training."
    }
  ],
  "pie_it": "Aldo e Mariela condividono una vita dedicata alla fede, al servizio e alla missione cristiana. Sono i genitori di Rebecca, la quale, insieme a suo marito Andrea, serve all’interno del Gruppo Cristiano di Parma mettendo a disposizione i propri doni.",
  "pie_es": "Aldo y Mariela comparten una vida dedicada a la fe, al servicio y a la misión cristiana. Son los padres de Rebecca, que junto a su marido Andrea sirve en el Gruppo Cristiano de Parma poniendo a disposición sus dones.",
  "testo_en": "In 2003, Aldo and Mariela founded the Gruppo Cristiano community, starting the first church in Parma.\n\nOver the years, thanks to the growth of the community and the work of the Lord, it has become an ever larger and more multicultural family, able to welcome people of every age and background: children, young people, adults and the elderly, from many different nations.\n\nThis growth led to the birth of new communities in the area, with the opening of other churches in Fidenza, Reggio Emilia and Marina di Carrara.\n\nThe missionary vision has not stopped there. The desire that still drives Aldo and Mariela is to see new Christian communities born in Italy, to proclaim the Gospel, reach new people and make disciples of Jesus Christ, contributing to the spread of the Kingdom of God.",
  "pie_en": "Aldo and Mariela share a life devoted to faith, service and Christian mission. They are the parents of Rebecca who, together with her husband Andrea, serves in the Gruppo Cristiano of Parma, putting her gifts at the service of others."
};
