-- V42.23 Stability & Production Readiness
-- Ziel: Live-/Demo-Trennung, Admin-Sicherheit, Invite-Härtung, Activity-Logs und Migrationsstatus.

create table if not exists public.schema_migrations_mmos (
  version text primary key,
  file_name text not null,
  applied_at timestamptz not null default now(),
  notes text
);

insert into public.schema_migrations_mmos (version, file_name, notes)
values ('V42.23', 'SQL_V42_23_STABILITY_PRODUCTION_READINESS.sql', 'Production Readiness: Admin-Schutz, Invite-Härtung, Activity Log, ENV-/Migration-Status')
on conflict (version) do update set applied_at = now(), file_name = excluded.file_name, notes = excluded.notes;

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid null,
  type text,
  title text,
  message text,
  ref_table text,
  ref_id text,
  severity text default 'info',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.api_usage_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique,
  provider text,
  payload jsonb default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_integrity_checks (
  id uuid primary key default gen_random_uuid(),
  check_key text,
  status text default 'open',
  severity text default 'info',
  findings jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.user_profiles
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists role text default 'customer',
  add column if not exists status text default 'active',
  add column if not exists customer_id uuid null,
  add column if not exists created_by text,
  add column if not exists last_login_at timestamptz,
  add column if not exists password_changed_at timestamptz,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.customer_invites
  add column if not exists status text default 'open',
  add column if not exists token text,
  add column if not exists invite_url text,
  add column if not exists expires_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists used_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by text,
  add column if not exists resent_at timestamptz,
  add column if not exists auth_user_id uuid null,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_customer_invites_token on public.customer_invites(token);
create index if not exists idx_customer_invites_customer_status on public.customer_invites(customer_id, status);
create index if not exists idx_user_profiles_role_status on public.user_profiles(role, status);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

-- Optional: Hilfsview für Health Center / Admin-Check
create or replace view public.mmos_admin_profile_health as
select
  count(*) filter (where role = 'admin') as admin_total,
  count(*) filter (where role = 'admin' and status = 'active') as admin_active,
  count(*) filter (where role = 'admin' and status = 'blocked') as admin_blocked,
  max(updated_at) as last_admin_change
from public.user_profiles;
