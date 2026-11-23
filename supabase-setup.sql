-- ============================================================================
-- Gruppo Cristiano General — la base de datos
--
-- Se pega entero en el editor SQL de Supabase. Se puede volver a ejecutar sin
-- romper nada: todo va con IF NOT EXISTS, OR REPLACE o DROP ... IF EXISTS.
--
-- QUE RESUELVE
--   1. Que una ficha creada por un responsable la vea TODO EL MUNDO, y no
--      solo el movil donde la escribio.
--   2. Que la puerta del panel sea de verdad: la comprobacion pasa en el
--      servidor, no en una contrasena escrita dentro de la pagina.
--   3. Que al mudarse a su dominio no se pierda nada.
--   4. Los dos papeles de su mapa conceptual: un administrador general y un
--      responsable por comunidad.
--   5. Que el administrador general cree las cuentas de los responsables
--      DESDE EL PANEL, con correo y contrasena, sin que nadie pueda crearse
--      una cuenta por su lado.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- LAS FICHAS
-- ----------------------------------------------------------------------------
create table if not exists public.sede (
  id         text primary key,
  orden      integer      not null default 0,
  citta      text         not null,
  via        text         not null default '',
  cap        text         not null default '',
  web        text         not null default '',
  -- 240 es el tope, no una sugerencia: a partir de ahi las fichas de la
  -- rejilla dejan de medir parecido. El panel avisa a los 180, que es por
  -- donde corta Google.
  testo      text         not null default '' check (char_length(testo) <= 240),
  lingue     text         not null default '',
  logo       text         not null default '',
  -- El WhatsApp DE ESA IGLESIA: quien busca Parma tiene que escribir a Parma.
  whatsapp   text         not null default '',
  lat        double precision,
  lon        double precision,
  -- pares [que, cuando]: [["Incontro","Domenica 10:30"],["Preghiera","Giovedì 20:30"]]
  orari      jsonb        not null default '[]'::jsonb,
  apple      text         not null default '',
  -- el mapa generado, como data URL (~160 KB por sede)
  mapa       text         not null default '',
  publicada  boolean      not null default true,
  creada     timestamptz  not null default now(),
  tocada     timestamptz  not null default now()
);

alter table public.sede add column if not exists whatsapp text not null default '';

-- Lo que cada iglesia mando en su documento: sus pastores, su correo y sus
-- redes. Van aqui y no en el codigo para que cada responsable los cambie
-- desde el panel cuando cambien.
--   pastori: [["Daniel Lana",""],["Samuele Lorenzini","pastore giovani"]]
--   social:  {"instagram":"https://...","facebook":"https://...","youtube":"https://..."}
-- La foto de portada que sube cada iglesia desde el panel (direccion de la
-- imagen en el almacen de abajo). El logo va en la columna `logo`, que ya
-- existia.
alter table public.sede add column if not exists copertina text not null default '';
alter table public.sede add column if not exists email   text  not null default '';
alter table public.sede add column if not exists pastori jsonb not null default '[]'::jsonb;
alter table public.sede add column if not exists social  jsonb not null default '{}'::jsonb;

comment on table public.sede is
  'Las fichas de las iglesias del grupo. Las lee la web publica y las escribe el panel.';
comment on column public.sede.publicada is
  'false = preparada pero no sale en la web. Evita publicar una ficha a medio escribir.';

create index if not exists sede_orden_idx on public.sede (orden);

-- `tocada` se actualiza sola: si hay que ponerla a mano, un dia se olvida.
create or replace function public.tocar_sede()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.tocada = now();
  return new;
end $$;

drop trigger if exists sede_tocada on public.sede;
create trigger sede_tocada before update on public.sede
  for each row execute function public.tocar_sede();

