// ============================================================================
// GIORNALINO — la suscripcion por email y el envio de cada numero nuevo.
//
//   POST {azione:"iscrivi", email, lingua, privacy:true}   (desde la web)
//        Apunta el email SIN confirmar y le manda un correo con el enlace de
//        confirmacion (doble confirmacion: lo exige la ley en Italia/UE).
//   GET  ?azione=conferma&t=<token>   (el enlace del correo)
//   GET  ?azione=baja&t=<token>       (el enlace "cancellati" de cada correo)
//        Las dos vuelven a la web con ?giornalino=confermato / cancellato.
//   POST {azione:"invia", id}              (panel, solo el general; el panel
//        lo llama SOLO al publicar un numero)
//   POST {azione:"prova", id, a: email}    (panel, solo el general: una prueba)
//   POST {azione:"evento", id}             (panel, quien puede tocar ese evento;
//        el panel lo llama SOLO al crear un evento nuevo)
//
// QUIEN LO RECIBE: los suscritos que han confirmado Y el correo de cada
// iglesia (el de su ficha en el panel): los encargados lo reciben siempre,
// sin apuntarse. Si un correo esta en las dos listas, va una sola vez.
//
// SECRETOS (Edge Functions -> Secrets):
//   RESEND_KEY   la clave de Resend (de la cuenta del grupo).
// Opcionales: SITO (por defecto https://www.gruppocristiano.it) y MITTENTE.
//
// IMPORTANTE al desplegarla: "Verify JWT" / "Enforce JWT verification" en
// OFF. Los enlaces de confirmar y darse de baja se abren desde un correo y no
// llevan ninguna llave. Quien puede enviar lo comprueba la propia funcion.
// ============================================================================

