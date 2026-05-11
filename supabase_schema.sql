
-- Mecklenburg Marketing OS - Supabase Database Schema
-- Run this in Supabase SQL Editor.
-- Safe order: extensions -> tables -> functions -> RLS -> policies -> seed data.

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
do $$ begin
  create type app_role as enum ('admin','employee','customer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type customer_status as enum ('Aktiv','Lead','Inaktiv');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum ('Bezahlt','Offen','Überfällig');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_status as enum ('angekommen','in Bearbeitung','erledigt');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_search_status as enum ('Aktiv','Inaktiv','In Arbeit','Abgeschlossen');
exception when duplicate_object then null; end $$;

-- ---------- CORE ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role app_role not null default 'customer',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  status customer_status not null default 'Lead',
  branch text,
  revenue numeric(12,2) not null default 0,
  rating numeric(3,2) not null default 0,
  profile_image_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_customer_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, customer_id)
);

create table if not exists public.customer_modules (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(customer_id, module_key)
);

-- ---------- CRM DETAIL ----------
create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_files (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name text not null,
  file_url text not null,
  file_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_activity (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- ---------- SEO / REVIEWS / REPUTATION ----------
create table if not exists public.seo_snapshots (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  organic_traffic integer not null default 0,
  top10_keywords integer not null default 0,
  avg_position numeric(6,2) not null default 0,
  impressions integer not null default 0,
  ctr numeric(6,2) not null default 0,
  backlinks integer not null default 0,
  period_start date not null default (current_date - interval '30 days')::date,
  period_end date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.seo_keywords (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  keyword text not null,
  position numeric(6,2),
  clicks integer default 0,
  impressions integer default 0,
  source text default 'Google Business Profile',
  created_at timestamptz not null default now()
);

create table if not exists public.seo_checks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  status text not null default 'offen',
  recommendation text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  platform text not null default 'Google',
  author_name text,
  rating integer not null check (rating between 1 and 5),
  text text,
  response text,
  created_at timestamptz not null default now()
);

create table if not exists public.reputation_alerts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  rule_name text not null,
  platform text,
  keyword text,
  active boolean not null default true,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- BOOKING ----------
create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  price numeric(12,2) default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_category_id uuid references public.service_categories(id) on delete set null,
  client_name text not null,
  client_email text,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  goal text,
  notes text,
  created_at timestamptz not null default now()
);

-- Lead Gespräche
create table if not exists public.lead_meetings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  meeting_date date not null,
  start_time time not null,
  end_time time not null,
  goal text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- INVOICES / BILLING ----------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete cascade,
  amount numeric(12,2) not null,
  invoice_date date not null default current_date,
  due_date date not null default (current_date + interval '14 days')::date,
  status invoice_status not null default 'Offen',
  service text,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  level text not null default '1. Mahnung',
  fee numeric(12,2) not null default 15,
  pdf_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  plan_name text not null,
  monthly_price numeric(12,2) not null,
  active boolean not null default true,
  started_at date not null default current_date,
  created_invoice_id uuid references public.invoices(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- LEADS ----------
create table if not exists public.lead_searches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branch text,
  area text,
  status lead_search_status not null default 'Aktiv',
  seven_day_trend integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_contacts (
  id uuid primary key default gen_random_uuid(),
  lead_search_id uuid not null references public.lead_searches(id) on delete cascade,
  name text not null,
  company text,
  email text,
  phone text,
  source text,
  found_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------- QR / REPORTS / EMAIL ----------
create table if not exists public.qr_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  target_url text not null,
  negative_feedback_email text not null,
  scans integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.email_template_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.email_template_categories(id) on delete cascade,
  name text not null,
  body text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  selected_kpis text[] not null default '{}',
  pdf_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- SUPPORT ----------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  description text,
  status ticket_status not null default 'angekommen',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  message text not null,
  is_admin_feedback boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- INTEGRATIONS / COMPETITORS / AUDIT ----------
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  platform text not null,
  api_key text not null,
  created_at timestamptz not null default now(),
  unique(customer_id, platform)
);

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  google_profile_url text,
  rating numeric(3,2),
  review_count integer,
  visibility_rank integer,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  rule_name text not null,
  applies_to_all boolean not null default false,
  days_overdue integer,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  action text not null,
  entity text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

-- ---------- FUNCTIONS ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','employee')
  );
$$;

create or replace function public.can_access_customer(c_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_admin()
  or exists (
    select 1 from public.user_customer_access
    where user_id = auth.uid() and customer_id = c_id
  );
$$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.user_customer_access enable row level security;
alter table public.customer_modules enable row level security;
alter table public.customer_contacts enable row level security;
alter table public.customer_notes enable row level security;
alter table public.customer_files enable row level security;
alter table public.customer_activity enable row level security;
alter table public.seo_snapshots enable row level security;
alter table public.seo_keywords enable row level security;
alter table public.seo_checks enable row level security;
alter table public.reviews enable row level security;
alter table public.reputation_alerts enable row level security;
alter table public.service_categories enable row level security;
alter table public.appointments enable row level security;
alter table public.lead_meetings enable row level security;
alter table public.invoices enable row level security;
alter table public.reminders enable row level security;
alter table public.subscriptions enable row level security;
alter table public.lead_searches enable row level security;
alter table public.lead_contacts enable row level security;
alter table public.qr_campaigns enable row level security;
alter table public.email_template_categories enable row level security;
alter table public.email_templates enable row level security;
alter table public.reports enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.integrations enable row level security;
alter table public.competitors enable row level security;
alter table public.automations enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
for update using (id = auth.uid() or public.is_admin());

-- Customers
drop policy if exists "customers_access" on public.customers;
create policy "customers_access" on public.customers
for select using (public.is_admin() or public.can_access_customer(id));

drop policy if exists "customers_admin_write" on public.customers;
create policy "customers_admin_write" on public.customers
for all using (public.is_admin()) with check (public.is_admin());

-- Generic customer_id policies
do $$
declare t text;
begin
  foreach t in array array[
    'customer_modules','customer_contacts','customer_notes','customer_files','customer_activity',
    'seo_snapshots','seo_keywords','seo_checks','reviews','reputation_alerts',
    'service_categories','appointments','lead_meetings','invoices','subscriptions',
    'qr_campaigns','reports','tickets','integrations','competitors','automations'
  ]
  loop
    execute format('drop policy if exists "%s_access" on public.%I', t, t);
    execute format('create policy "%s_access" on public.%I for select using (public.can_access_customer(customer_id))', t, t);
    execute format('drop policy if exists "%s_admin_write" on public.%I', t, t);
    execute format('create policy "%s_admin_write" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- Customer can create own support tickets and notes/appointments if they have access
drop policy if exists "tickets_customer_insert" on public.tickets;
create policy "tickets_customer_insert" on public.tickets
for insert with check (public.can_access_customer(customer_id));

drop policy if exists "appointments_customer_insert" on public.appointments;
create policy "appointments_customer_insert" on public.appointments
for insert with check (public.can_access_customer(customer_id));

drop policy if exists "customer_notes_customer_insert" on public.customer_notes;
create policy "customer_notes_customer_insert" on public.customer_notes
for insert with check (public.can_access_customer(customer_id));

-- Ticket messages
drop policy if exists "ticket_messages_access" on public.ticket_messages;
create policy "ticket_messages_access" on public.ticket_messages
for select using (
  public.is_admin()
  or exists (
    select 1 from public.tickets t
    where t.id = ticket_id and public.can_access_customer(t.customer_id)
  )
);

drop policy if exists "ticket_messages_insert" on public.ticket_messages;
create policy "ticket_messages_insert" on public.ticket_messages
for insert with check (
  public.is_admin()
  or exists (
    select 1 from public.tickets t
    where t.id = ticket_id and public.can_access_customer(t.customer_id)
  )
);

-- Lead searches are admin-only
drop policy if exists "lead_searches_admin" on public.lead_searches;
create policy "lead_searches_admin" on public.lead_searches
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lead_contacts_admin" on public.lead_contacts;
create policy "lead_contacts_admin" on public.lead_contacts
for all using (public.is_admin()) with check (public.is_admin());

-- Email templates visible to all logged in, writable by admin
drop policy if exists "email_categories_select" on public.email_template_categories;
create policy "email_categories_select" on public.email_template_categories
for select using (auth.uid() is not null);

drop policy if exists "email_categories_admin_write" on public.email_template_categories;
create policy "email_categories_admin_write" on public.email_template_categories
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "email_templates_select" on public.email_templates;
create policy "email_templates_select" on public.email_templates
for select using (auth.uid() is not null);

drop policy if exists "email_templates_admin_write" on public.email_templates;
create policy "email_templates_admin_write" on public.email_templates
for all using (public.is_admin()) with check (public.is_admin());

-- Reminders through invoice access
drop policy if exists "reminders_access" on public.reminders;
create policy "reminders_access" on public.reminders
for select using (
  public.is_admin()
  or exists (
    select 1 from public.invoices i
    where i.id = invoice_id and public.can_access_customer(i.customer_id)
  )
);

drop policy if exists "reminders_admin_write" on public.reminders;
create policy "reminders_admin_write" on public.reminders
for all using (public.is_admin()) with check (public.is_admin());

-- audit logs admin-only
drop policy if exists "audit_logs_admin" on public.audit_logs;
create policy "audit_logs_admin" on public.audit_logs
for all using (public.is_admin()) with check (public.is_admin());

-- ---------- SEED DATA ----------
insert into public.email_template_categories (name)
values ('Bewertungsanfrage'), ('Mahnung'), ('Monatsreport'), ('Terminbestätigung')
on conflict (name) do nothing;

insert into public.customers (name, contact_name, email, phone, status, branch, revenue, rating)
values
('Friseur Profi','Max Mustermann','kontakt1@example.de','0381 100001','Aktiv','Beauty',1380,4.8),
('Barber Lounge Rostock','Kevin Müller','kontakt2@example.de','0381 100002','Aktiv','Beauty',1840,4.7),
('Autohaus Schmidt','Lisa Schneider','kontakt3@example.de','0381 100003','Lead','Automotive',0,4.5),
('Restaurant Hafenblick','Anna Peters','kontakt4@example.de','0381 100004','Aktiv','Gastronomie',2070,4.6)
on conflict do nothing;

-- Insert modules for all customers
insert into public.customer_modules (customer_id, module_key, enabled)
select c.id, m.module_key, true
from public.customers c
cross join (values
 ('reviews'),('booking'),('seo'),('reputation'),('reports'),('qr'),('integrations'),('competitors'),('forecasts'),('support')
) as m(module_key)
on conflict (customer_id, module_key) do nothing;

-- Seed services
insert into public.service_categories (customer_id, name, price)
select id, 'Fade Cut', 29 from public.customers where name='Friseur Profi'
on conflict do nothing;

insert into public.service_categories (customer_id, name, price)
select id, 'Damen Haarschnitt', 49 from public.customers where name='Friseur Profi'
on conflict do nothing;

-- Seed SEO keywords and reviews for Friseur Profi
insert into public.seo_keywords (customer_id, keyword, position, clicks, impressions)
select id, 'friseur rostock', 3.4, 210, 3400 from public.customers where name='Friseur Profi'
on conflict do nothing;

insert into public.seo_keywords (customer_id, keyword, position, clicks, impressions)
select id, 'fade cut rostock', 5.1, 120, 1900 from public.customers where name='Friseur Profi'
on conflict do nothing;

insert into public.reviews (customer_id, platform, author_name, rating, text)
select id, 'Google', 'Anna Müller', 5, 'Sehr guter Service!' from public.customers where name='Friseur Profi'
on conflict do nothing;

insert into public.reviews (customer_id, platform, author_name, rating, text)
select id, 'Google', 'Kevin Hansen', 4, 'Alles gut gelaufen.' from public.customers where name='Friseur Profi'
on conflict do nothing;

-- Seed lead search
insert into public.lead_searches (name, branch, area, status, seven_day_trend)
values ('Werkstatt Schwerin','Werkstatt','Schwerin','Aktiv',5)
on conflict do nothing;
