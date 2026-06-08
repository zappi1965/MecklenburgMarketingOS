-- Admin-Automatisierungs-Tools: Health-Cockpit + Wartungs-Reminder +
-- Auto-Onboarding-Audit. Idempotent.

create extension if not exists pgcrypto;

-- Wartungs-Hinweise pro Customer (vom Worker generiert).
create table if not exists public.maintenance_alerts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  category text not null,                           -- branding | content | loyalty | seo | billing | security
  severity text not null default 'info',            -- info | warning | critical
  rule_key text not null,                           -- z.B. 'logo_missing', 'reward_unused_90d'
  title text not null,
  description text,
  fix_url text,                                     -- Deep-Link in Admin-UI
  fix_action text,                                  -- z.B. 'open_branding_editor'
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'open',              -- open | resolved | dismissed
  resolved_at timestamptz,
  detected_at timestamptz not null default now(),
  unique (customer_id, rule_key, status)            -- gleicher Rule + offen = nur 1x
);

create index if not exists idx_maintenance_alerts_customer on public.maintenance_alerts(customer_id);
create index if not exists idx_maintenance_alerts_status on public.maintenance_alerts(status, severity);

-- Onboarding-Audit-Resultate (lange Lauffristen, Background-Jobs).
create table if not exists public.onboarding_audits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  initiated_by uuid,
  target_url text,
  status text not null default 'pending',           -- pending | running | done | failed
  score int,                                        -- 0..100 Gesamt
  findings jsonb not null default '[]'::jsonb,
  checks jsonb not null default '{}'::jsonb,
  pdf_url text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_onboarding_audits_customer on public.onboarding_audits(customer_id);
create index if not exists idx_onboarding_audits_status on public.onboarding_audits(status, created_at desc);

-- Snapshot-Tabelle fuer Health-Cockpit (Caching ueber Zeit, optional).
create table if not exists public.ops_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'all_customers',
  snapshot_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  generated_by uuid
);

create index if not exists idx_ops_health_snapshots_time on public.ops_health_snapshots(snapshot_at desc);

alter table public.maintenance_alerts enable row level security;
alter table public.onboarding_audits enable row level security;
alter table public.ops_health_snapshots enable row level security;

-- Admin-Schreibrechte aus 0081 covern diese drei neuen Tabellen analog:
do $$
declare t text;
begin
  for t in select unnest(array['maintenance_alerts','onboarding_audits','ops_health_snapshots']) loop
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename=t and policyname='mmos_admin_write'
    ) then
      begin
        execute format(
          'create policy mmos_admin_write on public.%I for all to authenticated using (coalesce(public.mmos_is_admin(), false)) with check (coalesce(public.mmos_is_admin(), false))',
          t
        );
      exception when others then
        raise notice 'mmos_admin_write skipped on %: %', t, sqlerrm;
      end;
    end if;
  end loop;
end $$;
