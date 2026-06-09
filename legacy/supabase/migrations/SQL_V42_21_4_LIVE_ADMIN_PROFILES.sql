-- MMOS V42.21.4 Live Admin Profiles
-- Ermöglicht das Anlegen echter Admin-Profile für Supabase Auth / Live-Login.
-- Kann mehrfach ausgeführt werden.

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key,
  username text,
  display_name text,
  email text,
  role text not null default 'customer',
  customer_id text,
  status text not null default 'active',
  created_by text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.user_profiles add column if not exists username text;
alter table public.user_profiles add column if not exists display_name text;
alter table public.user_profiles add column if not exists email text;
alter table public.user_profiles add column if not exists role text not null default 'customer';
alter table public.user_profiles add column if not exists customer_id text;
alter table public.user_profiles add column if not exists status text not null default 'active';
alter table public.user_profiles add column if not exists created_by text;
alter table public.user_profiles add column if not exists last_login_at timestamptz;
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();
alter table public.user_profiles add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_user_profiles_role on public.user_profiles(role);
create index if not exists idx_user_profiles_status on public.user_profiles(status);
create unique index if not exists idx_user_profiles_admin_email_unique on public.user_profiles(lower(email)) where role = 'admin' and email is not null;

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_self_read on public.user_profiles;
create policy user_profiles_self_read on public.user_profiles for select using (auth.uid() = id);

-- Admin-Erstellung erfolgt ausschließlich über das Railway-Backend mit Service Role.
