-- MMOS V085: Campaign repair, CRM delete and landing save hardening
-- Safe additive migration. Frontend/backend also strip unknown landing columns and provide an admin repair action.

create extension if not exists "pgcrypto";

alter table if exists public.customers add column if not exists is_deleted boolean not null default false;
alter table if exists public.customers add column if not exists deleted_at timestamptz;
alter table if exists public.customers add column if not exists deleted_reason text;
create index if not exists idx_customers_is_deleted_v085 on public.customers(is_deleted);

alter table if exists public.qr_campaigns add column if not exists slug text;
alter table if exists public.qr_campaigns add column if not exists public_url text;
alter table if exists public.qr_campaigns add column if not exists target_url text;
alter table if exists public.qr_campaigns add column if not exists purpose text default 'review';
alter table if exists public.qr_campaigns add column if not exists active boolean default true;
alter table if exists public.qr_campaigns add column if not exists status text default 'Aktiv';
alter table if exists public.qr_campaigns add column if not exists points_per_scan integer default 0;
alter table if exists public.qr_campaigns add column if not exists require_rescan_for_points boolean default true;
alter table if exists public.qr_campaigns add column if not exists rotate_qr_after_scan boolean default false;
alter table if exists public.qr_campaigns add column if not exists loyalty_enabled boolean default false;
alter table if exists public.qr_campaigns add column if not exists loyalty_program_id uuid;
alter table if exists public.qr_campaigns add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.qr_campaigns add column if not exists updated_at timestamptz default now();

alter table if exists public.loyalty_programs add column if not exists qr_campaign_id uuid;
alter table if exists public.loyalty_programs add column if not exists slug text;
alter table if exists public.loyalty_programs add column if not exists status text default 'active';
alter table if exists public.loyalty_programs add column if not exists points_per_scan integer default 10;
alter table if exists public.loyalty_programs add column if not exists public_url text;
alter table if exists public.loyalty_programs add column if not exists rules jsonb default '{}'::jsonb;
alter table if exists public.loyalty_programs add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.loyalty_programs add column if not exists updated_at timestamptz default now();

alter table if exists public.loyalty_rewards add column if not exists title text;
alter table if exists public.loyalty_rewards add column if not exists name text;
alter table if exists public.loyalty_rewards add column if not exists label text;
alter table if exists public.loyalty_rewards add column if not exists reward_title text;
alter table if exists public.loyalty_rewards add column if not exists reward_name text;
alter table if exists public.loyalty_rewards add column if not exists description text;
alter table if exists public.loyalty_rewards add column if not exists active boolean default true;
alter table if exists public.loyalty_rewards add column if not exists status text default 'active';
alter table if exists public.loyalty_rewards add column if not exists qr_campaign_id uuid;
alter table if exists public.loyalty_rewards add column if not exists loyalty_program_id uuid;
alter table if exists public.loyalty_rewards add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.loyalty_rewards add column if not exists updated_at timestamptz default now();

create table if not exists public.landing_page_settings (
  id text primary key,
  scope text not null default 'public_home',
  packages jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.landing_page_settings add column if not exists scope text not null default 'public_home';
alter table public.landing_page_settings add column if not exists packages jsonb not null default '{}'::jsonb;
alter table public.landing_page_settings add column if not exists updated_at timestamptz not null default now();
