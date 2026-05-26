
-- MMOS V24 Revenue Forecasting & Dynamic Billing
-- Umsatzprognosen, Paketempfehlungen, Usage Billing, Revenue Share / Stripe Connect Vorbereitung.

create table if not exists public.revenue_forecasts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  forecast_period text not null default 'monthly',
  period_start date not null,
  period_end date not null,
  expected_revenue numeric(12,2) not null default 0,
  expected_mrr numeric(12,2) not null default 0,
  expected_new_revenue numeric(12,2) not null default 0,
  expected_churn_risk_value numeric(12,2) not null default 0,
  pipeline_weighted_value numeric(12,2) not null default 0,
  confidence_score integer not null default 50,
  forecast_level text not null default 'medium',
  drivers jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(customer_id, period_start, period_end)
);

create table if not exists public.dynamic_billing_usage (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  period_start date not null,
  period_end date not null,
  qr_scans integer not null default 0,
  loyalty_members integer not null default 0,
  loyalty_transactions integer not null default 0,
  review_events integer not null default 0,
  invoices_created integer not null default 0,
  automation_runs integer not null default 0,
  ai_messages integer not null default 0,
  active_tools integer not null default 0,
  calculated_addon_amount numeric(12,2) not null default 0,
  usage_breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(customer_id, period_start, period_end)
);

create table if not exists public.package_recommendations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  current_package text,
  recommended_package text not null,
  reason text not null,
  recommendation_type text not null default 'upgrade',
  priority text not null default 'medium',
  estimated_revenue_uplift numeric(12,2) not null default 0,
  confidence_score integer not null default 50,
  source_metrics jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.revenue_share_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  applies_to_package text,
  customer_id uuid,
  partner_name text,
  partner_account_reference text,
  share_type text not null default 'percentage',
  share_value numeric(12,4) not null default 0,
  active boolean not null default true,
  stripe_connect_account_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.revenue_share_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  rule_id uuid references public.revenue_share_rules(id) on delete set null,
  source_type text not null default 'subscription',
  source_id uuid,
  gross_amount numeric(12,2) not null default 0,
  share_amount numeric(12,2) not null default 0,
  platform_amount numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  status text not null default 'calculated',
  stripe_transfer_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.customer_subscriptions add column if not exists usage_billing_enabled boolean not null default false;
alter table if exists public.customer_subscriptions add column if not exists revenue_share_enabled boolean not null default false;
alter table if exists public.customer_subscriptions add column if not exists recommended_package text;
alter table if exists public.customer_subscriptions add column if not exists forecasted_mrr numeric(12,2) not null default 0;

alter table public.revenue_forecasts enable row level security;
alter table public.dynamic_billing_usage enable row level security;
alter table public.package_recommendations enable row level security;
alter table public.revenue_share_rules enable row level security;
alter table public.revenue_share_events enable row level security;

drop policy if exists revenue_forecasts_access on public.revenue_forecasts;
create policy revenue_forecasts_access on public.revenue_forecasts for all
using (customer_id is null or public.can_access_customer(customer_id))
with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists dynamic_billing_usage_access on public.dynamic_billing_usage;
create policy dynamic_billing_usage_access on public.dynamic_billing_usage for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

drop policy if exists package_recommendations_access on public.package_recommendations;
create policy package_recommendations_access on public.package_recommendations for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

drop policy if exists revenue_share_rules_access on public.revenue_share_rules;
create policy revenue_share_rules_access on public.revenue_share_rules for all
using (customer_id is null or public.can_access_customer(customer_id))
with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists revenue_share_events_access on public.revenue_share_events;
create policy revenue_share_events_access on public.revenue_share_events for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

insert into public.package_features (package_key, feature_key, label, description, category, included, limit_value, sort_order, tooltip)
values
('growth','revenue_forecasting','Revenue Forecasting','Umsatzprognose aus Rechnungen, Pipeline, Health und Nutzung.','Analytics',true,'Basis',32,'Erwarteter Monatsumsatz und Risiken.'),
('premium','revenue_forecasting','Revenue Forecasting Plus','Erweiterte Prognosen mit Churn-Wert, Pipeline-Gewichtung und Confidence Score.','Analytics',true,'Premium',33,'Verknüpft Pipeline, MRR, Kundenhealth und Rechnungen.'),
('premium','dynamic_billing','Dynamic Billing','Usage-basierte Zusatzabrechnung und Paketempfehlungen.','Billing',true,'Premium',34,'Berechnet Zusatzumsätze aus QR, Loyalty, Reviews, Automationen und AI-Nutzung.'),
('premium','revenue_share','Revenue Share Vorbereitung','Prozentuale Umsatzbeteiligung / Stripe Connect Vorbereitung.','Billing',true,'Premium',35,'Berechnet Plattform- und Partneranteile je Abo oder Paket.')
on conflict (package_key, feature_key) do update set
label=excluded.label, description=excluded.description, category=excluded.category, included=excluded.included, limit_value=excluded.limit_value, sort_order=excluded.sort_order, tooltip=excluded.tooltip;

insert into public.package_tools (package_key, tool_key, label, description, enabled_by_default, visible_to_customer, sort_order)
values
('growth','revenue_forecasting','Revenue Forecasting','Umsatzprognose und Risiken',true,true,33),
('premium','revenue_forecasting','Revenue Forecasting Plus','Erweiterte Prognosen',true,true,34),
('premium','dynamic_billing','Dynamic Billing','Usage Billing und Paketempfehlungen',true,true,35),
('premium','revenue_share','Revenue Share','Umsatzbeteiligung / Stripe Connect Vorbereitung',true,false,36)
on conflict (package_key, tool_key) do update set
label=excluded.label, description=excluded.description, enabled_by_default=excluded.enabled_by_default, visible_to_customer=excluded.visible_to_customer, sort_order=excluded.sort_order;

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','v24_revenue_dynamic_billing_applied','system','{"version":"0036"}'::jsonb)
on conflict do nothing;
