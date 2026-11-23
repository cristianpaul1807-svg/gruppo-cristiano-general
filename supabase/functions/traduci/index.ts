// ============================================================================
// TRADUCI — lo que escriben en el panel, en espanol y en ingles.
//
// La web la llama asi:  GET /functions/v1/traduci?lingua=es   (o en)
// y recibe {lingua, testi: {"texto italiano": "traduccion", ...}}.
//
// LA WEB NO MANDA NINGUN TEXTO. La funcion lee ella misma lo publicado en la
// base de datos (fichas de las iglesias, preguntas, vision, historia, fotos,
// eventos, donaciones) y traduce SOLO eso. Asi nadie puede usarla para
// traducir lo que quiera y gastarnos la cuota de DeepL: lo que se traduce lo
// han escrito el general o los responsables desde el panel.
//
// Si en el panel han escrito ellos la version en espanol o en ingles, la
// web ensena la suya y no esta: aqui se traduce todo lo italiano igual, y
// la web elige.
//
// La causale de las donaciones NO se traduce: es lo que quien dona copia en
// su transferencia, y tiene que ser igual en el banco.
//
// Cada frase se traduce UNA vez y se guarda en la tabla `traduzione`. Las
// siguientes visitas la leen de ahi sin llamar a DeepL. Si cambian el texto,
// la frase nueva se traduce sola en la siguiente visita.
//
// SECRETO QUE NECESITA (Edge Functions -> Secrets):
//   DEEPL_KEY  la llave de la API de DeepL (la gratuita acaba en ":fx").
// Sin ella la funcion contesta con lo que ya tenga guardado (o nada), y la
// web ensena el italiano. No se rompe nada.
// ============================================================================

const URL_BASE = Deno.env.get("SUPABASE_URL")!;
const SERVICIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEEPL = Deno.env.get("DEEPL_KEY") || "";

// Tope de caracteres nuevos por llamada: el plan gratuito de DeepL da 500.000
// al mes. Todo el contenido del grupo son unos 30.000; esto es por si algo
// raro hiciese que se tradujera todo de golpe muchas veces.
const TOPE_NUEVOS = 60000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function db(ruta: string, init: RequestInit = {}) {
  return fetch(URL_BASE + "/rest/v1/" + ruta, {
    ...init,
    headers: {
      apikey: SERVICIO,
      Authorization: "Bearer " + SERVICIO,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

// Lo que ha pasado en esta llamada, para el campo "estado" de la respuesta:
// asi se ve desde fuera por que no traduce, sin ensenar ninguna clave.
let fallosBase = 0;
async function leer(ruta: string): Promise<any[]> {
  const r = await db(ruta);
  if (!r.ok) { fallosBase++; return []; }
  return await r.json();
}

async function huella(t: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

// Todo lo que se escribe en italiano desde el panel.
async function textos(): Promise<string[]> {
  const out = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && v.trim() && /[a-zA-Zàèéìòù]/.test(v)) out.add(v);
  };
  const hoy = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const [sedi, sito, foto, eventi] = await Promise.all([
    leer("sede?select=testo,lingue,orari,pastori&publicada=eq.true"),
    leer("sito?select=domande,visione,storia&limit=1"),
    leer("foto?select=testo"),
    leer("evento?select=titolo,ora,luogo,testo&giorno=gte." + hoy),
  ]);

  for (const s of sedi) {
    add(s.testo); add(s.lingue);
    for (const o of s.orari || []) if (Array.isArray(o)) { add(o[0]); add(o[1]); }
    for (const p of s.pastori || []) if (Array.isArray(p)) add(p[1]);
  }
  const g = sito[0] || {};
  for (const q of g.domande || []) { add(q.d_it); add(q.r_it); }
  if (g.visione) {
    add(g.visione.intro_it);
    for (const p of g.visione.punti || []) { add(p.t_it); add(p.p_it); }
  }
  if (g.storia) {
    add(g.storia.testo_it); add(g.storia.pie_it);
    for (const f of g.storia.fondatori || []) add(f.t_it);
  }
  for (const f of foto) add(f.testo);
  for (const e of eventi) { add(e.titolo); add(e.ora); add(e.luogo); add(e.testo); }
  return [...out];
}

async function deepl(lista: string[], lingua: string): Promise<string[]> {
  // (el estado de abajo dice que paso si esto falla)
  const host = DEEPL.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const r = await fetch(host + "/v2/translate", {
    method: "POST",
    headers: { Authorization: "DeepL-Auth-Key " + DEEPL, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: lista,
      source_lang: "IT",
      target_lang: lingua === "en" ? "EN-GB" : "ES",
      preserve_formatting: true,
    }),
  });
  if (!r.ok) {
    const det = r.status === 403 ? " (la clave no vale)" : r.status === 456 ? " (cuota del mes agotada)" : "";
    throw new Error("DeepL " + r.status + det);
  }
  const d = await r.json();
  return (d.translations || []).map((t: any) => String(t.text || ""));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const lingua = new URL(req.url).searchParams.get("lingua");
  if (lingua !== "es" && lingua !== "en") {
    return new Response(JSON.stringify({ error: "lingua: es o en" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  fallosBase = 0;
  let deeplEstado = DEEPL ? (DEEPL.endsWith(":fx") ? "clave gratuita" : "clave de pago") : "SIN CLAVE: falta el secreto DEEPL_KEY";
  const lista = await textos();
  const claves = await Promise.all(lista.map(huella));

  // Lo que ya esta traducido.
  const guardadas = new Map<string, string>();
  for (let i = 0; i < claves.length; i += 100) {
    const trozo = claves.slice(i, i + 100);
    const filas = await leer("traduzione?select=chiave,tradotto&lingua=eq." + lingua
      + "&chiave=in.(" + trozo.join(",") + ")");
    for (const f of filas) guardadas.set(f.chiave, f.tradotto);
  }

  // Lo que falta, a DeepL, de 40 en 40, sin pasar del tope.
  if (DEEPL) {
    const faltan: number[] = [];
    let chars = 0;
    lista.forEach((t, i) => {
      if (!guardadas.has(claves[i]) && chars + t.length <= TOPE_NUEVOS) { faltan.push(i); chars += t.length; }
    });
    for (let i = 0; i < faltan.length; i += 40) {
      const grupo = faltan.slice(i, i + 40);
      try {
        const tr = await deepl(grupo.map((j) => lista[j]), lingua);
        const filas = grupo.map((j, k) => ({ lingua, chiave: claves[j], tradotto: tr[k] || lista[j] }));
        filas.forEach((f) => guardadas.set(f.chiave, f.tradotto));
        await db("traduzione?on_conflict=lingua,chiave", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(filas),
        });
      } catch (e) {
        // sin cuota, clave mal o sin red: se devuelve lo que haya, la web
        // ensena el italiano en lo demas
        deeplEstado = "ERROR de DeepL: " + String((e as Error).message || e);
        break;
      }
    }
  }

  const testi: Record<string, string> = {};
  lista.forEach((t, i) => { const v = guardadas.get(claves[i]); if (v) testi[t] = v; });

  const estado = {
    textos_italianos: lista.length,
    traducidos: Object.keys(testi).length,
    deepl: deeplEstado,
    base_de_datos: fallosBase ? "ERROR: no puede leer " + fallosBase + " tablas" : "ok",
  };
  return new Response(JSON.stringify({ lingua, estado, testi }), {
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
      // Cinco minutos en el movil: un texto cambiado en el panel se ve
      // traducido como mucho cinco minutos despues.
      "Cache-Control": "public, max-age=300",
    },
  });
});
