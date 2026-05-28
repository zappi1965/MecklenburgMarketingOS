-- ============================================================
-- 0052_v41_deep_module_detail_pages.sql
-- Deep detail pages support for Forecast, Revenue Share, Package Matrix,
-- Customer Intelligence, Marketing Automation and AI Assistant.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.v41_ai_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  prompt text,
  answer text,
  reasons jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists v41_ai_sessions_customer_idx
on public.v41_ai_sessions (customer_id, created_at desc);

create table if not exists public.v41_marketing_calendar (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  title text not null default 'Marketing Aktion',
  audience text,
  channel text,
  scheduled_at date,
  status text not null default 'geplant',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists v41_marketing_calendar_customer_idx
on public.v41_marketing_calendar (customer_id, scheduled_at desc);

create table if not exists public.v41_package_decisions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  package_key text not null,
  package_name text,
  price numeric(12,2) not null default 0,
  status text not null default 'created',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists v41_package_decisions_customer_idx
on public.v41_package_decisions (customer_id, created_at desc);

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values (
  'System',
  'v41_deep_module_detail_pages_schema_applied',
  'system',
  '{"version":"0052_v41_deep_module_detail_pages"}'::jsonb
)
on conflict do nothing;