const URL_BASE = Deno.env.get("SUPABASE_URL")!;
// La llave de servicio. Los proyectos nuevos de Supabase usan llaves nuevas
// ("sb_secret_..."), que van SOLO en la cabecera apikey: si ademas se mandan
// como "Authorization: Bearer", la base las rechaza. Las viejas (un JWT,
// "eyJ...") van en las dos. Se toma la que haya.
function llaveServicio(): string {
  const v = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (v) return v;
  try {
    const j = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    return String(Object.values(j)[0] || "");
  } catch (_e) { return ""; }
}
const SERVICIO = llaveServicio();
const LLAVE: Record<string, string> = SERVICIO.startsWith("eyJ")
  ? { apikey: SERVICIO, Authorization: "Bearer " + SERVICIO }
  : { apikey: SERVICIO };
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const RESEND = Deno.env.get("RESEND_KEY") || "";
const SITO = (Deno.env.get("SITO") || "https://www.gruppocristiano.it").replace(/\/$/, "");
const MITTENTE = Deno.env.get("MITTENTE") || "Gruppo Cristiano <giornalino@gruppocristiano.it>";
// La direccion de esta misma funcion (para los enlaces de confirmar y darse
// de baja). Se saca de la propia llamada: asi vale aunque en Supabase la
// funcion tenga otra direccion (por ejemplo "bright-task").
let FN = URL_BASE + "/functions/v1/giornalino";
function fijarFN(req: Request) {
  const slug = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  if (slug && /^[a-z0-9_-]+$/i.test(slug) && slug !== "v1" && slug !== "functions") FN = URL_BASE + "/functions/v1/" + slug;
}
const LOGO = SITO + "/media/logo-ufficiale.png";
const SIMBOLO = SITO + "/media/simbolo-ufficiale-256.png";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
function json(d: unknown, status = 200) {
  return new Response(JSON.stringify(d), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
}
function vai(stato: string) {
  return new Response(null, { status: 302, headers: { Location: SITO + "/?giornalino=" + stato + "#giornalino" } });
}

function db(ruta: string, init: RequestInit = {}) {
  return fetch(URL_BASE + "/rest/v1/" + ruta, {
    ...init,
    headers: { ...LLAVE, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}
async function leer(ruta: string): Promise<any[]> {
  const r = await db(ruta);
  return r.ok ? await r.json() : [];
}

function esc(t: string) {
  return String(t || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// --- los textos de los correos, en el idioma de quien se apunta -------------
const T: Record<string, Record<string, string>> = {
  it: {
    conf_ogg: "Conferma la tua iscrizione al giornalino",
    conf_h: "Manca solo un passo",
    conf_p: "Hai chiesto di ricevere per email il giornalino del Gruppo Cristiano. Per confermare, tocca il bottone qui sotto.",
    conf_btn: "Confermo l'iscrizione",
    conf_no: "Se non sei stato tu, ignora questa email: senza conferma non ti scriveremo più.",
    num_ogg: "Il nuovo giornalino del Gruppo Cristiano",
    num_h: "È uscito il nuovo giornalino",
    num_btn: "Leggi il giornalino",
    baja: "Non vuoi più riceverlo? Cancellati qui",
    saluto: "Con affetto in Cristo,",
    motto: "Un’unica famiglia di comunità cristiane",
    ev_ogg: "Nuovo evento",
    ev_h: "Nuovo evento",
    ev_gruppo: "Tutto il Gruppo Cristiano",
    ev_btn: "Vedi l’annuncio",
    ev_sito: "Vedi sul sito",
    chiesa: "Ricevi questa email come chiesa del Gruppo Cristiano.",
  },
  es: {
    conf_ogg: "Confirma tu suscripción al giornalino",
    conf_h: "Solo falta un paso",
    conf_p: "Has pedido recibir por email el giornalino del Gruppo Cristiano. Para confirmar, toca el botón de abajo.",
    conf_btn: "Confirmo la suscripción",
    conf_no: "Si no has sido tú, ignora este email: sin confirmación no te volveremos a escribir.",
    num_ogg: "El nuevo giornalino del Gruppo Cristiano",
    num_h: "Ha salido el nuevo giornalino",
    num_btn: "Leer el giornalino",
    baja: "¿Ya no quieres recibirlo? Date de baja aquí",
    saluto: "Con cariño en Cristo,",
    motto: "Una única familia de comunidades cristianas",
    ev_ogg: "Nuevo evento",
    ev_h: "Nuevo evento",
    ev_gruppo: "Todo el Gruppo Cristiano",
    ev_btn: "Ver el anuncio",
    ev_sito: "Ver en la web",
    chiesa: "Recibes este email como iglesia del Gruppo Cristiano.",
  },
  en: {
    conf_ogg: "Confirm your subscription to the newsletter",
    conf_h: "Just one more step",
    conf_p: "You asked to receive the Gruppo Cristiano newsletter by email. To confirm, tap the button below.",
    conf_btn: "Confirm my subscription",
    conf_no: "If it wasn't you, just ignore this email: without confirmation we won't write to you again.",
    num_ogg: "The new Gruppo Cristiano newsletter",
    num_h: "The new newsletter is out",
    num_btn: "Read the newsletter",
    baja: "Don't want it anymore? Unsubscribe here",
    saluto: "With love in Christ,",
    motto: "One family of Christian communities",
    ev_ogg: "New event",
    ev_h: "New event",
    ev_gruppo: "The whole Gruppo Cristiano",
    ev_btn: "See the announcement",
    ev_sito: "See it on the website",
    chiesa: "You receive this email as a church of the Gruppo Cristiano.",
  },
};
function t(l: string) { return T[l] || T.it; }

// Todos los correos iguales: el LOGO del grupo arriba, el contenido, la FIRMA
// del grupo abajo, y debajo de todo la letra pequena (darse de baja).
function plantilla(cuerpo: string, pie: string, lingua = "it") {
  const tt = t(lingua);
  const firma = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:30px;border-top:1px solid #eee;padding-top:18px;width:100%"><tr>
<td width="64" valign="top"><img src="${SIMBOLO}" alt="" width="56" style="width:56px;height:auto"></td>
<td valign="top" style="font-size:14px;line-height:1.5;color:#10203f">${esc(tt.saluto)}<br>
<b style="font-family:Georgia,serif;font-size:17px;font-weight:normal">Gruppo Cristiano</b><br>
<span style="color:#8c6614;font-size:12px;letter-spacing:.06em">${esc(tt.motto)}</span><br>
<a href="${SITO}" style="color:#0a6cb8;font-size:13px">www.gruppocristiano.it</a></td></tr></table>`;
  return `<!doctype html><html><body style="margin:0;background:#f4efe4;font-family:Arial,Helvetica,sans-serif;color:#10203f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe4;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#ffffff;padding:24px 22px 8px;text-align:center;border-bottom:3px solid #d4a843"><img src="${LOGO}" alt="Gruppo Cristiano" width="170" style="width:170px;max-width:170px;height:auto"></td></tr>
<tr><td style="padding:28px 26px 26px;font-size:16px;line-height:1.6">${cuerpo}${firma}</td></tr>
<tr><td style="padding:14px 26px 22px;font-size:12px;color:#5c677f;background:#faf7f0">${pie}</td></tr>
</table></td></tr></table></body></html>`;
}
function boton(href: string, txt: string) {
  return `<p style="text-align:center;margin:26px 0"><a href="${href}" style="background:#d4a843;color:#0b2a55;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;display:inline-block">${esc(txt)}</a></p>`;
}

async function manda(correos: any[]) {
  // De 100 en 100, que es lo que acepta Resend de una vez.
  let ok = 0;
  for (let i = 0; i < correos.length; i += 100) {
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: "Bearer " + RESEND, "Content-Type": "application/json" },
      body: JSON.stringify(correos.slice(i, i + 100)),
    });
    if (!r.ok) throw new Error("Resend " + r.status + ": " + (await r.text()).slice(0, 200));
    ok += correos.slice(i, i + 100).length;
  }
  return ok;
}

function correoNumero(g: any, a: string, lingua: string, token: string | null) {
  const tt = t(lingua);
  const baja = token ? FN + "?azione=baja&t=" + token : SITO + "/#giornalino";
  const cop = g.copertina
    ? `<p style="text-align:center;margin:0 0 18px"><a href="${esc(g.pdf)}"><img src="${esc(g.copertina)}" alt="" width="260" style="max-width:260px;height:auto;border-radius:8px;border:1px solid #eee"></a></p>`
    : "";
  const cuerpo = `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 6px;text-align:center">${esc(tt.num_h)}</h1>
<p style="text-align:center;color:#5c677f;margin:0 0 22px">${esc(g.titolo)}</p>${cop}${boton(g.pdf, tt.num_btn)}`;
  const c: any = {
    from: MITTENTE, to: [a], subject: tt.num_ogg + " — " + g.titolo,
    html: plantilla(cuerpo, token ? `<a href="${baja}" style="color:#5c677f">${esc(tt.baja)}</a>` : esc(tt.chiesa), lingua),
  };
  if (token) c.headers = { "List-Unsubscribe": "<" + baja + ">", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  return c;
}

// A quien se manda: suscritos confirmados + el correo de cada iglesia
// publicada (los encargados, siempre). Sin repetidos: si el correo de una
// iglesia tambien esta suscrito, va una vez, con su enlace de baja.
async function destinatari() {
  const iscr = await leer("iscritto?confermato=eq.true&select=email,token,lingua");
  const sedi = await leer("sede?publicada=eq.true&select=email");
  const vistos = new Set<string>(iscr.map((i: any) => String(i.email).toLowerCase()));
  const lista = iscr.map((i: any) => ({ email: i.email, lingua: i.lingua || "it", token: i.token }));
  for (const s of sedi) {
    const e = String(s.email || "").trim().toLowerCase();
    if (/^[^@\s<>"']+@[^@\s<>"']+\.[a-z]{2,}$/i.test(e) && !vistos.has(e)) { vistos.add(e); lista.push({ email: e, lingua: "it", token: null }); }
  }
  return lista;
}

function loc(o: any, k: string, l: string) { return (l !== "it" && o[k + "_" + l]) || o[k] || ""; }
function testoHtml(tx: string) {
  return esc(tx).split(/\n\s*\n/).map((p) => "<p style=\"margin:0 0 10px\">" + p.replace(/\n/g, "<br>") + "</p>").join("");
}
function correoEvento(e: any, chi: string, pagina: string, a: string, lingua: string, token: string | null) {
  const tt = t(lingua);
  const loc2 = { it: "it-IT", es: "es-ES", en: "en-GB" }[lingua] || "it-IT";
  let quando = e.giorno;
  try {
    const [y, m, d] = String(e.giorno).split("-").map(Number);
    quando = new Intl.DateTimeFormat(loc2, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(Date.UTC(y, m - 1, d)));
    if (e.fine && e.fine > e.giorno) {
      const [y2, m2, d2] = String(e.fine).split("-").map(Number);
      const corto = new Intl.DateTimeFormat(loc2, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
        .format(new Date(Date.UTC(y, m - 1, d)));
      quando = corto + " – " + new Intl.DateTimeFormat(loc2, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
        .format(new Date(Date.UTC(y2, m2 - 1, d2)));
    }
    quando = quando.charAt(0).toUpperCase() + quando.slice(1);
  } catch (_x) { /* la fecha tal cual */ }
  const titolo = loc(e, "titolo", lingua), testo = loc(e, "testo", lingua);
  const baja = token ? FN + "?azione=baja&t=" + token : "";
  const cartel = e.foto
    ? `<p style="text-align:center;margin:18px 0"><img src="${esc(e.foto)}" alt="" width="320" style="max-width:100%;width:320px;height:auto;border-radius:8px"></p>` : "";
  const cuerpo = `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8c6614;font-weight:bold">${esc(tt.ev_h)} · ${esc(chi)}</p>
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:26px;margin:0 0 12px;line-height:1.25">${esc(titolo)}</h1>
<p style="margin:0 0 4px;font-weight:bold">${esc(quando)}${e.ora ? " · " + esc(e.ora) : ""}</p>
${e.luogo ? `<p style="margin:0 0 14px;color:#5c677f">${esc(e.luogo)}</p>` : ""}
${testo ? testoHtml(testo) : ""}${cartel}
${boton(e.link || pagina, e.link ? tt.ev_btn : tt.ev_sito)}`;
  const c: any = {
    from: MITTENTE, to: [a], subject: tt.ev_ogg + ": " + titolo + " — " + chi,
    html: plantilla(cuerpo, token ? `<a href="${baja}" style="color:#5c677f">${esc(tt.baja)}</a>` : esc(tt.chiesa), lingua),
  };
  if (token) c.headers = { "List-Unsubscribe": "<" + baja + ">", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  return c;
}

// ¿Puede quien llama tocar esta carpeta (su iglesia, o 'generale' si es el
// general)? La misma regla de la base de datos, con su propia sesion.
async function puoCartella(req: Request, c: string) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ") || !ANON) return false;
  const r = await fetch(URL_BASE + "/rest/v1/rpc/puo_cartella", {
    method: "POST", headers: { apikey: ANON, Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ c }),
  });
  return r.ok && (await r.json()) === true;
}

// ¿Es el administrador general quien llama? Se pregunta a la base de datos
// CON su propia sesion: la misma regla que usa todo lo demas.
async function esGenerale(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ") || !ANON) return false;
  const r = await fetch(URL_BASE + "/rest/v1/rpc/es_generale", {
    method: "POST", headers: { apikey: ANON, Authorization: auth, "Content-Type": "application/json" }, body: "{}",
  });
  return r.ok && (await r.json()) === true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  fijarFN(req);
  const u = new URL(req.url);

  // --- los enlaces de los correos ------------------------------------------
  if (req.method === "GET" || (req.method === "POST" && u.searchParams.get("azione") === "baja")) {
    const az = u.searchParams.get("azione"), tok = u.searchParams.get("t") || "";
    if (!/^[0-9a-f-]{36}$/i.test(tok)) return vai("errore");
    if (az === "conferma") {
      const r = await db("iscritto?token=eq." + tok + "&select=email", {
        method: "PATCH", headers: { Prefer: "return=representation" },
        body: JSON.stringify({ confermato: true, confermato_il: new Date().toISOString() }),
      });
      const f = r.ok ? await r.json() : [];
      return vai(f.length ? "confermato" : "errore");
    }
    if (az === "baja") {
      await db("iscritto?token=eq." + tok, { method: "DELETE" });
      return req.method === "POST" ? json({ ok: true }) : vai("cancellato");
    }
    return vai("errore");
  }

  let d: any = {};
  try { d = await req.json(); } catch (_e) { return json({ errore: "richiesta" }, 400); }

  // --- apuntarse desde la web ------------------------------------------------
  if (d.azione === "iscrivi") {
    const email = String(d.email || "").trim().toLowerCase();
    const lingua = ["it", "es", "en"].includes(d.lingua) ? d.lingua : "it";
    if (!/^[^@\s<>"']{1,64}@[^@\s<>"']+\.[a-z]{2,}$/i.test(email) || email.length > 200) return json({ errore: "email" }, 400);
    if (d.privacy !== true) return json({ errore: "privacy" }, 400);
    if (!RESEND) return json({ errore: "servizio" }, 503);

    const ya = (await leer("iscritto?email=eq." + encodeURIComponent(email) + "&select=token,confermato,creato"))[0];
    if (ya && ya.confermato) return json({ stato: "gia" });
    // Freno: no se reenvia la confirmacion al mismo email antes de 10 minutos,
    // y no mas de 40 apuntados sin confirmar por hora en total.
    if (ya && Date.now() - new Date(ya.creato).getTime() < 10 * 60 * 1000) return json({ stato: "inviata" });
    const hace1h = new Date(Date.now() - 3600 * 1000).toISOString();
    const recientes = await leer("iscritto?confermato=eq.false&creato=gte." + hace1h + "&select=email");
    if (recientes.length >= 40) return json({ errore: "troppi" }, 429);

    let token = ya && ya.token;
    if (ya) {
      await db("iscritto?email=eq." + encodeURIComponent(email), {
        method: "PATCH", body: JSON.stringify({ creato: new Date().toISOString(), lingua }),
      });
    } else {
      const r = await db("iscritto", {
        method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ email, lingua }),
      });
      const f = r.ok ? await r.json() : [];
      token = f[0] && f[0].token;
    }
    if (!token) return json({ errore: "servizio" }, 500);
    const tt = t(lingua);
    const cuerpo = `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 14px">${esc(tt.conf_h)}</h1>
<p>${esc(tt.conf_p)}</p>${boton(FN + "?azione=conferma&t=" + token, tt.conf_btn)}`;
    try {
      await manda([{ from: MITTENTE, to: [email], subject: tt.conf_ogg, html: plantilla(cuerpo, esc(tt.conf_no), lingua) }]);
    } catch (_e) {
      return json({ errore: "servizio" }, 502);
    }
    return json({ stato: "inviata" });
  }

  // --- enviar un numero (solo el general) ------------------------------------
  if (d.azione === "invia" || d.azione === "prova") {
    if (!(await esGenerale(req))) return json({ errore: "permesso" }, 403);
    if (!RESEND) return json({ errore: "Manca il segreto RESEND_KEY" }, 503);
    const g = (await leer("giornalino?id=eq." + encodeURIComponent(String(d.id || "")) + "&select=*"))[0];
    if (!g) return json({ errore: "Numero non trovato" }, 404);

    if (d.azione === "prova") {
      const a = String(d.a || "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)) return json({ errore: "email" }, 400);
      try { await manda([correoNumero(g, a, "it", null)]); } catch (e) { return json({ errore: String((e as Error).message) }, 502); }
      return json({ inviati: 1 });
    }

    if (g.inviato && d.forza !== true) return json({ stato: "gia_inviato", inviato: g.inviato });
    const lista = await destinatari();
    let n = 0;
    try { n = await manda(lista.map((i: any) => correoNumero(g, i.email, i.lingua, i.token))); }
    catch (e) { return json({ errore: String((e as Error).message) }, 502); }
    await db("giornalino?id=eq." + g.id, { method: "PATCH", body: JSON.stringify({ inviato: new Date().toISOString() }) });
    return json({ inviati: n });
  }

  // --- avisar de un evento nuevo (quien puede tocar ese evento) ---------------
  if (d.azione === "evento") {
    if (!RESEND) return json({ errore: "Manca il segreto RESEND_KEY" }, 503);
    const e = (await leer("evento?id=eq." + encodeURIComponent(String(d.id || "")) + "&select=*"))[0];
    if (!e) return json({ errore: "Evento non trovato" }, 404);
    if (!(await puoCartella(req, e.cartella))) return json({ errore: "permesso" }, 403);
    if (e.avvisato) return json({ stato: "gia_inviato" });
    let chi = "", pagina = SITO + "/#eventi";
    if (e.cartella !== "generale") {
      const s = (await leer("sede?id=eq." + encodeURIComponent(e.cartella) + "&select=id,citta"))[0];
      chi = "Gruppo Cristiano " + (s ? s.citta : e.cartella);
      pagina = SITO + "/" + e.cartella + "/#eventi";
    }
    const lista = await destinatari();
    let n = 0;
    try {
      n = await manda(lista.map((i: any) => correoEvento(e, chi || t(i.lingua).ev_gruppo, pagina, i.email, i.lingua, i.token)));
    } catch (x) { return json({ errore: String((x as Error).message) }, 502); }
    await db("evento?id=eq." + e.id, { method: "PATCH", body: JSON.stringify({ avvisato: new Date().toISOString() }) });
    return json({ inviati: n });
  }

  return json({ errore: "azione" }, 400);
});
