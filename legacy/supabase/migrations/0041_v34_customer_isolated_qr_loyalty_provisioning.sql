-- ============================================================
-- 0041_v34_customer_isolated_qr_loyalty_provisioning.sql
-- Customer-isolated QR/Loyalty provisioning for every new customer
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.v33_functional_records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  resource text not null,
  local_id text,
  title text,
  status text not null default 'active',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists v33_functional_records_resource_customer_local_uidx
on public.v33_functional_records (resource, customer_id, local_id)
where local_id is not null and customer_id is not null;

create table if not exists public.v33_public_leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  loyalty_program_id uuid,
  loyalty_customer_id uuid,
  qr_campaign_id uuid,
  slug text,
  name text,
  email text,
  phone text,
  source text not null default 'qr_loyalty',
  status text not null default 'new',
  points_added integer not null default 0,
  points_balance integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists v33_public_leads_customer_idx on public.v33_public_leads (customer_id, created_at desc);

alter table public.qr_campaigns add column if not exists customer_id uuid;
alter table public.qr_campaigns add column if not exists title text default 'QR Kampagne';
alter table public.qr_campaigns add column if not exists name text default 'QR Kampagne';
alter table public.qr_campaigns add column if not exists slug text;
alter table public.qr_campaigns add column if not exists target_url text;
alter table public.qr_campaigns add column if not exists scans integer not null default 0;
alter table public.qr_campaigns add column if not exists conversions integer not null default 0;
alter table public.qr_campaigns add column if not exists active boolean not null default true;
alter table public.qr_campaigns add column if not exists status text not null default 'Aktiv';
alter table public.qr_campaigns add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.qr_campaigns add column if not exists updated_at timestamptz not null default now();

create unique index if not exists qr_campaigns_slug_uidx on public.qr_campaigns (slug) where slug is not null;

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
alter table public.loyalty_programs add column if not exists updated_at timestamptz not null default now();

create unique index if not exists loyalty_programs_slug_uidx on public.loyalty_programs (slug) where slug is not null;

alter table public.loyalty_customers add column if not exists customer_id uuid;
alter table public.loyalty_customers add column if not exists loyalty_program_id uuid;
alter table public.loyalty_customers add column if not exists email text;
alter table public.loyalty_customers add column if not exists phone text;
alter table public.loyalty_customers add column if not exists display_name text;
alter table public.loyalty_customers add column if not exists member_token text;
alter table public.loyalty_customers add column if not exists device_id text;
alter table public.loyalty_customers add column if not exists points_balance integer not null default 0;
alter table public.loyalty_customers add column if not exists total_points integer not null default 0;
alter table public.loyalty_customers add column if not exists total_scans integer not null default 0;
alter table public.loyalty_customers add column if not exists total_reviews integer not null default 0;
alter table public.loyalty_customers add column if not exists last_seen_at timestamptz;
alter table public.loyalty_customers add column if not exists last_activity_at timestamptz;
alter table public.loyalty_customers add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.loyalty_transactions add column if not exists customer_id uuid;
alter table public.loyalty_transactions add column if not exists loyalty_program_id uuid;
alter table public.loyalty_transactions add column if not exists loyalty_customer_id uuid;
alter table public.loyalty_transactions add column if not exists qr_campaign_id uuid;
alter table public.loyalty_transactions add column if not exists action text not null default 'points';
alter table public.loyalty_transactions add column if not exists points integer not null default 0;
alter table public.loyalty_transactions add column if not exists description text;
alter table public.loyalty_transactions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.loyalty_transactions add column if not exists created_at timestamptz not null default now();

alter table public.pipeline_leads add column if not exists customer_id uuid;
alter table public.pipeline_leads add column if not exists title text not null default 'Lead';
alter table public.pipeline_leads add column if not exists source text default 'manual';
alter table public.pipeline_leads add column if not exists stage text default 'new';
alter table public.pipeline_leads add column if not exists value numeric(12,2) not null default 0;
alter table public.pipeline_leads add column if not exists probability integer not null default 0;
alter table public.pipeline_leads add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.pipeline_leads add column if not exists created_at timestamptz not null default now();
alter table public.pipeline_leads add column if not exists updated_at timestamptz not null default now();

alter table public.customer_timeline_events add column if not exists customer_id uuid;
alter table public.customer_timeline_events add column if not exists event_type text not null default 'event';
alter table public.customer_timeline_events add column if not exists title text not null default 'Event';
alter table public.customer_timeline_events add column if not exists description text;
alter table public.customer_timeline_events add column if not exists source_module text not null default 'system';
alter table public.customer_timeline_events add column if not exists severity text not null default 'info';
alter table public.customer_timeline_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customer_timeline_events add column if not exists created_at timestamptz not null default now();

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values (
  'System',
  'v34_customer_isolated_qr_loyalty_provisioning_schema_applied',
  'system',
  '{"version":"0041_v34_customer_isolated_qr_loyalty_provisioning"}'::jsonb
)
on conflict do nothing;
