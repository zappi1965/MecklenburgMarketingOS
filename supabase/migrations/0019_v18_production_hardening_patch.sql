
-- MMOS v18 Production Hardening Patch

create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  message text,
  last_error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.stripe_customers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text default 'inactive',
  package_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.security_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values
('production_hardening','{"auth_ui":"prepared","mail_templates":"prepared","stripe":"prepared","gotenberg":"prepared","worker_retry":"prepared","security_headers":"prepared","rate_limit":"prepared"}'::jsonb)
on conflict (key) do update set value=excluded.value, updated_at=now();

alter table public.user_profiles enable row level security;
alter table public.job_runs enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.security_audit_logs enable row level security;

drop policy if exists admin_job_runs on public.job_runs;
create policy admin_job_runs on public.job_runs
for all using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
)
with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
);

drop policy if exists admin_stripe_customers on public.stripe_customers;
create policy admin_stripe_customers on public.stripe_customers
for all using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
)
with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
);

drop policy if exists customer_stripe_self on public.stripe_customers;
create policy customer_stripe_self on public.stripe_customers
for select using (
  customer_id in (select customer_id from public.user_profiles where id = auth.uid())
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
('avatars','avatars',true,5242880,array['image/png','image/jpeg','image/webp']),
('qr-codes','qr-codes',true,5242880,array['image/png','image/svg+xml']),
('generated-pdfs','generated-pdfs',false,52428800,array['application/pdf'])
on conflict (id) do update set public=excluded.public;

drop policy if exists generated_pdfs_admin on storage.objects;
create policy generated_pdfs_admin on storage.objects
for all using (
  bucket_id = 'generated-pdfs'
  and exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
)
with check (
  bucket_id = 'generated-pdfs'
  and exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
);
