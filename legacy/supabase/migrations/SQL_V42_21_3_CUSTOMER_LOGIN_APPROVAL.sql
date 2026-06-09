-- MMOS V42.21.3 Customer Login & Approval Flow
-- Admin kann Kunden einladen, Kunden können Einladung annehmen, Selbstregistrierungen warten auf Freigabe.
-- Kann mehrfach ausgeführt werden.

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key,
  display_name text,
  email text,
  role text not null default 'customer',
  customer_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.user_profiles add column if not exists email text;
alter table public.user_profiles add column if not exists customer_id text;
alter table public.user_profiles add column if not exists status text not null default 'active';
alter table public.user_profiles add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();

alter table if exists public.customers add column if not exists status text not null default 'active';
alter table if exists public.customers add column if not exists contact_person text;
alter table if exists public.customers add column if not exists email text;
alter table if exists public.customers add column if not exists phone text;
alter table if exists public.customers add column if not exists requested_package text;
alter table if exists public.customers add column if not exists package_name text;
alter table if exists public.customers add column if not exists onboarding_source text default 'admin';
alter table if exists public.customers add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.customers add column if not exists updated_at timestamptz default now();

create table if not exists public.customer_registrations (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  customer_id text,
  company_name text not null,
  contact_person text,
  email text not null,
  phone text,
  requested_package text not null default 'Starter',
  status text not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.customer_invites (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null,
  email text not null,
  contact_person text,
  package_name text not null default 'Starter',
  status text not null default 'open',
  token text not null unique,
  invite_url text,
  created_by text,
  auth_user_id uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.customer_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  customer_id text not null,
  email text not null,
  display_name text,
  role text not null default 'owner',
  status text not null default 'active',
  accepted_invite_id uuid references public.customer_invites(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(auth_user_id, customer_id)
);

create index if not exists idx_customer_registrations_customer_id on public.customer_registrations(customer_id);
create index if not exists idx_customer_registrations_status on public.customer_registrations(status);
create index if not exists idx_customer_invites_token on public.customer_invites(token);
create index if not exists idx_customer_invites_customer_id on public.customer_invites(customer_id);
create index if not exists idx_customer_users_customer_id on public.customer_users(customer_id);
create index if not exists idx_user_profiles_customer_id on public.user_profiles(customer_id);

alter table public.user_profiles enable row level security;
alter table public.customer_registrations enable row level security;
alter table public.customer_invites enable row level security;
alter table public.customer_users enable row level security;

-- Sichere Basispolicies. Admin-Zugriffe laufen im Backend über Service Role.
drop policy if exists user_profiles_self_read on public.user_profiles;
create policy user_profiles_self_read on public.user_profiles for select using (auth.uid() = id);

drop policy if exists customer_registrations_self_read on public.customer_registrations;
create policy customer_registrations_self_read on public.customer_registrations for select using (auth.uid() = auth_user_id);

drop policy if exists customer_users_self_read on public.customer_users;
create policy customer_users_self_read on public.customer_users for select using (auth.uid() = auth_user_id);
