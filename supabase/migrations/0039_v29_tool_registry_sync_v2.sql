-- ============================================================
-- 0039_v29_tool_registry_sync_v2.sql
-- Purpose:
--   Re-sync all tools/modules created in V20-V28 into package_features,
--   package_tools and customer_tool_access.
--   This does not delete data.
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

create unique index if not exists customer_tool_access_customer_tool_uidx
on public.customer_tool_access (customer_id, tool_key);

with tools(package_key, tool_key, label, description, category, visible_to_customer, sort_order) as (
  values
  ('starter','dashboard','Dashboard','Zentrale Übersicht','Core',true,10),
  ('starter','booking','Booking','Termine und Services','Operations',true,20),
  ('starter','invoices','Rechnungen','Rechnungen und PDF','Billing',true,30),
  ('starter','tickets','Tickets','Support und Anfragen','Support',true,40),

  ('growth','qr_campaigns','QR Kampagnen','QR-Kampagnen mit Slug, Landingpage und Tracking','QR & Loyalty',true,100),
  ('growth','public_landing_page','Öffentliche /l/[slug] Seite','Endkundenseite für QR, Review und Loyalty','QR & Loyalty',true,110),
  ('growth','loyalty','Loyalty Programm','Punkteprogramm über QR-Code','QR & Loyalty',true,120),
  ('growth','loyalty_rewards','Rewards','Einlösbare Prämien und Rabatte','QR & Loyalty',true,130),
  ('growth','reviews','Reviews','Bewertungen und Feedback','Reviews',true,140),

  ('premium','loyalty_reward_rules','Reward Regeln','Reward-Typen und Punkte-Regeln','QR & Loyalty',true,200),
  ('premium','staff_confirmation_codes','Mitarbeiter-Bestätigungscode','Reward-Einlösung per Mitarbeitercode','QR & Loyalty',true,210),
  ('premium','loyalty_segments','Loyalty Segmente','VIP, inaktiv, reward-ready und review-aktiv','QR & Loyalty',true,220),
  ('premium','smart_loyalty_v2','Smart Loyalty V2','VIP-Level, Multiplikatoren und Smart Actions','QR & Loyalty',true,230),
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
  ('premium','timeline','Timeline Events','Verknüpfte Kundenereignisse','CRM',false,380)
)
insert into public.package_tools (
  package_key, tool_key, label, description, enabled_by_default, visible_to_customer, sort_order, metadata
)
select package_key, tool_key, label, description, true, visible_to_customer, sort_order, jsonb_build_object('category', category, 'v29_sync', true)
from tools
on conflict (package_key, tool_key) do update set
  label = excluded.label,
  description = excluded.description,
  enabled_by_default = true,
  visible_to_customer = excluded.visible_to_customer,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = now();

