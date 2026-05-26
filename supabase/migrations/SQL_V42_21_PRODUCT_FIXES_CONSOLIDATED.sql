-- MMOS V42.21 Product Fixes / Consolidated optional schema
-- Führt alle derzeit fehlenden optionalen Tabellen zusammen.
-- Kann mehrfach ausgeführt werden.
create extension if not exists pgcrypto;

create table if not exists public.landing_page_settings (
  id text primary key default 'main',
  scope text default 'public_home',
  brand_name text,
  nav_title text,
  logo_url text,
  logo_alt text,
  logo_mark_text text,
  logo_show_text boolean default true,
  hero_title text,
  hero_subline text,
  primary_cta_label text,
  secondary_cta_label text,
  show_public_demo_button boolean default true,
  package_headline text,
  package_subline text,
  packages jsonb default '{}'::jsonb,
  steps jsonb default '[]'::jsonb,
  faq jsonb default '[]'::jsonb,
  example_metrics jsonb default '[]'::jsonb,
  footer_note text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.landing_page_settings add column if not exists show_public_demo_button boolean default true;


create table if not exists public.knowledge_articles (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  title text,
  category text,
  content text,
  status text default 'Aktiv',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.competitor_benchmarks (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  name text,
  rating numeric,
  reviews integer,
  visibility numeric,
  profile_score numeric,
  keywords jsonb default '[]'::jsonb,
  notes text,
  status text default 'Aktiv',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.google_business_audits (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  business_name text,
  city text,
  branch text,
  website text,
  google_url text,
  rating numeric,
  reviews integer,
  score integer,
  status text default 'Entwurf',
  summary text,
  findings jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.mini_audits (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  audit_id text,
  title text,
  status text default 'Erstellt',
  recommendations jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.prospect_leads (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  name text,
  branch text,
  city text,
  address text,
  phone text,
  email text,
  website text,
  google_url text,
  rating numeric,
  reviews integer,
  score numeric,
  status text default 'Neu',
  source text,
  reasons jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.generated_offers (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  lead_id text,
  title text,
  package_name text,
  amount numeric,
  setup_fee numeric,
  services jsonb default '[]'::jsonb,
  status text default 'Entwurf',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.generated_contracts (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  offer_id text,
  title text,
  package_name text,
  term text,
  cancellation text,
  scope text,
  status text default 'Entwurf',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dunning_cases (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  invoice_id text,
  level integer default 1,
  status text default 'Vorbereitet',
  due_date date,
  message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customer_health_scores (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  score integer,
  status text,
  reasons jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.acquisition_campaigns (
  id text primary key default gen_random_uuid()::text,
  name text,
  branch text,
  city text,
  goal text,
  channel text,
  lead_ids jsonb default '[]'::jsonb,
  customer_ids jsonb default '[]'::jsonb,
  status text default 'Aktiv',
  stage text default 'Neu',
  next_step text,
  follow_up_at date,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz
);

create table if not exists public.api_usage_cache (
  id text primary key default gen_random_uuid()::text,
  cache_key text unique,
  provider text,
  payload jsonb default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.data_integrity_checks (
  id text primary key default gen_random_uuid()::text,
  status text default 'OK',
  issues jsonb default '[]'::jsonb,
  checked_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.onboarding_checklists (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  status text default 'In Arbeit',
  steps jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.monthly_reports (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  title text,
  status text default 'Entwurf',
  summary text,
  selected_sources jsonb default '[]'::jsonb,
  potential text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.approval_requests (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  title text,
  type text,
  description text,
  status text default 'Offen',
  decided_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.output_documents (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  title text,
  type text,
  status text default 'Entwurf',
  html text,
  pdf_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.public_landing_pages (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  title text,
  slug text unique,
  headline text,
  mode text default 'loyalty',
  status text default 'Aktiv',
  active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.loyalty_rewards (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  qr_campaign_id text,
  title text,
  type text,
  points integer default 0,
  points_required integer default 0,
  required_points integer default 0,
  status text default 'Aktiv',
  active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.loyalty_reward_rules (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  qr_campaign_id text,
  name text,
  trigger text,
  condition text,
  action text,
  points integer default 0,
  multiplier numeric default 1,
  status text default 'Aktiv',
  active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.staff_codes (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  qr_campaign_id text,
  code text,
  label text,
  role text,
  status text default 'Aktiv',
  active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Optional safety: add frequently used columns when tables already existed.
alter table public.acquisition_campaigns add column if not exists archived_at timestamptz;
alter table public.acquisition_campaigns add column if not exists next_step text;
alter table public.acquisition_campaigns add column if not exists updated_at timestamptz default now();
alter table public.loyalty_rewards add column if not exists qr_campaign_id text;
alter table public.loyalty_rewards add column if not exists points_required integer default 0;
alter table public.loyalty_rewards add column if not exists required_points integer default 0;
alter table public.loyalty_reward_rules add column if not exists qr_campaign_id text;
alter table public.staff_codes add column if not exists qr_campaign_id text;


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

-- Included from V42.23 Stability & Production Readiness
\i SQL_V42_23_STABILITY_PRODUCTION_READINESS.sql
