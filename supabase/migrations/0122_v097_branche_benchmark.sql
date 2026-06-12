-- MMOS V097: Branchen-Benchmark-Report (k-anonym)
-- Vergleicht KPIs eines Kunden gegen eine anonymisierte Peer-Gruppe derselben
-- Branche (customers.branch). min-N = 5 Peers (nach Self-Exclusion), sonst
-- Fallback auf konfigurierbare Branchen-Zielwerte. Idempotent.

create extension if not exists pgcrypto;

-- Admin-konfigurierbare Fallback-Zielwerte je Branche/Metrik.
create table if not exists public.branche_benchmark_targets (
  id uuid primary key default gen_random_uuid(),
  branch text not null,
  metric_key text not null,
  target_value numeric not null default 0,
  period_scope text not null default 'monthly',
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique(branch, metric_key)
);

-- Vorberechnete k-anonyme Peer-Statistiken (KEINE Rohdaten anderer Tenants).
create table if not exists public.branche_benchmark_aggregates (
  id uuid primary key default gen_random_uuid(),
  branch text not null,
  period_start date not null,
  period_end date not null,
  metric_key text not null,
  peer_count integer not null default 0,
  p25 numeric,
  median numeric,
  p75 numeric,
  avg numeric,
  is_suppressed boolean not null default false,
  source text not null default 'peers', -- peers | targets
  computed_at timestamptz not null default now(),
  unique(branch, period_start, period_end, metric_key)
);

-- Per-Kunde-Report.
create table if not exists public.branche_benchmark_reports (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  branch text,
  comparison jsonb not null default '[]'::jsonb,
  peer_count integer not null default 0,
  used_fallback boolean not null default false,
  output_document_id uuid,
  pdf_url text,
  status text not null default 'generated',
  created_at timestamptz not null default now(),
  unique(customer_id, period_start, period_end)
);

create index if not exists idx_bb_reports_customer on public.branche_benchmark_reports(customer_id);
create index if not exists idx_bb_aggregates_branch_period on public.branche_benchmark_aggregates(branch, period_start, period_end);

alter table public.branche_benchmark_targets enable row level security;
alter table public.branche_benchmark_aggregates enable row level security;
alter table public.branche_benchmark_reports enable row level security;

-- Kunde sieht nur eigene Reports. Aggregate/Targets sind admin-/service-role-only
-- (KEINE Policy für authenticated -> kein Lesezugriff für normale Nutzer).
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='branche_benchmark_reports' and policyname='bb_reports_self_or_admin') then
    create policy bb_reports_self_or_admin on public.branche_benchmark_reports
      for select to authenticated
      using (
        coalesce(public.mmos_is_admin(), false)
        or customer_id = public.mmos_current_customer_id()
      );
  end if;
exception when others then raise notice 'bb_reports policy skipped: %', sqlerrm; end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='branche_benchmark_aggregates' and policyname='bb_aggregates_admin_only') then
    create policy bb_aggregates_admin_only on public.branche_benchmark_aggregates
      for select to authenticated
      using (coalesce(public.mmos_is_admin(), false));
  end if;
exception when others then raise notice 'bb_aggregates policy skipped: %', sqlerrm; end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='branche_benchmark_targets' and policyname='bb_targets_admin_only') then
    create policy bb_targets_admin_only on public.branche_benchmark_targets
      for select to authenticated
      using (coalesce(public.mmos_is_admin(), false));
  end if;
exception when others then raise notice 'bb_targets policy skipped: %', sqlerrm; end $$;
