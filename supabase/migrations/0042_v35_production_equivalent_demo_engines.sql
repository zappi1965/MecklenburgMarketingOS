-- ============================================================
-- 0042_v35_production_equivalent_demo_engines.sql
-- Production-equivalent demo business engines
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.v35_engine_runs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  engine_key text not null,
  status text not null default 'completed',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists v35_engine_runs_customer_idx on public.v35_engine_runs (customer_id, created_at desc);

create table if not exists public.v35_business_snapshots (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  health integer not null default 0,
  risk integer not null default 0,
  upsell integer not null default 0,
  success integer not null default 0,
  package_usage integer not null default 0,
  qr_scans integer not null default 0,
  leads integer not null default 0,
  reviews integer not null default 0,
  negative_reviews integer not null default 0,
  open_tickets integer not null default 0,
  usage_total numeric(12,2) not null default 0,
  forecast numeric(12,2) not null default 0,
  revenue_share numeric(12,2) not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists v35_business_snapshots_customer_idx on public.v35_business_snapshots (customer_id, created_at desc);

alter table public.tickets add column if not exists customer_id uuid;
alter table public.tickets add column if not exists title text not null default 'Ticket';
alter table public.tickets add column if not exists status text not null default 'open';
alter table public.tickets add column if not exists priority text not null default 'medium';
alter table public.tickets add column if not exists source text;
alter table public.tickets add column if not exists description text;
alter table public.tickets add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.tickets add column if not exists created_at timestamptz not null default now();

alter table public.review_feedback add column if not exists customer_id uuid;
alter table public.review_feedback add column if not exists rating integer;
alter table public.review_feedback add column if not exists feedback_text text;
alter table public.review_feedback add column if not exists comment text;
alter table public.review_feedback add column if not exists reviewer_name text;
alter table public.review_feedback add column if not exists reviewer_email text;
alter table public.review_feedback add column if not exists source text;
alter table public.review_feedback add column if not exists status text not null default 'new';
alter table public.review_feedback add column if not exists sentiment text;
alter table public.review_feedback add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.review_feedback add column if not exists created_at timestamptz not null default now();

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values (
  'System',
  'v35_production_equivalent_demo_engines_schema_applied',
  'system',
  '{"version":"0042_v35_production_equivalent_demo_engines"}'::jsonb
)
on conflict do nothing;
