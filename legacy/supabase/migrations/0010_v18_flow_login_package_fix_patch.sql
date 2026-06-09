
-- MMOS v18 Flow Login Package Fix Patch

alter table public.customers add column if not exists phone text;
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists zip text;
alter table public.customers add column if not exists city text;
alter table public.customers add column if not exists package_name text default 'Starter';

alter table public.invoices add column if not exists service_type text;
alter table public.ticket_messages add column if not exists sender_role text default 'admin';
alter table public.ticket_messages add column if not exists message text;
alter table public.integrations add column if not exists api_key text;
alter table public.integrations add column if not exists seo_enabled boolean default false;

create table if not exists public.invoice_categories (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.invoice_categories enable row level security;
drop policy if exists invoice_categories_access on public.invoice_categories;
create policy invoice_categories_access on public.invoice_categories
for all using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select p.role::text from public.profiles p where p.id = auth.uid()), 'anonymous');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() in ('admin','employee','support','sales','seo_manager','buchhaltung');
$$;

create or replace function public.can_access_customer(c_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is null
  or public.is_admin()
  or exists(
    select 1 from public.user_customer_access uca
    where uca.user_id = auth.uid()
    and uca.customer_id = c_id
  );
$$;
