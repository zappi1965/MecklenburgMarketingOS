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

create index if not exists v33_functional_records_customer_idx on public.v33_functional_records (customer_id);
create index if not exists v33_functional_records_resource_idx on public.v33_functional_records (resource);
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

alter table public.loyalty_programs add column if not exists slug text;
alter table public.loyalty_programs add column if not exists points_per_scan integer not null default 10;
alter table public.loyalty_programs add column if not exists active boolean not null default true;
alter table public.loyalty_programs add column if not exists status text not null default 'active';
alter table public.loyalty_programs add column if not exists qr_campaign_id uuid;
alter table public.loyalty_programs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.loyalty_programs add column if not exists updated_at timestamptz not null default now();

alter table public.loyalty_customers add column if not exists loyalty_program_id uuid;
alter table public.loyalty_customers add column if not exists email text;
alter table public.loyalty_customers add column if not exists phone text;
alter table public.loyalty_customers add column if not exists display_name text;
alter table public.loyalty_customers add column if not exists member_token text;
alter table public.loyalty_customers add column if not exists device_id text;
alter table public.loyalty_customers add column if not exists points_balance integer not null default 0;
alter table public.loyalty_customers add column if not exists total_points integer not null default 0;
alter table public.loyalty_customers add column if not exists total_scans integer not null default 0;
alter table public.loyalty_customers add column if not exists last_seen_at timestamptz;
alter table public.loyalty_customers add column if not exists last_activity_at timestamptz;
alter table public.loyalty_customers add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.qr_campaigns add column if not exists slug text;
alter table public.qr_campaigns add column if not exists title text default 'QR Kampagne';
alter table public.qr_campaigns add column if not exists name text default 'QR Kampagne';
alter table public.qr_campaigns add column if not exists target_url text;
alter table public.qr_campaigns add column if not exists scans integer not null default 0;
alter table public.qr_campaigns add column if not exists conversions integer not null default 0;
alter table public.qr_campaigns add column if not exists active boolean not null default true;
alter table public.qr_campaigns add column if not exists status text not null default 'Aktiv';
alter table public.qr_campaigns add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.qr_campaigns add column if not exists updated_at timestamptz not null default now();

alter table public.pipeline_leads add column if not exists customer_id uuid;
alter table public.pipeline_leads add column if not exists title text not null default 'Lead';
alter table public.pipeline_leads add column if not exists source text default 'manual';
alter table public.pipeline_leads add column if not exists stage text default 'new';
alter table public.pipeline_leads add column if not exists value numeric(12,2) not null default 0;
alter table public.pipeline_leads add column if not exists probability integer not null default 0;
alter table public.pipeline_leads add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.pipeline_leads add column if not exists created_at timestamptz not null default now();
alter table public.pipeline_leads add column if not exists updated_at timestamptz not null default now();

insert into public.qr_campaigns (
  id, customer_id, title, name, slug, target_url, scans, conversions, active, status, metadata
)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Frühstücks-Loyalty QR',
  'Frühstücks-Loyalty QR',
  'demo-cafe-morgenlicht',
  '/l/demo-cafe-morgenlicht',
  0,
  0,
  true,
  'Aktiv',
  '{"v33_lead_ready":true}'::jsonb
)
on conflict (id) do update set
  slug = excluded.slug,
  target_url = excluded.target_url,
  active = true,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.loyalty_programs (
  id, customer_id, qr_campaign_id, title, name, slug, points_per_scan, active, status, metadata
)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Morgenlicht Bonusclub',
  'Morgenlicht Bonusclub',
  'demo-cafe-morgenlicht',
  10,
  true,
  'active',
  '{"v33_lead_ready":true}'::jsonb
)
on conflict (id) do update set
  qr_campaign_id = excluded.qr_campaign_id,
  slug = excluded.slug,
  points_per_scan = excluded.points_per_scan,
  active = true,
  status = 'active',
  metadata = excluded.metadata,
  updated_at = now();

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values (
  'System',
  'v33_lead_ready_schema_applied',
  'system',
  '{"version":"0040_v33_lead_ready_functional_endpoints","public_test_url":"/l/demo-cafe-morgenlicht"}'::jsonb
)
on conflict do nothing;
