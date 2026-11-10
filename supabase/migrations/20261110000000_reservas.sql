-- ============================================================================
-- Nube Estudio · Sistema de reservas de clases
-- Se corre una sola vez en Supabase: SQL Editor → pegar todo → Run
-- (o `supabase db push` si usás la CLI).
--
-- Cómo funciona:
--   · disciplines = qué se enseña (Pilates Reformer, Mat, Danza, Piano, Guitarra)
--   · classes     = la grilla semanal: "Reformer, lunes 18:00, 4 lugares"
--                   (una clase individual de piano es una clase con cupo 1)
--   · closures    = días o franjas sin clases (feriados, vacaciones)
--   · bookings    = cada alumna anotada a una clase de un día puntual
--
-- Horas: se guardan en UTC (timestamptz) y se calculan en settings.timezone
-- (America/Argentina/Buenos_Aires).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Ajustes generales (una sola fila)
-- ---------------------------------------------------------------------------
create table public.settings (
  id               int primary key default 1 check (id = 1),
  timezone         text not null default 'America/Argentina/Buenos_Aires',
  min_notice_hours int  not null default 2   check (min_notice_hours between 0 and 168),
  max_days_ahead   int  not null default 21  check (max_days_ahead between 1 and 120),
  cancel_hours     int  not null default 12  check (cancel_hours between 0 and 168),
  reminder_hours   int  not null default 24  check (reminder_hours between 1 and 168),
  -- adónde llegan los avisos de reservas nuevas (y a quién responde la alumna)
  admin_email      text not null default '',
  -- dirección pública del sitio (para los links de los emails)
  site_url         text not null default 'http://localhost:5173',
  address          text not null default 'José Mármol, Buenos Aires',
  whatsapp         text not null default '5491161084203',
  -- Datos de pago que van en el email de confirmación
  transfer_alias   text not null default '',
  transfer_cbu     text not null default '',
  transfer_holder  text not null default '',
  mp_link          text not null default '',   -- link de pago de Mercado Pago (opcional)
  pay_at_studio    boolean not null default true,
  payment_note     text not null default 'Mandanos el comprobante por WhatsApp y te confirmamos el lugar.'
);
insert into public.settings (id) values (1);

-- ---------------------------------------------------------------------------
-- Disciplinas
-- ---------------------------------------------------------------------------
create table public.disciplines (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null check (key ~ '^[a-z0-9-]+$'),
  name        text not null,
  description text not null default '',
  kind        text not null default 'group' check (kind in ('group', 'individual')),
  price       numeric(10,2) not null default 0 check (price >= 0),
  minutes     int  not null default 60 check (minutes between 15 and 240),
  active      boolean not null default true,
  sort        int  not null default 0
);

-- ---------------------------------------------------------------------------
-- Grilla semanal (weekday ISO: 1 = lunes … 7 = domingo)
-- ---------------------------------------------------------------------------
create table public.classes (
  id            uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines (id) on delete cascade,
  weekday       smallint not null check (weekday between 1 and 7),
  start_time    time not null,
  minutes       int  check (minutes between 15 and 240),   -- vacío = la de la disciplina
  capacity      int  not null check (capacity between 1 and 100),
  teacher       text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index classes_weekday_idx on public.classes (weekday) where active;

-- Días o franjas sin clases
create table public.closures (
  id        uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at   timestamptz not null check (ends_at > starts_at),
  label     text
);

-- ---------------------------------------------------------------------------
-- Reservas
-- ---------------------------------------------------------------------------
create type public.booking_status as enum (
  'pending_payment',  -- lugar guardado, falta el pago
  'paid',             -- pagada
  'confirmed',        -- confirmada sin pago (clase gratis o abona en el estudio)
  'cancelled'
);

create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  class_id         uuid references public.classes (id) on delete set null,
  discipline_id    uuid not null references public.disciplines (id) on delete restrict,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null check (ends_at > starts_at),
  status           public.booking_status not null,
  price            numeric(10,2) not null default 0,
  client_name      text not null check (length(client_name) between 1 and 120),
  -- puede quedar vacío en reservas cargadas a mano desde el panel
  client_email     text check (client_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  client_phone     text check (length(client_phone) <= 40),
  notes            text check (length(notes) <= 2000),
  source           text not null default 'web' check (source in ('web', 'admin')),
  cancel_token     uuid not null default gen_random_uuid() unique,
  reminder_sent_at timestamptz,
  paid_at          timestamptz,
  cancelled_at     timestamptz,
  created_at       timestamptz not null default now()
);

create index bookings_occurrence_idx on public.bookings (class_id, starts_at) where status <> 'cancelled';
create index bookings_starts_at_idx on public.bookings (starts_at);
-- La misma persona no puede anotarse dos veces a la misma clase del mismo día
create unique index bookings_one_per_person on public.bookings (class_id, starts_at, client_email)
  where status <> 'cancelled';

-- Fechas de pago/cancelación automáticas al cambiar el estado
create function public.bookings_status_dates() returns trigger
language plpgsql as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status <> 'paid') then
    new.paid_at := coalesce(new.paid_at, now());
  elsif new.status <> 'paid' then
    new.paid_at := null;
  end if;
  if new.status = 'cancelled' and (tg_op = 'INSERT' or old.status <> 'cancelled') then
    new.cancelled_at := now();
  elsif new.status <> 'cancelled' then
    new.cancelled_at := null;
  end if;
  return new;
