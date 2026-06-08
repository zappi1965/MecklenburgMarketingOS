
-- MMOS v19 Package & Billing Logic
-- Zentrale Paketlogik, Pricing-Sync, dynamische Features und Tool-Gating.

create table if not exists public.package_catalog (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  subtitle text,
  description text,
  monthly_price numeric(12,2) not null default 0,
  yearly_price numeric(12,2),
  currency text not null default 'EUR',
  sort_order integer not null default 0,
  active boolean not null default true,
  is_public boolean not null default true,
  cta text not null default 'Paket anfragen',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.package_features (
  id uuid primary key default gen_random_uuid(),
  package_key text not null references public.package_catalog(key) on delete cascade,
  feature_key text not null,
  label text not null,
  description text,
  category text not null default 'Allgemein',
  included boolean not null default true,
  limit_value text,
  sort_order integer not null default 0,
  tooltip text,
  unique(package_key, feature_key)
);

create table if not exists public.package_tools (
  id uuid primary key default gen_random_uuid(),
  package_key text not null references public.package_catalog(key) on delete cascade,
  tool_key text not null,
  label text not null,
  description text,
  enabled_by_default boolean not null default true,
  visible_to_customer boolean not null default true,
  sort_order integer not null default 0,
  unique(package_key, tool_key)
);

create table if not exists public.billing_plan_sync (
  id uuid primary key default gen_random_uuid(),
  package_key text not null references public.package_catalog(key) on delete cascade,
  provider text not null default 'manual',
  provider_product_id text,
  provider_price_id text,
  billing_interval text not null default 'month',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(package_key, provider, billing_interval)
);

alter table if exists public.customer_subscriptions add column if not exists package_key text;
alter table if exists public.customer_subscriptions add column if not exists billing_status text not null default 'active';
alter table if exists public.customer_subscriptions add column if not exists current_period_start timestamptz;
alter table if exists public.customer_subscriptions add column if not exists current_period_end timestamptz;
alter table if exists public.customer_subscriptions add column if not exists provider text default 'manual';
alter table if exists public.customer_subscriptions add column if not exists provider_subscription_id text;

alter table if exists public.customer_tool_access add column if not exists source text default 'manual';
alter table if exists public.customer_tool_access add column if not exists package_key text;

alter table if exists public.package_requests add column if not exists package_key text;
alter table if exists public.package_requests add column if not exists requested_price numeric(12,2);
alter table if exists public.package_requests add column if not exists billing_interval text default 'month';

alter table public.package_catalog enable row level security;
alter table public.package_features enable row level security;
alter table public.package_tools enable row level security;
alter table public.billing_plan_sync enable row level security;

drop policy if exists package_catalog_public_read on public.package_catalog;
create policy package_catalog_public_read on public.package_catalog for select using (active = true and is_public = true);

drop policy if exists package_catalog_admin_all on public.package_catalog;
create policy package_catalog_admin_all on public.package_catalog for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists package_features_public_read on public.package_features;
create policy package_features_public_read on public.package_features for select using (true);

drop policy if exists package_features_admin_all on public.package_features;
create policy package_features_admin_all on public.package_features for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists package_tools_public_read on public.package_tools;
create policy package_tools_public_read on public.package_tools for select using (true);

drop policy if exists package_tools_admin_all on public.package_tools;
create policy package_tools_admin_all on public.package_tools for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists billing_plan_sync_admin_read on public.billing_plan_sync;
create policy billing_plan_sync_admin_read on public.billing_plan_sync for all using (public.is_admin()) with check (public.is_admin());

insert into public.package_catalog (key,name,subtitle,description,monthly_price,yearly_price,sort_order,cta)
values
('starter','Starter','Basis für kleine Betriebe','Kundenportal, Rechnungen, Tickets und einfache Booking-Funktionen.',149,1490,1,'Starter anfragen'),
('growth','Growth','Wachstum & Automatisierung','Erweiterte Automationen, QR-Kampagnen, Reports und KPI-Auswertungen.',299,2990,2,'Growth anfragen'),
('premium','Premium','Vollständiges Marketing OS','Premium Automationen, Review Funnel, Advanced Reports, Success Score und Priorität.',499,4990,3,'Premium anfragen')
on conflict (key) do update set
name=excluded.name,
subtitle=excluded.subtitle,
description=excluded.description,
monthly_price=excluded.monthly_price,
yearly_price=excluded.yearly_price,
sort_order=excluded.sort_order,
cta=excluded.cta,
active=true,
is_public=true,
updated_at=now();

-- Features: keine Formulierung "im Paket enthalten", sondern sauber "verfügbar".
insert into public.package_features (package_key,feature_key,label,description,category,included,limit_value,sort_order,tooltip)
values
('starter','dashboard','Dashboard','Basisübersicht für den Kundenbereich.','Portal',true,null,1,'Im Kundenportal verfügbar.'),
('starter','invoices','Rechnungen','Rechnungsübersicht und PDF-Downloads.','Abrechnung',true,null,2,'Für freigegebene Kunden sichtbar.'),
('starter','tickets','Tickets','Support-Tickets erstellen und verfolgen.','Service',true,null,3,'Für Kundenkommunikation verfügbar.'),
('starter','booking','Booking Basis','Termine und Kategorien verwalten.','Booking',true,'Basis',4,'Termine mit Kategorien und Preisen.'),
('starter','integrations','Integrationen Status','Integrationsstatus anzeigen.','Integrationen',true,'Status',5,'Statusansicht für verbundene Dienste.'),

('growth','dashboard','Dashboard','Erweiterte Übersicht mit KPIs.','Portal',true,null,1,'Für aktive Growth Kunden verfügbar.'),
('growth','invoices','Rechnungen','Rechnungen und PDF-Downloads.','Abrechnung',true,null,2,'PDF-Erzeugung verfügbar.'),
('growth','tickets','Tickets','Support-Tickets mit Status.','Service',true,null,3,'Support-Kommunikation verfügbar.'),
('growth','booking','Booking Pro','Termine, Kategorien, Umsatzberechnung.','Booking',true,'Pro',4,'Umsatz aus Terminpreisen.'),
('growth','qr_campaigns','QR-Kampagnen','QR-Kampagnen mit KPI-Auswertung.','Marketing',true,'5 Kampagnen',5,'QR-Codes und Scan-KPIs.'),
('growth','automations','Automationen','Basis-Automationen für Rechnungen/Tickets.','Automation',true,'Basis',6,'Automationsläufe verfügbar.'),
('growth','reports','Reports','Monatsreports als PDF.','Reporting',true,'Monatlich',7,'PDF-Reports verfügbar.'),
('growth','seo_kpis','SEO/KPI Daten','Google KPI-Sync, wenn APIs verbunden sind.','Analytics',true,'Google API',8,'Live-Daten bei hinterlegten APIs.'),

('premium','dashboard','Dashboard','Premium KPI Cockpit.','Portal',true,null,1,'Premium Kundenansicht.'),
('premium','invoices','Rechnungen','PDF-Rechnungen und Abrechnungslogik.','Abrechnung',true,null,2,'Rechnungs-PDFs verfügbar.'),
('premium','tickets','Tickets','Priorisierte Tickets.','Service',true,'Priorität',3,'Support mit Priorisierung.'),
('premium','booking','Booking Premium','Termine, Kategorien, Umsatz, Auswertung.','Booking',true,'Premium',4,'Erweiterte Buchungslogik.'),
('premium','qr_campaigns','QR-Kampagnen Plus','QR-Code, Funnel und Detail-KPIs.','Marketing',true,'unbegrenzt',5,'Detailauswertung für Kampagnen.'),
('premium','automations','Automationen Plus','Erweiterte Automationen und Trigger.','Automation',true,'Erweitert',6,'Mehr Automationsoptionen.'),
('premium','workflows','Workflows','Interne Prozesssteuerung im Adminbereich.','Automation',true,'Admin',7,'Für Admin-Prozesskontrolle.'),
('premium','advanced_reports','Advanced Reports','Erweiterte PDF-Reports.','Reporting',true,'Premium',8,'Report-PDFs verfügbar.'),
('premium','review_funnel','Review Funnel','Bewertungslogik mit internem Feedback.','Marketing',true,'Premium',9,'QR-basierter Review Funnel.'),
('premium','client_success','Client Success Score','Individuell anpassbarer Score.','Analytics',true,'Premium',10,'Parameter je Kunde anpassbar.')
on conflict (package_key,feature_key) do update set
label=excluded.label,
description=excluded.description,
category=excluded.category,
included=excluded.included,
limit_value=excluded.limit_value,
sort_order=excluded.sort_order,
tooltip=excluded.tooltip;

insert into public.package_tools (package_key,tool_key,label,description,enabled_by_default,visible_to_customer,sort_order)
values
('starter','dashboard','Dashboard','Kundenübersicht',true,true,1),
('starter','invoices','Rechnungen','Rechnungsbereich',true,true,2),
('starter','tickets','Tickets','Support-Tickets',true,true,3),
('starter','booking','Booking','Terminverwaltung Basis',true,true,4),
('starter','integrations','Integrationen','Status der Integrationen',true,true,5),
('starter','media_center','Media Center','Dateien und Medien',true,true,6),
('starter','packages_billing','Pakete & Billing','Pakete und Anfragen',true,true,7),

('growth','dashboard','Dashboard','Kundenübersicht',true,true,1),
('growth','invoices','Rechnungen','Rechnungsbereich',true,true,2),
('growth','tickets','Tickets','Support-Tickets',true,true,3),
('growth','booking','Booking','Terminverwaltung Pro',true,true,4),
('growth','integrations','Integrationen','API Status',true,true,5),
('growth','media_center','Media Center','Dateien und Medien',true,true,6),
('growth','packages_billing','Pakete & Billing','Pakete und Anfragen',true,true,7),
('growth','qr_campaigns','QR Kampagnen','QR-Kampagnen und KPIs',true,true,8),
('growth','automations','Automationen','Basis-Automationen',true,true,9),
('growth','reports','Reports','Monatsreports',true,true,10),
('growth','seo_kpis','SEO/KPI Daten','Google KPI Daten',true,true,11),

('premium','dashboard','Dashboard','Premium Dashboard',true,true,1),
('premium','invoices','Rechnungen','Rechnungsbereich',true,true,2),
('premium','tickets','Tickets','Priorisierte Tickets',true,true,3),
('premium','booking','Booking','Premium Booking',true,true,4),
('premium','integrations','Integrationen','API Status und Sync',true,true,5),
('premium','media_center','Media Center','Dateien und Medien',true,true,6),
('premium','packages_billing','Pakete & Billing','Pakete und Anfragen',true,true,7),
('premium','qr_campaigns','QR Kampagnen','QR-Kampagnen und Funnel',true,true,8),
('premium','automations','Automationen','Erweiterte Automationen',true,true,9),
('premium','reports','Reports','Monatsreports',true,true,10),
('premium','seo_kpis','SEO/KPI Daten','Google KPI Daten',true,true,11),
('premium','advanced_reports','Advanced Reports','Erweiterte Reports',true,true,12),
('premium','review_funnel','Review Funnel','Bewertungsfunnel',true,true,13),
('premium','client_success','Client Success','Success Score',true,true,14)
on conflict (package_key,tool_key) do update set
label=excluded.label,
description=excluded.description,
enabled_by_default=excluded.enabled_by_default,
visible_to_customer=excluded.visible_to_customer,
sort_order=excluded.sort_order;

insert into public.billing_plan_sync (package_key,provider,billing_interval,metadata)
values
('starter','manual','month','{"note":"Manuelle Abrechnung vorbereitet"}'::jsonb),
('growth','manual','month','{"note":"Manuelle Abrechnung vorbereitet"}'::jsonb),
('premium','manual','month','{"note":"Manuelle Abrechnung vorbereitet"}'::jsonb)
on conflict (package_key,provider,billing_interval) do update set active=true, updated_at=now();

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','package_billing_logic_applied','system','{"version":"0029"}'::jsonb)
on conflict do nothing;
