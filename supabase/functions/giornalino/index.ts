// ============================================================================
// GIORNALINO — la suscripcion por email y el envio de cada numero nuevo.
//
//   POST {azione:"iscrivi", email, lingua, privacy:true}   (desde la web)
//        Apunta el email SIN confirmar y le manda un correo con el enlace de
//        confirmacion (doble confirmacion: lo exige la ley en Italia/UE).
//   GET  ?azione=conferma&t=<token>   (el enlace del correo)
//   GET  ?azione=baja&t=<token>       (el enlace "cancellati" de cada correo)
//        Las dos vuelven a la web con ?giornalino=confermato / cancellato.
//   POST {azione:"invia", id}              (panel, solo el general)
//   POST {azione:"prova", id, a: email}    (panel, solo el general: una prueba)
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
const SERVICIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const RESEND = Deno.env.get("RESEND_KEY") || "";
const SITO = (Deno.env.get("SITO") || "https://www.gruppocristiano.it").replace(/\/$/, "");
const MITTENTE = Deno.env.get("MITTENTE") || "Gruppo Cristiano <giornalino@gruppocristiano.it>";
const FN = URL_BASE + "/functions/v1/giornalino";
const LOGO = SITO + "/media/logo-ufficiale.png";

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
    headers: { apikey: SERVICIO, Authorization: "Bearer " + SERVICIO, "Content-Type": "application/json", ...(init.headers || {}) },
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
  },
};
function t(l: string) { return T[l] || T.it; }

function plantilla(cuerpo: string, pie: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4efe4;font-family:Arial,Helvetica,sans-serif;color:#10203f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe4;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#0b2a55;padding:22px;text-align:center"><img src="${LOGO}" alt="Gruppo Cristiano" width="160" style="max-width:160px;height:auto"></td></tr>
<tr><td style="padding:28px 26px;font-size:16px;line-height:1.6">${cuerpo}</td></tr>
<tr><td style="padding:16px 26px 24px;font-size:12px;color:#5c677f;border-top:1px solid #eee">${pie}</td></tr>
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
    html: plantilla(cuerpo, `<a href="${baja}" style="color:#5c677f">${esc(tt.baja)}</a>`),
  };
  if (token) c.headers = { "List-Unsubscribe": "<" + baja + ">", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  return c;
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
      await manda([{ from: MITTENTE, to: [email], subject: tt.conf_ogg, html: plantilla(cuerpo, esc(tt.conf_no)) }]);
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
    const iscritti = await leer("iscritto?confermato=eq.true&select=email,token,lingua");
    let n = 0;
    try { n = await manda(iscritti.map((i: any) => correoNumero(g, i.email, i.lingua, i.token))); }
    catch (e) { return json({ errore: String((e as Error).message) }, 502); }
    await db("giornalino?id=eq." + g.id, { method: "PATCH", body: JSON.stringify({ inviato: new Date().toISOString() }) });
    return json({ inviati: n });
  }

  return json({ errore: "azione" }, 400);
});