end $$;

create trigger bookings_status_dates
  before insert or update of status on public.bookings
  for each row execute function public.bookings_status_dates();

-- ---------------------------------------------------------------------------
-- Administradoras (Lisbeth). Se agrega con:
--   insert into public.admins (user_id) select id from auth.users where email = '...';
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

-- ============================================================================
-- Lógica de agenda
-- ============================================================================

-- Todas las clases (de la grilla semanal) entre dos fechas, con los lugares
-- que quedan. No filtra por anticipación: eso lo hace public_schedule.
create function public.class_occurrences(p_from date, p_to date)
returns table (
  class_id uuid, discipline_id uuid, discipline_key text, discipline_name text,
  kind text, starts_at timestamptz, ends_at timestamptz, capacity int,
  taken int, spots_left int, price numeric, teacher text
)
language sql stable security definer set search_path = public as $$
  with st as (select timezone as tz from settings where id = 1),
  occ as (
    select c.id as class_id, d.id as discipline_id, d.key, d.name, d.kind,
           (g::date + c.start_time) at time zone st.tz as starts_at,
           coalesce(c.minutes, d.minutes) as mins,
           c.capacity, d.price, c.teacher, d.sort
      from st,
           generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') g
      join classes c on c.active and c.weekday = extract(isodow from g)
      join disciplines d on d.id = c.discipline_id and d.active
  )
  select o.class_id, o.discipline_id, o.key, o.name, o.kind, o.starts_at,
         o.starts_at + make_interval(mins => o.mins), o.capacity,
         coalesce(t.n, 0)::int,
         greatest(o.capacity - coalesce(t.n, 0), 0)::int,
         o.price, o.teacher
    from occ o
    left join lateral (
      select count(*) as n from bookings b
       where b.class_id = o.class_id and b.starts_at = o.starts_at and b.status <> 'cancelled'
    ) t on true
   where not exists (
     select 1 from closures k
      where tstzrange(k.starts_at, k.ends_at) && tstzrange(o.starts_at, o.starts_at + make_interval(mins => o.mins))
   )
   order by o.starts_at, o.sort, o.name
$$;

-- Lo que ve el sitio: clases reservables (con anticipación mínima y hasta
-- max_days_ahead días). Incluye las llenas, para mostrar "Completa".
create function public.public_schedule(p_from date, p_to date)
returns table (
  class_id uuid, discipline_key text, discipline_name text, kind text,
  starts_at timestamptz, ends_at timestamptz, capacity int, spots_left int,
  price numeric, teacher text
)
language plpgsql stable security definer set search_path = public as $$
declare
  st      settings;
  v_today date;
begin
  select * into st from settings where id = 1;
  v_today := (now() at time zone st.timezone)::date;
  return query
  select o.class_id, o.discipline_key, o.discipline_name, o.kind, o.starts_at, o.ends_at,
         o.capacity, o.spots_left, o.price, o.teacher
    from class_occurrences(greatest(p_from, v_today),
                           least(p_to, v_today + st.max_days_ahead, greatest(p_from, v_today) + 62)) o
   where o.starts_at >= now() + make_interval(hours => st.min_notice_hours);
