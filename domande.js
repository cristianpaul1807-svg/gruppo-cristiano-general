/* ============================================================================
   DOMANDE — las preguntas de siempre, las que vienen de serie.

   Desde el panel el administrador general las cambia («Il sito del gruppo» ->
   «Domande frequenti») y se guardan en la base de datos (sito.domande). En
   cuanto las guarda una vez, la web usa las suyas y estas dejan de salir.
   Mientras no lo haga, salen estas. El panel las usa tambien como punto de
   partida: al abrir el editor por primera vez, aparecen estas para cambiarlas.

   Cada una en italiano, en español y en ingles. `conf: true` = respuesta todavia por
   confirmar con ellos: sale con la etiqueta «da confermare» para que nadie la
   tome por definitiva. El general la quita al confirmarla.
   ============================================================================ */
var DOMANDE_BASE = [
  { d_it: 'Come trovo la chiesa più vicina a me?',
    r_it: 'Nella sezione «Le comunità» c’è una scheda per ogni chiesa. Si tocca e si apre la sua pagina, con gli orari, i pastori e il bottone per arrivarci col navigatore del telefono. Nella mappa, «Usa la mia posizione» ti dice qual è la più vicina.',
    d_es: '¿Cómo encuentro la iglesia más cercana?',
    r_es: 'En la sección «Las comunidades» hay una ficha por cada iglesia. Se toca y se abre su página, con los horarios, los pastores y el botón para llegar con el navegador del móvil. En el mapa, «Usar mi ubicación» te dice cuál es la más cercana.',
    d_en: "How do I find the church closest to me?",
    r_en: "In the «Our communities» section there is a card for each church. Tap it and its page opens, with the meeting times, the pastors and a button to get there with your phone's navigator. On the map, «Use my location» tells you which one is closest." },
  { d_it: 'Devo vestirmi in un modo particolare?',
    r_it: 'No. Si entra come si è.',
    d_es: '¿Tengo que vestirme de alguna manera?',
    r_es: 'No. Se entra como se está.',
    d_en: "Do I have to dress in a particular way?",
    r_en: "No. Come as you are.", conf: true },
  { d_it: 'Devo avvisare prima di venire?',
    r_it: 'No, si entra e basta.',
    d_es: '¿Tengo que avisar antes de ir?',
    r_es: 'No, se entra y ya.',
    d_en: "Do I need to let you know before I come?",
    r_en: "No, just come in.", conf: true },
  { d_it: 'Devo dare un’offerta?',
    r_it: 'No. Nessuno ti chiederà niente, e nessuno guarda chi dà e chi non dà.',
    d_es: '¿Tengo que dar una ofrenda?',
    r_es: 'No. Nadie te va a pedir nada, y nadie mira quién da y quién no.',
    d_en: "Do I have to give an offering?",
    r_en: "No. Nobody will ask you for anything, and nobody watches who gives and who doesn't.", conf: true },
  { d_it: 'Che lingue si parlano?',
    r_it: 'Siamo un gruppo di persone di diverse nazioni. Le lingue di ogni sede sono scritte nella sua scheda.',
    d_es: '¿Qué idiomas se hablan?',
    r_es: 'Somos un grupo de personas de distintas naciones. Los idiomas de cada sede están escritos en su ficha.',
    d_en: "What languages are spoken?",
    r_en: "We are a group of people from different nations. The languages of each church are written on its card.", conf: true },
  { d_it: 'Posso venire con i bambini?',
    r_it: 'Qui serve la risposta vera: se c’è un momento per i bambini, a che ora e da che età.',
    d_es: '¿Puedo venir con niños?',
    r_es: 'Aquí hace falta la respuesta real: si hay un momento para los niños, a qué hora y desde qué edad.',
    d_en: "Can I come with children?",
    r_en: "The real answer is needed here: whether there is a time for children, at what time and from what age.", conf: true },
  { d_it: 'Voglio venire in Italia come missionario. Mi potete aiutare?',
    r_it: 'Sì: è il settimo punto della nostra visione. Scrivici su WhatsApp e ne parliamo.',
    d_es: 'Quiero venir a Italia como misionero. ¿Me pueden ayudar?',
    r_es: 'Sí: es el séptimo punto de nuestra visión. Escríbenos por WhatsApp y hablamos.',
    d_en: "I want to come to Italy as a missionary. Can you help me?",
    r_en: "Yes: it is the seventh point of our vision. Write to us on WhatsApp and we'll talk about it." }
];
