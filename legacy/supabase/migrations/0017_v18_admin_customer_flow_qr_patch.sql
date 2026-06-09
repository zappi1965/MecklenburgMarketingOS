
-- MMOS v18 Admin Customer Flow QR Patch

alter table public.customers add column if not exists contact_person text;
alter table public.appointments add column if not exists notes text;

create table if not exists public.qr_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  internal_email text,
  internal_from integer default 1,
  internal_to integer default 3,
  google_from integer default 4,
  google_to integer default 5,
  google_review_url text,
  status text default 'Aktiv',
  created_at timestamptz not null default now()
);

alter table public.qr_campaigns enable row level security;

drop policy if exists qr_campaigns_access on public.qr_campaigns;
create policy qr_campaigns_access on public.qr_campaigns
for all using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

alter table public.notifications add column if not exists type text default 'system';
alter table public.notifications add column if not exists actor_name text;
alter table public.invoices add column if not exists service_type text;
