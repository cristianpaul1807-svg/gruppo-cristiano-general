-- ============================================================================
-- Gruppo Cristiano General — la base de datos de las fichas
--
-- Se pega entero en el editor SQL de Supabase. Se puede volver a ejecutar sin
-- romper nada: todo va con IF NOT EXISTS o DROP ... IF EXISTS.
--
-- QUE RESUELVE
--   1. Que una ficha creada por el encargado la vea TODO EL MUNDO, y no solo
--      el movil donde la escribio.
--   2. Que la puerta del panel sea de verdad. Hoy el usuario y la contraseña
--      estan escritos en la pagina: quien sepa mirar el codigo entra. Con esto
--      la comprobacion pasa en el servidor.
--   3. Que al mudarse a su dominio no se pierda nada. Lo que hay guardado en
--      el navegador es por origen: el dia que la web pase de un dominio a otro,
--      eso se queda atras. Lo que esta aqui, no.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- La tabla
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

comment on table public.sede is
  'Las fichas de las iglesias del grupo. Las lee la web publica y las escribe el panel.';
comment on column public.sede.publicada is
  'false = preparada pero no sale en la web. Es el boton que evita publicar una ficha a medio escribir.';

create index if not exists sede_orden_idx on public.sede (orden);

-- `tocada` se actualiza sola: si hay que ponerla a mano, un dia se olvida.
create or replace function public.tocar_sede()
returns trigger language plpgsql as $$
begin
  new.tocada = now();
  return new;
end $$;

drop trigger if exists sede_tocada on public.sede;
create trigger sede_tocada before update on public.sede
  for each row execute function public.tocar_sede();

-- ----------------------------------------------------------------------------
-- Quien puede hacer que
--
-- La clave `anon` de Supabase es publica por diseño: va dentro de la pagina y
-- cualquiera la ve. Lo que protege NO es la clave, son estas reglas.
-- ----------------------------------------------------------------------------
alter table public.sede enable row level security;

drop policy if exists "cualquiera lee las publicadas" on public.sede;
drop policy if exists "quien ha entrado lo ve todo"  on public.sede;
drop policy if exists "quien ha entrado escribe"     on public.sede;
drop policy if exists "quien ha entrado corrige"     on public.sede;
drop policy if exists "quien ha entrado borra"       on public.sede;

-- La web publica. Solo lee, y solo lo publicado: una ficha en borrador no
-- sale ni aunque alguien pida la tabla entera a mano con la clave anon.
create policy "cualquiera lee las publicadas"
  on public.sede for select
  to anon
  using (publicada = true);

-- El encargado, una vez ha entrado con su correo y su contraseña.
create policy "quien ha entrado lo ve todo"
  on public.sede for select to authenticated using (true);

create policy "quien ha entrado escribe"
  on public.sede for insert to authenticated with check (true);

create policy "quien ha entrado corrige"
  on public.sede for update to authenticated using (true) with check (true);

create policy "quien ha entrado borra"
  on public.sede for delete to authenticated using (true);

-- ============================================================================
-- DESPUES DE EJECUTAR ESTO
--
-- 1. Authentication → Providers → Email: dejar activado SOLO el correo.
--    Desactivar "Enable email signups": las cuentas las crea el administrador,
--    nadie se registra solo. Si no, cualquiera que encuentre la direccion del
--    panel se hace una cuenta y edita la web de la iglesia.
--
-- 2. Authentication → Users → Add user: la cuenta del encargado.
--    Marcar "Auto Confirm User", que si no se queda esperando un correo de
--    confirmacion que nunca mira.
--
-- 3. Settings → API: copiar la Project URL y la clave anon, y ponerlas en
--    almacen.js. Nada mas.
--
-- 4. Comprobar que funciona: entrar en /panel/, crear una ficha de prueba,
--    abrirla desde OTRO telefono. Si no se ve desde el otro telefono, algo de
--    esto no se ha hecho.
-- ============================================================================
