-- ============================================================================
-- Gruppo Cristiano General — la base de datos de las fichas
--
-- Se pega entero en el editor SQL de Supabase. Se puede volver a ejecutar sin
-- romper nada: todo va con IF NOT EXISTS o DROP ... IF EXISTS.
--
-- QUE RESUELVE
--   1. Que una ficha creada por un responsable la vea TODO EL MUNDO, y no
--      solo el movil donde la escribio.
--   2. Que la puerta del panel sea de verdad: la comprobacion pasa en el
--      servidor, no en una contrasena escrita dentro de la pagina.
--   3. Que al mudarse a su dominio no se pierda nada. Lo guardado en el
--      navegador es por origen y se queda atras; esto no.
--   4. Los dos tipos de responsable que ellos mismos dibujaron en su mapa
--      conceptual: un administrador general y un responsable por comunidad.
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
  -- rejilla dejan de medir parecido y se ve una gigante al lado de una de dos
  -- palabras. El panel avisa a los 180, que es por donde corta Google.
  testo      text         not null default '' check (char_length(testo) <= 240),
  lingue     text         not null default '',
  logo       text         not null default '',
  -- El WhatsApp DE ESA IGLESIA. Cada comunidad tiene el suyo: en su mapa
  -- conceptual cada sede lleva "responsabili e contatti" propios, y mandar a
  -- quien busca Massa-Carrara al telefono de Fidenza no sirve de nada.
  whatsapp   text         not null default '',
  lat        double precision,
  lon        double precision,
  -- pares [que, cuando]: [["Incontro","Domenica 10:30"],["Preghiera","Giovedì 20:30"]]
  orari      jsonb        not null default '[]'::jsonb,
  apple      text         not null default '',
  -- el mapa generado, como data URL. Pesa ~160 KB por sede; con una docena de
  -- iglesias son 2 MB, que para una tabla es nada.
  mapa       text         not null default '',
  publicada  boolean      not null default true,
  creada     timestamptz  not null default now(),
  tocada     timestamptz  not null default now()
);

-- Por si la tabla ya existia de una version anterior.
alter table public.sede add column if not exists whatsapp text not null default '';

comment on table public.sede is
  'Las fichas de las iglesias del grupo. Las lee la web publica y las escribe el panel.';
comment on column public.sede.publicada is
  'false = preparada pero no sale en la web. Es el boton que evita publicar una ficha a medio escribir.';

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
-- contenuti della propria sede). Esta tabla es eso y nada mas.
--
--   generale  -> puede todo: crear iglesias, borrarlas, tocar cualquiera.
--   sede      -> puede cambiar LA SUYA. Ni crear ni borrar ninguna.
--
-- Por que el responsable de sede no puede crear: crear una iglesia es decidir
-- que una comunidad entra en el grupo, y eso no es una decision de contenido.
-- ----------------------------------------------------------------------------
create table if not exists public.profilo (
  utente uuid primary key references auth.users (id) on delete cascade,
  ruolo  text not null check (ruolo in ('generale', 'sede')),
  sede   text references public.sede (id) on delete cascade,
  nome   text not null default '',
  creado timestamptz not null default now(),
  -- Un responsable de sede SIN sede no puede existir: seria una cuenta que
  -- pasa la puerta y no puede hacer nada, y nadie entenderia por que.
  constraint sede_obbligatoria check (ruolo = 'generale' or sede is not null)
);

comment on table public.profilo is
  'Quien puede tocar que. Una fila por cuenta: o administrador general, o responsable de una sede.';

-- Estas dos funciones las usan las reglas de abajo. Van con security definer
-- para que puedan mirar `profilo` sin que las reglas de `profilo` se llamen a
-- si mismas: sin esto, una regla que consulta su propia tabla entra en bucle.
create or replace function public.es_generale()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profilo p
    where p.utente = (select auth.uid()) and p.ruolo = 'generale'
  );
$$;

create or replace function public.mia_sede()
returns text language sql stable security definer set search_path = ''
as $$
  select p.sede from public.profilo p
  where p.utente = (select auth.uid()) and p.ruolo = 'sede';
$$;

