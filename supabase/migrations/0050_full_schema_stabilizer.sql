-- ============================================================
-- 0050_full_schema_stabilizer.sql
-- V39 Stability & Schema Guard
-- Defensive schema stabilizer for MMOS demo/live-like environment.
-- No drops. No destructive deletes. Only create/alter/index/upsert.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Kunde',
  created_at timestamptz not null default now()
);

alter table public.customers add column if not exists name text not null default 'Kunde';
alter table public.customers add column if not exists title text;
alter table public.customers add column if not exists company text;
alter table public.customers add column if not exists package_key text default 'growth';
alter table public.customers add column if not exists monthly_price numeric(12,2) default 299;
alter table public.customers add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customers add column if not exists created_at timestamptz not null default now();
alter table public.customers add column if not exists updated_at timestamptz not null default now();

create table if not exists public.qr_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  title text not null default 'QR Kampagne',
  created_at timestamptz not null default now()
);
alter table public.qr_campaigns add column if not exists customer_id uuid;
alter table public.qr_campaigns add column if not exists title text not null default 'QR Kampagne';
alter table public.qr_campaigns add column if not exists name text default 'QR Kampagne';
alter table public.qr_campaigns add column if not exists slug text;
alter table public.qr_campaigns add column if not exists target_url text;
alter table public.qr_campaigns add column if not exists scans integer not null default 0;
alter table public.qr_campaigns add column if not exists conversions integer not null default 0;
alter table public.qr_campaigns add column if not exists active boolean not null default true;
alter table public.qr_campaigns add column if not exists status text not null default 'Aktiv';
alter table public.qr_campaigns add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.qr_campaigns add column if not exists created_at timestamptz not null default now();
alter table public.qr_campaigns add column if not exists updated_at timestamptz not null default now();
create unique index if not exists qr_campaigns_slug_uidx on public.qr_campaigns (slug) where slug is not null;
create index if not exists qr_campaigns_customer_idx on public.qr_campaigns (customer_id);

create table if not exists public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text not null default 'Loyalty Programm',
  created_at timestamptz not null default now()
);
alter table public.loyalty_programs add column if not exists customer_id uuid;
alter table public.loyalty_programs add column if not exists qr_campaign_id uuid;
alter table public.loyalty_programs add column if not exists title text default 'Loyalty Programm';
alter table public.loyalty_programs add column if not exists name text default 'Loyalty Programm';
alter table public.loyalty_programs add column if not exists slug text;
alter table public.loyalty_programs add column if not exists points_per_scan integer not null default 10;
alter table public.loyalty_programs add column if not exists active boolean not null default true;
alter table public.loyalty_programs add column if not exists status text not null default 'active';
alter table public.loyalty_programs add column if not exists require_staff_code boolean not null default true;
alter table public.loyalty_programs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.loyalty_programs add column if not exists created_at timestamptz not null default now();
alter table public.loyalty_programs add column if not exists updated_at timestamptz not null default now();
create unique index if not exists loyalty_programs_slug_uidx on public.loyalty_programs (slug) where slug is not null;
create index if not exists loyalty_programs_customer_idx on public.loyalty_programs (customer_id);