-- ----------------------------------------------------------------------------
-- QUIEN ES QUIEN
--
-- Su mapa conceptual lo dice con estas palabras: "Amministratore generale"
-- (gestisce il sito principale) y "Responsabili di comunita" (gestiscono i
-- contenuti della propria sede).
--
--   generale  -> lo del grupo: crear iglesias, dar y quitar accesos, y la
--                portada de la web general. Una iglesia la lleva SOLO
--                mientras no tiene responsable.
--   sede      -> cambia LA SUYA. Ni crear ni borrar ninguna.
--
-- CADA UNO EN LO SUYO: en cuanto una iglesia tiene un responsable con el
-- acceso activo, es de esa persona y el general ya no puede cambiarla, ni sus
-- fotos, ni borrarla. Si hace falta, el general le quita el acceso y la
-- iglesia vuelve a ser suya. Asi nunca hay dos personas tocando lo mismo.
--
-- Crear una iglesia es decidir que comunidad entra en el grupo, y eso no es
-- una decision de contenido: por eso el responsable de sede no puede.
-- ----------------------------------------------------------------------------
create table if not exists public.profilo (
  utente uuid primary key references auth.users (id) on delete cascade,
  ruolo  text not null check (ruolo in ('generale', 'sede')),
  sede   text references public.sede (id) on delete cascade,
  nome   text not null default '',
  -- Copia del correo, para que el administrador general vea en el panel quien
  -- es quien. El correo de verdad vive en auth.users, que no se expone.
  email  text not null default '',
  -- Quitar el acceso a alguien es poner esto en false, no borrar la fila: asi,
  -- si vuelve, se le devuelve con un boton y sigue con su misma contrasena.
  -- Borrando, habria que crearle otra cuenta y su correo ya estaria cogido.
  attivo boolean not null default true,
  creado timestamptz not null default now(),
  -- Un responsable de sede SIN sede no puede existir: seria una cuenta que
  -- pasa la puerta y no puede hacer nada, y nadie entenderia por que.
  constraint sede_obbligatoria check (ruolo = 'generale' or sede is not null)
);

-- Por si la tabla ya existia de una version anterior.
alter table public.profilo add column if not exists email  text    not null default '';
alter table public.profilo add column if not exists attivo boolean not null default true;

comment on table public.profilo is
  'Quien puede tocar que. Una fila por cuenta: o administrador general, o responsable de una sede.';

-- Estas funciones las usan las reglas de abajo. Van con security definer para
-- que puedan mirar `profilo` sin que las reglas de `profilo` se llamen a si
-- mismas: una regla que consulta su propia tabla entra en bucle.
--
-- Las tres exigen attivo = true. Un acceso quitado no cuenta para nada.
create or replace function public.es_generale()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profilo p
    where p.utente = (select auth.uid()) and p.ruolo = 'generale' and p.attivo
  );
$$;

create or replace function public.mia_sede()
returns text language sql stable security definer set search_path = ''
as $$
  select p.sede from public.profilo p
  where p.utente = (select auth.uid()) and p.ruolo = 'sede' and p.attivo;
$$;

create or replace function public.ha_accesso()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profilo p
    where p.utente = (select auth.uid()) and p.attivo
  );
$$;

-- ¿Tiene esta iglesia un responsable con el acceso activo?
create or replace function public.ha_responsabile(s text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profilo p
    where p.ruolo = 'sede' and p.sede = s and p.attivo
  );
$$;

