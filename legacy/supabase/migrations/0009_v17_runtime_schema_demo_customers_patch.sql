
-- MMOS v17 Runtime Schema + Demo Customers Patch

-- Stack depth fix: simplify helper functions to avoid recursive customer policy calls
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select p.role::text from public.profiles p where p.id = auth.uid()), 'anonymous');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() in ('admin','employee','support','sales','seo_manager','buchhaltung');
$$;

create or replace function public.can_access_customer(c_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is null
  or public.is_admin()
  or exists(
    select 1 from public.user_customer_access uca
    where uca.user_id = auth.uid()
    and uca.customer_id = c_id
  );
$$;

alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists zip text;
alter table public.customers add column if not exists country text default 'Deutschland';
alter table public.customers add column if not exists package_name text default 'Starter';

alter table public.invoices add column if not exists service_type text;
alter table public.integrations add column if not exists api_key text;
alter table public.integrations add column if not exists seo_enabled boolean default false;
alter table public.offers add column if not exists package_name text;

create table if not exists public.invoice_categories (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branch text,
  email text,
  phone text,
  address text,
  zip text,
  city text,
  status text default 'Demo',
  package_name text default 'Starter',
  created_at timestamptz not null default now()
);

create table if not exists public.demo_invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.demo_customers(id) on delete cascade,
  invoice_number text not null,
  service_type text,
  amount numeric(12,2) default 0,
  status text default 'Offen',
  document_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.demo_customers(id) on delete cascade,
  title text not null,
  status text default 'Aktiv',
  package_name text,
  monthly_amount numeric(12,2) default 0,
  document_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.demo_customers(id) on delete cascade,
  client_name text not null,
  appointment_date date not null,
  start_time text,
  end_time text,
  status text default 'Geplant',
  created_at timestamptz not null default now()
);

create table if not exists public.demo_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.demo_customers(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_files (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.demo_customers(id) on delete cascade,
  name text not null,
  file_type text default 'general',
  url text,
  version integer default 1,
  ref_table text,
  ref_id text,
  created_at timestamptz not null default now()
);

alter table public.invoice_categories enable row level security;
alter table public.demo_customers enable row level security;
alter table public.demo_invoices enable row level security;
alter table public.demo_contracts enable row level security;
alter table public.demo_appointments enable row level security;
alter table public.demo_notes enable row level security;
alter table public.demo_files enable row level security;

drop policy if exists invoice_categories_access on public.invoice_categories;
create policy invoice_categories_access on public.invoice_categories for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

drop policy if exists demo_customers_admin on public.demo_customers;
create policy demo_customers_admin on public.demo_customers for all using (public.is_admin() or auth.uid() is null) with check (public.is_admin() or auth.uid() is null);

drop policy if exists demo_invoices_admin on public.demo_invoices;
create policy demo_invoices_admin on public.demo_invoices for all using (public.is_admin() or auth.uid() is null) with check (public.is_admin() or auth.uid() is null);

drop policy if exists demo_contracts_admin on public.demo_contracts;
create policy demo_contracts_admin on public.demo_contracts for all using (public.is_admin() or auth.uid() is null) with check (public.is_admin() or auth.uid() is null);

drop policy if exists demo_appointments_admin on public.demo_appointments;
create policy demo_appointments_admin on public.demo_appointments for all using (public.is_admin() or auth.uid() is null) with check (public.is_admin() or auth.uid() is null);

drop policy if exists demo_notes_admin on public.demo_notes;
create policy demo_notes_admin on public.demo_notes for all using (public.is_admin() or auth.uid() is null) with check (public.is_admin() or auth.uid() is null);

drop policy if exists demo_files_admin on public.demo_files;
create policy demo_files_admin on public.demo_files for all using (public.is_admin() or auth.uid() is null) with check (public.is_admin() or auth.uid() is null);

insert into public.demo_customers (id,name,branch,email,phone,address,zip,city,status,package_name)
values
('aaaaaaaa-1111-1111-1111-111111111111','DEMO Barber Lounge Rostock','Friseur','demo-barber@mmos.local','0381 000001','Demo Straße 1','18055','Rostock','Demo','Growth'),
('aaaaaaaa-2222-2222-2222-222222222222','DEMO NordDach GmbH','Dachdecker','demo-dach@mmos.local','0385 000002','Demo Allee 2','19053','Schwerin','Demo','Premium'),
('aaaaaaaa-3333-3333-3333-333333333333','DEMO Alexas Inselblick','Restaurant','demo-restaurant@mmos.local','03991 000003','Demo Ufer 3','17192','Waren','Demo','Growth'),
('aaaaaaaa-4444-4444-4444-444444444444','DEMO Baltic Fitness Club','Fitnessstudio','demo-fitness@mmos.local','03834 000004','Demo Ring 4','17489','Greifswald','Demo','Premium')
on conflict (id) do update set name=excluded.name, branch=excluded.branch, package_name=excluded.package_name;

insert into public.demo_invoices (customer_id, invoice_number, service_type, amount, status, document_name)
values
('aaaaaaaa-1111-1111-1111-111111111111','DEMO-BAR-001','Google Business Optimierung',499,'Bezahlt','Demo-Rechnung-Barber.pdf'),
('aaaaaaaa-2222-2222-2222-222222222222','DEMO-DACH-001','Premium Local SEO',899,'Offen','Demo-Rechnung-Dach.pdf'),
('aaaaaaaa-3333-3333-3333-333333333333','DEMO-REST-001','Restaurant Sichtbarkeit',499,'Bezahlt','Demo-Rechnung-Restaurant.pdf'),
('aaaaaaaa-4444-4444-4444-444444444444','DEMO-FIT-001','Fitness Lead Funnel',899,'Offen','Demo-Rechnung-Fitness.pdf');

insert into public.demo_contracts (customer_id,title,status,package_name,monthly_amount,document_name)
values
('aaaaaaaa-1111-1111-1111-111111111111','Demo Growth Vertrag','Aktiv','Growth',499,'Demo-Vertrag-Barber.pdf'),
('aaaaaaaa-2222-2222-2222-222222222222','Demo Premium Vertrag','Aktiv','Premium',899,'Demo-Vertrag-Dach.pdf');

insert into public.demo_notes (customer_id,note)
values
('aaaaaaaa-1111-1111-1111-111111111111','Kunde möchte mehr Bewertungen über QR-Karten sammeln.'),
('aaaaaaaa-2222-2222-2222-222222222222','Fokus auf Dachsanierung + Notdienst Keywords.');

insert into public.demo_appointments (customer_id,client_name,appointment_date,start_time,end_time)
values
('aaaaaaaa-1111-1111-1111-111111111111','Demo Onboarding',current_date + 3,'10:00','11:00'),
('aaaaaaaa-2222-2222-2222-222222222222','Demo Lead-Analyse',current_date + 4,'13:00','14:00');

insert into public.demo_files (customer_id,name,file_type,url,version)
values
('aaaaaaaa-1111-1111-1111-111111111111','Demo-Rechnung-Barber.pdf','invoice','#',1),
('aaaaaaaa-1111-1111-1111-111111111111','Demo-Vertrag-Barber.pdf','contract','#',1);

create index if not exists idx_invoice_categories_customer on public.invoice_categories(customer_id);
create index if not exists idx_demo_customers_branch on public.demo_customers(branch);
create index if not exists idx_demo_invoices_customer on public.demo_invoices(customer_id);
