-- MMOS v10.1 Enterprise Fullstack Upgrade

create extension if not exists "pgcrypto";

-- Additional tables for fullstack upgrade

create table if not exists public.package_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  package_name text not null,
  requested_price numeric(12,2),
  requested_tools text[],
  status text not null default 'Neu',
  created_at timestamptz not null default now()
);

create table if not exists public.file_uploads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  entity text,
  entity_id uuid,
  bucket text not null,
  path text not null,
  file_name text,
  file_url text,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  report_type text not null default 'KPI',
  title text not null,
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_key text,
  module_key text not null,
  can_view boolean not null default true,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, module_key)
);

create table if not exists public.customer_health (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  score integer not null default 100,
  status text not null default 'Grün',
  churn_risk numeric(5,2) not null default 0,
  reasons text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_business_insights (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  insight_text text not null,
  severity text not null default 'Info',
  status text not null default 'Neu',
  created_at timestamptz not null default now()
);

create table if not exists public.integration_sync_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  platform text,
  status text not null default 'success',
  message text,
  created_at timestamptz not null default now()
);

-- Add file URL columns where missing
alter table public.invoices add column if not exists file_url text;
alter table public.reminders add column if not exists file_url text;
alter table public.contracts add column if not exists file_url text;
alter table public.offers add column if not exists file_url text;

-- RLS
alter table public.package_requests enable row level security;
alter table public.file_uploads enable row level security;
alter table public.reports enable row level security;
alter table public.role_permissions enable row level security;
alter table public.customer_health enable row level security;
alter table public.ai_business_insights enable row level security;
alter table public.integration_sync_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['package_requests','file_uploads','reports','customer_health','ai_business_insights','integration_sync_logs']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_read', t);
    execute format('create policy %I on public.%I for select using (public.can_access_customer(customer_id))', t||'_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_write', t);
    execute format('create policy %I on public.%I for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id))', t||'_write', t);
  end loop;
end $$;

drop policy if exists role_permissions_admin_read on public.role_permissions;
create policy role_permissions_admin_read on public.role_permissions for select using (public.is_admin() or user_id=auth.uid());
drop policy if exists role_permissions_admin_write on public.role_permissions;
create policy role_permissions_admin_write on public.role_permissions for all using (public.is_admin()) with check (public.is_admin());

-- Storage buckets
insert into storage.buckets (id, name, public)
values
('invoices','invoices',true),
('reminders','reminders',true),
('contracts','contracts',true),
('offers','offers',true),
('uploads','uploads',true),
('tickets','tickets',true),
('reports','reports',true)
on conflict (id) do update set public = true;

-- Storage policies
drop policy if exists storage_public_read_mmos on storage.objects;
create policy storage_public_read_mmos on storage.objects
for select using (bucket_id in ('invoices','reminders','contracts','offers','uploads','tickets','reports'));

drop policy if exists storage_admin_write_mmos on storage.objects;
create policy storage_admin_write_mmos on storage.objects
for all using (
  bucket_id in ('invoices','reminders','contracts','offers','uploads','tickets','reports')
)
with check (
  bucket_id in ('invoices','reminders','contracts','offers','uploads','tickets','reports')
);

-- Default permissions seeds are handled through API after user creation.