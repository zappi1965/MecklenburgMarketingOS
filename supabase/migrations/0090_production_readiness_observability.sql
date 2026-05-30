create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null default 'admin_event',
  severity text not null default 'info',
  actor_user_id uuid null,
  actor_email text null,
  actor_role text null,
  customer_id uuid null,
  route text null,
  method text null,
  status_code integer null,
  ip_hash text null,
  user_agent text null,
  message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.api_usage_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  feature text not null,
  endpoint text null,
  customer_id uuid null,
  actor_user_id uuid null,
  estimated_cost_cents integer not null default 0,
  units numeric not null default 1,
  success boolean not null default true,
  status_code integer null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  backup_type text not null default 'database',
  storage_bucket text null,
  storage_path text null,
  size_bytes bigint null,
  checksum_sha256 text null,
  created_by uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at desc);
create index if not exists idx_admin_audit_logs_customer_id on public.admin_audit_logs(customer_id);
create index if not exists idx_api_usage_events_created_at on public.api_usage_events(created_at desc);
create index if not exists idx_api_usage_events_provider_created_at on public.api_usage_events(provider, created_at desc);
create index if not exists idx_backup_runs_created_at on public.backup_runs(created_at desc);

alter table public.admin_audit_logs enable row level security;
alter table public.api_usage_events enable row level security;
alter table public.backup_runs enable row level security;

do $$ begin
  create policy "admin_audit_logs_service_only" on public.admin_audit_logs for all using (false) with check (false);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "api_usage_events_service_only" on public.api_usage_events for all using (false) with check (false);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "backup_runs_service_only" on public.backup_runs for all using (false) with check (false);
exception when duplicate_object then null; end $$;
