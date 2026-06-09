-- ============================================================
-- 0051_v40_ui_polish_contract_tests.sql
-- V40 Quality Center, contract test logging and audit helpers.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.v40_contract_test_runs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  passed integer not null default 0,
  failed integer not null default 0,
  ready boolean not null default false,
  tests jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists v40_contract_test_runs_customer_idx
on public.v40_contract_test_runs (customer_id, created_at desc);

create table if not exists public.v40_ui_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  event_key text not null,
  status text not null default 'ok',
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists v40_ui_events_customer_idx
on public.v40_ui_events (customer_id, created_at desc);

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','v40_ui_polish_contract_tests_schema_applied','system','{"version":"0051_v40_ui_polish_contract_tests"}'::jsonb)
on conflict do nothing;
