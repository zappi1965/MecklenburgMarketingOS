
-- MMOS v18 Auth + Security + Monitoring Patch

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'customer' check (role in ('admin','customer')),
  customer_id uuid references public.customers(id) on delete set null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_self_read on public.user_profiles;
create policy user_profiles_self_read on public.user_profiles
for select using (auth.uid() = id);

drop policy if exists user_profiles_admin_all on public.user_profiles;
create policy user_profiles_admin_all on public.user_profiles
for all using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
)
with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
);

create or replace function public.current_user_role()
returns text language sql security definer set search_path = public as $$
  select role from public.user_profiles where id = auth.uid()
$$;

create or replace function public.current_customer_id()
returns uuid language sql security definer set search_path = public as $$
  select customer_id from public.user_profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.user_profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.can_access_customer(target_customer uuid)
returns boolean language sql security definer set search_path = public as $$
  select public.is_admin() or public.current_customer_id() = target_customer
$$;

create table if not exists public.security_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.backup_restore_points (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  storage_bucket text,
  storage_path text,
  created_by text default 'System',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  message text,
  last_error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.security_audit_logs enable row level security;
alter table public.backup_restore_points enable row level security;
alter table public.job_runs enable row level security;

drop policy if exists admin_security_audit_logs on public.security_audit_logs;
create policy admin_security_audit_logs on public.security_audit_logs
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_backup_restore_points on public.backup_restore_points;
create policy admin_backup_restore_points on public.backup_restore_points
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_job_runs on public.job_runs;
create policy admin_job_runs on public.job_runs
for all using (public.is_admin()) with check (public.is_admin());

alter table if exists public.customer_clients enable row level security;
drop policy if exists customer_clients_access on public.customer_clients;
create policy customer_clients_access on public.customer_clients
for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

alter table if exists public.customer_service_categories enable row level security;
drop policy if exists customer_service_categories_access on public.customer_service_categories;
create policy customer_service_categories_access on public.customer_service_categories
for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

alter table if exists public.appointments enable row level security;
drop policy if exists appointments_access on public.appointments;
create policy appointments_access on public.appointments
for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

alter table if exists public.tickets enable row level security;
drop policy if exists tickets_access on public.tickets;
create policy tickets_access on public.tickets
for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

alter table if exists public.invoices enable row level security;
drop policy if exists invoices_access on public.invoices;
create policy invoices_access on public.invoices
for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

alter table if exists public.customer_files enable row level security;
drop policy if exists customer_files_access on public.customer_files;
create policy customer_files_access on public.customer_files
for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','auth_security_monitoring_patch_applied','system','{"version":"0022"}'::jsonb);
