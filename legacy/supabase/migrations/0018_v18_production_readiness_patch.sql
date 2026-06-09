
-- MMOS v18 Production Readiness Patch

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'customer',
  customer_id uuid references public.customers(id) on delete set null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_self_read on public.user_profiles;
create policy user_profiles_self_read on public.user_profiles
for select using (auth.uid() = id);

drop policy if exists user_profiles_admin_all on public.user_profiles;
create policy user_profiles_admin_all on public.user_profiles
for all using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
)
with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
);

alter table public.customers add column if not exists is_demo boolean default false;
alter table public.invoices add column if not exists is_demo boolean default false;
alter table public.notifications add column if not exists is_read boolean default false;
alter table public.notifications add column if not exists type text default 'system';
alter table public.notifications add column if not exists actor_name text;
alter table public.notifications add column if not exists actor_avatar text;

update public.customers set is_demo = true where name ilike 'DEMO %';
update public.invoices i set is_demo = true
where exists (select 1 from public.customers c where c.id = i.customer_id and c.is_demo = true);

create or replace view public.revenue_invoices_real as
select i.*
from public.invoices i
left join public.customers c on c.id = i.customer_id
where coalesce(i.is_demo,false) = false
and coalesce(c.is_demo,false) = false;

create table if not exists public.api_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  provider text not null,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.mail_jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  to_email text not null,
  subject text not null,
  html text,
  status text not null default 'pending',
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.qr_campaigns add column if not exists qr_data_url text;
alter table public.qr_campaigns add column if not exists review_url text;

create table if not exists public.production_checks (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  status text not null default 'pending',
  note text,
  updated_at timestamptz not null default now()
);

insert into public.production_checks (key,status,note)
values
('auth_roles','prepared','Supabase Auth profiles table prepared.'),
('worker','prepared','Railway worker script prepared.'),
('mail','needs_env','RESEND_API_KEY and MAIL_FROM required.'),
('pdf','prepared','Placeholder renderer prepared; LibreOffice/Gotenberg needed for DOCX->PDF.'),
('qr','prepared','QR code service prepared.'),
('api_sync','prepared','Provider sync placeholders prepared; OAuth credentials required.'),
('storage','prepared','Storage remains connected to Supabase buckets.')
on conflict (key) do update set status=excluded.status,note=excluded.note,updated_at=now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
('avatars','avatars',true,5242880,array['image/png','image/jpeg','image/webp']),
('qr-codes','qr-codes',true,5242880,array['image/png','image/svg+xml'])
on conflict (id) do update set public = excluded.public;

drop policy if exists qr_codes_read on storage.objects;
create policy qr_codes_read on storage.objects for select using (bucket_id = 'qr-codes');

drop policy if exists qr_codes_insert on storage.objects;
create policy qr_codes_insert on storage.objects for insert with check (bucket_id = 'qr-codes');
