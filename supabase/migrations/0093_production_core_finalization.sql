-- MMOS Production Core Finalization
create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  action text not null,
  entity_type text,
  entity_id text,
  status text not null default 'OK',
  details text,
  actor_name text,
  mode text default 'live',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_action_logs_customer_id on public.admin_action_logs(customer_id);
create index if not exists idx_admin_action_logs_created_at on public.admin_action_logs(created_at desc);

create table if not exists public.production_health_checks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  status text not null default 'checked',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_production_health_checks_created_at on public.production_health_checks(created_at desc);

create table if not exists public.production_smoke_tests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  status text not null default 'offen',
  results jsonb not null default '[]'::jsonb,
  actor_name text,
  created_at timestamptz not null default now()
);
create index if not exists idx_production_smoke_tests_customer_id on public.production_smoke_tests(customer_id);
create index if not exists idx_production_smoke_tests_created_at on public.production_smoke_tests(created_at desc);

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
create index if not exists idx_customer_access_audits_customer_id on public.customer_access_audits(customer_id);

alter table public.admin_action_logs enable row level security;
alter table public.production_health_checks enable row level security;
alter table public.production_smoke_tests enable row level security;
alter table public.customer_access_audits enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='admin_action_logs' and policyname='authenticated_admin_action_logs') then
    create policy authenticated_admin_action_logs on public.admin_action_logs for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='production_health_checks' and policyname='authenticated_production_health_checks') then
    create policy authenticated_production_health_checks on public.production_health_checks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='production_smoke_tests' and policyname='authenticated_production_smoke_tests') then
    create policy authenticated_production_smoke_tests on public.production_smoke_tests for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customer_access_audits' and policyname='authenticated_customer_access_audits') then
    create policy authenticated_customer_access_audits on public.customer_access_audits for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;
