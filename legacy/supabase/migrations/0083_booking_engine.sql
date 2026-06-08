-- Booking-Engine: echtes Self-Service-Online-Buchungs-Widget mit
-- Slot-/Verfuegbarkeitslogik. Schliesst die Haupt-Wettbewerbsluecke
-- gegenueber Shore / Treatwell / Gastronovi.
-- Idempotent.

create extension if not exists pgcrypto;

-- Buchbare Leistungen.
create table if not exists public.booking_services (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  description text,
  category text,
  duration_minutes int not null default 30,
  buffer_after_minutes int not null default 0,
  price_eur numeric(12,2) not null default 0,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_booking_services_customer on public.booking_services(customer_id, active);

-- Mitarbeiter / Ressourcen (Stuhl, Raum, Person).
create table if not exists public.booking_resources (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  role text,
  resource_type text not null default 'staff',  -- staff | room | equipment
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_booking_resources_customer on public.booking_resources(customer_id, active);

-- M:N — welche Ressource kann welche Leistung.
create table if not exists public.booking_resource_services (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.booking_resources(id) on delete cascade,
  service_id uuid not null references public.booking_services(id) on delete cascade,
  unique (resource_id, service_id)
);

-- Oeffnungs-/Arbeitszeiten. resource_id NULL = gilt fuer den ganzen Betrieb.
create table if not exists public.booking_business_hours (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  resource_id uuid references public.booking_resources(id) on delete cascade,
  weekday int not null,                          -- 0=So .. 6=Sa
  open_time text not null,                       -- 'HH:MM'
  close_time text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_hours_customer on public.booking_business_hours(customer_id, weekday);

-- Ausnahmen / Feiertage / Urlaub (komplette Sperrung eines Tages oder
-- Zeitfensters).
create table if not exists public.booking_blackouts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  resource_id uuid references public.booking_resources(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_blackouts_customer on public.booking_blackouts(customer_id, start_at);

-- Pro-Customer-Buchungs-Konfiguration.
create table if not exists public.booking_settings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  slot_granularity_minutes int not null default 15,
  min_lead_time_hours int not null default 2,    -- frühestens X Std. im Voraus
  max_advance_days int not null default 60,      -- spätestens X Tage im Voraus
  timezone text not null default 'Europe/Berlin',
  confirmation_mode text not null default 'auto', -- auto | manual
  booking_slug text unique,                       -- /book/<slug>
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists idx_booking_settings_slug on public.booking_settings(booking_slug);

-- appointments-Tabelle (existiert bereits) um Booking-Felder erweitern.
alter table if exists public.appointments
  add column if not exists service_id uuid,
  add column if not exists resource_id uuid,
  add column if not exists end_time timestamptz,
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists title text,
  add column if not exists price numeric(12,2),
  add column if not exists booking_source text default 'admin',  -- admin | online_widget
  add column if not exists confirmation_status text default 'confirmed'; -- confirmed | pending | cancelled

create index if not exists idx_appointments_resource_time on public.appointments(resource_id, start_time);
create index if not exists idx_appointments_service on public.appointments(service_id);

alter table public.booking_services enable row level security;
alter table public.booking_resources enable row level security;
alter table public.booking_resource_services enable row level security;
alter table public.booking_business_hours enable row level security;
alter table public.booking_blackouts enable row level security;
alter table public.booking_settings enable row level security;

-- Public-Read fuer das Buchungs-Widget (Endkunden brauchen anon-Lesezugriff
-- auf Services + Hours + Settings). Schreiben nur Admin (Service-Role).
do $$
declare t text;
begin
  for t in select unnest(array['booking_services','booking_resources','booking_resource_services','booking_business_hours','booking_settings']) loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='booking_public_read') then
      begin
        execute format('create policy booking_public_read on public.%I for select to anon, authenticated using (true)', t);
      exception when others then raise notice 'booking_public_read skipped on %: %', t, sqlerrm; end;
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='mmos_admin_write') then
      begin
        execute format('create policy mmos_admin_write on public.%I for all to authenticated using (coalesce(public.mmos_is_admin(), false)) with check (coalesce(public.mmos_is_admin(), false))', t);
      exception when others then raise notice 'mmos_admin_write skipped on %: %', t, sqlerrm; end;
    end if;
  end loop;
end $$;
