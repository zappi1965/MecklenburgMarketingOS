-- v0.60 Package inquiry mail delivery diagnostics
alter table if exists public.package_requests add column if not exists mail_status text;
alter table if exists public.package_requests add column if not exists mail_error text;
alter table if exists public.package_requests add column if not exists mail_to text;
alter table if exists public.package_requests add column if not exists mail_provider_id text;
create index if not exists idx_package_requests_mail_status on public.package_requests(mail_status);
