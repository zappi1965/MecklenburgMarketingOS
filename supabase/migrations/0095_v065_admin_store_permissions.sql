-- MMOS V065 Live Store Permission Fix
-- Erlaubt den Admin-/Production-Tabellen konsistente Live-Nutzung über Backend Service Role.
-- Wichtig: Diese Migration im Supabase SQL Editor ausführen oder über Supabase CLI deployen.

create extension if not exists pgcrypto;

create table if not exists public.sales_workflows (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  status text not null default 'In Bearbeitung',
  current_step text,
  completed_steps jsonb not null default '[]'::jsonb,
  owner_name text,
  last_completed_step text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_workflow_events (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid,
  customer_id uuid,
  step_key text,
  title text not null default 'Workflow Event',
  description text,
  actor_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_workflow_documents (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid,
  customer_id uuid,
  document_type text not null default 'document',
  source_table text,
  source_id uuid,
  title text,
  status text not null default 'Entwurf',
  public_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  action text not null default 'system',
  entity_type text,
  entity_id text,
  status text not null default 'OK',
  details text,
  actor_name text,
  mode text default 'live',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.production_health_checks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  status text not null default 'checked',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.production_smoke_tests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  status text not null default 'offen',
  results jsonb not null default '[]'::jsonb,
  actor_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_access_audits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  route text,
  tool_key text,
  allowed boolean not null default false,
  reason text,
  actor_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.production_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  check_key text not null,
  status text not null default 'unknown',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  backup_type text,
  status text not null default 'pending',
  storage_path text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_workflows_customer_id on public.sales_workflows(customer_id);
create index if not exists idx_sales_workflow_events_customer_id on public.sales_workflow_events(customer_id);
create index if not exists idx_sales_workflow_documents_customer_id on public.sales_workflow_documents(customer_id);
create index if not exists idx_admin_action_logs_created_at on public.admin_action_logs(created_at desc);
create index if not exists idx_production_health_checks_created_at on public.production_health_checks(created_at desc);
create index if not exists idx_production_smoke_tests_created_at on public.production_smoke_tests(created_at desc);
create index if not exists idx_customer_access_audits_customer_id on public.customer_access_audits(customer_id);
create index if not exists idx_production_readiness_checks_key on public.production_readiness_checks(check_key);
create index if not exists idx_backup_runs_created_at on public.backup_runs(created_at desc);

alter table public.sales_workflows enable row level security;
alter table public.sales_workflow_events enable row level security;
alter table public.sales_workflow_documents enable row level security;
alter table public.admin_action_logs enable row level security;
alter table public.production_health_checks enable row level security;
alter table public.production_smoke_tests enable row level security;
alter table public.customer_access_audits enable row level security;
alter table public.production_readiness_checks enable row level security;
alter table public.backup_runs enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'sales_workflows',
    'sales_workflow_events',
    'sales_workflow_documents',
    'admin_action_logs',
    'production_health_checks',
    'production_smoke_tests',
    'customer_access_audits',
    'production_readiness_checks',
    'backup_runs'
  ]
  loop
    execute format('drop policy if exists authenticated_%I on public.%I', t, t);
    execute format('create policy authenticated_%I on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t, t);

    execute format('drop policy if exists service_role_%I on public.%I', t, t);
    execute format('create policy service_role_%I on public.%I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')', t, t);
  end loop;
end $$;
