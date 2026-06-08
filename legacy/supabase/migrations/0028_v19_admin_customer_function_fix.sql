
alter table if exists public.customers add column if not exists second_contact_name text;
alter table if exists public.customers add column if not exists second_contact_email text;
alter table if exists public.customers add column if not exists second_contact_phone text;
alter table if exists public.customers add column if not exists success_score_config jsonb not null default '{"weights":{"revenue":30,"tickets":20,"seo":20,"reviews":15,"activity":15},"thresholds":{"good":80,"warning":55}}'::jsonb;

alter table if exists public.customer_clients add column if not exists second_contact_name text;
alter table if exists public.customer_clients add column if not exists second_contact_email text;
alter table if exists public.customer_clients add column if not exists second_contact_phone text;

alter table if exists public.customer_service_categories add column if not exists price numeric(12,2) not null default 0;
alter table if exists public.customer_service_categories add column if not exists duration_minutes integer not null default 60;
alter table if exists public.customer_service_categories add column if not exists active boolean not null default true;

alter table if exists public.appointments add column if not exists service_category_id uuid;
alter table if exists public.appointments add column if not exists service_category_name text;
alter table if exists public.appointments add column if not exists price numeric(12,2) not null default 0;
alter table if exists public.appointments add column if not exists notes text;

alter table if exists public.invoices add column if not exists pdf_url text;
alter table if exists public.invoices add column if not exists pdf_base64 text;
alter table if exists public.invoices add column if not exists service_category_id uuid;
alter table if exists public.invoices add column if not exists source_appointment_id uuid;

alter table if exists public.qr_campaigns add column if not exists slug text;
alter table if exists public.qr_campaigns add column if not exists public_url text;
alter table if exists public.qr_campaigns add column if not exists redirect_url text;
alter table if exists public.qr_campaigns add column if not exists qr_svg text;
alter table if exists public.qr_campaigns add column if not exists qr_png_base64 text;
alter table if exists public.qr_campaigns add column if not exists scans integer not null default 0;
alter table if exists public.qr_campaigns add column if not exists conversions integer not null default 0;
alter table if exists public.qr_campaigns add column if not exists last_scan_at timestamptz;

create table if not exists public.qr_campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid,
  customer_id uuid,
  event_type text not null default 'scan',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.pipeline_leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  title text not null,
  source text default 'manual',
  stage text not null default 'lead',
  value numeric(12,2) not null default 0,
  probability integer not null default 10,
  probability_manual boolean not null default false,
  expected_close_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  automation_key text not null,
  title text not null,
  status text not null default 'completed',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.advanced_reports (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  title text not null,
  report_type text not null default 'monthly',
  pdf_url text,
  pdf_base64 text,
  status text not null default 'created',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.qr_campaign_events enable row level security;
alter table if exists public.pipeline_leads enable row level security;
alter table if exists public.automation_runs enable row level security;
alter table if exists public.advanced_reports enable row level security;

drop policy if exists qr_campaign_events_access on public.qr_campaign_events;
create policy qr_campaign_events_access on public.qr_campaign_events for all
using (customer_id is null or public.can_access_customer(customer_id))
with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists pipeline_leads_access on public.pipeline_leads;
create policy pipeline_leads_access on public.pipeline_leads for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

drop policy if exists automation_runs_access on public.automation_runs;
create policy automation_runs_access on public.automation_runs for all
using (customer_id is null or public.can_access_customer(customer_id))
with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists advanced_reports_access on public.advanced_reports;
create policy advanced_reports_access on public.advanced_reports for all
using (customer_id is null or public.can_access_customer(customer_id))
with check (customer_id is null or public.can_access_customer(customer_id));

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','v19_admin_customer_function_fix_applied','system','{"version":"0028"}'::jsonb)
on conflict do nothing;
