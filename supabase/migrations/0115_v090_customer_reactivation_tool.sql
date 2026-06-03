-- MMOS V090: Rückholaktionen / Customer Reactivation Add-on
-- Separat freischaltbares Modul für QR/Loyalty: persönliche Einmal-Links, Mitarbeitercode-Einlösung, Reaktivierungs-KPIs.

create extension if not exists "pgcrypto";

create table if not exists public.customer_reactivation_settings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  qr_campaign_id uuid,
  active boolean not null default true,
  inactive_after_days integer not null default 30,
  reward_name text not null default 'Wir vermissen dich: Gratis Kaffee',
  reward_type text not null default 'free_item',
  reward_points integer not null default 20,
  valid_days integer not null default 14,
  staff_code_required boolean not null default true,
  email_subject text not null default 'Wir haben dich vermisst ☕',
  email_intro text not null default 'Komm wieder vorbei und sichere dir deine persönliche Rückhol-Prämie.',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_reactivation_settings add column if not exists customer_id uuid;
alter table public.customer_reactivation_settings add column if not exists qr_campaign_id uuid;
alter table public.customer_reactivation_settings add column if not exists active boolean not null default true;
alter table public.customer_reactivation_settings add column if not exists inactive_after_days integer not null default 30;
alter table public.customer_reactivation_settings add column if not exists reward_name text not null default 'Wir vermissen dich: Gratis Kaffee';
alter table public.customer_reactivation_settings add column if not exists reward_type text not null default 'free_item';
alter table public.customer_reactivation_settings add column if not exists reward_points integer not null default 20;
alter table public.customer_reactivation_settings add column if not exists valid_days integer not null default 14;
alter table public.customer_reactivation_settings add column if not exists staff_code_required boolean not null default true;
alter table public.customer_reactivation_settings add column if not exists email_subject text not null default 'Wir haben dich vermisst ☕';
alter table public.customer_reactivation_settings add column if not exists email_intro text not null default 'Komm wieder vorbei und sichere dir deine persönliche Rückhol-Prämie.';
alter table public.customer_reactivation_settings add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customer_reactivation_settings add column if not exists created_at timestamptz not null default now();
alter table public.customer_reactivation_settings add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_reactivation_settings_customer on public.customer_reactivation_settings(customer_id);
create index if not exists idx_reactivation_settings_qr on public.customer_reactivation_settings(qr_campaign_id);

create table if not exists public.customer_reactivation_links (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  qr_campaign_id uuid,
  loyalty_program_id uuid,
  loyalty_customer_id uuid,
  email text,
  display_name text,
  token text not null unique,
  status text not null default 'open',
  reward_name text,
  reward_type text,
  reward_points integer not null default 0,
  staff_code_required boolean not null default true,
  sent_at timestamptz,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  opened_count integer not null default 0,
  redeemed_at timestamptz,
  reactivated_at timestamptz,
  staff_code_used text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_reactivation_links add column if not exists customer_id uuid;
alter table public.customer_reactivation_links add column if not exists qr_campaign_id uuid;
alter table public.customer_reactivation_links add column if not exists loyalty_program_id uuid;
alter table public.customer_reactivation_links add column if not exists loyalty_customer_id uuid;
alter table public.customer_reactivation_links add column if not exists email text;
alter table public.customer_reactivation_links add column if not exists display_name text;
alter table public.customer_reactivation_links add column if not exists token text;
alter table public.customer_reactivation_links add column if not exists status text not null default 'open';
alter table public.customer_reactivation_links add column if not exists reward_name text;
alter table public.customer_reactivation_links add column if not exists reward_type text;
alter table public.customer_reactivation_links add column if not exists reward_points integer not null default 0;
alter table public.customer_reactivation_links add column if not exists staff_code_required boolean not null default true;
alter table public.customer_reactivation_links add column if not exists sent_at timestamptz;
alter table public.customer_reactivation_links add column if not exists first_opened_at timestamptz;
alter table public.customer_reactivation_links add column if not exists last_opened_at timestamptz;
alter table public.customer_reactivation_links add column if not exists opened_count integer not null default 0;
alter table public.customer_reactivation_links add column if not exists redeemed_at timestamptz;
alter table public.customer_reactivation_links add column if not exists reactivated_at timestamptz;
alter table public.customer_reactivation_links add column if not exists staff_code_used text;
alter table public.customer_reactivation_links add column if not exists expires_at timestamptz;
alter table public.customer_reactivation_links add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customer_reactivation_links add column if not exists created_at timestamptz not null default now();
alter table public.customer_reactivation_links add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_reactivation_links_token_unique on public.customer_reactivation_links(token) where token is not null;
create index if not exists idx_reactivation_links_customer on public.customer_reactivation_links(customer_id);
create index if not exists idx_reactivation_links_qr on public.customer_reactivation_links(qr_campaign_id);
create index if not exists idx_reactivation_links_member on public.customer_reactivation_links(loyalty_customer_id);

create table if not exists public.customer_reactivation_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  qr_campaign_id uuid,
  loyalty_customer_id uuid,
  reactivation_link_id uuid,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.customer_reactivation_events add column if not exists customer_id uuid;
alter table public.customer_reactivation_events add column if not exists qr_campaign_id uuid;
alter table public.customer_reactivation_events add column if not exists loyalty_customer_id uuid;
alter table public.customer_reactivation_events add column if not exists reactivation_link_id uuid;
alter table public.customer_reactivation_events add column if not exists event_type text;
alter table public.customer_reactivation_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customer_reactivation_events add column if not exists created_at timestamptz not null default now();

create index if not exists idx_reactivation_events_customer on public.customer_reactivation_events(customer_id);
create index if not exists idx_reactivation_events_link on public.customer_reactivation_events(reactivation_link_id);

-- Tool als separat zubuchbares Add-on sichtbar machen, ohne es automatisch für alle zu aktivieren.
-- Aktivierung erfolgt pro Kunde über customer_tool_access.tool_key = 'Rückholaktionen' oder 'customer_reactivation'.