end $$;

-- Reserva desde el sitio. La llama la función `book` (servidor), no el navegador.
create function public.create_booking(
  p_class_id  uuid,
  p_starts_at timestamptz,
  p_name      text,
  p_email     text,
  p_phone     text,
  p_notes     text
) returns public.bookings
language plpgsql volatile security definer set search_path = public as $$
declare
  st    settings;
  cls   classes;
  occ   record;
  b     bookings;
  v_day date;
begin
  select * into st from settings where id = 1;
  -- Bloquea la clase: dos reservas al mismo tiempo no superan el cupo
  select * into cls from classes where id = p_class_id for update;
  if not found then raise exception 'class_not_found'; end if;

  v_day := (p_starts_at at time zone st.timezone)::date;
  select * into occ from public_schedule(v_day, v_day) s
   where s.class_id = p_class_id and s.starts_at = p_starts_at;
  if not found then raise exception 'class_unavailable'; end if;
  if occ.spots_left <= 0 then raise exception 'class_full'; end if;

  if exists (select 1 from bookings
              where class_id = p_class_id and starts_at = p_starts_at and status <> 'cancelled'
                and client_email = lower(trim(p_email))) then
    raise exception 'already_registered';
  end if;

  insert into bookings (class_id, discipline_id, starts_at, ends_at, status, price,
                        client_name, client_email, client_phone, notes)
  values (cls.id, cls.discipline_id, occ.starts_at, occ.ends_at,
          case when occ.price > 0 then 'pending_payment' else 'confirmed' end::booking_status,
          occ.price, trim(p_name), lower(trim(p_email)), nullif(trim(p_phone), ''),
          nullif(trim(p_notes), ''))
  returning * into b;
  return b;
end $$;

-- Cancelación por la alumna con el link del email (hasta cancel_hours antes)
create function public.cancel_booking(p_token uuid) returns public.bookings
language plpgsql volatile security definer set search_path = public as $$
declare
  b  bookings;
  st settings;
begin
  select * into st from settings where id = 1;
  select * into b from bookings where cancel_token = p_token for update;
  if not found then raise exception 'booking_not_found'; end if;
  if b.status = 'cancelled' then raise exception 'already_cancelled'; end if;
  if b.starts_at <= now() then raise exception 'booking_past'; end if;
  if b.starts_at < now() + make_interval(hours => st.cancel_hours) then
    raise exception 'too_late';
  end if;
  update bookings set status = 'cancelled' where id = b.id returning * into b;
  return b;
end $$;

-- Datos de una reserva por su token (página de cancelación)
create function public.booking_by_token(p_token uuid)
returns table (status public.booking_status, starts_at timestamptz, ends_at timestamptz,
               discipline_name text, cancel_until timestamptz)
language sql stable security definer set search_path = public as $$
  select b.status, b.starts_at, b.ends_at, d.name,
         b.starts_at - make_interval(hours => (select cancel_hours from settings where id = 1))
    from bookings b
    join disciplines d on d.id = b.discipline_id
   where b.cancel_token = p_token
$$;

-- Datos públicos de pago y contacto (sin el email de la administradora)
create function public.public_settings()
returns table (address text, whatsapp text, transfer_alias text, transfer_cbu text,
               transfer_holder text, mp_link text, pay_at_studio boolean, payment_note text,
               cancel_hours int, max_days_ahead int)
language sql stable security definer set search_path = public as $$
  select address, whatsapp, transfer_alias, transfer_cbu, transfer_holder, mp_link,
         pay_at_studio, payment_note, cancel_hours, max_days_ahead
    from settings where id = 1
$$;

-- ============================================================================
-- Permisos (Row Level Security)
-- El público solo ve disciplinas activas y usa las funciones de arriba.
-- El panel (usuaria en public.admins) puede todo.
-- ============================================================================
alter table public.settings    enable row level security;
alter table public.disciplines enable row level security;
alter table public.classes     enable row level security;
alter table public.closures    enable row level security;
alter table public.bookings    enable row level security;
alter table public.admins      enable row level security;

create policy "disciplinas activas visibles" on public.disciplines
  for select using (active or public.is_admin());

