
-- MMOS v18 Storage Upload E2E Extension Patch
-- Purpose: real binary uploads via Supabase Storage + Railway backend.

alter table public.customer_files add column if not exists original_name text;
alter table public.customer_files add column if not exists bucket text;
alter table public.customer_files add column if not exists storage_path text;
alter table public.customer_files add column if not exists mime_type text;
alter table public.customer_files add column if not exists size_bytes bigint;
alter table public.customer_files add column if not exists ref_table text;
alter table public.customer_files add column if not exists ref_id text;
alter table public.customer_files add column if not exists version integer default 1;
alter table public.customer_files add column if not exists url text;

create table if not exists public.file_versions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  file_id uuid null references public.customer_files(id) on delete cascade,
  original_name text,
  name text not null,
  bucket text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  version integer not null default 1,
  ref_table text,
  ref_id text,
  signed_url text,
  created_at timestamptz not null default now()
);

alter table public.file_versions enable row level security;

drop policy if exists file_versions_access on public.file_versions;
create policy file_versions_access on public.file_versions
for all using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
('media','media',false,26214400,array['image/png','image/jpeg','image/webp','video/mp4','application/pdf']),
('invoices','invoices',false,26214400,array['application/pdf','image/png','image/jpeg']),
('contracts','contracts',false,26214400,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
('reports','reports',false,26214400,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.apple.keynote']),
('documents','documents',false,26214400,null)
on conflict (id) do update set
public = excluded.public,
file_size_limit = excluded.file_size_limit,
allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists mmos_storage_read on storage.objects;
create policy mmos_storage_read on storage.objects
for select using (bucket_id in ('media','invoices','contracts','reports','documents'));

drop policy if exists mmos_storage_insert on storage.objects;
create policy mmos_storage_insert on storage.objects
for insert with check (bucket_id in ('media','invoices','contracts','reports','documents'));

drop policy if exists mmos_storage_update on storage.objects;
create policy mmos_storage_update on storage.objects
for update using (bucket_id in ('media','invoices','contracts','reports','documents'));

create index if not exists idx_customer_files_customer_type
on public.customer_files(customer_id, file_type, created_at desc);

create index if not exists idx_file_versions_customer_file
on public.file_versions(customer_id, file_id, version desc);