-- ¿Puede quien ha entrado cambiar esta iglesia? Su responsable, si o si. El
-- general, solo si no tiene responsable. Nadie mas.
create or replace function public.puo_sede(s text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(s = public.mia_sede(), false)
      or (public.es_generale() and not public.ha_responsabile(s));
$$;

-- Lo mismo para las carpetas del almacen de fotos. La carpeta `generale` es la
-- del general (la portada de la web del grupo) y no la toca nadie mas.
create or replace function public.puo_cartella(c text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case when c = 'generale' then public.es_generale()
              else public.puo_sede(c) end;
$$;

-- ----------------------------------------------------------------------------
-- LAS INVITACIONES — como se crea una cuenta sin llave de administrador
--
-- Crear una cuenta en Supabase "a mano" exige la llave de servicio, y esa
-- llave no puede vivir en una pagina web: quien mirase el codigo podria crear
-- todas las cuentas que quisiera.
--
-- Asi que se hace al reves. El administrador general apunta aqui el correo y
-- el papel, y acto seguido el panel registra la cuenta por la via normal. Un
-- trigger en auth.users mira esta tabla:
--
--   - si el correo esta invitado, crea su fila en `profilo` con su papel y su
--     sede, y borra la invitacion;
--   - si NO esta invitado, lanza un error, y el error en ese trigger hace que
--     Supabase rechace la cuenta entera.
--
-- Resultado: el registro esta abierto, pero solo funciona para los correos que
-- haya invitado el administrador general. Quien encuentre /panel/ e intente
-- crearse una cuenta, no puede.
--
-- Las invitaciones caducan en 24 horas. Si el registro falla despues de
-- invitar (contrasena demasiado corta, por ejemplo), el panel borra la
-- invitacion; si aun asi quedase alguna colgada, caduca sola y nadie puede
-- aprovecharla para meterse con ese correo.
-- ----------------------------------------------------------------------------
create table if not exists public.invito (
  email  text primary key check (email = lower(email)),
  ruolo  text not null check (ruolo in ('generale', 'sede')),
  sede   text references public.sede (id) on delete cascade,
  creato timestamptz not null default now(),
  constraint invito_sede_obbligatoria check (ruolo = 'generale' or sede is not null)
);

comment on table public.invito is
  'Correos autorizados a crear cuenta. Se consumen al usarse y caducan en 24 horas.';

create or replace function public.nuovo_utente()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  inv public.invito%rowtype;
begin
  select * into inv
  from public.invito
  where email = lower(new.email)
    and creato > now() - interval '24 hours';

  if not found then
    -- Este error es el que impide la cuenta. Supabase lo devuelve al panel
    -- como "Database error saving new user".
    raise exception 'email non invitata: %', new.email;
  end if;

  insert into public.profilo (utente, ruolo, sede, email)
  values (new.id, inv.ruolo, inv.sede, lower(new.email));

  delete from public.invito where email = inv.email;
  return new;
end $$;

drop trigger if exists al_crear_utente on auth.users;
create trigger al_crear_utente
  after insert on auth.users
  for each row execute function public.nuovo_utente();

-- ----------------------------------------------------------------------------
-- LAS REGLAS
--
-- La clave `anon` es publica por diseno: va dentro de la pagina. Lo que
-- protege NO es la clave, son estas reglas.
-- ----------------------------------------------------------------------------
alter table public.sede    enable row level security;
alter table public.profilo enable row level security;
alter table public.invito  enable row level security;

drop policy if exists "cualquiera lee las publicadas"  on public.sede;
drop policy if exists "quien ha entrado lo ve todo"    on public.sede;
drop policy if exists "quien tiene acceso lo ve todo"  on public.sede;
drop policy if exists "quien ha entrado escribe"       on public.sede;
drop policy if exists "quien ha entrado corrige"       on public.sede;
drop policy if exists "quien ha entrado borra"         on public.sede;
drop policy if exists "solo el general crea"           on public.sede;
drop policy if exists "el general o el de esa sede"    on public.sede;
drop policy if exists "solo el general borra"          on public.sede;
drop policy if exists "cada uno ve su perfil"          on public.profilo;
drop policy if exists "el general ve los perfiles"     on public.profilo;
drop policy if exists "el general activa y desactiva"  on public.profilo;
drop policy if exists "el general invita"              on public.invito;

-- La web publica. Solo lee, y solo lo publicado.
create policy "cualquiera lee las publicadas"
  on public.sede for select
  to anon
  using (publicada = true);

-- Quien tiene un acceso vivo ve todas, borradores incluidos. Que el de Parma
-- vea la ficha de Fidenza no importa: lo que importa es quien puede CAMBIARLA.
-- Un acceso quitado ya no ve los borradores.
create policy "quien tiene acceso lo ve todo"
  on public.sede for select to authenticated
  using (public.ha_accesso());

create policy "solo el general crea"
  on public.sede for insert to authenticated
  with check (public.es_generale());

-- Cada uno en lo suyo (ver puo_sede arriba). El `with check` impide ademas
-- cambiarle el id a una ficha para apoderarse de otra.
drop policy if exists "cada uno la suya" on public.sede;
create policy "cada uno la suya"
  on public.sede for update to authenticated
  using      (public.puo_sede(id))
  with check (public.puo_sede(id));

-- Borrar: el general, y solo una iglesia sin responsable. Una que tiene
-- responsable no desaparece sin que antes se le quite el acceso.
create policy "solo el general borra"
  on public.sede for delete to authenticated
  using (public.es_generale() and not public.ha_responsabile(id));

-- Cada uno lee su propia fila: es como el panel sabe que ensenar.
create policy "cada uno ve su perfil"
  on public.profilo for select to authenticated
  using (utente = (select auth.uid()));

create policy "el general ve los perfiles"
  on public.profilo for select to authenticated
  using (public.es_generale());

-- El general quita y devuelve accesos. Solo puede tocar `attivo`: el papel y
-- la sede de una cuenta no se cambian desde la web, para que nadie pueda
-- ascenderse a si mismo ni pasarse de iglesia. Ademas no puede desactivarse
-- a si mismo: si fuese el unico general, nadie podria volver a entrar.
create policy "el general activa y desactiva"
  on public.profilo for update to authenticated
  using      (public.es_generale() and utente <> (select auth.uid()))
  with check (public.es_generale() and utente <> (select auth.uid()));

-- Las filas de profilo no se crean desde la web: las crea el trigger.
-- Las invitaciones, solo el general.
create policy "el general invita"
  on public.invito for all to authenticated
  using      (public.es_generale())
  with check (public.es_generale());

-- LOS PERMISOS DE BASE. Los proyectos nuevos de Supabase ya no los dan solos
-- sobre las tablas nuevas: sin esto, la web recibe "permission denied" aunque
-- las reglas de arriba la dejen. Esto abre la puerta; las reglas (RLS)
-- deciden quien pasa y que filas ve.
grant usage on schema public to anon, authenticated;
grant select                         on public.sede    to anon, authenticated;
grant insert, update, delete         on public.sede    to authenticated;
grant select                         on public.profilo to authenticated;
grant select, insert, update, delete on public.invito  to authenticated;
grant execute on function public.es_generale(), public.mia_sede(), public.ha_accesso(),
  public.ha_responsabile(text), public.puo_sede(text), public.puo_cartella(text)
  to anon, authenticated;

-- Que el general solo pueda cambiar `attivo` en profilo, y nada mas.
revoke update on public.profilo from authenticated;
grant  update (attivo) on public.profilo to authenticated;

-- ----------------------------------------------------------------------------
-- LAS FOTOS Y LOS LOGOS DE CADA IGLESIA
--
-- Un almacen de archivos ("bucket") llamado media. Publico para LEER: las
-- fotos se ven en la web sin entrar en ningun sitio. Para SUBIR, las reglas de
-- siempre: cada iglesia en SU carpeta (media/parma/..., media/fidenza/...), y
-- el general en cualquiera.
--
-- El propio almacen pone dos topes, que no dependen del panel:
--   - solo JPEG, PNG y WebP. Fuera SVG: un SVG puede llevar codigo dentro, y
--     servido desde aqui se ejecutaria.
--   - 3 MB por archivo. El panel ya achica las fotos en el movil antes de
--     subirlas (una foto de movil son 4 MB y el plan gratuito da 1 GB), pero
--     el tope esta aqui por si alguien se salta el panel.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media: ver"            on storage.objects;
drop policy if exists "media: subir lo suyo"  on storage.objects;
drop policy if exists "media: cambiar lo suyo" on storage.objects;
drop policy if exists "media: borrar lo suyo" on storage.objects;

-- Leer: cualquiera que haya entrado (borrar exige poder ver lo que se borra).
-- Los visitantes no lo necesitan: el almacen es publico y ven las fotos por
-- su direccion directa.
create policy "media: ver"
  on storage.objects for select to authenticated
  using (bucket_id = 'media');

-- EL TOPE: 50 archivos por carpeta. Una iglesia usa como mucho 35: portada, logo,
-- foto de los pastores, las 12 fotos de su galeria y la imagen de hasta 20
-- eventos; el general, ademas, las fotos de los fundadores. El panel borra solas las viejas; el
-- margen es para cambiar fotos y para algun resto si se corta la red. Con
-- 3 MB por archivo como mucho, una carpeta no pasa de 90 MB aunque alguien se
-- salte el panel; en la practica, con las fotos achicadas, unos 3 MB.
create or replace function public.fotos_en_cartella(c text)
returns integer language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from storage.objects o
  where o.bucket_id = 'media' and (storage.foldername(o.name))[1] = c;
$$;
grant execute on function public.fotos_en_cartella(text) to authenticated;

-- (storage.foldername(name))[1] es la primera carpeta de la ruta:
-- para "parma/copertina-1732.jpg" es "parma". Cada carpeta, con la misma
-- regla que su ficha (puo_cartella, arriba), y con el tope.
create policy "media: subir lo suyo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media'
    and public.puo_cartella((storage.foldername(name))[1])
    and public.fotos_en_cartella((storage.foldername(name))[1]) < 50);

create policy "media: cambiar lo suyo"
  on storage.objects for update to authenticated
  using      (bucket_id = 'media' and public.puo_cartella((storage.foldername(name))[1]))
  with check (bucket_id = 'media' and public.puo_cartella((storage.foldername(name))[1]));

create policy "media: borrar lo suyo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.puo_cartella((storage.foldername(name))[1]));

-- ----------------------------------------------------------------------------
-- LAS GALERIAS — fotos con su texto debajo
--
-- Una galeria por iglesia (cartella = su id) y una de la web del grupo
-- (cartella = 'generale'). Las mismas reglas que todo lo demas: cada uno en
-- la suya (puo_cartella), y la del grupo solo el general. Tope: 12 fotos por
-- galeria. El archivo vive en el almacen, en <cartella>/galleria/, y aqui se
-- guarda su direccion, el texto y el orden.
-- ----------------------------------------------------------------------------
create table if not exists public.foto (
  id       uuid primary key default gen_random_uuid(),
  cartella text        not null,
  url      text        not null,
  testo    text        not null default '' check (char_length(testo) <= 200),
  orden    bigint      not null default 0,
  creada   timestamptz not null default now()
);
create index if not exists foto_cartella_idx on public.foto (cartella, orden);

comment on table public.foto is
  'Las galerias: una por iglesia y una del grupo (cartella = generale). Tope 12 por galeria.';

create or replace function public.foto_in_galleria(c text)
returns integer language sql stable security definer set search_path = ''
as $$ select count(*)::integer from public.foto where cartella = c; $$;

alter table public.foto enable row level security;
drop policy if exists "galeria: la ve cualquiera"  on public.foto;
drop policy if exists "galeria: anadir a la suya"  on public.foto;
drop policy if exists "galeria: cambiar la suya"   on public.foto;
drop policy if exists "galeria: quitar de la suya" on public.foto;

create policy "galeria: la ve cualquiera"
  on public.foto for select to anon, authenticated
  using (true);

-- Solo fotos de SU carpeta del almacen: nadie puede colgar en su galeria una
-- imagen de fuera ni una de la carpeta de otra iglesia.
create policy "galeria: anadir a la suya"
  on public.foto for insert to authenticated
  with check (public.puo_cartella(cartella)
    and public.foto_in_galleria(cartella) < 12
    and url like 'https://ifmrqbnnvlmnrfbseonr.supabase.co/storage/v1/object/public/media/'
                 || cartella || '/galleria/%');

create policy "galeria: cambiar la suya"
  on public.foto for update to authenticated
  using      (public.puo_cartella(cartella))
  with check (public.puo_cartella(cartella)
    and url like 'https://ifmrqbnnvlmnrfbseonr.supabase.co/storage/v1/object/public/media/'
                 || cartella || '/galleria/%');

create policy "galeria: quitar de la suya"
  on public.foto for delete to authenticated
  using (public.puo_cartella(cartella));

grant select                 on public.foto to anon, authenticated;
grant insert, update, delete on public.foto to authenticated;
grant execute on function public.foto_in_galleria(text) to authenticated;

-- ----------------------------------------------------------------------------
-- LA WEB DEL GRUPO — lo que sube el general
--
-- Una sola fila. Por ahora, la foto de portada de la pagina principal; si no
-- hay, la web usa la que trae de serie. La lee todo el mundo; la cambia solo
-- el general.
-- ----------------------------------------------------------------------------
create table if not exists public.sito (
  id        boolean primary key default true check (id),   -- solo puede haber una fila
  copertina text        not null default '',
  tocada    timestamptz not null default now()
);
insert into public.sito (id) values (true) on conflict (id) do nothing;

-- El WhatsApp del grupo: el del boton verde de la portada, para quien no sabe
-- a que iglesia escribir. Dentro de la pagina de cada iglesia, ese boton
-- escribe a ESA iglesia (su numero va en su ficha).
alter table public.sito add column if not exists whatsapp text not null default '';

-- Las preguntas de la seccion «Domande», que cambia el general. null = todavia
-- no ha guardado ninguna y la web usa las de serie (domande.js). Una lista de
-- {d_it, r_it, d_es, r_es, conf}; tope de 30 preguntas para que nadie llene la
-- fila por error.
alter table public.sito add column if not exists domande jsonb;

-- La vision y «Chi siamo» (historia + fundadores con su foto), que cambia el
-- general. null = los de serie (contenuti.js).
alter table public.sito add column if not exists visione jsonb;
alter table public.sito add column if not exists storia  jsonb;
do $$ begin
  alter table public.sito add constraint sito_visione_valida check (
    visione is null or (jsonb_typeof(visione) = 'object' and octet_length(visione::text) < 60000));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.sito add constraint sito_storia_valida check (
    storia is null or (jsonb_typeof(storia) = 'object' and octet_length(storia::text) < 60000));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.sito add constraint sito_domande_valide check (
    domande is null or (jsonb_typeof(domande) = 'array'
      and jsonb_array_length(domande) <= 30 and octet_length(domande::text) < 60000));
exception when duplicate_object then null; end $$;

comment on table public.sito is
  'Lo de la web general que cambia el administrador general desde el panel. Una sola fila.';

drop trigger if exists sito_tocada on public.sito;
create trigger sito_tocada before update on public.sito
  for each row execute function public.tocar_sede();

alter table public.sito enable row level security;
drop policy if exists "cualquiera lee el sitio"   on public.sito;
drop policy if exists "solo el general lo cambia" on public.sito;

create policy "cualquiera lee el sitio"
  on public.sito for select to anon, authenticated
  using (true);

create policy "solo el general lo cambia"
  on public.sito for update to authenticated
  using      (public.es_generale())
  with check (public.es_generale());

grant select on public.sito to anon, authenticated;
grant update on public.sito to authenticated;

-- Una iglesia no puede llamarse como la carpeta del general: subiria sus fotos
-- dentro de la suya. El panel ya lo evita; esto, por si alguien se salta el panel.
do $$ begin
  alter table public.sede add constraint sede_id_no_riservato
    check (id not in ('generale', 'sito', 'panel', 'media'));
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- LA FOTO DE LOS PASTORES Y LAS DONACIONES
--
-- foto_pastori: la direccion de la foto en el almacen (<id>/pastori-....jpg).
-- donazioni: {paypal, iban, intestatario, causale}. Lo mismo en `sito` para
-- el boton de donar de la web del grupo. Con tope de tamano, por si alguien se
-- salta el panel.
-- ----------------------------------------------------------------------------
alter table public.sede add column if not exists foto_pastori text  not null default '';
alter table public.sede add column if not exists donazioni    jsonb not null default '{}'::jsonb;
alter table public.sito add column if not exists donazioni    jsonb not null default '{}'::jsonb;
do $$ begin
  alter table public.sede add constraint sede_donazioni_valide check (
    jsonb_typeof(donazioni) = 'object' and octet_length(donazioni::text) < 2000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.sito add constraint sito_donazioni_valide check (
    jsonb_typeof(donazioni) = 'object' and octet_length(donazioni::text) < 2000);
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- LOS EVENTOS — los proximos de cada iglesia, y los del grupo (cartella =
-- 'generale'). La portada los junta todos; la pagina de cada iglesia ensena
-- los suyos. Los pasados no salen en la web, y el panel los borra solo.
--
-- Mismas reglas que todo: cada uno en lo suyo (puo_cartella). Tope: 20
-- eventos por iglesia. La imagen (el cartel) vive en <cartella>/eventi/, y el
-- enlace es al post de Instagram o Facebook donde lo anuncian.
-- ----------------------------------------------------------------------------
create table if not exists public.evento (
  id       uuid primary key default gen_random_uuid(),
  cartella text        not null,
  titolo   text        not null check (char_length(titolo) between 1 and 120),
  giorno   date        not null,
  ora      text        not null default '' check (char_length(ora)   <= 40),
  luogo    text        not null default '' check (char_length(luogo) <= 160),
  testo    text        not null default '' check (char_length(testo) <= 1000),
  foto     text        not null default '',
  link     text        not null default '' check (link = '' or link ~* '^https://[^[:space:]]+$'),
  creato   timestamptz not null default now()
);
create index if not exists evento_giorno_idx on public.evento (giorno);

comment on table public.evento is
  'Los proximos eventos de cada iglesia y del grupo (cartella = generale). Tope 20 por iglesia.';

create or replace function public.eventi_in(c text)
returns integer language sql stable security definer set search_path = ''
as $$ select count(*)::integer from public.evento where cartella = c; $$;

alter table public.evento enable row level security;
drop policy if exists "eventos: los ve cualquiera"   on public.evento;
drop policy if exists "eventos: anadir a la suya"    on public.evento;
drop policy if exists "eventos: cambiar los suyos"   on public.evento;
drop policy if exists "eventos: quitar los suyos"    on public.evento;

create policy "eventos: los ve cualquiera"
  on public.evento for select to anon, authenticated
  using (true);

-- La imagen, si la hay, solo de SU carpeta del almacen.
create policy "eventos: anadir a la suya"
  on public.evento for insert to authenticated
  with check (public.puo_cartella(cartella)
    and public.eventi_in(cartella) < 20
    and (foto = '' or foto like 'https://ifmrqbnnvlmnrfbseonr.supabase.co/storage/v1/object/public/media/'
                                || cartella || '/eventi/%'));

create policy "eventos: cambiar los suyos"
  on public.evento for update to authenticated
  using      (public.puo_cartella(cartella))
  with check (public.puo_cartella(cartella)
    and (foto = '' or foto like 'https://ifmrqbnnvlmnrfbseonr.supabase.co/storage/v1/object/public/media/'
                                || cartella || '/eventi/%'));

create policy "eventos: quitar los suyos"
  on public.evento for delete to authenticated
  using (public.puo_cartella(cartella));

grant select                 on public.evento to anon, authenticated;
grant insert, update, delete on public.evento to authenticated;
grant execute on function public.eventi_in(text) to authenticated;

-- ----------------------------------------------------------------------------
-- LOS TRES IDIOMAS — italiano, espanol e ingles
--
-- El italiano lo escriben siempre; el espanol y el ingles, si quieren. Lo
-- que dejan vacio lo traduce la funcion `traduci` (mas abajo); sin
-- traduccion, sale el italiano. Las preguntas, la vision y la historia ya lo guardan
-- dentro de su jsonb (d_en, t_en...); los horarios y los pastores, en el
-- propio jsonb de la ficha. Aqui, las columnas de texto que faltaban.
-- ----------------------------------------------------------------------------
alter table public.sede   add column if not exists testo_es  text not null default '' check (char_length(testo_es)  <= 240);
alter table public.sede   add column if not exists testo_en  text not null default '' check (char_length(testo_en)  <= 240);
alter table public.foto   add column if not exists testo_es  text not null default '' check (char_length(testo_es)  <= 200);
alter table public.foto   add column if not exists testo_en  text not null default '' check (char_length(testo_en)  <= 200);
alter table public.evento add column if not exists titolo_es text not null default '' check (char_length(titolo_es) <= 120);
alter table public.evento add column if not exists titolo_en text not null default '' check (char_length(titolo_en) <= 120);
alter table public.evento add column if not exists testo_es  text not null default '' check (char_length(testo_es)  <= 1000);
alter table public.evento add column if not exists testo_en  text not null default '' check (char_length(testo_en)  <= 1000);

-- ----------------------------------------------------------------------------
-- LAS TRADUCCIONES AUTOMATICAS (lo que NO escriben ellos)
--
-- Lo que se deja vacio en espanol o en ingles lo traduce del italiano la
-- funcion `traduci` (supabase/functions/traduci) con DeepL, y guarda aqui
-- cada frase: se traduce UNA vez y la siguiente visita la lee de aqui. Si
-- cambian el texto, la frase nueva se traduce sola en la siguiente visita.
--
-- Sin reglas a proposito: con RLS activado y ninguna regla, ni la web ni el
-- panel pueden leerla ni escribirla. Solo la funcion, con la llave de servicio.
-- ----------------------------------------------------------------------------
create table if not exists public.traduzione (
  lingua   text not null check (lingua in ('es', 'en')),
  chiave   text not null,            -- sha-256 del texto italiano
  tradotto text not null,
  creata   timestamptz not null default now(),
  primary key (lingua, chiave)
);
alter table public.traduzione enable row level security;
revoke all on public.traduzione from anon, authenticated;

-- Que la API vea al momento las columnas nuevas (si no, el panel dice "Could
-- not find the '...' column in the schema cache" hasta que se refresca sola).
notify pgrst, 'reload schema';

-- ============================================================================
-- DESPUES DE EJECUTAR ESTO — en este orden
--
-- 1. Authentication -> Sign In / Providers -> Email:
--      - "Enable email signups"  -> ACTIVADO.  El panel crea las cuentas por
--        esta via; lo que impide que cualquiera se registre es el trigger.
--      - "Confirm email"         -> DESACTIVADO. Si no, cada cuenta nueva
--        espera un correo de confirmacion, y el correo de fabrica de Supabase
--        solo manda 2 por hora. Cuando Resend este listo se puede volver a
--        activar.
--
-- 2. El primer administrador general. Este es el unico que se crea a mano,
--    porque todavia no hay nadie dentro para invitarle. Primero la
--    invitacion (cambia el correo):
--
--      insert into public.invito (email, ruolo)
--      values ('correo-del-administrador@ejemplo.com', 'generale');
--
--    Y despues, en menos de 24 horas: Authentication -> Users -> Add user ->
--    Create new user, con ese mismo correo y una contrasena, y "Auto Confirm
--    User" marcado. El trigger le crea solo su permiso de general.
--
-- 3. A partir de ahi, todo desde el panel: el general entra en /panel/, va a
--    "Accessi", elige la iglesia, escribe correo y contrasena, y listo.
--
-- 4. Comprobar: entrar con la cuenta de un responsable de sede y ver que solo
--    aparece SU iglesia. Si aparecen todas, algo no se ha aplicado. Y con
--    la del general: una iglesia con responsable dice "Gestita da ..." y no
--    tiene boton "Modifica".
--
-- SI ALGUIEN OLVIDA SU CONTRASENA (mientras no haya correo con codigo):
--
--      update auth.users
--      set encrypted_password = extensions.crypt('NUEVA-CONTRASENA', extensions.gen_salt('bf'))
--      where email = 'correo@ejemplo.com';
--
--    Desde el editor SQL. Despues se le dice la nueva en persona.
-- ============================================================================
