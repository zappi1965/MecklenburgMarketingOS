-- ============================================================
-- 0043_v36_demo_qa_qr_worker.sql
-- Demo QA, QR export readiness and automation worker support
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.v36_qa_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  event_key text not null,
  status text not null default 'ok',
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists v36_qa_events_customer_idx on public.v36_qa_events (customer_id, created_at desc);

create table if not exists public.v35_engine_runs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  engine_key text not null default 'engine',
  status text not null default 'completed',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.v35_engine_runs add column if not exists customer_id uuid;
alter table public.v35_engine_runs add column if not exists engine_key text not null default 'engine';
alter table public.v35_engine_runs add column if not exists status text not null default 'completed';
alter table public.v35_engine_runs add column if not exists input jsonb not null default '{}'::jsonb;
alter table public.v35_engine_runs add column if not exists output jsonb not null default '{}'::jsonb;
alter table public.v35_engine_runs add column if not exists created_at timestamptz not null default now();

alter table public.qr_campaigns add column if not exists slug text;
alter table public.qr_campaigns add column if not exists target_url text;
alter table public.qr_campaigns add column if not exists scans integer not null default 0;
alter table public.qr_campaigns add column if not exists conversions integer not null default 0;
alter table public.qr_campaigns add column if not exists active boolean not null default true;
alter table public.qr_campaigns add column if not exists metadata jsonb not null default '{}'::jsonb;

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values (
  'System',
  'v36_demo_qa_qr_worker_schema_applied',
  'system',
  '{"version":"0043_v36_demo_qa_qr_worker"}'::jsonb
)
on conflict do nothing;
