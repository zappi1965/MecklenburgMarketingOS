
-- MMOS v18 Customer Portal Registration
-- Kunden können sich registrieren und Pakete anfragen. Admin schaltet frei.

alter table if exists public.customers add column if not exists status text not null default 'active';
alter table if exists public.customers add column if not exists contact_person text;
alter table if exists public.customers add column if not exists email text;
alter table if exists public.customers add column if not exists phone text;
alter table if exists public.customers add column if not exists requested_package text;
alter table if exists public.customers add column if not exists onboarding_source text default 'admin';

create table if not exists public.customer_registrations (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  company_name text not null,
  contact_person text,
  email text not null,
  phone text,
  requested_package text not null default 'Starter',
  status text not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

alter table public.customer_registrations enable row level security;

drop policy if exists customer_registrations_self_read on public.customer_registrations;
create policy customer_registrations_self_read on public.customer_registrations
for select using (auth.uid() = auth_user_id);

drop policy if exists customer_registrations_self_insert on public.customer_registrations;
create policy customer_registrations_self_insert on public.customer_registrations
for insert with check (auth.uid() = auth_user_id);

drop policy if exists customer_registrations_admin_all on public.customer_registrations;
create policy customer_registrations_admin_all on public.customer_registrations
for all using (public.is_admin())
with check (public.is_admin());

-- Kunde darf Paketanfragen für seinen eigenen Kunden-Datensatz erstellen.
alter table if exists public.package_requests enable row level security;

drop policy if exists package_requests_customer_insert on public.package_requests;
create policy package_requests_customer_insert on public.package_requests
for insert with check (public.can_access_customer(customer_id));

drop policy if exists package_requests_customer_read on public.package_requests;
create policy package_requests_customer_read on public.package_requests
for select using (public.can_access_customer(customer_id));

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','customer_portal_registration_applied','system','{"version":"0027"}'::jsonb)
on conflict do nothing;