with features(package_key, feature_key, label, description, category, sort_order) as (
  select package_key, tool_key, label, description, category, sort_order
  from (
    values
    ('starter','dashboard','Dashboard','Zentrale Übersicht','Core',10),
    ('starter','booking','Booking','Termine und Services','Operations',20),
    ('starter','invoices','Rechnungen','Rechnungen und PDF','Billing',30),
    ('starter','tickets','Tickets','Support und Anfragen','Support',40),
    ('growth','qr_campaigns','QR Kampagnen','QR-Kampagnen mit Slug, Landingpage und Tracking','QR & Loyalty',100),
    ('growth','public_landing_page','Öffentliche /l/[slug] Seite','Endkundenseite für QR, Review und Loyalty','QR & Loyalty',110),
    ('growth','loyalty','Loyalty Programm','Punkteprogramm über QR-Code','QR & Loyalty',120),
    ('growth','loyalty_rewards','Rewards','Einlösbare Prämien und Rabatte','QR & Loyalty',130),
    ('growth','reviews','Reviews','Bewertungen und Feedback','Reviews',140),
    ('premium','loyalty_reward_rules','Reward Regeln','Reward-Typen und Punkte-Regeln','QR & Loyalty',200),
    ('premium','staff_confirmation_codes','Mitarbeiter-Bestätigungscode','Reward-Einlösung per Mitarbeitercode','QR & Loyalty',210),
    ('premium','loyalty_segments','Loyalty Segmente','VIP, inaktiv, reward-ready und review-aktiv','QR & Loyalty',220),
    ('premium','smart_loyalty_v2','Smart Loyalty V2','VIP-Level, Multiplikatoren und Smart Actions','QR & Loyalty',230),
    ('premium','review_intelligence','Review Intelligence','Sentiment, Themen, Antwortvorschläge und Eskalation','Reviews',240),
    ('premium','review_response_templates','Antwortvorlagen','Vorlagen für Bewertungsantworten','Reviews',250),
    ('premium','smart_automation','Smart Automation','Regeln und Automationsläufe','Automation',260),
    ('premium','marketing_automation','Marketing Automation','Reaktivierung, Review Booster und Loyalty-Kampagnen','Marketing',270),
    ('premium','ai_business_assistant','AI Business Assistant','Empfehlungen, Chancen und Warnungen','AI',280),
    ('premium','customer_health','Customer Health','Health Score und Warnungen','Analytics',290),
    ('premium','customer_intelligence','Customer Intelligence','Risk, Upsell und Package Usage Score','Analytics',300),
    ('premium','dynamic_billing','Dynamic Billing','Usage-basierte Zusatzabrechnung','Billing',310),
    ('premium','revenue_forecasting','Revenue Forecasting','Forecasts aus Pipeline und MRR','Analytics',320),
    ('premium','revenue_share','Revenue Share','Umsatzbeteiligungslogik','Billing',330),
    ('premium','package_recommendations','Package Recommendations','Paket- und Add-on Empfehlungen','Billing',340),
    ('premium','package_matrix','Paket-Matrix','Paketlogik und Tool-Zugriffe','Billing',350),
    ('premium','pipeline','Pipeline','Leads und Upsell-Potenzial','Sales',360),
    ('premium','crm','CRM / Kundenakte','Kundenverwaltung und Timeline','CRM',370),
    ('premium','timeline','Timeline Events','Verknüpfte Kundenereignisse','CRM',380)
  ) as t(package_key, tool_key, label, description, category, sort_order)
)
insert into public.package_features (
  package_key, feature_key, label, description, category, included, limit_value, sort_order, tooltip, metadata
)
select package_key, feature_key, label, description, category, true, 'included', sort_order, description, '{"v29_sync":true}'::jsonb
from features
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

-- Demo customer full Premium access
-- V29.1 Fix:
-- `package_tools` can contain the same `tool_key` in multiple packages.
-- The unique key on `customer_tool_access(customer_id, tool_key)` would then be hit
-- more than once in the same INSERT, causing:
-- ERROR 21000: ON CONFLICT DO UPDATE command cannot affect row a second time.
-- Therefore we deduplicate by tool_key before inserting.
with ranked_demo_tools as (
  select
    tool_key,
    bool_or(visible_to_customer) as visible_to_customer,
    min(sort_order) as sort_order
  from public.package_tools
  where package_key in ('starter','growth','premium')
  group by tool_key
)
insert into public.customer_tool_access (customer_id, tool_key, enabled, visible_to_customer, metadata)
select
  '11111111-1111-1111-1111-111111111111'::uuid,
  tool_key,
  true,
  visible_to_customer,
  '{"v29_sync":true,"demo":true}'::jsonb
from ranked_demo_tools
on conflict (customer_id, tool_key) do update set
  enabled = true,
  visible_to_customer = excluded.visible_to_customer,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values (
  'System',
  'v29_tool_registry_sync_v2_applied',
  'system',
  '{"version":"0039_v29_tool_registry_sync_v2","reason":"restore_all_v20_to_v28_tools"}'::jsonb
)
on conflict do nothing;
