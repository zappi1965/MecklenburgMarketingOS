
-- MMOS V22 AI & Automation Core
-- Smart Automation Engine, AI Business Assistant, Marketing Automation, Customer Health Dashboard.

create table if not exists public.smart_automation_rules (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text not null,
  description text,
  trigger_key text not null,
  condition_config jsonb not null default '{}'::jsonb,
  action_config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  scope text not null default 'customer',
  run_count integer not null default 0,
  last_run_at timestamptz,
  created_by text default 'System',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.smart_automation_rules(id) on delete set null,
  customer_id uuid,
  trigger_key text not null,
  status text not null default 'pending',
  actions_executed jsonb not null default '[]'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_business_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  assistant_type text not null default 'business_assistant',
  title text not null,
  message text not null,
  recommendation_type text not null default 'general',
  severity text not null default 'info',
  source_modules text[] not null default '{}',
  related_entity_type text,
  related_entity_id uuid,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.marketing_automation_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  name text not null,
  campaign_type text not null default 'reactivation',
  status text not null default 'draft',
  audience_config jsonb not null default '{}'::jsonb,
  trigger_config jsonb not null default '{}'::jsonb,
  message_config jsonb not null default '{}'::jsonb,
  linked_qr_campaign_id uuid,
  linked_loyalty_program_id uuid,
  linked_reward_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  health_score integer not null default 0,
  health_level text not null default 'unknown',
  revenue_health integer not null default 0,
  usage_health integer not null default 0,
  review_health integer not null default 0,
  loyalty_health integer not null default 0,
  support_health integer not null default 0,
  qr_health integer not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  unique(customer_id)
);

alter table public.smart_automation_rules enable row level security;
alter table public.smart_automation_runs enable row level security;
alter table public.ai_business_assistant_messages enable row level security;
alter table public.marketing_automation_campaigns enable row level security;
alter table public.customer_health_snapshots enable row level security;

drop policy if exists smart_automation_rules_access on public.smart_automation_rules;
create policy smart_automation_rules_access on public.smart_automation_rules for all
using (customer_id is null or public.can_access_customer(customer_id))
with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists smart_automation_runs_access on public.smart_automation_runs;
create policy smart_automation_runs_access on public.smart_automation_runs for all
using (customer_id is null or public.can_access_customer(customer_id))
with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists ai_business_assistant_messages_access on public.ai_business_assistant_messages;
create policy ai_business_assistant_messages_access on public.ai_business_assistant_messages for all
using (customer_id is null or public.can_access_customer(customer_id))
with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists marketing_automation_campaigns_access on public.marketing_automation_campaigns;
create policy marketing_automation_campaigns_access on public.marketing_automation_campaigns for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

drop policy if exists customer_health_snapshots_access on public.customer_health_snapshots;
create policy customer_health_snapshots_access on public.customer_health_snapshots for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

-- Default Automation Templates
insert into public.smart_automation_rules (name, description, trigger_key, condition_config, action_config, scope, active)
values
('Negatives Feedback → Ticket & Warnung','Bei schlechtem Review wird Ticket und Assistant-Hinweis erzeugt.','review.negative','{"rating_lte":3}'::jsonb,'{"create_ticket":true,"create_assistant_message":true,"timeline":true}'::jsonb,'global',true),
('Starke QR-Kampagne → Upsell Lead','Bei guter QR-Performance wird ein Pipeline-Upsell erzeugt.','qr.performance_high','{"min_scans":25,"min_conversions":5}'::jsonb,'{"create_pipeline_lead":true,"create_assistant_message":true,"timeline":true}'::jsonb,'global',true),
('Geringe Paketnutzung → Onboarding-Hinweis','Bei niedriger Toolnutzung wird ein CRM-Hinweis erzeugt.','usage.low','{"package_usage_lte":40}'::jsonb,'{"create_assistant_message":true,"timeline":true}'::jsonb,'global',true),
('Hohes Churn-Risiko → Health Warnung','Bei hohem Risiko wird eine Customer-Health-Warnung erzeugt.','health.risk_high','{"risk_gte":65}'::jsonb,'{"create_assistant_message":true,"timeline":true}'::jsonb,'global',true),
('Hohe Opportunity → Sales Aufgabe','Bei hohem Upsell-Score wird eine Opportunity erzeugt.','health.upsell_high','{"upsell_gte":65}'::jsonb,'{"create_pipeline_lead":true,"create_assistant_message":true,"timeline":true}'::jsonb,'global',true)
on conflict do nothing;

insert into public.package_features (package_key, feature_key, label, description, category, included, limit_value, sort_order, tooltip)
values
('growth','smart_automation','Smart Automation','Automatische Regeln aus Reviews, QR, Health und Paketnutzung.','Automation',true,'Basis',23,'Verknüpft Kundenereignisse mit Aktionen.'),
('growth','ai_business_assistant','AI Business Assistant','Automatische Handlungsempfehlungen aus Kundendaten.','AI',true,'Basis',24,'Regelbasierter Business Assistant.'),
('premium','smart_automation','Smart Automation Plus','Erweiterte intelligente Automationen mit Marketing-Aktionen.','Automation',true,'Premium',25,'Automationen über CRM, QR, Loyalty, Reviews und Pipeline.'),
('premium','ai_business_assistant','AI Business Assistant Plus','Erweiterte Assistant-Hinweise und Priorisierungen.','AI',true,'Premium',26,'Priorisierte Empfehlungen und Health-Warnungen.'),
('premium','marketing_automation','Marketing Automation','Reaktivierung, Review-Flows und Loyalty-Aktionen.','Marketing',true,'Premium',27,'Kampagnenlogik für QR, Loyalty und Reviews.'),
('premium','customer_health','Customer Health Dashboard','Ampelsystem, Warnungen und Chancen je Kunde.','Analytics',true,'Premium',28,'Health Score aus Umsatz, Nutzung, Reviews, Loyalty, Support und QR.')
on conflict (package_key, feature_key) do update set label=excluded.label,description=excluded.description,category=excluded.category,included=excluded.included,limit_value=excluded.limit_value,sort_order=excluded.sort_order,tooltip=excluded.tooltip;

insert into public.package_tools (package_key, tool_key, label, description, enabled_by_default, visible_to_customer, sort_order)
values
('growth','smart_automation','Smart Automation','Basis-Automationen aus Kundendaten',true,true,24),
('growth','ai_business_assistant','AI Assistant','Business-Hinweise und Empfehlungen',true,true,25),
('premium','smart_automation','Smart Automation Plus','Erweiterte intelligente Automationen',true,true,26),
('premium','ai_business_assistant','AI Assistant Plus','Priorisierte Business-Hinweise',true,true,27),
('premium','marketing_automation','Marketing Automation','Reaktivierung, Review- und Loyalty-Kampagnen',true,true,28),
('premium','customer_health','Customer Health','Health Dashboard und Ampelsystem',true,true,29)
on conflict (package_key, tool_key) do update set label=excluded.label,description=excluded.description,enabled_by_default=excluded.enabled_by_default,visible_to_customer=excluded.visible_to_customer,sort_order=excluded.sort_order;

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','v22_ai_automation_core_applied','system','{"version":"0034"}'::jsonb)
on conflict do nothing;
