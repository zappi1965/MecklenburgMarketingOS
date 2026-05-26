-- ============================================================
-- 0039_v29_tool_registry_sync_v3.sql
-- MMOS V30.4 SQL Dedupe Fix
-- ------------------------------------------------------------
-- Fixes:
-- - ERROR 21000: ON CONFLICT DO UPDATE command cannot affect row a second time
-- - Dedupe for package_tools
-- - Dedupe for package_features
-- - Dedupe for customer_tool_access
--
-- Safe:
-- - no DROP TABLE
-- - no data deletion
-- - only CREATE / ALTER / UPSERT
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.package_features (
  id uuid primary key default gen_random_uuid(),
  package_key text not null default 'starter',
  feature_key text not null default 'feature',
  label text not null default 'Feature',
  description text,
  category text not null default 'Allgemein',
  included boolean not null default true,
  limit_value text,
  sort_order integer not null default 100,
  tooltip text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.package_features add column if not exists package_key text not null default 'starter';
alter table public.package_features add column if not exists feature_key text not null default 'feature';
alter table public.package_features add column if not exists label text not null default 'Feature';
alter table public.package_features add column if not exists description text;
alter table public.package_features add column if not exists category text not null default 'Allgemein';
alter table public.package_features add column if not exists included boolean not null default true;
alter table public.package_features add column if not exists limit_value text;
alter table public.package_features add column if not exists sort_order integer not null default 100;
alter table public.package_features add column if not exists tooltip text;
alter table public.package_features add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.package_features add column if not exists created_at timestamptz not null default now();
alter table public.package_features add column if not exists updated_at timestamptz not null default now();

create unique index if not exists package_features_package_feature_uidx
on public.package_features (package_key, feature_key);

create table if not exists public.package_tools (
  id uuid primary key default gen_random_uuid(),
  package_key text not null default 'starter',
  tool_key text not null default 'tool',
  label text not null default 'Tool',
  description text,
  enabled_by_default boolean not null default true,
  visible_to_customer boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.package_tools add column if not exists package_key text not null default 'starter';
alter table public.package_tools add column if not exists tool_key text not null default 'tool';
alter table public.package_tools add column if not exists label text not null default 'Tool';
alter table public.package_tools add column if not exists description text;
alter table public.package_tools add column if not exists enabled_by_default boolean not null default true;
alter table public.package_tools add column if not exists visible_to_customer boolean not null default true;
alter table public.package_tools add column if not exists sort_order integer not null default 100;
alter table public.package_tools add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.package_tools add column if not exists created_at timestamptz not null default now();
alter table public.package_tools add column if not exists updated_at timestamptz not null default now();

create unique index if not exists package_tools_package_tool_uidx
on public.package_tools (package_key, tool_key);

create table if not exists public.customer_tool_access (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  tool_key text not null default 'tool',
  enabled boolean not null default true,
  visible_to_customer boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_tool_access add column if not exists customer_id uuid;
alter table public.customer_tool_access add column if not exists tool_key text not null default 'tool';
alter table public.customer_tool_access add column if not exists enabled boolean not null default true;
alter table public.customer_tool_access add column if not exists visible_to_customer boolean not null default true;
alter table public.customer_tool_access add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customer_tool_access add column if not exists created_at timestamptz not null default now();
alter table public.customer_tool_access add column if not exists updated_at timestamptz not null default now();

create unique index if not exists customer_tool_access_customer_tool_uidx
on public.customer_tool_access (customer_id, tool_key);

-- ============================================================
-- TOOL SOURCE
-- ============================================================

create temp table if not exists _mmos_v30_tool_source (
  package_key text,
  tool_key text,
  label text,
  description text,
  category text,
  visible_to_customer boolean,
  sort_order integer
) on commit drop;

truncate table _mmos_v30_tool_source;

insert into _mmos_v30_tool_source
(package_key, tool_key, label, description, category, visible_to_customer, sort_order)
values
('starter','dashboard','Dashboard','Zentrale Übersicht','Core',true,10),
('starter','booking','Booking','Termine und Services','Operations',true,20),
('starter','invoices','Rechnungen','Rechnungen und PDF','Billing',true,30),
('starter','tickets','Tickets','Support und Anfragen','Support',true,40),

('growth','dashboard','Dashboard','Zentrale Übersicht','Core',true,10),
('growth','booking','Booking','Termine und Services','Operations',true,20),
('growth','invoices','Rechnungen','Rechnungen und PDF','Billing',true,30),
('growth','tickets','Tickets','Support und Anfragen','Support',true,40),
('growth','qr_campaigns','QR Kampagnen','QR-Kampagnen mit Slug, Landingpage und Tracking','QR & Loyalty',true,100),
('growth','public_landing_page','Öffentliche /l/[slug] Seite','Endkundenseite für QR, Review und Loyalty','QR & Loyalty',true,110),
('growth','loyalty','Loyalty Programm','Punkteprogramm über QR-Code','QR & Loyalty',true,120),
('growth','loyalty_rewards','Rewards','Einlösbare Prämien und Rabatte','QR & Loyalty',true,130),
('growth','reviews','Reviews','Bewertungen und Feedback','Reviews',true,140),

('premium','dashboard','Dashboard','Zentrale Übersicht','Core',true,10),
('premium','booking','Booking','Termine und Services','Operations',true,20),
('premium','invoices','Rechnungen','Rechnungen und PDF','Billing',true,30),
('premium','tickets','Tickets','Support und Anfragen','Support',true,40),
('premium','qr_campaigns','QR Kampagnen','QR-Kampagnen mit Slug, Landingpage und Tracking','QR & Loyalty',true,100),
('premium','public_landing_page','Öffentliche /l/[slug] Seite','Endkundenseite für QR, Review und Loyalty','QR & Loyalty',true,110),
('premium','loyalty','Loyalty Programm','Punkteprogramm über QR-Code','QR & Loyalty',true,120),
('premium','loyalty_rewards','Rewards','Einlösbare Prämien und Rabatte','QR & Loyalty',true,130),
('premium','loyalty_reward_rules','Reward Regeln','Reward-Typen und Punkte-Regeln','QR & Loyalty',true,200),
('premium','staff_confirmation_codes','Mitarbeiter-Bestätigungscode','Reward-Einlösung per Mitarbeitercode','QR & Loyalty',true,210),
('premium','loyalty_segments','Loyalty Segmente','VIP, inaktiv, reward-ready und review-aktiv','QR & Loyalty',true,220),
('premium','smart_loyalty_v2','Smart Loyalty V2','VIP-Level, Multiplikatoren und Smart Actions','QR & Loyalty',true,230),
('premium','reviews','Reviews','Bewertungen und Feedback','Reviews',true,140),
('premium','review_intelligence','Review Intelligence','Sentiment, Themen, Antwortvorschläge und Eskalation','Reviews',true,240),
('premium','review_response_templates','Antwortvorlagen','Vorlagen für Bewertungsantworten','Reviews',true,250),
('premium','smart_automation','Smart Automation','Regeln und Automationsläufe','Automation',true,260),
('premium','marketing_automation','Marketing Automation','Reaktivierung, Review Booster und Loyalty-Kampagnen','Marketing',true,270),
('premium','ai_business_assistant','AI Business Assistant','Empfehlungen, Chancen und Warnungen','AI',true,280),
('premium','customer_health','Customer Health','Health Score und Warnungen','Analytics',true,290),
('premium','customer_intelligence','Customer Intelligence','Risk, Upsell und Package Usage Score','Analytics',true,300),
('premium','dynamic_billing','Dynamic Billing','Usage-basierte Zusatzabrechnung','Billing',false,310),
('premium','revenue_forecasting','Revenue Forecasting','Forecasts aus Pipeline und MRR','Analytics',false,320),
('premium','revenue_share','Revenue Share','Umsatzbeteiligungslogik','Billing',false,330),
('premium','package_recommendations','Package Recommendations','Paket- und Add-on Empfehlungen','Billing',false,340),
('premium','package_matrix','Paket-Matrix','Paketlogik und Tool-Zugriffe','Billing',false,350),
('premium','pipeline','Pipeline','Leads und Upsell-Potenzial','Sales',false,360),
('premium','crm','CRM / Kundenakte','Kundenverwaltung und Timeline','CRM',false,370),
('premium','timeline','Timeline Events','Verknüpfte Kundenereignisse','CRM',false,380);

-- ============================================================
-- PACKAGE TOOLS UPSERT, DEDUPED BY (package_key, tool_key)
-- ============================================================

with deduped_tools as (
  select
    package_key,
    tool_key,
    max(label) as label,
    max(description) as description,
    max(category) as category,
    bool_or(visible_to_customer) as visible_to_customer,
    min(sort_order) as sort_order
  from _mmos_v30_tool_source
  group by package_key, tool_key
)
insert into public.package_tools (
  package_key, tool_key, label, description, enabled_by_default, visible_to_customer, sort_order, metadata
)
select
  package_key,
  tool_key,
  label,
  description,
  true,
  visible_to_customer,
  sort_order,
  jsonb_build_object('category', category, 'v30_4_sync', true)
from deduped_tools
on conflict (package_key, tool_key) do update set
  label = excluded.label,
  description = excluded.description,
  enabled_by_default = true,
  visible_to_customer = excluded.visible_to_customer,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = now();

-- ============================================================
-- PACKAGE FEATURES UPSERT, DEDUPED BY (package_key, feature_key)
-- ============================================================

with deduped_features as (
  select
    package_key,
    tool_key as feature_key,
    max(label) as label,
    max(description) as description,
    max(category) as category,
    min(sort_order) as sort_order
  from _mmos_v30_tool_source
  group by package_key, tool_key
)
insert into public.package_features (
  package_key, feature_key, label, description, category, included, limit_value, sort_order, tooltip, metadata
)
select
  package_key,
  feature_key,
  label,
  description,
  category,
  true,
  'included',
  sort_order,
  description,
  '{"v30_4_sync":true}'::jsonb
from deduped_features
on conflict (package_key, feature_key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  included = true,
  limit_value = excluded.limit_value,
  sort_order = excluded.sort_order,
  tooltip = excluded.tooltip,
  metadata = excluded.metadata,
  updated_at = now();

-- ============================================================
-- DEMO CUSTOMER ACCESS, DEDUPED BY tool_key
-- ============================================================

with demo_tools as (
  select
    tool_key,
    bool_or(visible_to_customer) as visible_to_customer,
    min(sort_order) as sort_order
  from _mmos_v30_tool_source
  where package_key in ('starter','growth','premium')
  group by tool_key
)
insert into public.customer_tool_access (
  customer_id, tool_key, enabled, visible_to_customer, metadata
)
select
  '11111111-1111-1111-1111-111111111111'::uuid,
  tool_key,
  true,
  visible_to_customer,
  '{"v30_4_sync":true,"demo":true}'::jsonb
from demo_tools
on conflict (customer_id, tool_key) do update set
  enabled = true,
  visible_to_customer = excluded.visible_to_customer,
  metadata = excluded.metadata,
  updated_at = now();

-- ============================================================
-- AUDIT LOG, optional
-- ============================================================

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
values (
  'System',
  'v30_4_tool_registry_sync_applied',
  'system',
  '{"version":"0039_v29_tool_registry_sync_v3","reason":"dedupe_all_conflict_inserts"}'::jsonb
)
on conflict do nothing;

-- DONE
