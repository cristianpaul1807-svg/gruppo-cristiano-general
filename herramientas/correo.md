# El correo de los códigos de acceso

Cómo se manda el código de 6 dígitos con el que entran al panel el
administrador general y los responsables de cada comunidad.

**Este archivo no se publica** — está dentro de `herramientas/`, que el
`.dockerignore` deja fuera de la imagen.

---

## Quién manda el correo

No lo manda la web. Lo manda **Supabase**, que es quien genera el código y
sabe si es válido. Resend es solo el cartero.

```
panel  →  Supabase (genera el código)  →  SMTP de Resend  →  correo del responsable
```

Eso importa para entender la configuración: en Supabase no se programa nada,
se rellenan unos campos de SMTP.

---

## 1. El dominio — hecho

Creado en Resend: **`accessi.gruppocristiano.it`**, región **eu-west-1**
(Irlanda), solo envío, sin seguimiento de aperturas ni de clics.

**Por qué un subdominio y no el dominio a secas:** `gruppocristiano.it` ya
tiene correo de verdad funcionando (MX en SiteGround, con su filtro
antispam). Tocar el SPF del dominio principal puede dejarles sin recibir
correo. Un subdominio aparte no roza nada de lo suyo.

**Por qué no `mail.gruppocristiano.it`:** ya existe y apunta al webmail de
ellos. Habría sido meterle registros encima a algo en uso.

**Por qué Irlanda y no Estados Unidos:** la iglesia está en Italia y los
correos van a personas de la UE. Además el proyecto de Supabase ya está en
eu-west-1. **La región no se puede cambiar después**, por eso se eligió a
conciencia.

**Sin seguimiento a propósito:** el seguimiento de clics reescribe los
enlaces del correo, y en un mensaje que lleva un código de acceso eso
empeora la entrega y da aspecto de phishing.

---

## 2. Los registros DNS — pendiente

El DNS de `gruppocristiano.it` está en **SiteGround** (`ns1.siteground.net`,
`ns2.siteground.net`). Hace falta quien tenga esa cuenta.

En SiteGround: *Site Tools → Domain → DNS Zone Editor*.

| Tipo | Nombre | Valor | Prioridad |
|---|---|---|---|
| TXT | `resend._domainkey.accessi` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDKbz83+vx9vEWY36EkJqLlmHRMRNYk7X4O02HP4UihSUPrnP1cR2EWFa6hobQYJcPbKy/8Yv+4tyIuOT5dE6NcU+F9a0lkhOf+sun/J8YelJQZb+a3dSI15C5rAXHXdXgBfCOEmI+jKjkANksPndTIb+YggSz2MvjSseEKYkDrcQIDAQAB` | — |
| MX | `send.accessi` | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| TXT | `send.accessi` | `v=spf1 include:amazonses.com ~all` | — |
| CNAME | `rsend.accessi` | `send.forge.rmta.net` | — |

Si el panel pide el nombre entero en vez del trozo, son:

```
resend._domainkey.accessi.gruppocristiano.it
send.accessi.gruppocristiano.it          (el MX y el TXT, los dos)
rsend.accessi.gruppocristiano.it
```

**DMARC: no hay que tocar nada.** El dominio ya tiene
`v=DMARC1; p=none; aspf=r; adkim=r;` en la raíz, y lo heredan los
subdominios.

Después, en Resend, **Verify**. El DNS tarda de minutos a horas.

---

## 3. La clave de envío — la creas tú, y no pasa por el chat

Una clave de API es una contraseña. No se pega en una conversación, ni en un
archivo, ni en el repositorio: se crea y se pega directamente donde va.

En Resend → **API Keys** → **Create API Key**:

- Nombre: `Gruppo Cristiano — invio`
- Permiso: **Sending access** (no «Full access»)
- Dominio: **solo** `accessi.gruppocristiano.it`

**Se enseña una sola vez.** Cópiala y pégala directamente en el paso 4.

Restringida así, si algún día se filtra, lo peor que puede hacer quien la
tenga es mandar correos desde ese subdominio. No puede leer nada, ni tocar el
dominio del otro cliente, ni borrar.

---

## 4. Supabase — rellenar el SMTP

*Project Settings → Authentication → SMTP Settings* → activar **Enable Custom
SMTP**:

| Campo | Valor |
|---|---|
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` *(literal, no un correo)* |
| Password | la clave del paso 3 |
| Sender email | `accessi@accessi.gruppocristiano.it` |
| Sender name | `Gruppo Cristiano` |

El puerto 587 va con STARTTLS, que es lo que entiende Supabase. Resend admite
también 465 (SSL directo), 25, 2465 y 2587.

**Esto no es opcional.** El envío que trae Supabase de fábrica está muy
limitado y es solo para pruebas: sin SMTP propio, el responsable pide el
código, no le llega, y nadie sabe por qué.

---

## 5. Que mande un código y no un enlace

*Authentication → Email Templates → **Magic Link***.

Supabase manda un enlace o un código según lo que haya en la plantilla. Con
`{{ .ConfirmationURL }}` manda enlace; con `{{ .Token }}` manda el código de
6 dígitos. Hay que dejar solo el segundo.

Son **6 dígitos, no 8**: en el correo la longitud no se puede cambiar.

---

## 6. Que nadie pueda crearse una cuenta

**Esto ya está resuelto, y no con el interruptor.** Mientras se entra con
contraseña, «Enable email signups» tiene que estar **activado**, porque el
panel crea las cuentas de los responsables por la vía del registro. Lo que
impide que cualquiera se registre es el trigger de `supabase-setup.sql`: si el
correo no tiene invitación del administrador general, rechaza la cuenta.

Cuando se pase al código por correo, además, al pedir el código se manda
`shouldCreateUser: false`: pedir un código no crea nunca una cuenta, solo
sirve para las que ya existen.

---

## Mientras tanto: correo y contraseña

Hasta que este dominio esté verificado, **el panel funciona con correo y
contraseña**, que elige el administrador general con cada responsable, en
persona. Está explicado en el README, sección «Cómo se dan los accesos».

Al pasar al código no hay que migrar nada: las cuentas, las invitaciones y los
permisos son los mismos. Cambia la puerta, no lo que hay detrás.

---

## Cuando migren a su propio hosting

Nada de esto se pierde. El dominio de Resend y los registros DNS ya son de
`gruppocristiano.it`: no dependen de Digitatex ni de dónde esté alojada la
web. Si cambian de hosting pero mantienen el dominio, los registros se copian
a la zona nueva y ya está.
