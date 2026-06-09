-- MMOS V42.24 Security & Privacy Center
-- Features:
-- - Verdachts-Score pro Loyalty-Endkunde
-- - Punkte-Tageslimit pro Endkunde
-- - Security Center / System Health
-- - kundenscharfe RLS-Härtung für Tabellen mit customer_id
-- - DSGVO-Anfragen: Auskunft, Export, Löschung/Anonymisierung

create extension if not exists pgcrypto;

alter table if exists public.qr_campaigns
  add column if not exists daily_point_limit_per_member integer not null default 0,
  add column if not exists suspicion_score_threshold integer not null default 70;

alter table if exists public.loyalty_programs
  add column if not exists daily_point_limit_per_member integer not null default 0,
  add column if not exists suspicion_score_threshold integer not null default 70;

alter table if exists public.v37_loyalty_settings
  add column if not exists daily_point_limit_per_member integer not null default 0,
  add column if not exists suspicion_score_threshold integer not null default 70,
  add column if not exists auto_block_threshold integer not null default 95;

create table if not exists public.loyalty_security_settings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  daily_point_limit_per_member integer not null default 0,
  suspicion_score_threshold integer not null default 70,
  auto_block_threshold integer not null default 95,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id)
);

create table if not exists public.loyalty_member_security_scores (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  loyalty_customer_id uuid,
  email text,
  score integer not null default 0,
  status text not null default 'ok',
  scans_today integer not null default 0,
  scans_last_15m integer not null default 0,
  points_today integer not null default 0,
  reward_redemptions_today integer not null default 0,
  device_count_today integer not null default 0,
  reasons jsonb not null default '[]'::jsonb,
  last_checked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(loyalty_customer_id)
);

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  actor_type text not null default 'system',
  actor_id text,
  event_type text not null,
  severity text not null default 'info',
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.dsar_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  subject_type text not null default 'customer',
  subject_email text,
  type text not null check (type in ('export','delete','rectify','restrict','consent')),
  status text not null default 'Offen',
  requested_by text,
  notes text,
  export_url text,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_loyalty_security_settings_customer on public.loyalty_security_settings(customer_id);
create index if not exists idx_loyalty_member_security_scores_customer on public.loyalty_member_security_scores(customer_id);
create index if not exists idx_loyalty_member_security_scores_score on public.loyalty_member_security_scores(score desc);
create index if not exists idx_security_events_customer_created on public.security_events(customer_id, created_at desc);
create index if not exists idx_dsar_requests_customer_status on public.dsar_requests(customer_id, status);

-- Admin-/Kunden-Isolation: helper functions for RLS.
create or replace function public.mmos_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and lower(coalesce(up.role,'')) in ('admin','super_admin')
      and lower(coalesce(up.status,'active')) = 'active'
  );
$$;

create or replace function public.mmos_current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cu.customer_id
  from public.customer_users cu
  where cu.user_id = auth.uid()
    and lower(coalesce(cu.status,'active')) = 'active'
  limit 1;
$$;

create or replace function public.mmos_customer_scoped_tables()
returns table(table_name text)
language sql
stable
as $$
  select c.relname::text
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid
  where n.nspname = 'public'
    and c.relkind = 'r'
    and a.attname = 'customer_id'
    and a.attnum > 0
    and not a.attisdropped
  order by c.relname;
$$;

-- Enable RLS for all real public tables with customer_id.
-- Admins see all. Customers see only rows for their own customer_id.
do $$
declare
  r record;
  policy_name text;
begin
  for r in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public'
      and c.relkind = 'r'
      and a.attname = 'customer_id'
      and a.attnum > 0
      and not a.attisdropped
  loop
    begin
      execute format('alter table %I.%I enable row level security', r.schema_name, r.table_name);
      policy_name := 'mmos_customer_isolation_all';
      if not exists (
        select 1 from pg_policies
        where schemaname = r.schema_name
          and tablename = r.table_name
          and policyname = policy_name
      ) then
        execute format(
          'create policy %I on %I.%I for all to authenticated using (public.mmos_is_admin() or customer_id = public.mmos_current_customer_id()) with check (public.mmos_is_admin() or customer_id = public.mmos_current_customer_id())',
          policy_name,
          r.schema_name,
          r.table_name
        );
      end if;
    exception when others then
      raise notice 'RLS skipped for %.%: %', r.schema_name, r.table_name, sqlerrm;
    end;
  end loop;
end $$;

-- RLS for customer mapping/profile/security tables without direct customer_id pattern exceptions.
alter table if exists public.user_profiles enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='mmos_user_profiles_admin_or_self') then
    create policy mmos_user_profiles_admin_or_self on public.user_profiles
      for all to authenticated
      using (public.mmos_is_admin() or id = auth.uid())
      with check (public.mmos_is_admin() or id = auth.uid());
  end if;
exception when others then raise notice 'user_profiles policy skipped: %', sqlerrm; end $$;

-- Migration log, tolerant to older schema_migrations_mmos variants.
create table if not exists public.schema_migrations_mmos (
  version text primary key,
  file_name text not null default '',
  applied_at timestamptz not null default now(),
  checksum text,
  description text
);
alter table public.schema_migrations_mmos add column if not exists file_name text not null default '';
alter table public.schema_migrations_mmos add column if not exists applied_at timestamptz not null default now();
alter table public.schema_migrations_mmos add column if not exists description text;

insert into public.schema_migrations_mmos (version, file_name, description, applied_at)
values (
  'V42.24_SECURITY_PRIVACY_CENTER',
  'SQL_V42_24_SECURITY_PRIVACY_CENTER.sql',
  'Security Center, suspicion scoring, daily point limits, DSAR workflows and customer scoped RLS helpers.',
  now()
)
on conflict (version) do update set
  file_name = excluded.file_name,
  description = excluded.description,
  applied_at = excluded.applied_at;
