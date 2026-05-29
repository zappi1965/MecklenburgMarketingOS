-- v0.59 Public package inquiries from landing page
alter table if exists public.package_requests add column if not exists requested_by text;
alter table if exists public.package_requests add column if not exists contact_name text;
alter table if exists public.package_requests add column if not exists company_name text;
alter table if exists public.package_requests add column if not exists email text;
alter table if exists public.package_requests add column if not exists phone text;
alter table if exists public.package_requests add column if not exists message text;
alter table if exists public.package_requests add column if not exists source text default 'public_landingpage';
alter table if exists public.package_requests add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.package_requests add column if not exists updated_at timestamptz default now();
create index if not exists idx_package_requests_status_created on public.package_requests(status, created_at desc);
create index if not exists idx_package_requests_email on public.package_requests(email);
