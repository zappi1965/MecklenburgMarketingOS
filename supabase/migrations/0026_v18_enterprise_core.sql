
-- MMOS v18 Enterprise Core
-- Kompakter Enterprise-Ausbau ohne Menüflut:
-- Mandanten, Rollen/Rechte, Feature Flags, Event Queue, Audit, Security Events, Backup Jobs.

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  status text not null default 'active',
  plan text not null default 'starter',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.customers add column if not exists tenant_id uuid references public.tenants(id) on delete set null;
alter table public.user_profiles add column if not exists tenant_id uuid references public.tenants(id) on delete set null;
alter table public.user_profiles add column if not exists permissions text[] not null default '{}';

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  key text not null,
  name text not null,
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique(tenant_id, key)
);

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  key text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(tenant_id, key)
);

create table if not exists public.enterprise_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  event_type text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  severity text not null default 'info',
  created_by text default 'System',
  created_at timestamptz not null default now()
);

create table if not exists public.enterprise_job_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  job_type text not null,
  status text not null default 'pending',
  priority integer not null default 5,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  last_error text,
  scheduled_at timestamptz not null default now(),
  locked_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  actor_id uuid,
  actor_name text,
  event_type text not null,
  ip text,
  user_agent text,
  severity text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.backup_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  label text not null,
  status text not null default 'planned',
  backup_type text not null default 'database',
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_by text default 'System',
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.tenants enable row level security;
alter table public.roles enable row level security;
alter table public.feature_flags enable row level security;
alter table public.enterprise_events enable row level security;
alter table public.enterprise_job_queue enable row level security;
alter table public.security_events enable row level security;
alter table public.backup_jobs enable row level security;

create or replace function public.current_tenant_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select tenant_id from public.user_profiles where id = auth.uid()
$$;

create or replace function public.has_permission(permission_key text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid()
      and (
        role = 'admin'
        or permission_key = any(permissions)
      )
  )
$$;

create or replace function public.can_access_tenant(target_tenant uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_admin() or public.current_tenant_id() = target_tenant
$$;

drop policy if exists tenants_admin_all on public.tenants;
create policy tenants_admin_all on public.tenants for all
using (public.is_admin() or id = public.current_tenant_id())
with check (public.is_admin());

drop policy if exists roles_tenant_access on public.roles;
create policy roles_tenant_access on public.roles for all
using (public.can_access_tenant(tenant_id))
with check (public.is_admin());

drop policy if exists feature_flags_tenant_access on public.feature_flags;
create policy feature_flags_tenant_access on public.feature_flags for all
using (public.can_access_tenant(tenant_id))
with check (public.is_admin());

drop policy if exists enterprise_events_tenant_access on public.enterprise_events;
create policy enterprise_events_tenant_access on public.enterprise_events for all
using (public.can_access_tenant(tenant_id))
with check (public.is_admin());

drop policy if exists enterprise_job_queue_tenant_access on public.enterprise_job_queue;
create policy enterprise_job_queue_tenant_access on public.enterprise_job_queue for all
using (public.can_access_tenant(tenant_id))
with check (public.is_admin());

drop policy if exists security_events_admin on public.security_events;
create policy security_events_admin on public.security_events for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists backup_jobs_admin on public.backup_jobs;
create policy backup_jobs_admin on public.backup_jobs for all
using (public.is_admin())
with check (public.is_admin());

-- Default Tenant
insert into public.tenants (name, slug, plan, is_demo)
values ('MecklenburgMarketingOS', 'mecklenburgmarketingos', 'premium', false)
on conflict (slug) do update set name=excluded.name;

-- Demo Tenant
insert into public.tenants (name, slug, plan, is_demo)
values ('MMOS Demo Sandbox', 'mmos-demo-sandbox', 'premium', true)
on conflict (slug) do update set name=excluded.name, is_demo=true;

update public.customers
set tenant_id = (select id from public.tenants where slug = 'mmos-demo-sandbox')
where coalesce(is_demo,false)=true and tenant_id is null;

update public.customers
set tenant_id = (select id from public.tenants where slug = 'mecklenburgmarketingos')
where tenant_id is null;

insert into public.roles (tenant_id, key, name, permissions, is_system)
select id, 'owner', 'Owner', array['*'], true from public.tenants
on conflict (tenant_id,key) do nothing;

insert into public.roles (tenant_id, key, name, permissions, is_system)
select id, 'staff', 'Mitarbeiter', array['crm.read','crm.write','tickets.write','booking.write','reports.read'], true from public.tenants
on conflict (tenant_id,key) do nothing;

insert into public.roles (tenant_id, key, name, permissions, is_system)
select id, 'customer', 'Kunde', array['portal.read','tickets.write','booking.write','files.write'], true from public.tenants
on conflict (tenant_id,key) do nothing;

insert into public.feature_flags (tenant_id, key, enabled, config)
select id, key, true, '{}'::jsonb
from public.tenants
cross join (values
  ('pdf_generation'),
  ('qr_review_funnel'),
  ('resend_mail'),
  ('workflow_engine'),
  ('audit_logs'),
  ('backup_center')
) as f(key)
on conflict (tenant_id,key) do nothing;

insert into public.enterprise_events (tenant_id, event_type, title, payload, severity, created_by)
select id, 'enterprise_core_ready', 'Enterprise Core aktiviert', '{"version":"0026"}'::jsonb, 'success', 'System'
from public.tenants
on conflict do nothing;

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','enterprise_core_applied','system','{"version":"0026"}'::jsonb)
on conflict do nothing;