-- ----------------------------------------------------------------------------
-- LAS REGLAS
--
-- La clave `anon` de Supabase es publica por diseño: va dentro de la pagina y
-- cualquiera la ve. Lo que protege NO es la clave, son estas reglas.
-- ----------------------------------------------------------------------------
alter table public.sede    enable row level security;
alter table public.profilo enable row level security;

drop policy if exists "cualquiera lee las publicadas"  on public.sede;
drop policy if exists "quien ha entrado lo ve todo"    on public.sede;
drop policy if exists "quien ha entrado escribe"       on public.sede;
drop policy if exists "quien ha entrado corrige"       on public.sede;
drop policy if exists "quien ha entrado borra"         on public.sede;
drop policy if exists "solo el general crea"           on public.sede;
drop policy if exists "el general o el de esa sede"    on public.sede;
drop policy if exists "solo el general borra"          on public.sede;
drop policy if exists "cada uno ve su perfil"          on public.profilo;
drop policy if exists "el general ve los perfiles"     on public.profilo;

-- La web publica. Solo lee, y solo lo publicado: una ficha en borrador no
-- sale ni aunque alguien pida la tabla entera a mano con la clave anon.
create policy "cualquiera lee las publicadas"
  on public.sede for select
  to anon
  using (publicada = true);

-- Quien ha entrado ve todas, borradores incluidos. Que el responsable de
-- Parma vea la ficha de Fidenza no es ningun problema: es una direccion y un
-- horario, y ya salen en la web. Lo que importa es quien puede CAMBIARLAS.
create policy "quien ha entrado lo ve todo"
  on public.sede for select to authenticated using (true);

create policy "solo el general crea"
  on public.sede for insert to authenticated
  with check (public.es_generale());

-- El general, cualquiera. El responsable de sede, la suya — y el `with check`
-- ademas le impide cambiarle el id a su ficha para apoderarse de otra.
create policy "el general o el de esa sede"
  on public.sede for update to authenticated
  using      (public.es_generale() or id = public.mia_sede())
  with check (public.es_generale() or id = public.mia_sede());

create policy "solo el general borra"
  on public.sede for delete to authenticated
  using (public.es_generale());

-- Cada uno puede leer su propia fila, que es como el panel sabe si enseñar el
-- boton de crear iglesias o no. Nadie puede escribir en esta tabla desde la
-- web: los permisos se dan desde Supabase, a mano, y punto.
create policy "cada uno ve su perfil"
  on public.profilo for select to authenticated
  using (utente = (select auth.uid()));

create policy "el general ve los perfiles"
  on public.profilo for select to authenticated
  using (public.es_generale());

-- ============================================================================
-- DESPUES DE EJECUTAR ESTO
--
-- 1. Authentication -> Providers -> Email: dejar activado SOLO el correo.
--    Desactivar "Enable email signups": las cuentas las crea el
--    administrador, nadie se registra solo. Si no, cualquiera que encuentre
--    la direccion del panel se hace una cuenta.
--
-- 2. Authentication -> Users -> Add user: la cuenta del administrador
--    general. Marcar "Auto Confirm User", que si no se queda esperando un
--    correo de confirmacion que nunca mira.
--
-- 3. IMPORTANTE, Y ES EL PASO QUE SE OLVIDA. Una cuenta recien creada no
--    puede cambiar NADA hasta que tenga su fila aqui. Copiar el id del
--    usuario (Authentication -> Users, columna UID) y ejecutar:
--
--      insert into public.profilo (utente, ruolo, nome)
--      values ('PEGA-AQUI-EL-UID', 'generale', 'Nombre del responsable');
--
--    Y para el responsable de una comunidad:
--
--      insert into public.profilo (utente, ruolo, sede, nome)
--      values ('OTRO-UID', 'sede', 'parma', 'Nombre');
--
--    Si alguien entra y el panel no le deja guardar, es casi siempre esto.
--
-- 4. Settings -> API: copiar la Project URL y la clave anon y ponerlas en
--    almacen.js. (Ya estan puestas.)
--
-- 5. Comprobar que funciona: entrar en /panel/, crear una ficha de prueba y
--    abrirla desde OTRO telefono. Si no se ve desde el otro telefono, algo de
--    esto no se ha hecho.
-- ============================================================================