create table if not exists public.loyalty_customers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  created_at timestamptz not null default now()
);
alter table public.loyalty_customers add column if not exists customer_id uuid;
alter table public.loyalty_customers add column if not exists loyalty_program_id uuid;
alter table public.loyalty_customers add column if not exists email text;
alter table public.loyalty_customers add column if not exists phone text;
alter table public.loyalty_customers add column if not exists display_name text;
alter table public.loyalty_customers add column if not exists member_token text;
alter table public.loyalty_customers add column if not exists device_id text;
alter table public.loyalty_customers add column if not exists birthday date;
alter table public.loyalty_customers add column if not exists tier text not null default 'Basic';
alter table public.loyalty_customers add column if not exists points_balance integer not null default 0;
alter table public.loyalty_customers add column if not exists total_points integer not null default 0;
alter table public.loyalty_customers add column if not exists total_scans integer not null default 0;
alter table public.loyalty_customers add column if not exists total_reviews integer not null default 0;
alter table public.loyalty_customers add column if not exists last_seen_at timestamptz;
alter table public.loyalty_customers add column if not exists last_activity_at timestamptz;
alter table public.loyalty_customers add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.loyalty_customers add column if not exists created_at timestamptz not null default now();
create index if not exists loyalty_customers_customer_idx on public.loyalty_customers (customer_id);
create index if not exists loyalty_customers_email_idx on public.loyalty_customers (email);

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  created_at timestamptz not null default now()
);
alter table public.loyalty_transactions add column if not exists customer_id uuid;
alter table public.loyalty_transactions add column if not exists loyalty_program_id uuid;
alter table public.loyalty_transactions add column if not exists loyalty_customer_id uuid;
alter table public.loyalty_transactions add column if not exists qr_campaign_id uuid;
alter table public.loyalty_transactions add column if not exists action text not null default 'points';
alter table public.loyalty_transactions add column if not exists points integer not null default 0;
alter table public.loyalty_transactions add column if not exists description text;
alter table public.loyalty_transactions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.loyalty_transactions add column if not exists created_at timestamptz not null default now();
create index if not exists loyalty_transactions_customer_idx on public.loyalty_transactions (customer_id, created_at desc);

create table if not exists public.v33_public_leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  created_at timestamptz not null default now()
);
alter table public.v33_public_leads add column if not exists customer_id uuid;
alter table public.v33_public_leads add column if not exists loyalty_program_id uuid;
alter table public.v33_public_leads add column if not exists loyalty_customer_id uuid;
alter table public.v33_public_leads add column if not exists qr_campaign_id uuid;
alter table public.v33_public_leads add column if not exists slug text;
alter table public.v33_public_leads add column if not exists name text;
alter table public.v33_public_leads add column if not exists email text;
alter table public.v33_public_leads add column if not exists phone text;
alter table public.v33_public_leads add column if not exists source text not null default 'qr_loyalty';
alter table public.v33_public_leads add column if not exists status text not null default 'new';
alter table public.v33_public_leads add column if not exists points_added integer not null default 0;
alter table public.v33_public_leads add column if not exists points_balance integer not null default 0;
alter table public.v33_public_leads add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.v33_public_leads add column if not exists created_at timestamptz not null default now();
create index if not exists v33_public_leads_customer_idx on public.v33_public_leads (customer_id, created_at desc);
create index if not exists v33_public_leads_duplicate_guard_idx on public.v33_public_leads (customer_id, slug, email, created_at desc);

create table if not exists public.v33_functional_records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  resource text not null,
  created_at timestamptz not null default now()
);
alter table public.v33_functional_records add column if not exists customer_id uuid;
alter table public.v33_functional_records add column if not exists resource text not null default 'record';
alter table public.v33_functional_records add column if not exists local_id text;
alter table public.v33_functional_records add column if not exists title text;
alter table public.v33_functional_records add column if not exists status text not null default 'active';
alter table public.v33_functional_records add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.v33_functional_records add column if not exists created_at timestamptz not null default now();
alter table public.v33_functional_records add column if not exists updated_at timestamptz not null default now();
create unique index if not exists v33_functional_records_resource_customer_local_uidx on public.v33_functional_records (resource, customer_id, local_id) where local_id is not null and customer_id is not null;
create index if not exists v33_functional_records_customer_idx on public.v33_functional_records (customer_id, resource);

create table if not exists public.pipeline_leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  title text not null default 'Lead',
  created_at timestamptz not null default now()
);
alter table public.pipeline_leads add column if not exists customer_id uuid;
alter table public.pipeline_leads add column if not exists title text not null default 'Lead';
alter table public.pipeline_leads add column if not exists source text default 'manual';
alter table public.pipeline_leads add column if not exists stage text default 'new';
alter table public.pipeline_leads add column if not exists value numeric(12,2) not null default 0;
alter table public.pipeline_leads add column if not exists probability integer not null default 0;
alter table public.pipeline_leads add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.pipeline_leads add column if not exists created_at timestamptz not null default now();
alter table public.pipeline_leads add column if not exists updated_at timestamptz not null default now();

