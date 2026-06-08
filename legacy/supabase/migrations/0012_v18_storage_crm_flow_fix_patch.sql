
-- MMOS v18 Storage CRM Flow Fix Patch

alter table public.customer_files add column if not exists original_name text;
alter table public.customer_files add column if not exists bucket text;
alter table public.customer_files add column if not exists storage_path text;
alter table public.customer_files add column if not exists mime_type text;
alter table public.customer_files add column if not exists size_bytes bigint;
alter table public.customer_files add column if not exists ref_table text;
alter table public.customer_files add column if not exists ref_id text;
alter table public.customer_files add column if not exists version integer default 1;
alter table public.customer_files add column if not exists url text;
alter table public.customer_files add column if not exists actor_name text default 'System';

create table if not exists public.file_versions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  file_id uuid null references public.customer_files(id) on delete cascade,
  original_name text,
  name text not null,
  bucket text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  version integer not null default 1,
  ref_table text,
  ref_id text,
  signed_url text,
  created_at timestamptz not null default now()
);

alter table public.file_versions add column if not exists file_id uuid null references public.customer_files(id) on delete cascade;
alter table public.file_versions add column if not exists original_name text;
alter table public.file_versions add column if not exists bucket text;
alter table public.file_versions add column if not exists storage_path text;
alter table public.file_versions add column if not exists mime_type text;
alter table public.file_versions add column if not exists size_bytes bigint;
alter table public.file_versions add column if not exists version integer default 1;
alter table public.file_versions add column if not exists signed_url text;
alter table public.file_versions add column if not exists ref_table text;
alter table public.file_versions add column if not exists ref_id text;

create table if not exists public.invoice_templates (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  name text not null,
  storage_path text,
  bucket text default 'documents',
  placeholders jsonb not null default '["{{KUNDENNAME}}","{{ADRESSE}}","{{RECHNUNGSNUMMER}}","{{BETRAG}}","{{LEISTUNG}}","{{DATUM}}","{{FAELLIGKEIT}}"]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_clients (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.customer_notes add column if not exists actor_name text default 'System';
alter table public.appointments add column if not exists notes text;
alter table public.tickets add column if not exists closed_at timestamptz;
alter table public.invoices add column if not exists service_type text;

alter table public.file_versions enable row level security;
alter table public.invoice_templates enable row level security;
alter table public.customer_clients enable row level security;

do $$
declare t text;
begin
  foreach t in array array['file_versions','invoice_templates','customer_clients','customer_files']
  loop
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='customer_id') then
      execute format('drop policy if exists %I on public.%I', t || '_access', t);
      execute format('create policy %I on public.%I for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id))', t || '_access', t);
    end if;
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
('media','media',false,26214400,array['image/png','image/jpeg','image/webp','video/mp4','application/pdf']),
('invoices','invoices',false,26214400,array['application/pdf','image/png','image/jpeg']),
('contracts','contracts',false,26214400,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
('reports','reports',false,26214400,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.apple.keynote']),
('documents','documents',false,26214400,null)
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists mmos_storage_read on storage.objects;
create policy mmos_storage_read on storage.objects for select using (bucket_id in ('media','invoices','contracts','reports','documents'));

drop policy if exists mmos_storage_insert on storage.objects;
create policy mmos_storage_insert on storage.objects for insert with check (bucket_id in ('media','invoices','contracts','reports','documents'));

drop policy if exists mmos_storage_update on storage.objects;
create policy mmos_storage_update on storage.objects for update using (bucket_id in ('media','invoices','contracts','reports','documents'));

create index if not exists idx_customer_files_customer_type on public.customer_files(customer_id, file_type, created_at desc);
create index if not exists idx_file_versions_customer_file on public.file_versions(customer_id, file_id, version desc);
