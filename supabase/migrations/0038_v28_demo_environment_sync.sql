-- 0038_v28_demo_environment_sync.sql
-- MMOS V28 Demo Environment Sync
-- Bringt Demo-Admin und Demo-Kundenbereich auf Stand V27/V28.
-- Enthält Demo-Daten für CRM, QR, Loyalty, Segmente, Reviews, AI, Automation, Revenue, Billing, Pipeline, Booking und Rechnungen.

create extension if not exists pgcrypto;

-- Core compatibility tables
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  status text not null default 'active',
  package_key text not null default 'starter',
  is_demo boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table if exists public.customers add column if not exists package_key text not null default 'starter';
alter table if exists public.customers add column if not exists is_demo boolean not null default false;
alter table if exists public.customers add column if not exists customer_lifetime_value numeric(12,2) not null default 0;
alter table if exists public.customers add column if not exists risk_score integer not null default 0;
alter table if exists public.customers add column if not exists upsell_score integer not null default 0;
alter table if exists public.customers add column if not exists package_usage_score integer not null default 0;
alter table if exists public.customers add column if not exists risk_level text not null default 'low';
alter table if exists public.customers add column if not exists upsell_level text not null default 'low';

create table if not exists public.package_features (
  id uuid primary key default gen_random_uuid(), package_key text not null, feature_key text not null,
  label text not null, description text, category text not null default 'Allgemein', included boolean not null default true,
  limit_value text, sort_order integer not null default 100, tooltip text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(package_key, feature_key)
);
create table if not exists public.package_tools (
  id uuid primary key default gen_random_uuid(), package_key text not null, tool_key text not null,
  label text not null, description text, enabled_by_default boolean not null default true, visible_to_customer boolean not null default true,
  sort_order integer not null default 100, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(package_key, tool_key)
);
create table if not exists public.customer_tool_access (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, tool_key text not null,
  enabled boolean not null default true, visible_to_customer boolean not null default true, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  unique(customer_id, tool_key)
);
create table if not exists public.customer_tool_usage (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, tool_key text not null,
  usage_count integer not null default 0, last_used_at timestamptz, first_used_at timestamptz default now(), metadata jsonb not null default '{}'::jsonb,
  unique(customer_id, tool_key)
);
create table if not exists public.customer_timeline_events (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, event_type text not null, title text not null,
  description text, source_module text not null default 'system', source_id uuid, severity text not null default 'info', actor_name text default 'System',
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.pipeline_leads (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, title text not null, source text default 'manual', stage text default 'new',
  value numeric(12,2) not null default 0, probability integer not null default 0, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, title text not null, service_category_id uuid, service_category_name text,
  price numeric(12,2) not null default 0, start_time timestamptz, end_time timestamptz, status text not null default 'confirmed', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, invoice_number text not null, service_type text,
  amount numeric(12,2) not null default 0, total numeric(12,2) not null default 0, status text not null default 'Offen', pdf_url text, pdf_base64 text,
  service_category_id uuid, source_appointment_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, title text not null, description text,
  status text not null default 'open', priority text not null default 'medium', source text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

-- QR/Loyalty compatibility tables
create table if not exists public.qr_campaigns (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, name text not null default 'QR Kampagne', slug text unique, target_url text,
  scans integer not null default 0, conversions integer not null default 0, active boolean not null default true, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.loyalty_programs (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, qr_campaign_id uuid, name text not null default 'Loyalty Programm', slug text unique,
  points_per_scan integer not null default 10, active boolean not null default true, require_staff_code boolean not null default false,
  branding jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.loyalty_customers (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, loyalty_program_id uuid, email text, phone text, member_token text, device_id text, display_name text,
  points_balance integer not null default 0, total_points integer not null default 0, current_tier text not null default 'basic', total_scans integer not null default 0,
  total_reviews integer not null default 0, last_seen_at timestamptz, last_activity_at timestamptz, segment_summary jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, loyalty_program_id uuid, loyalty_customer_id uuid, qr_campaign_id uuid, reward_id uuid,
  action text not null default 'points', points integer not null default 0, description text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, loyalty_program_id uuid, title text not null, description text,
  reward_type text not null default 'discount', points_required integer not null default 100, active boolean not null default true,
  require_staff_confirmation boolean not null default false, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.loyalty_segments (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, loyalty_program_id uuid, name text not null, segment_key text not null,
  description text, rule_config jsonb not null default '{}'::jsonb, member_count integer not null default 0, active boolean not null default true, color text default '#7c3aed',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(customer_id, loyalty_program_id, segment_key)
);
create table if not exists public.loyalty_tiers (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, loyalty_program_id uuid, tier_key text not null, name text not null, description text,
  min_points integer not null default 0, min_scans integer not null default 0, min_reviews integer not null default 0, multiplier numeric(6,2) not null default 1.00,
  benefits jsonb not null default '[]'::jsonb, active boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now(), unique(loyalty_program_id, tier_key)
);
create table if not exists public.loyalty_point_rules (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, loyalty_program_id uuid, qr_campaign_id uuid, name text not null,
  rule_type text not null default 'bonus', trigger_key text not null default 'qr_scan', points_delta integer not null default 0, multiplier numeric(6,2) not null default 1.00,
  condition_config jsonb not null default '{}'::jsonb, valid_from timestamptz, valid_until timestamptz, active boolean not null default true, priority integer not null default 100, created_at timestamptz not null default now()
);
create table if not exists public.loyalty_smart_actions (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, loyalty_program_id uuid, segment_id uuid, name text not null,
  action_type text not null default 'reactivation', status text not null default 'draft', reward_id uuid, qr_campaign_id uuid, marketing_campaign_id uuid,
  message_config jsonb not null default '{}'::jsonb, trigger_config jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.staff_confirmation_codes (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, loyalty_program_id uuid, code_label text not null default 'Mitarbeiter Code', code_hash text not null,
  active boolean not null default true, max_uses integer, used_count integer not null default 0, valid_until timestamptz, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

-- Review / AI / Revenue compatibility tables
create table if not exists public.review_feedback (
  id uuid primary key default gen_random_uuid(), customer_id uuid, loyalty_customer_id uuid, qr_campaign_id uuid, rating integer, feedback_text text, reviewer_name text, reviewer_email text,
  source text not null default 'manual', status text not null default 'new', intelligence_status text not null default 'pending', sentiment text, detected_topics jsonb not null default '[]'::jsonb,
  suggested_response text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.review_intelligence_profiles (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null unique, total_reviews integer not null default 0, avg_rating numeric(3,2) not null default 0,
  sentiment_score integer not null default 0, positive_count integer not null default 0, neutral_count integer not null default 0, negative_count integer not null default 0,
  top_positive_topics jsonb not null default '[]'::jsonb, top_negative_topics jsonb not null default '[]'::jsonb, recurring_issues jsonb not null default '[]'::jsonb,
  recurring_praises jsonb not null default '[]'::jsonb, recommended_actions jsonb not null default '[]'::jsonb, metrics jsonb not null default '{}'::jsonb, calculated_at timestamptz not null default now()
);
create table if not exists public.review_intelligence_items (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, review_feedback_id uuid, rating integer, sentiment text not null default 'neutral', sentiment_score integer not null default 0,
  detected_topics jsonb not null default '[]'::jsonb, issue_tags jsonb not null default '[]'::jsonb, praise_tags jsonb not null default '[]'::jsonb, summary text, suggested_response text,
  escalation_required boolean not null default false, source_module text not null default 'reviews', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.customer_intelligence_scores (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null unique, customer_lifetime_value numeric(12,2) not null default 0, monthly_recurring_revenue numeric(12,2) not null default 0,
  risk_score integer not null default 0, upsell_score integer not null default 0, package_usage_score integer not null default 0, loyalty_engagement_score integer not null default 0, review_health_score integer not null default 0,
  client_success_score integer not null default 0, risk_level text not null default 'low', upsell_level text not null default 'low', recommendations jsonb not null default '[]'::jsonb, metrics jsonb not null default '{}'::jsonb, calculated_at timestamptz not null default now()
);
create table if not exists public.customer_health_snapshots (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null unique, health_score integer not null default 0, health_level text not null default 'unknown', revenue_health integer not null default 0,
  usage_health integer not null default 0, review_health integer not null default 0, loyalty_health integer not null default 0, support_health integer not null default 0, qr_health integer not null default 0,
  warnings jsonb not null default '[]'::jsonb, opportunities jsonb not null default '[]'::jsonb, metrics jsonb not null default '{}'::jsonb, calculated_at timestamptz not null default now()
);
create table if not exists public.ai_business_assistant_messages (
  id uuid primary key default gen_random_uuid(), customer_id uuid, assistant_type text not null default 'business_assistant', title text not null, message text not null,
  recommendation_type text not null default 'general', severity text not null default 'info', source_modules text[] not null default '{}', related_entity_type text, related_entity_id uuid,
  status text not null default 'open', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), resolved_at timestamptz
);
create table if not exists public.smart_automation_rules (
  id uuid primary key default gen_random_uuid(), customer_id uuid, name text not null, description text, trigger_key text not null, condition_config jsonb not null default '{}'::jsonb,
  action_config jsonb not null default '{}'::jsonb, active boolean not null default true, scope text not null default 'customer', run_count integer not null default 0, last_run_at timestamptz, created_by text default 'System', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.smart_automation_runs (
  id uuid primary key default gen_random_uuid(), rule_id uuid, customer_id uuid, trigger_key text not null, status text not null default 'pending', actions_executed jsonb not null default '[]'::jsonb,
  result jsonb not null default '{}'::jsonb, error_message text, created_at timestamptz not null default now()
);
create table if not exists public.marketing_automation_campaigns (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, name text not null, campaign_type text not null default 'reactivation', status text not null default 'draft',
  audience_config jsonb not null default '{}'::jsonb, trigger_config jsonb not null default '{}'::jsonb, message_config jsonb not null default '{}'::jsonb,
  linked_qr_campaign_id uuid, linked_loyalty_program_id uuid, linked_reward_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.revenue_forecasts (
  id uuid primary key default gen_random_uuid(), customer_id uuid, forecast_period text not null default 'monthly', period_start date not null, period_end date not null,
  expected_revenue numeric(12,2) not null default 0, expected_mrr numeric(12,2) not null default 0, expected_new_revenue numeric(12,2) not null default 0,
  expected_churn_risk_value numeric(12,2) not null default 0, pipeline_weighted_value numeric(12,2) not null default 0, confidence_score integer not null default 50,
  forecast_level text not null default 'medium', drivers jsonb not null default '[]'::jsonb, metrics jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique(customer_id, period_start, period_end)
);
create table if not exists public.dynamic_billing_usage (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, period_start date not null, period_end date not null, qr_scans integer not null default 0,
  loyalty_members integer not null default 0, loyalty_transactions integer not null default 0, review_events integer not null default 0, invoices_created integer not null default 0,
  automation_runs integer not null default 0, ai_messages integer not null default 0, active_tools integer not null default 0, calculated_addon_amount numeric(12,2) not null default 0,
  usage_breakdown jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique(customer_id, period_start, period_end)
);
create table if not exists public.package_recommendations (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null, current_package text, recommended_package text not null, reason text not null,
  recommendation_type text not null default 'upgrade', priority text not null default 'medium', estimated_revenue_uplift numeric(12,2) not null default 0, confidence_score integer not null default 50,
  source_metrics jsonb not null default '{}'::jsonb, status text not null default 'open', created_at timestamptz not null default now(), resolved_at timestamptz
);
create table if not exists public.security_audit_logs (
  id uuid primary key default gen_random_uuid(), actor_name text, action text not null, entity_type text, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

-- Package demo features/tools
insert into public.package_features (package_key, feature_key, label, description, category, included, limit_value, sort_order, tooltip)
values
('premium','crm','CRM Plus','Kundenverwaltung mit Timeline und Intelligence.','CRM',true,'Premium',10,'Vollständige Kundenverwaltung.'),
('premium','qr_campaigns','QR Kampagnen Plus','QR-Kampagnen mit KPI, Loyalty und Landingpages.','QR',true,'Premium',20,'QR-Kampagnen mit Tracking.'),
('premium','loyalty','Loyalty Plus','Punkte, Rewards und Mitarbeitercodes.','Kundenbindung',true,'Premium',30,'Kundenbindung über QR.'),
('premium','loyalty_segments','Advanced Loyalty Segmente','VIP, inaktiv, Reward-ready und eigene Segmente.','Kundenbindung',true,'Premium',31,'Zielgruppen für Kampagnen.'),
('premium','smart_loyalty_v2','Smart Loyalty V2','VIP-Level, Multiplikatoren und dynamische Regeln.','Kundenbindung',true,'Premium',32,'Dynamische Punkte-Engine.'),
('premium','reviews','Reviews Plus','Bewertungen und Feedback.','Reviews',true,'Premium',40,'Review-Funnel.'),
('premium','review_intelligence','AI Review Intelligence Plus','Sentiment, Themen, Antwortvorschläge und Tickets.','Reviews',true,'Premium',41,'Review-Auswertung.'),
('premium','marketing_automation','Marketing Automation','Reaktivierung, Loyalty-Boost und Review-Flows.','Marketing',true,'Premium',50,'Kampagnenautomationen.'),
('premium','smart_automation','Smart Automation Plus','Automationen aus QR, Reviews, Health und Nutzung.','Automation',true,'Premium',60,'Regelbasierte Aktionen.'),
('premium','ai_business_assistant','AI Business Assistant Plus','Warnungen, Chancen und Empfehlungen.','AI',true,'Premium',70,'Regelbasierter Assistant.'),
('premium','customer_health','Customer Health','Ampelsystem und Risiko-/Chancenbewertung.','Analytics',true,'Premium',80,'Health Score.'),
('premium','customer_intelligence','Customer Intelligence Plus','Risiko, Upsell und Paketnutzung.','Analytics',true,'Premium',81,'Kundenintelligenz.'),
('premium','revenue_forecasting','Revenue Forecasting Plus','Umsatz-, MRR- und Pipeline-Prognose.','Analytics',true,'Premium',90,'Forecasting.'),
('premium','dynamic_billing','Dynamic Billing','Usage-basierte Zusatzabrechnung.','Billing',true,'Premium',91,'Usage Billing.'),
('premium','booking','Booking','Termine, Services und Preise.','Booking',true,'Premium',100,'Termine und Umsatz.'),
('premium','invoices','Rechnungen','PDFs und Rechnungsübersicht.','Billing',true,'Premium',110,'Rechnungen und Umsatz.')
on conflict (package_key, feature_key) do update set label=excluded.label, description=excluded.description, category=excluded.category, included=excluded.included, limit_value=excluded.limit_value, sort_order=excluded.sort_order, tooltip=excluded.tooltip, updated_at=now();

insert into public.package_tools (package_key, tool_key, label, description, enabled_by_default, visible_to_customer, sort_order)
select 'premium', feature_key, label, description, true, true, sort_order from public.package_features where package_key='premium'
on conflict (package_key, tool_key) do update set label=excluded.label, description=excluded.description, enabled_by_default=true, visible_to_customer=true, sort_order=excluded.sort_order, updated_at=now();

-- Demo customer
insert into public.customers (id, name, email, phone, company, status, package_key, is_demo, customer_lifetime_value, risk_score, upsell_score, package_usage_score, risk_level, upsell_level, metadata)
values ('11111111-1111-1111-1111-111111111111','Demo Kunde – Café Morgenlicht','demo-kunde@mmos.local','+49 381 000000','Café Morgenlicht GmbH','active','premium',true,4280.50,22,84,91,'low','high','{"industry":"Gastronomie","city":"Rostock","demo_login":"kunde","admin_demo":true}'::jsonb)
on conflict (id) do update set name=excluded.name, email=excluded.email, phone=excluded.phone, company=excluded.company, status=excluded.status, package_key=excluded.package_key, is_demo=true, customer_lifetime_value=excluded.customer_lifetime_value, risk_score=excluded.risk_score, upsell_score=excluded.upsell_score, package_usage_score=excluded.package_usage_score, risk_level=excluded.risk_level, upsell_level=excluded.upsell_level, metadata=excluded.metadata, updated_at=now();

insert into public.customer_tool_access (customer_id, tool_key, enabled, visible_to_customer)
select '11111111-1111-1111-1111-111111111111', tool_key, true, true from public.package_tools where package_key='premium'
on conflict (customer_id, tool_key) do update set enabled=true, visible_to_customer=true;

insert into public.customer_tool_usage (customer_id, tool_key, usage_count, last_used_at)
values
('11111111-1111-1111-1111-111111111111','qr_campaigns',42,now()-interval '1 day'),
('11111111-1111-1111-1111-111111111111','loyalty',67,now()-interval '1 day'),
('11111111-1111-1111-1111-111111111111','review_intelligence',18,now()-interval '2 days'),
('11111111-1111-1111-1111-111111111111','marketing_automation',9,now()-interval '3 days'),
('11111111-1111-1111-1111-111111111111','revenue_forecasting',11,now()-interval '1 day'),
('11111111-1111-1111-1111-111111111111','dynamic_billing',6,now()-interval '4 days'),
('11111111-1111-1111-1111-111111111111','booking',24,now()-interval '2 days'),
('11111111-1111-1111-1111-111111111111','invoices',13,now()-interval '3 days'),
('11111111-1111-1111-1111-111111111111','customer_intelligence',17,now()-interval '1 day'),
('11111111-1111-1111-1111-111111111111','ai_business_assistant',21,now()-interval '1 day')
on conflict (customer_id, tool_key) do update set usage_count=excluded.usage_count, last_used_at=excluded.last_used_at;

-- QR/Loyalty seed
insert into public.qr_campaigns (id, customer_id, name, slug, target_url, scans, conversions, active, metadata)
values
('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Frühstücks-Loyalty QR','demo-cafe-morgenlicht','/l/demo-cafe-morgenlicht',186,54,true,'{"channel":"Tischaufsteller","status":"Top Performer"}'::jsonb),
('22222222-2222-2222-2222-222222222223','11111111-1111-1111-1111-111111111111','Google Review QR','demo-review-morgenlicht','/l/demo-cafe-morgenlicht?review=1',94,31,true,'{"channel":"Kassenaufsteller","status":"Review Funnel"}'::jsonb)
on conflict (id) do update set name=excluded.name, slug=excluded.slug, target_url=excluded.target_url, scans=excluded.scans, conversions=excluded.conversions, active=true, metadata=excluded.metadata, updated_at=now();

insert into public.loyalty_programs (id, customer_id, qr_campaign_id, name, slug, points_per_scan, active, require_staff_code, branding, metadata)
values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Morgenlicht Bonusclub','demo-cafe-morgenlicht',10,true,true,'{"primary":"#7c3aed","logoText":"Café Morgenlicht","theme":"dark-premium"}'::jsonb,'{"demo":true}'::jsonb)
on conflict (id) do update set name=excluded.name, slug=excluded.slug, points_per_scan=excluded.points_per_scan, active=true, require_staff_code=true, branding=excluded.branding, metadata=excluded.metadata, updated_at=now();

insert into public.loyalty_rewards (id, customer_id, loyalty_program_id, title, description, reward_type, points_required, active, require_staff_confirmation, metadata)
values
('44444444-4444-4444-4444-444444444401','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','Gratis Cappuccino','Ein Cappuccino aufs Haus ab 100 Punkten.','free_product',100,true,true,'{"category":"coffee"}'::jsonb),
('44444444-4444-4444-4444-444444444402','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','10% Frühstücksrabatt','10% Rabatt auf ein Frühstücksmenü.','discount',180,true,true,'{"discount_percent":10}'::jsonb),
('44444444-4444-4444-4444-444444444403','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','VIP Kuchenstück','Exklusiver VIP Reward für Stammkunden.','vip_reward',350,true,true,'{"vip_only":true}'::jsonb)
on conflict (id) do update set title=excluded.title, description=excluded.description, reward_type=excluded.reward_type, points_required=excluded.points_required, active=true, require_staff_confirmation=true, metadata=excluded.metadata, updated_at=now();

insert into public.staff_confirmation_codes (id, customer_id, loyalty_program_id, code_label, code_hash, active, max_uses, used_count, metadata)
values ('55555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','Demo Thekencode','demo-hash-2468',true,null,3,'{"demo_plain_code":"2468","note":"Nur Demo"}'::jsonb)
on conflict (id) do update set code_label=excluded.code_label, code_hash=excluded.code_hash, active=true, used_count=excluded.used_count, metadata=excluded.metadata;

insert into public.loyalty_customers (id, customer_id, loyalty_program_id, email, member_token, device_id, display_name, points_balance, total_points, current_tier, total_scans, total_reviews, last_seen_at, last_activity_at, segment_summary)
values
('66666666-6666-6666-6666-666666666601','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','anna.demo@example.com','demo-member-anna','device-anna','Anna Stammkundin',420,920,'gold',14,2,now()-interval '1 day',now()-interval '1 day','[{"key":"vip","name":"VIP Kunden"},{"key":"reward_ready","name":"Reward-bereit"}]'::jsonb),
('66666666-6666-6666-6666-666666666602','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','max.demo@example.com','demo-member-max','device-max','Max Reviewfan',160,310,'silver',6,3,now()-interval '3 days',now()-interval '3 days','[{"key":"review_active","name":"Bewertungsaktive Endkunden"},{"key":"reward_ready","name":"Reward-bereit"}]'::jsonb),
('66666666-6666-6666-6666-666666666603','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','lisa.demo@example.com','demo-member-lisa','device-lisa','Lisa Inaktiv',80,120,'basic',2,0,now()-interval '45 days',now()-interval '45 days','[{"key":"inactive","name":"Inaktive Endkunden"}]'::jsonb)
on conflict (id) do update set points_balance=excluded.points_balance, total_points=excluded.total_points, current_tier=excluded.current_tier, total_scans=excluded.total_scans, total_reviews=excluded.total_reviews, last_seen_at=excluded.last_seen_at, last_activity_at=excluded.last_activity_at, segment_summary=excluded.segment_summary;

insert into public.loyalty_segments (id, customer_id, loyalty_program_id, name, segment_key, description, rule_config, member_count, active, color)
values
('88888888-8888-8888-8888-888888888801','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','VIP Kunden','vip','Sehr aktive Endkunden mit hohem Punktestand.','{"min_points":500}'::jsonb,1,true,'#22c55e'),
('88888888-8888-8888-8888-888888888802','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','Inaktive Endkunden','inactive','Keine Aktivität seit 30 Tagen.','{"inactive_days":30}'::jsonb,1,true,'#f59e0b'),
('88888888-8888-8888-8888-888888888803','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','Reward-bereit','reward_ready','Mindestens 100 Punkte.','{"min_points":100}'::jsonb,2,true,'#7c3aed'),
('88888888-8888-8888-8888-888888888804','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','Review-Aktiv','review_active','Mindestens eine Bewertung.','{"min_reviews":1}'::jsonb,1,true,'#0ea5e9')
on conflict (customer_id, loyalty_program_id, segment_key) do update set name=excluded.name, description=excluded.description, rule_config=excluded.rule_config, member_count=excluded.member_count, active=true, color=excluded.color, updated_at=now();

insert into public.loyalty_tiers (customer_id, loyalty_program_id, tier_key, name, description, min_points, min_scans, min_reviews, multiplier, benefits, active, sort_order)
values
('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','basic','Basic','Einstiegslevel',0,0,0,1.00,'["Standardpunkte"]'::jsonb,true,1),
('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','silver','Silver','Aktive Kunden',250,3,0,1.10,'["10% Punktebonus"]'::jsonb,true,2),
('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','gold','Gold','Stammkunden',500,8,1,1.25,'["25% Punktebonus","Exklusive Rewards"]'::jsonb,true,3),
('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','vip','VIP','Top Kunden',1000,15,2,1.50,'["50% Punktebonus","VIP Rewards"]'::jsonb,true,4)
on conflict (loyalty_program_id, tier_key) do update set name=excluded.name, description=excluded.description, min_points=excluded.min_points, min_scans=excluded.min_scans, min_reviews=excluded.min_reviews, multiplier=excluded.multiplier, benefits=excluded.benefits, active=true, sort_order=excluded.sort_order;

insert into public.loyalty_point_rules (id, customer_id, loyalty_program_id, qr_campaign_id, name, rule_type, trigger_key, points_delta, multiplier, condition_config, active, priority)
values
('99999999-9999-9999-9999-999999999901','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','Doppelte Punkte am Vormittag','bonus','qr_scan',0,2.00,'{"hours":[8,9,10,11]}'::jsonb,true,10),
('99999999-9999-9999-9999-999999999902','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333',null,'VIP Bonus','bonus','qr_scan',25,1.00,'{"segment_key":"vip"}'::jsonb,true,20)
on conflict (id) do update set name=excluded.name, multiplier=excluded.multiplier, points_delta=excluded.points_delta, condition_config=excluded.condition_config, active=true;

-- Reviews, intelligence, booking, revenue
insert into public.review_feedback (id, customer_id, loyalty_customer_id, qr_campaign_id, rating, feedback_text, reviewer_name, reviewer_email, source, status, intelligence_status, sentiment, detected_topics, suggested_response, created_at)
values
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','11111111-1111-1111-1111-111111111111','66666666-6666-6666-6666-666666666601','22222222-2222-2222-2222-222222222223',5,'Super freundlicher Service und der Cappuccino war perfekt.','Anna','anna.demo@example.com','qr_review','new','analyzed','positive','[{"topic_key":"service_positive","label":"Guter Service"},{"topic_key":"quality_positive","label":"Gute Qualität"}]'::jsonb,'Vielen Dank für das tolle Feedback! Wir freuen uns sehr.',now()-interval '2 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','11111111-1111-1111-1111-111111111111','66666666-6666-6666-6666-666666666602','22222222-2222-2222-2222-222222222223',4,'Lecker und gemütlich, Wartezeit war aber etwas lang.','Max','max.demo@example.com','qr_review','new','analyzed','neutral','[{"topic_key":"quality_positive","label":"Gute Qualität"},{"topic_key":"wait_time","label":"Wartezeit"}]'::jsonb,'Vielen Dank für Ihre Rückmeldung. Wir nehmen den Hinweis zur Wartezeit ernst.',now()-interval '5 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','11111111-1111-1111-1111-111111111111',null,'22222222-2222-2222-2222-222222222223',2,'Leider sehr lange gewartet und der Tisch war nicht sauber.','Gast','gast.demo@example.com','qr_review','new','analyzed','negative','[{"topic_key":"wait_time","label":"Wartezeit"},{"topic_key":"cleanliness","label":"Sauberkeit"}]'::jsonb,'Vielen Dank für Ihr ehrliches Feedback. Es tut uns leid – wir prüfen das intern.',now()-interval '8 days')
on conflict (id) do update set rating=excluded.rating, feedback_text=excluded.feedback_text, intelligence_status='analyzed', sentiment=excluded.sentiment, detected_topics=excluded.detected_topics, suggested_response=excluded.suggested_response;

insert into public.review_intelligence_profiles (customer_id, total_reviews, avg_rating, sentiment_score, positive_count, neutral_count, negative_count, top_positive_topics, top_negative_topics, recurring_issues, recurring_praises, recommended_actions, metrics, calculated_at)
values ('11111111-1111-1111-1111-111111111111',3,3.67,13,1,1,1,'[{"topic_key":"quality_positive","label":"Gute Qualität","count":2},{"topic_key":"service_positive","label":"Guter Service","count":1}]'::jsonb,'[{"topic_key":"wait_time","label":"Wartezeit","count":2},{"topic_key":"cleanliness","label":"Sauberkeit","count":1}]'::jsonb,'[{"topic_key":"wait_time","label":"Wartezeit","count":2}]'::jsonb,'[{"topic_key":"quality_positive","label":"Gute Qualität","count":2}]'::jsonb,'[{"type":"recovery","text":"Kritische Bewertungen zeitnah beantworten."},{"type":"topic","text":"Häufiges Problem: Wartezeit."},{"type":"marketing","text":"Lob zur Qualität im Marketing nutzen."}]'::jsonb,'{"demo":true}'::jsonb,now())
on conflict (customer_id) do update set total_reviews=excluded.total_reviews, avg_rating=excluded.avg_rating, sentiment_score=excluded.sentiment_score, positive_count=excluded.positive_count, neutral_count=excluded.neutral_count, negative_count=excluded.negative_count, top_positive_topics=excluded.top_positive_topics, top_negative_topics=excluded.top_negative_topics, recurring_issues=excluded.recurring_issues, recurring_praises=excluded.recurring_praises, recommended_actions=excluded.recommended_actions, metrics=excluded.metrics, calculated_at=now();

insert into public.appointments (id, customer_id, title, service_category_name, price, start_time, end_time, status, metadata)
values
('cccccccc-cccc-cccc-cccc-ccccccccccc1','11111111-1111-1111-1111-111111111111','Social Media Shooting','Content Paket',249.00,now()+interval '2 days',now()+interval '2 days 2 hours','confirmed','{"source":"demo"}'::jsonb),
('cccccccc-cccc-cccc-cccc-ccccccccccc2','11111111-1111-1111-1111-111111111111','QR Kampagnen Setup','Marketing Setup',399.00,now()+interval '5 days',now()+interval '5 days 1 hour','confirmed','{"source":"demo"}'::jsonb)
on conflict (id) do update set title=excluded.title, price=excluded.price, status=excluded.status;

insert into public.invoices (id, customer_id, invoice_number, service_type, amount, total, status, pdf_url, metadata, created_at)
values
('dddddddd-dddd-dddd-dddd-ddddddddddd1','11111111-1111-1111-1111-111111111111','RE-DEMO-1001','Premium Lizenz Mai',299.00,299.00,'Bezahlt','data:application/pdf;base64,JVBERi0xLjQKJURlbW8K','{"demo":true}'::jsonb,now()-interval '12 days'),
('dddddddd-dddd-dddd-dddd-ddddddddddd2','11111111-1111-1111-1111-111111111111','RE-DEMO-1002','QR & Loyalty Setup',499.00,499.00,'Offen','data:application/pdf;base64,JVBERi0xLjQKJURlbW8K','{"demo":true}'::jsonb,now()-interval '3 days')
on conflict (id) do update set invoice_number=excluded.invoice_number, amount=excluded.amount, total=excluded.total, status=excluded.status, pdf_url=excluded.pdf_url;

insert into public.pipeline_leads (id, customer_id, title, source, stage, value, probability, metadata)
values
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1','11111111-1111-1111-1111-111111111111','Upgrade: Premium Kampagnenpaket','smart_automation','qualified',799.00,72,'{"reason":"starke QR Performance"}'::jsonb),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2','11111111-1111-1111-1111-111111111111','Zusatzstandort Innenstadt','manual','proposal',1299.00,48,'{"reason":"Expansion"}'::jsonb)
on conflict (id) do update set title=excluded.title, stage=excluded.stage, value=excluded.value, probability=excluded.probability, metadata=excluded.metadata;

insert into public.customer_intelligence_scores (customer_id, customer_lifetime_value, monthly_recurring_revenue, risk_score, upsell_score, package_usage_score, loyalty_engagement_score, review_health_score, client_success_score, risk_level, upsell_level, recommendations, metrics, calculated_at)
values ('11111111-1111-1111-1111-111111111111',4280.50,299.00,22,84,91,78,73,86,'low','high','[{"type":"upsell","title":"Hohe Upsell-Chance","text":"QR und Loyalty werden stark genutzt."},{"type":"review","title":"Wartezeit prüfen","text":"Review Intelligence erkennt wiederkehrende Wartezeitkritik."}]'::jsonb,'{"qrScans":280,"loyaltyParticipants":3,"reviews":3,"openTickets":1,"usedTools":10,"enabledTools":16}'::jsonb,now())
on conflict (customer_id) do update set customer_lifetime_value=excluded.customer_lifetime_value, monthly_recurring_revenue=excluded.monthly_recurring_revenue, risk_score=excluded.risk_score, upsell_score=excluded.upsell_score, package_usage_score=excluded.package_usage_score, loyalty_engagement_score=excluded.loyalty_engagement_score, review_health_score=excluded.review_health_score, client_success_score=excluded.client_success_score, risk_level=excluded.risk_level, upsell_level=excluded.upsell_level, recommendations=excluded.recommendations, metrics=excluded.metrics, calculated_at=now();

insert into public.customer_health_snapshots (customer_id, health_score, health_level, revenue_health, usage_health, review_health, loyalty_health, support_health, qr_health, warnings, opportunities, metrics, calculated_at)
values ('11111111-1111-1111-1111-111111111111',86,'green',82,91,73,78,88,94,'[{"type":"reviews","text":"Wartezeit wird wiederholt erwähnt."}]'::jsonb,'[{"type":"upsell","text":"Premium Kampagnenpaket anbieten."},{"type":"qr","text":"QR-Kampagne performt überdurchschnittlich."}]'::jsonb,'{"demo":true}'::jsonb,now())
on conflict (customer_id) do update set health_score=excluded.health_score, health_level=excluded.health_level, revenue_health=excluded.revenue_health, usage_health=excluded.usage_health, review_health=excluded.review_health, loyalty_health=excluded.loyalty_health, support_health=excluded.support_health, qr_health=excluded.qr_health, warnings=excluded.warnings, opportunities=excluded.opportunities, metrics=excluded.metrics, calculated_at=now();

insert into public.ai_business_assistant_messages (id, customer_id, title, message, recommendation_type, severity, source_modules, status, metadata, created_at)
values
('ffffffff-ffff-ffff-ffff-fffffffffff1','11111111-1111-1111-1111-111111111111','Hohe Upsell-Chance erkannt','QR, Loyalty und Toolnutzung liegen deutlich über Premium-Schwelle. Zusatzkampagne anbieten.','upsell','success',array['qr','loyalty','customer_intelligence'],'open','{"demo":true}'::jsonb,now()-interval '1 day'),
('ffffffff-ffff-ffff-ffff-fffffffffff2','11111111-1111-1111-1111-111111111111','Review-Thema Wartezeit prüfen','Review Intelligence erkennt Wartezeit als wiederkehrendes Thema.','review_intelligence','warning',array['reviews','review_intelligence'],'open','{"demo":true}'::jsonb,now()-interval '2 days'),
('ffffffff-ffff-ffff-ffff-fffffffffff3','11111111-1111-1111-1111-111111111111','Paketnutzung sehr gut','Der Kunde nutzt 10 von 16 freigeschalteten Tools aktiv.','adoption','info',array['packages','tool_usage'],'open','{"demo":true}'::jsonb,now()-interval '3 days')
on conflict (id) do update set title=excluded.title, message=excluded.message, severity=excluded.severity, status=excluded.status;

insert into public.revenue_forecasts (id, customer_id, forecast_period, period_start, period_end, expected_revenue, expected_mrr, expected_new_revenue, expected_churn_risk_value, pipeline_weighted_value, confidence_score, forecast_level, drivers, metrics)
values ('aeaeaeae-aeae-aeae-aeae-aeaeaeaeae01','11111111-1111-1111-1111-111111111111','monthly',date_trunc('month',now())::date,(date_trunc('month',now()) + interval '1 month - 1 day')::date,1442.28,299.00,1080.00,65.78,1198.08,82,'high','[{"type":"pipeline","text":"Gewichtete Pipeline: 1198,08 EUR"},{"type":"upsell","text":"Hohe Upgrade-Wahrscheinlichkeit erkannt."},{"type":"qr","text":"QR-Aktivität unterstützt Upsell-Potenzial."}]'::jsonb,'{"demo":true}'::jsonb)
on conflict (customer_id, period_start, period_end) do update set expected_revenue=excluded.expected_revenue, expected_mrr=excluded.expected_mrr, expected_new_revenue=excluded.expected_new_revenue, expected_churn_risk_value=excluded.expected_churn_risk_value, pipeline_weighted_value=excluded.pipeline_weighted_value, confidence_score=excluded.confidence_score, forecast_level=excluded.forecast_level, drivers=excluded.drivers, metrics=excluded.metrics;

insert into public.dynamic_billing_usage (id, customer_id, period_start, period_end, qr_scans, loyalty_members, loyalty_transactions, review_events, invoices_created, automation_runs, ai_messages, active_tools, calculated_addon_amount, usage_breakdown)
values ('afafafaf-afaf-afaf-afaf-afafafafaf01','11111111-1111-1111-1111-111111111111',date_trunc('month',now())::date,(date_trunc('month',now()) + interval '1 month - 1 day')::date,280,3,3,3,2,2,3,10,7.31,'{"qr_scans":{"quantity":280,"unit_price":0.01,"amount":2.8},"loyalty_members":{"quantity":3,"unit_price":0.1,"amount":0.3},"review_events":{"quantity":3,"unit_price":0.05,"amount":0.15},"automation_runs":{"quantity":2,"unit_price":0.03,"amount":0.06},"ai_messages":{"quantity":3,"unit_price":0.02,"amount":0.06},"premium_demo_flat":{"quantity":1,"unit_price":3.94,"amount":3.94}}'::jsonb)
on conflict (customer_id, period_start, period_end) do update set qr_scans=excluded.qr_scans, loyalty_members=excluded.loyalty_members, loyalty_transactions=excluded.loyalty_transactions, review_events=excluded.review_events, invoices_created=excluded.invoices_created, automation_runs=excluded.automation_runs, ai_messages=excluded.ai_messages, active_tools=excluded.active_tools, calculated_addon_amount=excluded.calculated_addon_amount, usage_breakdown=excluded.usage_breakdown;

insert into public.marketing_automation_campaigns (id, customer_id, name, campaign_type, status, audience_config, trigger_config, message_config, linked_qr_campaign_id, linked_loyalty_program_id, linked_reward_id)
values
('adadadad-adad-adad-adad-adadadadad01','11111111-1111-1111-1111-111111111111','Inaktive Gäste zurückholen','reactivation','draft','{"segment_key":"inactive","member_count":1}'::jsonb,'{"trigger":"inactive_30_days"}'::jsonb,'{"subject":"Wir vermissen dich","body":"Komm zurück und sichere dir doppelte Punkte."}'::jsonb,'22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444402'),
('adadadad-adad-adad-adad-adadadadad02','11111111-1111-1111-1111-111111111111','Review Booster','review_request','ready','{"segment_key":"review_active"}'::jsonb,'{"trigger":"after_visit"}'::jsonb,'{"subject":"Wie war dein Besuch?","body":"Bewerte uns und erhalte Bonuspunkte."}'::jsonb,'22222222-2222-2222-2222-222222222223','33333333-3333-3333-3333-333333333333',null)
on conflict (id) do update set name=excluded.name, campaign_type=excluded.campaign_type, status=excluded.status, audience_config=excluded.audience_config, trigger_config=excluded.trigger_config, message_config=excluded.message_config;

insert into public.customer_timeline_events (id, customer_id, event_type, title, description, source_module, severity, actor_name, metadata, created_at)
values
('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c001','11111111-1111-1111-1111-111111111111','qr_campaign_created','QR-Kampagne erstellt','Frühstücks-Loyalty QR wurde aktiviert.','qr_campaigns','success','Demo Admin','{}'::jsonb,now()-interval '14 days'),
('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c002','11111111-1111-1111-1111-111111111111','loyalty_reward_redeemed','Reward eingelöst','Gratis Cappuccino wurde per Mitarbeitercode bestätigt.','loyalty','success','Theke','{}'::jsonb,now()-interval '2 days'),
('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c003','11111111-1111-1111-1111-111111111111','review_intelligence_escalation','Kritische Bewertung erkannt','Wartezeit und Sauberkeit wurden erkannt.','review_intelligence','warning','Review Intelligence','{}'::jsonb,now()-interval '2 days'),
('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c004','11111111-1111-1111-1111-111111111111','revenue_forecast_created','Revenue Forecast aktualisiert','Erwarteter Monatsumsatz: 1.442,28 EUR.','revenue_forecasting','info','System','{}'::jsonb,now()-interval '1 day'),
('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c005','11111111-1111-1111-1111-111111111111','smart_automation_triggered','Automation ausgelöst','Starke QR-Kampagne erzeugte Upsell-Lead.','smart_automation','success','Smart Automation','{}'::jsonb,now()-interval '1 day')
on conflict (id) do update set title=excluded.title, description=excluded.description, severity=excluded.severity, created_at=excluded.created_at;

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','v28_demo_environment_sync_applied','system','{"version":"0038","demo_customer_id":"11111111-1111-1111-1111-111111111111"}'::jsonb)
on conflict do nothing;
