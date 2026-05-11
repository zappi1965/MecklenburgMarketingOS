
-- Mecklenburg Marketing OS - Persistent Fullstack Schema
-- Run in Supabase SQL Editor.
create extension if not exists "pgcrypto";

do $$ begin create type app_role as enum ('admin','employee','customer'); exception when duplicate_object then null; end $$;
do $$ begin create type customer_status as enum ('Aktiv','Lead','Inaktiv'); exception when duplicate_object then null; end $$;
do $$ begin create type invoice_status as enum ('Bezahlt','Offen','Überfällig'); exception when duplicate_object then null; end $$;
do $$ begin create type ticket_status as enum ('angekommen','in Bearbeitung','erledigt'); exception when duplicate_object then null; end $$;
do $$ begin create type lead_search_status as enum ('Aktiv','Inaktiv','In Arbeit','Abgeschlossen'); exception when duplicate_object then null; end $$;

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
  created_at timestamptz not null default now()
);

create table if not exists public.user_customer_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  unique(user_id, customer_id)
);

create table if not exists public.customer_modules (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  unique(customer_id, module_key)
);

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
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  notes text,
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

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
  found_at date not null default current_date
);

create table if not exists public.qr_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  target_url text not null,
  negative_feedback_email text not null,
  scans integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  platform text not null,
  api_key text not null,
  created_at timestamptz not null default now(),
  unique(customer_id, platform)
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

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','employee'));
$$;

create or replace function public.can_access_customer(c_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select public.is_admin() or exists(select 1 from public.user_customer_access where user_id = auth.uid() and customer_id = c_id);
$$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.user_customer_access enable row level security;
alter table public.customer_modules enable row level security;
alter table public.lead_meetings enable row level security;
alter table public.service_categories enable row level security;
alter table public.appointments enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.email_template_categories enable row level security;
alter table public.email_templates enable row level security;
alter table public.invoices enable row level security;
alter table public.lead_searches enable row level security;
alter table public.lead_contacts enable row level security;
alter table public.qr_campaigns enable row level security;
alter table public.integrations enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (id=auth.uid() or public.is_admin());
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists customers_read on public.customers;
create policy customers_read on public.customers for select using (public.can_access_customer(id));
drop policy if exists customers_admin_write on public.customers;
create policy customers_admin_write on public.customers for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists user_customer_access_admin on public.user_customer_access;
create policy user_customer_access_admin on public.user_customer_access for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists user_customer_access_self on public.user_customer_access;
create policy user_customer_access_self on public.user_customer_access for select using (user_id=auth.uid());

do $$
declare t text;
begin
  foreach t in array array['customer_modules','lead_meetings','service_categories','appointments','tickets','invoices','qr_campaigns','integrations']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_read', t);
    execute format('create policy %I on public.%I for select using (public.can_access_customer(customer_id))', t||'_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_admin_write', t);
    execute format('create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())', t||'_admin_write', t);
    execute format('drop policy if exists %I on public.%I', t||'_customer_insert', t);
    execute format('create policy %I on public.%I for insert with check (public.can_access_customer(customer_id))', t||'_customer_insert', t);
  end loop;
end $$;

drop policy if exists ticket_messages_read on public.ticket_messages;
create policy ticket_messages_read on public.ticket_messages for select using (
  public.is_admin() or exists(select 1 from public.tickets t where t.id=ticket_id and public.can_access_customer(t.customer_id))
);
drop policy if exists ticket_messages_insert on public.ticket_messages;
create policy ticket_messages_insert on public.ticket_messages for insert with check (
  public.is_admin() or exists(select 1 from public.tickets t where t.id=ticket_id and public.can_access_customer(t.customer_id))
);

drop policy if exists email_cats_read on public.email_template_categories;
create policy email_cats_read on public.email_template_categories for select using (auth.uid() is not null);
drop policy if exists email_cats_admin on public.email_template_categories;
create policy email_cats_admin on public.email_template_categories for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists email_templates_read on public.email_templates;
create policy email_templates_read on public.email_templates for select using (auth.uid() is not null);
drop policy if exists email_templates_admin on public.email_templates;
create policy email_templates_admin on public.email_templates for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists lead_searches_admin on public.lead_searches;
create policy lead_searches_admin on public.lead_searches for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists lead_contacts_admin on public.lead_contacts;
create policy lead_contacts_admin on public.lead_contacts for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists audit_admin on public.audit_logs;
create policy audit_admin on public.audit_logs for all using (public.is_admin()) with check (public.is_admin());

insert into public.email_template_categories(name)
values ('Bewertungsanfrage'),('Mahnung'),('Monatsreport'),('Terminbestätigung')
on conflict(name) do nothing;

insert into public.customers(name,contact_name,email,phone,status,branch,revenue,rating)
values
('Friseur Profi','Max Mustermann','kontakt1@example.de','0381 100001','Aktiv','Beauty',1380,4.8),
('Barber Lounge Rostock','Kevin Müller','kontakt2@example.de','0381 100002','Aktiv','Beauty',1840,4.7)
on conflict do nothing;