create policy "admin settings"    on public.settings    for all using (public.is_admin()) with check (public.is_admin());
create policy "admin disciplines" on public.disciplines for all using (public.is_admin()) with check (public.is_admin());
create policy "admin classes"     on public.classes     for all using (public.is_admin()) with check (public.is_admin());
create policy "admin closures"    on public.closures    for all using (public.is_admin()) with check (public.is_admin());
create policy "admin bookings"    on public.bookings    for all using (public.is_admin()) with check (public.is_admin());
create policy "admin ve admins"   on public.admins      for select using (public.is_admin());

grant usage on schema public to anon, authenticated, service_role;
grant select on public.disciplines to anon;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;

-- Funciones: el sitio solo consulta; reservar y cancelar pasa por el servidor
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.public_schedule(date, date)    to anon, authenticated;
grant execute on function public.public_settings()              to anon, authenticated;
grant execute on function public.booking_by_token(uuid)         to anon, authenticated;
grant execute on function public.is_admin()                     to anon, authenticated;
grant execute on function public.create_booking(uuid, timestamptz, text, text, text, text) to service_role;
grant execute on function public.cancel_booking(uuid)           to service_role;

-- Grilla completa (pasadas y llenas incluidas) solo para el panel
create function public.admin_schedule(p_from date, p_to date)
returns table (
  class_id uuid, discipline_id uuid, discipline_key text, discipline_name text,
  kind text, starts_at timestamptz, ends_at timestamptz, capacity int,
  taken int, spots_left int, price numeric, teacher text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'unauthorized'; end if;
  return query select * from class_occurrences(p_from, least(p_to, p_from + 62));
end $$;
revoke execute on function public.admin_schedule(date, date) from public, anon;
grant execute on function public.admin_schedule(date, date) to authenticated;

-- ============================================================================
-- Datos iniciales DE EJEMPLO: Lisbeth los cambia desde el panel
-- (Disciplinas y Horarios). Precios en pesos.
-- ============================================================================
insert into public.disciplines (key, name, description, kind, price, minutes, sort) values
  ('pilates-reformer', 'Pilates Reformer',
   'Clase en camilla Reformer en grupos reducidos. Fortalece, alinea y mejora la postura.', 'group', 15000, 50, 10),
  ('pilates-mat', 'Pilates Mat',
   'Pilates en colchoneta con elementos: pelota, bandas y pesitas. Ideal para empezar.', 'group', 10000, 50, 20),
  ('danza', 'Danza',
   'Clases de danza para trabajar técnica, expresión y musicalidad.', 'group', 10000, 60, 30),
  ('piano', 'Piano',
   'Clase individual de piano, para todas las edades y niveles.', 'individual', 18000, 45, 40),
  ('guitarra', 'Guitarra',
   'Clase individual de guitarra criolla o eléctrica, desde cero o para avanzar.', 'individual', 18000, 45, 50);

insert into public.classes (discipline_id, weekday, start_time, capacity, teacher)
select d.id, x.weekday, x.t::time, x.cap, null
  from (values
    ('pilates-reformer', 1, '09:00', 4), ('pilates-reformer', 1, '18:00', 4), ('pilates-reformer', 1, '19:00', 4),
    ('pilates-reformer', 3, '09:00', 4), ('pilates-reformer', 3, '18:00', 4), ('pilates-reformer', 3, '19:00', 4),
    ('pilates-reformer', 5, '18:00', 4), ('pilates-reformer', 6, '10:00', 4),
    ('pilates-mat', 2, '10:00', 8), ('pilates-mat', 2, '19:00', 8), ('pilates-mat', 4, '10:00', 8), ('pilates-mat', 4, '19:00', 8),
    ('danza', 3, '17:00', 10), ('danza', 5, '17:00', 10), ('danza', 6, '11:00', 10),
    ('piano', 2, '16:00', 1), ('piano', 2, '17:00', 1), ('piano', 4, '16:00', 1), ('piano', 4, '17:00', 1),
    ('guitarra', 1, '16:00', 1), ('guitarra', 1, '17:00', 1), ('guitarra', 3, '16:00', 1)
  ) as x(key, weekday, t, cap)
  join public.disciplines d on d.key = x.key;