create table if not exists public.customer_timeline_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  title text not null default 'Event',
  created_at timestamptz not null default now()
);
alter table public.customer_timeline_events add column if not exists customer_id uuid;
alter table public.customer_timeline_events add column if not exists event_type text not null default 'event';
alter table public.customer_timeline_events add column if not exists title text not null default 'Event';
alter table public.customer_timeline_events add column if not exists description text;
alter table public.customer_timeline_events add column if not exists source_module text not null default 'system';
alter table public.customer_timeline_events add column if not exists severity text not null default 'info';
alter table public.customer_timeline_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customer_timeline_events add column if not exists created_at timestamptz not null default now();

create table if not exists public.review_feedback (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  created_at timestamptz not null default now()
);
alter table public.review_feedback add column if not exists customer_id uuid;
alter table public.review_feedback add column if not exists loyalty_program_id uuid;
alter table public.review_feedback add column if not exists loyalty_customer_id uuid;
alter table public.review_feedback add column if not exists qr_campaign_id uuid;
alter table public.review_feedback add column if not exists rating integer;
alter table public.review_feedback add column if not exists feedback_text text;
alter table public.review_feedback add column if not exists comment text;
alter table public.review_feedback add column if not exists reviewer_name text;
alter table public.review_feedback add column if not exists reviewer_email text;
alter table public.review_feedback add column if not exists source text;
alter table public.review_feedback add column if not exists status text not null default 'new';
alter table public.review_feedback add column if not exists sentiment text;
alter table public.review_feedback add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.review_feedback add column if not exists created_at timestamptz not null default now();

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  title text not null default 'Ticket',
  created_at timestamptz not null default now()
);
alter table public.tickets add column if not exists customer_id uuid;
alter table public.tickets add column if not exists title text not null default 'Ticket';
alter table public.tickets add column if not exists status text not null default 'open';
alter table public.tickets add column if not exists priority text not null default 'medium';
alter table public.tickets add column if not exists source text;
alter table public.tickets add column if not exists description text;
alter table public.tickets add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.tickets add column if not exists created_at timestamptz not null default now();

create table if not exists public.v35_engine_runs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  engine_key text not null default 'engine',
  status text not null default 'completed',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.v35_engine_runs add column if not exists customer_id uuid;
alter table public.v35_engine_runs add column if not exists engine_key text not null default 'engine';
alter table public.v35_engine_runs add column if not exists status text not null default 'completed';
alter table public.v35_engine_runs add column if not exists input jsonb not null default '{}'::jsonb;
alter table public.v35_engine_runs add column if not exists output jsonb not null default '{}'::jsonb;
alter table public.v35_engine_runs add column if not exists created_at timestamptz not null default now();

create table if not exists public.v37_loyalty_settings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  brand_name text not null default 'Bonusclub',
  brand_font text not null default 'Pacifico',
  brand_primary text not null default '#d4af37',
  brand_secondary text not null default '#111827',
  brand_accent text not null default '#f8fafc',
  hero_headline text not null default 'Willkommen im Bonusclub',
  hero_subline text not null default 'Sammle Punkte, sichere dir Rewards und werde VIP.',
  qr_style text not null default 'luxury',
  qr_foreground text not null default '#111827',
  qr_background text not null default '#ffffff',
  qr_logo_text text,
  daily_scan_limit integer not null default 1,
  weekly_scan_limit integer not null default 5,
  birthday_bonus_points integer not null default 100,
  referral_bonus_referrer integer not null default 100,
  referral_bonus_friend integer not null default 50,
  level_rules jsonb not null default '[{"tier":"Basic","min_points":0,"multiplier":1},{"tier":"Silver","min_points":250,"multiplier":1.1},{"tier":"Gold","min_points":500,"multiplier":1.25},{"tier":"VIP","min_points":1000,"multiplier":1.5}]'::jsonb,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists v37_loyalty_settings_customer_uidx on public.v37_loyalty_settings (customer_id);

create table if not exists public.v36_qa_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  event_key text not null,
  status text not null default 'ok',
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.v38_demo_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  event_key text not null,
  scope text,
  status text not null default 'ok',
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.security_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_name text,
  action text not null default 'unknown',
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','v39_full_schema_stabilizer_applied','system','{"version":"0050_full_schema_stabilizer","safe":true,"destructive":false}'::jsonb)
on conflict do nothing;
