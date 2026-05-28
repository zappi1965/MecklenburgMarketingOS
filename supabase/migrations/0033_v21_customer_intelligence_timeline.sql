
create table if not exists public.customer_timeline_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  event_type text not null,
  title text not null,
  description text,
  source_module text not null default 'system',
  source_id uuid,
  severity text not null default 'info',
  actor_name text default 'System',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_intelligence_scores (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique,
  customer_lifetime_value numeric(12,2) not null default 0,
  monthly_recurring_revenue numeric(12,2) not null default 0,
  risk_score integer not null default 0,
  upsell_score integer not null default 0,
  package_usage_score integer not null default 0,
  loyalty_engagement_score integer not null default 0,
  review_health_score integer not null default 0,
  client_success_score integer not null default 0,
  risk_level text not null default 'low',
  upsell_level text not null default 'low',
  recommendations jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now()
);

create table if not exists public.customer_tool_usage (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  tool_key text not null,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  first_used_at timestamptz default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(customer_id, tool_key)
);

create table if not exists public.customer_monthly_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  period_start date not null,
  period_end date not null,
  title text not null,
  revenue numeric(12,2) not null default 0,
  appointments integer not null default 0,
  invoices integer not null default 0,
  qr_scans integer not null default 0,
  qr_conversions integer not null default 0,
  loyalty_participants integer not null default 0,
  loyalty_points_issued integer not null default 0,
  reviews integer not null default 0,
  avg_rating numeric(3,2) not null default 0,
  leads integer not null default 0,
  open_tickets integer not null default 0,
  risk_score integer not null default 0,
  upsell_score integer not null default 0,
  pdf_base64 text,
  pdf_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(customer_id, period_start, period_end)
);

alter table if exists public.customers add column if not exists customer_lifetime_value numeric(12,2) not null default 0;
alter table if exists public.customers add column if not exists risk_score integer not null default 0;
alter table if exists public.customers add column if not exists upsell_score integer not null default 0;
alter table if exists public.customers add column if not exists package_usage_score integer not null default 0;
alter table if exists public.customers add column if not exists risk_level text not null default 'low';
alter table if exists public.customers add column if not exists upsell_level text not null default 'low';
alter table if exists public.customers add column if not exists intelligence_updated_at timestamptz;

alter table public.customer_timeline_events enable row level security;
alter table public.customer_intelligence_scores enable row level security;
alter table public.customer_tool_usage enable row level security;
alter table public.customer_monthly_report_snapshots enable row level security;

drop policy if exists customer_timeline_events_access on public.customer_timeline_events;
create policy customer_timeline_events_access on public.customer_timeline_events for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));
drop policy if exists customer_intelligence_scores_access on public.customer_intelligence_scores;
create policy customer_intelligence_scores_access on public.customer_intelligence_scores for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));
drop policy if exists customer_tool_usage_access on public.customer_tool_usage;
create policy customer_tool_usage_access on public.customer_tool_usage for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));
drop policy if exists customer_monthly_report_snapshots_access on public.customer_monthly_report_snapshots;
create policy customer_monthly_report_snapshots_access on public.customer_monthly_report_snapshots for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

insert into public.package_features (package_key, feature_key, label, description, category, included, limit_value, sort_order, tooltip)
values
('growth','customer_intelligence','Customer Intelligence','Timeline, Risiko-Score, Upsell-Hinweise und Paketnutzung.','Analytics',true,'Basis',19,'Verknüpft CRM, QR, Loyalty, Reviews und Booking.'),
('premium','customer_intelligence','Customer Intelligence Plus','Erweiterte Kundenintelligenz mit Monatsreport-Basis und automatischen CRM-Hinweisen.','Analytics',true,'Premium',21,'Zentrale Kundenanalyse über alle Kernmodule.')
on conflict (package_key, feature_key) do update set label=excluded.label,description=excluded.description,category=excluded.category,included=excluded.included,limit_value=excluded.limit_value,sort_order=excluded.sort_order,tooltip=excluded.tooltip;

insert into public.package_tools (package_key, tool_key, label, description, enabled_by_default, visible_to_customer, sort_order)
values
('growth','customer_intelligence','Customer Intelligence','Timeline, Risiko- und Upsell-Auswertung',true,true,20),
('premium','customer_intelligence','Customer Intelligence Plus','Erweiterte Kundenintelligenz und Monatsreport-Basis',true,true,22)
on conflict (package_key, tool_key) do update set label=excluded.label,description=excluded.description,enabled_by_default=excluded.enabled_by_default,visible_to_customer=excluded.visible_to_customer,sort_order=excluded.sort_order;

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','v21_customer_intelligence_timeline_applied','system','{"version":"0033"}'::jsonb)
on conflict do nothing;
