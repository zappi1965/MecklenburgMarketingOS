-- MMOS Production Validation / RLS / Backup / Monitoring

create table if not exists public.production_validation_reports (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  report_type text not null,
  status text not null default 'offen',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.backup_drill_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'offen',
  table_count integer not null default 0,
  row_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.monitoring_alert_events (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info',
  title text not null,
  message text,
  channel text not null default 'system',
  status text not null default 'created',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_production_validation_reports_customer on public.production_validation_reports(customer_id);
create index if not exists idx_backup_drill_runs_created_at on public.backup_drill_runs(created_at desc);
create index if not exists idx_monitoring_alert_events_created_at on public.monitoring_alert_events(created_at desc);

alter table public.production_validation_reports enable row level security;
alter table public.backup_drill_runs enable row level security;
alter table public.monitoring_alert_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='production_validation_reports' and policyname='authenticated_production_validation_reports') then
    create policy authenticated_production_validation_reports on public.production_validation_reports
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='backup_drill_runs' and policyname='authenticated_backup_drill_runs') then
    create policy authenticated_backup_drill_runs on public.backup_drill_runs
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='monitoring_alert_events' and policyname='authenticated_monitoring_alert_events') then
    create policy authenticated_monitoring_alert_events on public.monitoring_alert_events
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;

create or replace function public.mmos_rls_audit()
returns table (
  table_name text,
  rls_enabled boolean,
  force_rls boolean,
  policy_count integer,
  status text
)
language sql
security definer
set search_path = public
as $$
  with expected(table_name) as (
    values
      ('customers'),
      ('customer_users'),
      ('user_profiles'),
      ('invoices'),
      ('customer_files'),
      ('output_documents'),
      ('sales_workflows'),
      ('sales_workflow_events'),
      ('sales_workflow_documents'),
      ('admin_action_logs'),
      ('api_keys'),
      ('customer_tool_access')
  )
  select
    e.table_name,
    coalesce(c.relrowsecurity, false) as rls_enabled,
    coalesce(c.relforcerowsecurity, false) as force_rls,
    coalesce(p.policy_count, 0)::integer as policy_count,
    case
      when c.oid is null then 'TABLE_MISSING'
      when c.relrowsecurity = false then 'RLS_OFF'
      when coalesce(p.policy_count,0) = 0 then 'NO_POLICY'
      else 'OK'
    end as status
  from expected e
  left join pg_class c on c.relname = e.table_name
  left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  left join (
    select schemaname, tablename, count(*) as policy_count
    from pg_policies
    where schemaname = 'public'
    group by schemaname, tablename
  ) p on p.tablename = e.table_name;
$$;
