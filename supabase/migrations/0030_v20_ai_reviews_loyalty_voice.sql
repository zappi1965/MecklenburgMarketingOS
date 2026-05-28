
-- MMOS v20 AI Insights, Review Management, Loyalty QR, Voice CRM

create table if not exists public.ai_business_insights (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  insight_type text not null default 'general',
  title text not null,
  summary text not null,
  recommendation text,
  severity text not null default 'info',
  source_module text,
  score numeric(12,2),
  metadata jsonb not null default '{}'::jsonb,
  created_by text default 'System',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.review_sources (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  provider text not null default 'google',
  location_name text,
  external_location_id text,
  review_url text,
  average_rating numeric(3,2) default 0,
  total_reviews integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.review_feedback (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  qr_campaign_id uuid,
  loyalty_customer_id uuid,
  rating integer,
  feedback_text text,
  public_review_intended boolean not null default false,
  provider text default 'internal',
  reviewer_name text,
  reviewer_email text,
  reviewer_phone text,
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  qr_campaign_id uuid,
  name text not null,
  slug text unique not null,
  status text not null default 'active',
  points_per_scan integer not null default 10,
  points_per_booking integer not null default 25,
  points_per_review integer not null default 40,
  require_email_or_phone boolean not null default true,
  allow_device_cookie boolean not null default true,
  public_url text,
  qr_svg text,
  qr_png_base64 text,
  rules jsonb not null default '{}'::jsonb,
  created_by text default 'Admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_customers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  loyalty_program_id uuid references public.loyalty_programs(id) on delete cascade,
  display_name text,
  email text,
  phone text,
  member_token text unique not null,
  device_id_hash text,
  points_balance integer not null default 0,
  tier text not null default 'basic',
  consent_at timestamptz,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  loyalty_program_id uuid references public.loyalty_programs(id) on delete cascade,
  loyalty_customer_id uuid references public.loyalty_customers(id) on delete cascade,
  qr_campaign_id uuid,
  action text not null,
  points integer not null default 0,
  source text not null default 'qr',
  booking_id uuid,
  review_feedback_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  loyalty_program_id uuid references public.loyalty_programs(id) on delete cascade,
  name text not null,
  description text,
  required_points integer not null default 100,
  reward_type text not null default 'discount',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_redemptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  loyalty_program_id uuid references public.loyalty_programs(id) on delete cascade,
  loyalty_customer_id uuid references public.loyalty_customers(id) on delete cascade,
  reward_id uuid references public.loyalty_rewards(id) on delete set null,
  redemption_code text unique not null,
  status text not null default 'open',
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table if exists public.qr_campaigns add column if not exists loyalty_enabled boolean not null default false;
alter table if exists public.qr_campaigns add column if not exists loyalty_program_id uuid;
alter table if exists public.qr_campaigns add column if not exists review_management_enabled boolean not null default false;
alter table if exists public.qr_campaigns add column if not exists ai_insights_enabled boolean not null default false;

create table if not exists public.crm_voice_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  customer_client_id uuid,
  lead_id uuid,
  title text not null default 'Sprachnotiz',
  audio_url text,
  audio_mime_type text,
  transcript text,
  summary text,
  action_items jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  status text not null default 'created',
  created_by text default 'Admin',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_business_insights enable row level security;
alter table public.review_sources enable row level security;
alter table public.review_feedback enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.loyalty_customers enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.loyalty_rewards enable row level security;
alter table public.loyalty_redemptions enable row level security;
alter table public.crm_voice_notes enable row level security;

drop policy if exists ai_business_insights_customer_access on public.ai_business_insights;
create policy ai_business_insights_customer_access on public.ai_business_insights for all
using (customer_id is null or public.can_access_customer(customer_id))
with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists review_sources_customer_access on public.review_sources;
create policy review_sources_customer_access on public.review_sources for all
using (customer_id is null or public.can_access_customer(customer_id))
with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists review_feedback_customer_access on public.review_feedback;
create policy review_feedback_customer_access on public.review_feedback for all
using (customer_id is null or public.can_access_customer(customer_id))
with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists loyalty_programs_customer_access on public.loyalty_programs;
create policy loyalty_programs_customer_access on public.loyalty_programs for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

drop policy if exists loyalty_customers_customer_access on public.loyalty_customers;
create policy loyalty_customers_customer_access on public.loyalty_customers for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

drop policy if exists loyalty_transactions_customer_access on public.loyalty_transactions;
create policy loyalty_transactions_customer_access on public.loyalty_transactions for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

drop policy if exists loyalty_rewards_customer_access on public.loyalty_rewards;
create policy loyalty_rewards_customer_access on public.loyalty_rewards for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

drop policy if exists loyalty_redemptions_customer_access on public.loyalty_redemptions;
create policy loyalty_redemptions_customer_access on public.loyalty_redemptions for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

drop policy if exists crm_voice_notes_customer_access on public.crm_voice_notes;
create policy crm_voice_notes_customer_access on public.crm_voice_notes for all
using (customer_id is null or public.can_access_customer(customer_id))
with check (customer_id is null or public.can_access_customer(customer_id));

insert into public.package_features (package_key, feature_key, label, description, category, included, limit_value, sort_order, tooltip)
values
('growth','reviews','Bewertungsmanagement','Bewertungen, Feedback und Review Funnel auswerten.','Marketing',true,'Basis',12,'Für Growth verfügbar.'),
('growth','ai_insights','AI Business Insights','Automatische Handlungsempfehlungen aus KPIs.','Analytics',true,'Basis',13,'Insight-Cards aus CRM, QR, Booking und Pipeline.'),
('growth','loyalty','Loyalty QR','Bonusprogramm über QR-Kampagnen.','Kundenbindung',true,'1 Programm',14,'Loyalty im QR-Kampagnen-Reiter aktivierbar.'),
('premium','reviews','Bewertungsmanagement Plus','Reviews, Feedback, Quellen und Funnel-Auswertungen.','Marketing',true,'Premium',15,'Erweiterte Review-Analyse.'),
('premium','ai_insights','AI Business Insights Plus','Erweiterte KI-Empfehlungen und Risiko-/Chancenanalyse.','Analytics',true,'Premium',16,'Detaillierte Empfehlungen.'),
('premium','loyalty','Loyalty & Rewards','Bonusprogramme, Rewards, Einlösungen und QR-Verknüpfung.','Kundenbindung',true,'unbegrenzt',17,'Loyalty läuft über QR-Kampagnen und kann nachträglich verknüpft werden.'),
('premium','voice_crm','Voice Notes / Audio CRM','Sprachnotizen mit Transkript und CRM-Zusammenfassung.','CRM',true,'Admin',18,'Für Admin-CRM-Detailansichten.')
on conflict (package_key, feature_key) do update set
label=excluded.label,
description=excluded.description,
category=excluded.category,
included=excluded.included,
limit_value=excluded.limit_value,
sort_order=excluded.sort_order,
tooltip=excluded.tooltip;

insert into public.package_tools (package_key, tool_key, label, description, enabled_by_default, visible_to_customer, sort_order)
values
('growth','reviews','Bewertungen','Bewertungsmanagement und Review Funnel',true,true,15),
('growth','ai_insights','AI Insights','Automatische Business Insights',true,true,16),
('growth','loyalty','Loyalty QR','Bonusprogramm über QR-Kampagnen',true,true,17),
('premium','reviews','Bewertungen','Erweitertes Bewertungsmanagement',true,true,15),
('premium','ai_insights','AI Insights','Erweiterte Business Insights',true,true,16),
('premium','loyalty','Loyalty & Rewards','Bonusprogramm und Rewards',true,true,17),
('premium','voice_crm','Voice CRM','Sprachnotizen im CRM',true,false,18)
on conflict (package_key, tool_key) do update set
label=excluded.label,
description=excluded.description,
enabled_by_default=excluded.enabled_by_default,
visible_to_customer=excluded.visible_to_customer,
sort_order=excluded.sort_order;

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','v20_ai_reviews_loyalty_voice_applied','system','{"version":"0030"}'::jsonb)
on conflict do nothing;
