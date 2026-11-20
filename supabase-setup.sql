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
--   generale  -> puede todo: crear iglesias, borrarlas, tocar cualquiera, y
--                dar y quitar accesos.
--   sede      -> cambia LA SUYA. Ni crear ni borrar ninguna.
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

-- El general, cualquiera. El de sede, la suya — y el `with check` le impide
-- cambiarle el id a su ficha para apoderarse de otra.
create policy "el general o el de esa sede"
  on public.sede for update to authenticated
  using      (public.es_generale() or id = public.mia_sede())
  with check (public.es_generale() or id = public.mia_sede());

create policy "solo el general borra"
  on public.sede for delete to authenticated
  using (public.es_generale());

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

-- Que el general solo pueda cambiar `attivo` en profilo, y nada mas.
revoke update on public.profilo from authenticated;
grant  update (attivo) on public.profilo to authenticated;

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
--    aparece SU iglesia. Si aparecen todas, algo no se ha aplicado.
--
-- SI ALGUIEN OLVIDA SU CONTRASENA (mientras no haya correo con codigo):
--
--      update auth.users
--      set encrypted_password = extensions.crypt('NUEVA-CONTRASENA', extensions.gen_salt('bf'))
--      where email = 'correo@ejemplo.com';
--
--    Desde el editor SQL. Despues se le dice la nueva en persona.
-- ============================================================================
