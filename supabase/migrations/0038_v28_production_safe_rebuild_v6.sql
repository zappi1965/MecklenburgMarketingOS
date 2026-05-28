-- ============================================================
-- MMOS PRODUCTION SAFE REBUILD / COMPATIBILITY MIGRATION
-- Datei: 0038_v28_production_safe_rebuild_v6_v2.sql
-- Zweck:
--   - konsolidierter Zielzustand aus 0001-0038
--   - defensive Schema-Kompatibilität für ältere MMOS-Stände
--   - keine DROP TABLE Statements
--   - keine Datenlöschung
--   - ergänzt fehlende Tabellen, Spalten, Defaults und Indexe
--   - seeded Demo-Umgebung auf aktuellen V28-Stand
--
-- Anwendung:
--   1. In Supabase SQL Editor vollständig ausführen.
--   2. Danach Railway Backend neu deployen.
--   3. Danach Vercel Frontend neu deployen.
--
-- Wichtig:
--   Diese Datei ersetzt nicht zwingend deine historische Migrationshistorie.
--   Sie bringt die bestehende DB defensiv auf den aktuellen Soll-Zustand.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 00 AUDIT / LOGGING
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

alter table public.security_audit_logs add column if not exists actor_name text;
alter table public.security_audit_logs add column if not exists action text not null default 'unknown';
alter table public.security_audit_logs add column if not exists entity_type text;
alter table public.security_audit_logs add column if not exists entity_id uuid;
alter table public.security_audit_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.security_audit_logs add column if not exists created_at timestamptz not null default now();

-- ============================================================
-- 01 CUSTOMERS / CRM CORE
-- ============================================================

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Kunde'
);

alter table public.customers add column if not exists name text not null default 'Kunde';
alter table public.customers add column if not exists title text;
alter table public.customers add column if not exists email text;
alter table public.customers add column if not exists phone text;
alter table public.customers add column if not exists company text;
alter table public.customers add column if not exists contact_person text;
alter table public.customers add column if not exists second_contact_person text;
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists city text;
alter table public.customers add column if not exists status text not null default 'active';
alter table public.customers add column if not exists package_key text not null default 'starter';
alter table public.customers add column if not exists plan text;
alter table public.customers add column if not exists is_demo boolean not null default false;
alter table public.customers add column if not exists customer_lifetime_value numeric(12,2) not null default 0;
alter table public.customers add column if not exists monthly_recurring_revenue numeric(12,2) not null default 0;
alter table public.customers add column if not exists risk_score integer not null default 0;
alter table public.customers add column if not exists upsell_score integer not null default 0;
alter table public.customers add column if not exists package_usage_score integer not null default 0;
alter table public.customers add column if not exists client_success_score integer not null default 0;
alter table public.customers add column if not exists risk_level text not null default 'low';
alter table public.customers add column if not exists upsell_level text not null default 'low';
alter table public.customers add column if not exists health_level text;
alter table public.customers add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customers add column if not exists notes text;
alter table public.customers add column if not exists intelligence_updated_at timestamptz;
alter table public.customers add column if not exists created_at timestamptz not null default now();
alter table public.customers add column if not exists updated_at timestamptz not null default now();

update public.customers set title = coalesce(title, name) where title is null;
update public.customers set name = coalesce(name, title, company, 'Kunde') where name is null;

-- ============================================================
-- 02 PACKAGES / TOOLS / SUBSCRIPTIONS
-- ============================================================

create table if not exists public.package_features (
  id uuid primary key default gen_random_uuid(),
  package_key text not null default 'starter',
  feature_key text not null default 'feature',
  label text not null default 'Feature'
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
  label text not null default 'Tool'
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
  tool_key text not null default 'tool'
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

create table if not exists public.customer_tool_usage (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  tool_key text not null default 'tool'
);

alter table public.customer_tool_usage add column if not exists customer_id uuid;
alter table public.customer_tool_usage add column if not exists tool_key text not null default 'tool';
alter table public.customer_tool_usage add column if not exists usage_count integer not null default 0;
alter table public.customer_tool_usage add column if not exists first_used_at timestamptz default now();
alter table public.customer_tool_usage add column if not exists last_used_at timestamptz;
alter table public.customer_tool_usage add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists customer_tool_usage_customer_tool_uidx
on public.customer_tool_usage (customer_id, tool_key);

create table if not exists public.customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.customer_subscriptions add column if not exists customer_id uuid;
alter table public.customer_subscriptions add column if not exists package_key text not null default 'starter';
alter table public.customer_subscriptions add column if not exists package_name text not null default 'Starter';
alter table public.customer_subscriptions add column if not exists plan text;
alter table public.customer_subscriptions add column if not exists provider text not null default 'manual';
alter table public.customer_subscriptions add column if not exists billing_interval text not null default 'month';
alter table public.customer_subscriptions add column if not exists status text not null default 'active';
alter table public.customer_subscriptions add column if not exists amount_cents integer not null default 0;
alter table public.customer_subscriptions add column if not exists amount numeric(12,2) not null default 0;
alter table public.customer_subscriptions add column if not exists monthly_price numeric(12,2) not null default 0;
alter table public.customer_subscriptions add column if not exists currency text not null default 'EUR';
alter table public.customer_subscriptions add column if not exists provider_customer_id text;
alter table public.customer_subscriptions add column if not exists provider_subscription_id text;
alter table public.customer_subscriptions add column if not exists current_period_start timestamptz;
alter table public.customer_subscriptions add column if not exists current_period_end timestamptz;
alter table public.customer_subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.customer_subscriptions add column if not exists usage_billing_enabled boolean not null default false;
alter table public.customer_subscriptions add column if not exists revenue_share_enabled boolean not null default false;
alter table public.customer_subscriptions add column if not exists recommended_package text;
alter table public.customer_subscriptions add column if not exists forecasted_mrr numeric(12,2) not null default 0;
alter table public.customer_subscriptions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customer_subscriptions add column if not exists created_at timestamptz not null default now();
alter table public.customer_subscriptions add column if not exists updated_at timestamptz not null default now();

-- ============================================================
-- 03 CRM TIMELINE / PIPELINE / BOOKING / INVOICES / TICKETS
-- ============================================================

create table if not exists public.customer_timeline_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  event_type text not null default 'event',
  title text not null default 'Event'
);

alter table public.customer_timeline_events add column if not exists customer_id uuid;
alter table public.customer_timeline_events add column if not exists event_type text not null default 'event';
alter table public.customer_timeline_events add column if not exists title text not null default 'Event';
alter table public.customer_timeline_events add column if not exists description text;
alter table public.customer_timeline_events add column if not exists source_module text not null default 'system';
alter table public.customer_timeline_events add column if not exists source_id uuid;
alter table public.customer_timeline_events add column if not exists severity text not null default 'info';
alter table public.customer_timeline_events add column if not exists actor_name text default 'System';
alter table public.customer_timeline_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customer_timeline_events add column if not exists created_at timestamptz not null default now();

create table if not exists public.pipeline_leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  title text not null default 'Lead'
);

alter table public.pipeline_leads add column if not exists customer_id uuid;
alter table public.pipeline_leads add column if not exists title text not null default 'Lead';
alter table public.pipeline_leads add column if not exists source text default 'manual';
alter table public.pipeline_leads add column if not exists stage text default 'new';
alter table public.pipeline_leads add column if not exists value numeric(12,2) not null default 0;
alter table public.pipeline_leads add column if not exists probability integer not null default 0;
alter table public.pipeline_leads add column if not exists expected_close_date date;
alter table public.pipeline_leads add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.pipeline_leads add column if not exists created_at timestamptz not null default now();
alter table public.pipeline_leads add column if not exists updated_at timestamptz not null default now();

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  title text not null default 'Termin'
);

alter table public.appointments add column if not exists customer_id uuid;
alter table public.appointments add column if not exists title text not null default 'Termin';
alter table public.appointments add column if not exists client_name text not null default 'Demo Kunde – Café Morgenlicht';
alter table public.appointments add column if not exists client_email text;
alter table public.appointments add column if not exists client_phone text;
alter table public.appointments add column if not exists appointment_date date not null default current_date;
alter table public.appointments add column if not exists appointment_time text not null default '09:00';
alter table public.appointments add column if not exists duration_minutes integer not null default 60;
alter table public.appointments add column if not exists notes text;
alter table public.appointments add column if not exists is_demo boolean not null default false;
alter table public.appointments add column if not exists reminder_sent boolean not null default false;
alter table public.appointments add column if not exists service_category_id uuid;
alter table public.appointments add column if not exists service_category_name text;
alter table public.appointments add column if not exists service_name text;
alter table public.appointments add column if not exists price numeric(12,2) not null default 0;
alter table public.appointments add column if not exists start_time timestamptz;
alter table public.appointments add column if not exists end_time timestamptz;
alter table public.appointments add column if not exists status text not null default 'confirmed';
alter table public.appointments add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.appointments add column if not exists created_at timestamptz not null default now();

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.invoices add column if not exists customer_id uuid;
alter table public.invoices add column if not exists invoice_number text;
alter table public.invoices add column if not exists service_type text;
alter table public.invoices add column if not exists amount numeric(12,2) not null default 0;
alter table public.invoices add column if not exists total numeric(12,2) not null default 0;
alter table public.invoices add column if not exists status text not null default 'Offen';
alter table public.invoices add column if not exists pdf_url text;
alter table public.invoices add column if not exists pdf_base64 text;
alter table public.invoices add column if not exists service_category_id uuid;
alter table public.invoices add column if not exists source_appointment_id uuid;
alter table public.invoices add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.invoices add column if not exists created_at timestamptz not null default now();

update public.invoices
set invoice_number = coalesce(invoice_number, 'RE-' || left(id::text, 8))
where invoice_number is null;

alter table public.invoices alter column invoice_number set default ('RE-' || left(gen_random_uuid()::text, 8));

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  title text not null default 'Ticket'
);

alter table public.tickets add column if not exists customer_id uuid;
alter table public.tickets add column if not exists title text not null default 'Ticket';
alter table public.tickets add column if not exists description text;
alter table public.tickets add column if not exists status text not null default 'open';
alter table public.tickets add column if not exists priority text not null default 'medium';
alter table public.tickets add column if not exists source text;
alter table public.tickets add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.tickets add column if not exists created_at timestamptz not null default now();

-- ============================================================
-- 04 QR CAMPAIGNS LEGACY + V28
-- ============================================================

create table if not exists public.qr_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.qr_campaigns add column if not exists customer_id uuid;
alter table public.qr_campaigns add column if not exists title text;
alter table public.qr_campaigns add column if not exists name text;
alter table public.qr_campaigns add column if not exists slug text;
alter table public.qr_campaigns add column if not exists target_url text;
alter table public.qr_campaigns add column if not exists scans integer not null default 0;
alter table public.qr_campaigns add column if not exists conversions integer not null default 0;
alter table public.qr_campaigns add column if not exists active boolean not null default true;
alter table public.qr_campaigns add column if not exists status text not null default 'Aktiv';
alter table public.qr_campaigns add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.qr_campaigns add column if not exists created_at timestamptz not null default now();
alter table public.qr_campaigns add column if not exists updated_at timestamptz not null default now();

update public.qr_campaigns set title = coalesce(title, name, 'QR Kampagne') where title is null;
update public.qr_campaigns set name = coalesce(name, title, 'QR Kampagne') where name is null;

alter table public.qr_campaigns alter column title set default 'QR Kampagne';
alter table public.qr_campaigns alter column name set default 'QR Kampagne';

create unique index if not exists qr_campaigns_slug_uidx
on public.qr_campaigns (slug)
where slug is not null;

-- ============================================================
-- 05 LOYALTY CORE / SMART LOYALTY V2
-- ============================================================

create table if not exists public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.loyalty_programs add column if not exists customer_id uuid;
alter table public.loyalty_programs add column if not exists qr_campaign_id uuid;
alter table public.loyalty_programs add column if not exists title text;
alter table public.loyalty_programs add column if not exists name text not null default 'Loyalty Programm';
alter table public.loyalty_programs add column if not exists slug text;
alter table public.loyalty_programs add column if not exists points_per_scan integer not null default 10;
alter table public.loyalty_programs add column if not exists active boolean not null default true;
alter table public.loyalty_programs add column if not exists require_staff_code boolean not null default false;
alter table public.loyalty_programs add column if not exists branding jsonb not null default '{}'::jsonb;
alter table public.loyalty_programs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.loyalty_programs add column if not exists created_at timestamptz not null default now();
alter table public.loyalty_programs add column if not exists updated_at timestamptz not null default now();

update public.loyalty_programs set title = coalesce(title, name, 'Loyalty Programm') where title is null;

create unique index if not exists loyalty_programs_slug_uidx
on public.loyalty_programs (slug)
where slug is not null;

create table if not exists public.loyalty_customers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.loyalty_customers add column if not exists customer_id uuid;
alter table public.loyalty_customers add column if not exists loyalty_program_id uuid;
alter table public.loyalty_customers add column if not exists email text;
alter table public.loyalty_customers add column if not exists phone text;
alter table public.loyalty_customers add column if not exists member_token text;
alter table public.loyalty_customers add column if not exists device_id text;
alter table public.loyalty_customers add column if not exists display_name text;
alter table public.loyalty_customers add column if not exists points_balance integer not null default 0;
alter table public.loyalty_customers add column if not exists total_points integer not null default 0;
alter table public.loyalty_customers add column if not exists current_tier text not null default 'basic';
alter table public.loyalty_customers add column if not exists total_scans integer not null default 0;
alter table public.loyalty_customers add column if not exists total_reviews integer not null default 0;
alter table public.loyalty_customers add column if not exists last_seen_at timestamptz;
alter table public.loyalty_customers add column if not exists last_activity_at timestamptz;
alter table public.loyalty_customers add column if not exists segment_summary jsonb not null default '[]'::jsonb;
alter table public.loyalty_customers add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.loyalty_customers add column if not exists created_at timestamptz not null default now();

create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.loyalty_rewards add column if not exists customer_id uuid;
alter table public.loyalty_rewards add column if not exists loyalty_program_id uuid;
alter table public.loyalty_rewards add column if not exists title text;
alter table public.loyalty_rewards add column if not exists name text;
alter table public.loyalty_rewards add column if not exists description text;
alter table public.loyalty_rewards add column if not exists reward_type text not null default 'discount';
alter table public.loyalty_rewards add column if not exists points_required integer not null default 100;
alter table public.loyalty_rewards add column if not exists active boolean not null default true;
alter table public.loyalty_rewards add column if not exists require_staff_confirmation boolean not null default false;
alter table public.loyalty_rewards add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.loyalty_rewards add column if not exists created_at timestamptz not null default now();
alter table public.loyalty_rewards add column if not exists updated_at timestamptz not null default now();

update public.loyalty_rewards set title = coalesce(title, name, 'Reward') where title is null;
update public.loyalty_rewards set name = coalesce(name, title, 'Reward') where name is null;

alter table public.loyalty_rewards alter column title set default 'Reward';
alter table public.loyalty_rewards alter column name set default 'Reward';

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.loyalty_transactions add column if not exists customer_id uuid;
alter table public.loyalty_transactions add column if not exists loyalty_program_id uuid;
alter table public.loyalty_transactions add column if not exists loyalty_customer_id uuid;
alter table public.loyalty_transactions add column if not exists qr_campaign_id uuid;
alter table public.loyalty_transactions add column if not exists reward_id uuid;
alter table public.loyalty_transactions add column if not exists action text not null default 'points';
alter table public.loyalty_transactions add column if not exists points integer not null default 0;
alter table public.loyalty_transactions add column if not exists description text;
alter table public.loyalty_transactions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.loyalty_transactions add column if not exists created_at timestamptz not null default now();

create table if not exists public.staff_confirmation_codes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.staff_confirmation_codes add column if not exists customer_id uuid;
alter table public.staff_confirmation_codes add column if not exists loyalty_program_id uuid;
alter table public.staff_confirmation_codes add column if not exists code_label text not null default 'Mitarbeiter Code';
alter table public.staff_confirmation_codes add column if not exists code_hash text not null default 'demo-hash';
alter table public.staff_confirmation_codes add column if not exists active boolean not null default true;
alter table public.staff_confirmation_codes add column if not exists max_uses integer;
alter table public.staff_confirmation_codes add column if not exists used_count integer not null default 0;
alter table public.staff_confirmation_codes add column if not exists valid_until timestamptz;
alter table public.staff_confirmation_codes add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.staff_confirmation_codes add column if not exists created_at timestamptz not null default now();

create table if not exists public.loyalty_segments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  segment_key text not null default 'segment'
);

alter table public.loyalty_segments add column if not exists customer_id uuid;
alter table public.loyalty_segments add column if not exists loyalty_program_id uuid;
alter table public.loyalty_segments add column if not exists name text not null default 'Segment';
alter table public.loyalty_segments add column if not exists segment_key text not null default 'segment';
alter table public.loyalty_segments add column if not exists description text;
alter table public.loyalty_segments add column if not exists rule_config jsonb not null default '{}'::jsonb;
alter table public.loyalty_segments add column if not exists member_count integer not null default 0;
alter table public.loyalty_segments add column if not exists active boolean not null default true;
alter table public.loyalty_segments add column if not exists color text default '#7c3aed';
alter table public.loyalty_segments add column if not exists created_at timestamptz not null default now();
alter table public.loyalty_segments add column if not exists updated_at timestamptz not null default now();

create unique index if not exists loyalty_segments_customer_program_key_uidx
on public.loyalty_segments (customer_id, loyalty_program_id, segment_key);

create table if not exists public.loyalty_tiers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  tier_key text not null default 'basic'
);

alter table public.loyalty_tiers add column if not exists customer_id uuid;
alter table public.loyalty_tiers add column if not exists loyalty_program_id uuid;
alter table public.loyalty_tiers add column if not exists tier_key text not null default 'basic';
alter table public.loyalty_tiers add column if not exists name text not null default 'Basic';
alter table public.loyalty_tiers add column if not exists description text;
alter table public.loyalty_tiers add column if not exists min_points integer not null default 0;
alter table public.loyalty_tiers add column if not exists min_scans integer not null default 0;
alter table public.loyalty_tiers add column if not exists min_reviews integer not null default 0;
alter table public.loyalty_tiers add column if not exists multiplier numeric(6,2) not null default 1.00;
alter table public.loyalty_tiers add column if not exists benefits jsonb not null default '[]'::jsonb;
alter table public.loyalty_tiers add column if not exists active boolean not null default true;
alter table public.loyalty_tiers add column if not exists sort_order integer not null default 0;
alter table public.loyalty_tiers add column if not exists created_at timestamptz not null default now();

create unique index if not exists loyalty_tiers_program_key_uidx
on public.loyalty_tiers (loyalty_program_id, tier_key);

create table if not exists public.loyalty_point_rules (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.loyalty_point_rules add column if not exists customer_id uuid;
alter table public.loyalty_point_rules add column if not exists loyalty_program_id uuid;
alter table public.loyalty_point_rules add column if not exists qr_campaign_id uuid;
alter table public.loyalty_point_rules add column if not exists name text not null default 'Punkte-Regel';
alter table public.loyalty_point_rules add column if not exists rule_type text not null default 'bonus';
alter table public.loyalty_point_rules add column if not exists trigger_key text not null default 'qr_scan';
alter table public.loyalty_point_rules add column if not exists points_delta integer not null default 0;
alter table public.loyalty_point_rules add column if not exists multiplier numeric(6,2) not null default 1.00;
alter table public.loyalty_point_rules add column if not exists condition_config jsonb not null default '{}'::jsonb;
alter table public.loyalty_point_rules add column if not exists valid_from timestamptz;
alter table public.loyalty_point_rules add column if not exists valid_until timestamptz;
alter table public.loyalty_point_rules add column if not exists active boolean not null default true;
alter table public.loyalty_point_rules add column if not exists priority integer not null default 100;
alter table public.loyalty_point_rules add column if not exists created_at timestamptz not null default now();

create table if not exists public.loyalty_smart_actions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.loyalty_smart_actions add column if not exists customer_id uuid;
alter table public.loyalty_smart_actions add column if not exists loyalty_program_id uuid;
alter table public.loyalty_smart_actions add column if not exists segment_id uuid;
alter table public.loyalty_smart_actions add column if not exists name text not null default 'Smart Action';
alter table public.loyalty_smart_actions add column if not exists action_type text not null default 'reactivation';
alter table public.loyalty_smart_actions add column if not exists status text not null default 'draft';
alter table public.loyalty_smart_actions add column if not exists reward_id uuid;
alter table public.loyalty_smart_actions add column if not exists qr_campaign_id uuid;
alter table public.loyalty_smart_actions add column if not exists marketing_campaign_id uuid;
alter table public.loyalty_smart_actions add column if not exists message_config jsonb not null default '{}'::jsonb;
alter table public.loyalty_smart_actions add column if not exists trigger_config jsonb not null default '{}'::jsonb;
alter table public.loyalty_smart_actions add column if not exists created_at timestamptz not null default now();
alter table public.loyalty_smart_actions add column if not exists updated_at timestamptz not null default now();

-- ============================================================
-- 06 REVIEWS / REVIEW INTELLIGENCE
-- ============================================================

create table if not exists public.review_feedback (
  id uuid primary key default gen_random_uuid()
);

alter table public.review_feedback add column if not exists customer_id uuid;
alter table public.review_feedback add column if not exists loyalty_customer_id uuid;
alter table public.review_feedback add column if not exists qr_campaign_id uuid;
alter table public.review_feedback add column if not exists rating integer;
alter table public.review_feedback add column if not exists feedback_text text;
alter table public.review_feedback add column if not exists comment text;
alter table public.review_feedback add column if not exists reviewer_name text;
alter table public.review_feedback add column if not exists reviewer_email text;
alter table public.review_feedback add column if not exists source text not null default 'manual';
alter table public.review_feedback add column if not exists status text not null default 'new';
alter table public.review_feedback add column if not exists intelligence_status text not null default 'pending';
alter table public.review_feedback add column if not exists sentiment text;
alter table public.review_feedback add column if not exists detected_topics jsonb not null default '[]'::jsonb;
alter table public.review_feedback add column if not exists suggested_response text;
alter table public.review_feedback add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.review_feedback add column if not exists created_at timestamptz not null default now();

create table if not exists public.review_intelligence_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.review_intelligence_profiles add column if not exists customer_id uuid;
alter table public.review_intelligence_profiles add column if not exists total_reviews integer not null default 0;
alter table public.review_intelligence_profiles add column if not exists avg_rating numeric(3,2) not null default 0;
alter table public.review_intelligence_profiles add column if not exists sentiment_score integer not null default 0;
alter table public.review_intelligence_profiles add column if not exists positive_count integer not null default 0;
alter table public.review_intelligence_profiles add column if not exists neutral_count integer not null default 0;
alter table public.review_intelligence_profiles add column if not exists negative_count integer not null default 0;
alter table public.review_intelligence_profiles add column if not exists top_positive_topics jsonb not null default '[]'::jsonb;
alter table public.review_intelligence_profiles add column if not exists top_negative_topics jsonb not null default '[]'::jsonb;
alter table public.review_intelligence_profiles add column if not exists recurring_issues jsonb not null default '[]'::jsonb;
alter table public.review_intelligence_profiles add column if not exists recurring_praises jsonb not null default '[]'::jsonb;
alter table public.review_intelligence_profiles add column if not exists recommended_actions jsonb not null default '[]'::jsonb;
alter table public.review_intelligence_profiles add column if not exists metrics jsonb not null default '{}'::jsonb;
alter table public.review_intelligence_profiles add column if not exists calculated_at timestamptz not null default now();

create unique index if not exists review_intelligence_profiles_customer_uidx
on public.review_intelligence_profiles (customer_id);

create table if not exists public.review_intelligence_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.review_intelligence_items add column if not exists customer_id uuid;
alter table public.review_intelligence_items add column if not exists review_feedback_id uuid;
alter table public.review_intelligence_items add column if not exists rating integer;
alter table public.review_intelligence_items add column if not exists sentiment text not null default 'neutral';
alter table public.review_intelligence_items add column if not exists sentiment_score integer not null default 0;
alter table public.review_intelligence_items add column if not exists detected_topics jsonb not null default '[]'::jsonb;
alter table public.review_intelligence_items add column if not exists issue_tags jsonb not null default '[]'::jsonb;
alter table public.review_intelligence_items add column if not exists praise_tags jsonb not null default '[]'::jsonb;
alter table public.review_intelligence_items add column if not exists summary text;
alter table public.review_intelligence_items add column if not exists suggested_response text;
alter table public.review_intelligence_items add column if not exists escalation_required boolean not null default false;
alter table public.review_intelligence_items add column if not exists source_module text not null default 'reviews';
alter table public.review_intelligence_items add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.review_intelligence_items add column if not exists created_at timestamptz not null default now();

create table if not exists public.review_topic_dictionary (
  id uuid primary key default gen_random_uuid(),
  topic_key text unique not null,
  label text not null
);

alter table public.review_topic_dictionary add column if not exists topic_type text not null default 'neutral';
alter table public.review_topic_dictionary add column if not exists keywords text[] not null default '{}';
alter table public.review_topic_dictionary add column if not exists severity_weight integer not null default 1;
alter table public.review_topic_dictionary add column if not exists active boolean not null default true;
alter table public.review_topic_dictionary add column if not exists created_at timestamptz not null default now();

create table if not exists public.review_response_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null default 'template',
  label text not null default 'Template',
  body text not null default ''
);

alter table public.review_response_templates add column if not exists customer_id uuid;
alter table public.review_response_templates add column if not exists sentiment text not null default 'neutral';
alter table public.review_response_templates add column if not exists active boolean not null default true;
alter table public.review_response_templates add column if not exists created_at timestamptz not null default now();

-- ============================================================
-- 07 AI / AUTOMATION / HEALTH / INTELLIGENCE / MARKETING
-- ============================================================

create table if not exists public.customer_intelligence_scores (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.customer_intelligence_scores add column if not exists customer_id uuid;
alter table public.customer_intelligence_scores add column if not exists customer_lifetime_value numeric(12,2) not null default 0;
alter table public.customer_intelligence_scores add column if not exists monthly_recurring_revenue numeric(12,2) not null default 0;
alter table public.customer_intelligence_scores add column if not exists risk_score integer not null default 0;
alter table public.customer_intelligence_scores add column if not exists upsell_score integer not null default 0;
alter table public.customer_intelligence_scores add column if not exists package_usage_score integer not null default 0;
alter table public.customer_intelligence_scores add column if not exists loyalty_engagement_score integer not null default 0;
alter table public.customer_intelligence_scores add column if not exists review_health_score integer not null default 0;
alter table public.customer_intelligence_scores add column if not exists client_success_score integer not null default 0;
alter table public.customer_intelligence_scores add column if not exists risk_level text not null default 'low';
alter table public.customer_intelligence_scores add column if not exists upsell_level text not null default 'low';
alter table public.customer_intelligence_scores add column if not exists recommendations jsonb not null default '[]'::jsonb;
alter table public.customer_intelligence_scores add column if not exists metrics jsonb not null default '{}'::jsonb;
alter table public.customer_intelligence_scores add column if not exists calculated_at timestamptz not null default now();

create unique index if not exists customer_intelligence_scores_customer_uidx
on public.customer_intelligence_scores (customer_id);

create table if not exists public.customer_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.customer_health_snapshots add column if not exists customer_id uuid;
alter table public.customer_health_snapshots add column if not exists health_score integer not null default 0;
alter table public.customer_health_snapshots add column if not exists health_level text not null default 'unknown';
alter table public.customer_health_snapshots add column if not exists revenue_health integer not null default 0;
alter table public.customer_health_snapshots add column if not exists usage_health integer not null default 0;
alter table public.customer_health_snapshots add column if not exists review_health integer not null default 0;
alter table public.customer_health_snapshots add column if not exists loyalty_health integer not null default 0;
alter table public.customer_health_snapshots add column if not exists support_health integer not null default 0;
alter table public.customer_health_snapshots add column if not exists qr_health integer not null default 0;
alter table public.customer_health_snapshots add column if not exists warnings jsonb not null default '[]'::jsonb;
alter table public.customer_health_snapshots add column if not exists opportunities jsonb not null default '[]'::jsonb;
alter table public.customer_health_snapshots add column if not exists metrics jsonb not null default '{}'::jsonb;
alter table public.customer_health_snapshots add column if not exists calculated_at timestamptz not null default now();

create unique index if not exists customer_health_snapshots_customer_uidx
on public.customer_health_snapshots (customer_id);

create table if not exists public.ai_business_assistant_messages (
  id uuid primary key default gen_random_uuid()
);

alter table public.ai_business_assistant_messages add column if not exists customer_id uuid;
alter table public.ai_business_assistant_messages add column if not exists assistant_type text not null default 'business_assistant';
alter table public.ai_business_assistant_messages add column if not exists title text not null default 'AI Hinweis';
alter table public.ai_business_assistant_messages add column if not exists message text not null default '';
alter table public.ai_business_assistant_messages add column if not exists recommendation_type text not null default 'general';
alter table public.ai_business_assistant_messages add column if not exists severity text not null default 'info';
alter table public.ai_business_assistant_messages add column if not exists source_modules text[] not null default '{}';
alter table public.ai_business_assistant_messages add column if not exists related_entity_type text;
alter table public.ai_business_assistant_messages add column if not exists related_entity_id uuid;
alter table public.ai_business_assistant_messages add column if not exists status text not null default 'open';
alter table public.ai_business_assistant_messages add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.ai_business_assistant_messages add column if not exists created_at timestamptz not null default now();
alter table public.ai_business_assistant_messages add column if not exists resolved_at timestamptz;

create table if not exists public.smart_automation_rules (
  id uuid primary key default gen_random_uuid()
);

alter table public.smart_automation_rules add column if not exists customer_id uuid;
alter table public.smart_automation_rules add column if not exists name text not null default 'Automation';
alter table public.smart_automation_rules add column if not exists description text;
alter table public.smart_automation_rules add column if not exists trigger_key text not null default 'manual';
alter table public.smart_automation_rules add column if not exists condition_config jsonb not null default '{}'::jsonb;
alter table public.smart_automation_rules add column if not exists action_config jsonb not null default '{}'::jsonb;
alter table public.smart_automation_rules add column if not exists active boolean not null default true;
alter table public.smart_automation_rules add column if not exists scope text not null default 'customer';
alter table public.smart_automation_rules add column if not exists run_count integer not null default 0;
alter table public.smart_automation_rules add column if not exists last_run_at timestamptz;
alter table public.smart_automation_rules add column if not exists created_by text default 'System';
alter table public.smart_automation_rules add column if not exists created_at timestamptz not null default now();
alter table public.smart_automation_rules add column if not exists updated_at timestamptz not null default now();

create table if not exists public.smart_automation_runs (
  id uuid primary key default gen_random_uuid()
);

alter table public.smart_automation_runs add column if not exists rule_id uuid;
alter table public.smart_automation_runs add column if not exists customer_id uuid;
alter table public.smart_automation_runs add column if not exists trigger_key text not null default 'manual';
alter table public.smart_automation_runs add column if not exists status text not null default 'pending';
alter table public.smart_automation_runs add column if not exists actions_executed jsonb not null default '[]'::jsonb;
alter table public.smart_automation_runs add column if not exists result jsonb not null default '{}'::jsonb;
alter table public.smart_automation_runs add column if not exists error_message text;
alter table public.smart_automation_runs add column if not exists created_at timestamptz not null default now();

create table if not exists public.marketing_automation_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.marketing_automation_campaigns add column if not exists customer_id uuid;
alter table public.marketing_automation_campaigns add column if not exists name text not null default 'Marketing Kampagne';
alter table public.marketing_automation_campaigns add column if not exists campaign_type text not null default 'reactivation';
alter table public.marketing_automation_campaigns add column if not exists status text not null default 'draft';
alter table public.marketing_automation_campaigns add column if not exists audience_config jsonb not null default '{}'::jsonb;
alter table public.marketing_automation_campaigns add column if not exists trigger_config jsonb not null default '{}'::jsonb;
alter table public.marketing_automation_campaigns add column if not exists message_config jsonb not null default '{}'::jsonb;
alter table public.marketing_automation_campaigns add column if not exists linked_qr_campaign_id uuid;
alter table public.marketing_automation_campaigns add column if not exists linked_loyalty_program_id uuid;
alter table public.marketing_automation_campaigns add column if not exists linked_reward_id uuid;
alter table public.marketing_automation_campaigns add column if not exists created_at timestamptz not null default now();
alter table public.marketing_automation_campaigns add column if not exists updated_at timestamptz not null default now();

-- ============================================================
-- 08 REVENUE / DYNAMIC BILLING / SHARE
-- ============================================================

create table if not exists public.revenue_forecasts (
  id uuid primary key default gen_random_uuid()
);

alter table public.revenue_forecasts add column if not exists customer_id uuid;
alter table public.revenue_forecasts add column if not exists forecast_period text not null default 'monthly';
alter table public.revenue_forecasts add column if not exists period_start date;
alter table public.revenue_forecasts add column if not exists period_end date;
alter table public.revenue_forecasts add column if not exists expected_revenue numeric(12,2) not null default 0;
alter table public.revenue_forecasts add column if not exists expected_mrr numeric(12,2) not null default 0;
alter table public.revenue_forecasts add column if not exists expected_new_revenue numeric(12,2) not null default 0;
alter table public.revenue_forecasts add column if not exists expected_churn_risk_value numeric(12,2) not null default 0;
alter table public.revenue_forecasts add column if not exists pipeline_weighted_value numeric(12,2) not null default 0;
alter table public.revenue_forecasts add column if not exists confidence_score integer not null default 50;
alter table public.revenue_forecasts add column if not exists forecast_level text not null default 'medium';
alter table public.revenue_forecasts add column if not exists drivers jsonb not null default '[]'::jsonb;
alter table public.revenue_forecasts add column if not exists metrics jsonb not null default '{}'::jsonb;
alter table public.revenue_forecasts add column if not exists created_at timestamptz not null default now();

create unique index if not exists revenue_forecasts_customer_period_uidx
on public.revenue_forecasts (customer_id, period_start, period_end)
where customer_id is not null and period_start is not null and period_end is not null;

create table if not exists public.dynamic_billing_usage (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.dynamic_billing_usage add column if not exists customer_id uuid;
alter table public.dynamic_billing_usage add column if not exists period_start date;
alter table public.dynamic_billing_usage add column if not exists period_end date;
alter table public.dynamic_billing_usage add column if not exists qr_scans integer not null default 0;
alter table public.dynamic_billing_usage add column if not exists loyalty_members integer not null default 0;
alter table public.dynamic_billing_usage add column if not exists loyalty_transactions integer not null default 0;
alter table public.dynamic_billing_usage add column if not exists review_events integer not null default 0;
alter table public.dynamic_billing_usage add column if not exists invoices_created integer not null default 0;
alter table public.dynamic_billing_usage add column if not exists automation_runs integer not null default 0;
alter table public.dynamic_billing_usage add column if not exists ai_messages integer not null default 0;
alter table public.dynamic_billing_usage add column if not exists active_tools integer not null default 0;
alter table public.dynamic_billing_usage add column if not exists calculated_addon_amount numeric(12,2) not null default 0;
alter table public.dynamic_billing_usage add column if not exists usage_breakdown jsonb not null default '{}'::jsonb;
alter table public.dynamic_billing_usage add column if not exists created_at timestamptz not null default now();

create unique index if not exists dynamic_billing_usage_customer_period_uidx
on public.dynamic_billing_usage (customer_id, period_start, period_end)
where period_start is not null and period_end is not null;

create table if not exists public.package_recommendations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.package_recommendations add column if not exists customer_id uuid;
alter table public.package_recommendations add column if not exists current_package text;
alter table public.package_recommendations add column if not exists recommended_package text not null default 'premium';
alter table public.package_recommendations add column if not exists reason text not null default '';
alter table public.package_recommendations add column if not exists recommendation_type text not null default 'upgrade';
alter table public.package_recommendations add column if not exists priority text not null default 'medium';
alter table public.package_recommendations add column if not exists estimated_revenue_uplift numeric(12,2) not null default 0;
alter table public.package_recommendations add column if not exists confidence_score integer not null default 50;
alter table public.package_recommendations add column if not exists source_metrics jsonb not null default '{}'::jsonb;
alter table public.package_recommendations add column if not exists status text not null default 'open';
alter table public.package_recommendations add column if not exists created_at timestamptz not null default now();
alter table public.package_recommendations add column if not exists resolved_at timestamptz;

create table if not exists public.revenue_share_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Revenue Share'
);

alter table public.revenue_share_rules add column if not exists applies_to_package text;
alter table public.revenue_share_rules add column if not exists customer_id uuid;
alter table public.revenue_share_rules add column if not exists partner_name text;
alter table public.revenue_share_rules add column if not exists partner_account_reference text;
alter table public.revenue_share_rules add column if not exists share_type text not null default 'percentage';
alter table public.revenue_share_rules add column if not exists share_value numeric(12,4) not null default 0;
alter table public.revenue_share_rules add column if not exists active boolean not null default true;
alter table public.revenue_share_rules add column if not exists stripe_connect_account_id text;
alter table public.revenue_share_rules add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.revenue_share_rules add column if not exists created_at timestamptz not null default now();

create table if not exists public.revenue_share_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid
);

alter table public.revenue_share_events add column if not exists customer_id uuid;
alter table public.revenue_share_events add column if not exists rule_id uuid;
alter table public.revenue_share_events add column if not exists source_type text not null default 'subscription';
alter table public.revenue_share_events add column if not exists source_id uuid;
alter table public.revenue_share_events add column if not exists gross_amount numeric(12,2) not null default 0;
alter table public.revenue_share_events add column if not exists share_amount numeric(12,2) not null default 0;
alter table public.revenue_share_events add column if not exists platform_amount numeric(12,2) not null default 0;
alter table public.revenue_share_events add column if not exists currency text not null default 'EUR';
alter table public.revenue_share_events add column if not exists status text not null default 'calculated';
alter table public.revenue_share_events add column if not exists stripe_transfer_id text;
alter table public.revenue_share_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.revenue_share_events add column if not exists created_at timestamptz not null default now();


-- ============================================================
-- 08B LEGACY NOT NULL SAFETY DEFAULTS
-- ------------------------------------------------------------
-- Einige alte V18/V20 Tabellen enthalten NOT NULL-Spalten, die der aktuelle
-- V28-Build nicht mehr direkt verwendet. Damit Inserts nicht an alten
-- Pflichtfeldern scheitern, bekommen bekannte Legacy-Spalten sichere Defaults.
-- Keine Datenlöschung, keine DROP TABLE.
-- ============================================================

do $$
declare
  r record;
  default_expr text;
begin
  for r in
    select table_name, column_name, data_type, udt_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'customers',
        'customer_subscriptions',
        'customer_tool_access',
        'customer_tool_usage',
        'package_features',
        'package_tools',
        'customer_timeline_events',
        'pipeline_leads',
        'appointments',
        'invoices',
        'tickets',
        'qr_campaigns',
        'loyalty_programs',
        'loyalty_customers',
        'loyalty_rewards',
        'loyalty_transactions',
        'staff_confirmation_codes',
        'loyalty_segments',
        'loyalty_tiers',
        'loyalty_point_rules',
        'loyalty_smart_actions',
        'review_feedback',
        'review_intelligence_profiles',
        'review_intelligence_items',
        'review_topic_dictionary',
        'review_response_templates',
        'customer_intelligence_scores',
        'customer_health_snapshots',
        'ai_business_assistant_messages',
        'smart_automation_rules',
        'smart_automation_runs',
        'marketing_automation_campaigns',
        'revenue_forecasts',
        'dynamic_billing_usage',
        'package_recommendations',
        'revenue_share_rules',
        'revenue_share_events',
        'security_audit_logs'
      )
      and is_nullable = 'NO'
      and column_default is null
      and is_generated = 'NEVER'
  loop
    if r.column_name = 'id' and r.udt_name = 'uuid' then
      default_expr := 'gen_random_uuid()';
    elsif r.udt_name = 'uuid' then
      default_expr := 'gen_random_uuid()';
    elsif r.data_type in ('text', 'character varying', 'character') then
      default_expr := quote_literal('Legacy');
    elsif r.data_type in ('integer', 'bigint', 'smallint') then
      default_expr := '0';
    elsif r.data_type in ('numeric', 'real', 'double precision') then
      default_expr := '0';
    elsif r.data_type = 'boolean' then
      default_expr := 'false';
    elsif r.data_type like 'timestamp%' then
      default_expr := 'now()';
    elsif r.data_type = 'date' then
      default_expr := 'current_date';
    elsif r.data_type = 'time without time zone' then
      default_expr := quote_literal('09:00');
    elsif r.udt_name = 'jsonb' then
      default_expr := quote_literal('{}') || '::jsonb';
    elsif r.udt_name = 'json' then
      default_expr := quote_literal('{}') || '::json';
    elsif r.data_type = 'ARRAY' then
      default_expr := quote_literal('{}');
    else
      default_expr := null;
    end if;

    if default_expr is not null then
      execute format(
        'alter table public.%I alter column %I set default %s',
        r.table_name,
        r.column_name,
        default_expr
      );
    end if;
  end loop;
end $$;

-- Appointment Legacy Null-Schutz
-- V6: typensicher, weil alte start_time-Spalten je nach Schema text oder timestamptz sein können.
alter table public.appointments alter column appointment_date set default current_date;
alter table public.appointments alter column appointment_time set default '09:00';
alter table public.appointments alter column client_name set default 'Demo Kunde – Café Morgenlicht';

update public.appointments
set
  appointment_date = coalesce(appointment_date, current_date),
  appointment_time = coalesce(appointment_time, '09:00'),
  client_name = coalesce(client_name, title, service_name, 'Demo Kunde – Café Morgenlicht')
where appointment_date is null
   or appointment_time is null
   or client_name is null;

-- ============================================================
-- 09 DEMO CUSTOMER / PACKAGE / TOOL SEEDS
-- ============================================================

insert into public.customers (
  id, name, title, email, phone, company, status, package_key, plan, is_demo,
  customer_lifetime_value, monthly_recurring_revenue, risk_score, upsell_score,
  package_usage_score, client_success_score, risk_level, upsell_level, health_level, metadata
)
values (
  '11111111-1111-1111-1111-111111111111',
  'Demo Kunde – Café Morgenlicht',
  'Demo Kunde – Café Morgenlicht',
  'demo-kunde@mmos.local',
  '+49 381 000000',
  'Café Morgenlicht GmbH',
  'active',
  'premium',
  'premium',
  true,
  4280.50,
  299.00,
  22,
  84,
  91,
  86,
  'low',
  'high',
  'green',
  '{"industry":"Gastronomie","city":"Rostock","demo_login":"kunde","admin_demo":true}'::jsonb
)
on conflict (id) do update set
  name=excluded.name,
  title=excluded.title,
  email=excluded.email,
  phone=excluded.phone,
  company=excluded.company,
  status=excluded.status,
  package_key=excluded.package_key,
  package_name=excluded.package_name,
  plan=excluded.plan,
  is_demo=true,
  customer_lifetime_value=excluded.customer_lifetime_value,
  monthly_recurring_revenue=excluded.monthly_recurring_revenue,
  risk_score=excluded.risk_score,
  upsell_score=excluded.upsell_score,
  package_usage_score=excluded.package_usage_score,
  client_success_score=excluded.client_success_score,
  risk_level=excluded.risk_level,
  upsell_level=excluded.upsell_level,
  health_level=excluded.health_level,
  metadata=excluded.metadata,
  updated_at=now();

update public.customer_subscriptions
set package_name = coalesce(package_name, package_key, plan, 'Starter')
where package_name is null;

-- Demo subscription upsert.
-- Legacy schemas may have unique(customer_id), therefore we update by customer_id first.
update public.customer_subscriptions
set
  id = coalesce(id, '12121212-1212-1212-1212-121212121212'),
  package_key = 'premium',
  package_name = 'Premium',
  plan = 'premium',
  provider = 'manual',
  billing_interval = 'month',
  status = 'active',
  amount_cents = 29900,
  amount = 299.00,
  monthly_price = 299.00,
  currency = 'EUR',
  usage_billing_enabled = true,
  revenue_share_enabled = true,
  recommended_package = 'premium_addon',
  forecasted_mrr = 299.00,
  metadata = '{"demo":true}'::jsonb,
  updated_at = now()
where customer_id = '11111111-1111-1111-1111-111111111111';

insert into public.customer_subscriptions (
  id, customer_id, package_key, package_name, plan, provider, billing_interval, status,
  amount_cents, amount, monthly_price, currency, usage_billing_enabled,
  revenue_share_enabled, recommended_package, forecasted_mrr, metadata
)
select
  '12121212-1212-1212-1212-121212121212',
  '11111111-1111-1111-1111-111111111111',
  'premium',
  'Premium',
  'premium',
  'manual',
  'month',
  'active',
  29900,
  299.00,
  299.00,
  'EUR',
  true,
  true,
  'premium_addon',
  299.00,
  '{"demo":true}'::jsonb
where not exists (
  select 1
  from public.customer_subscriptions
  where customer_id = '11111111-1111-1111-1111-111111111111'
);

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
on conflict (package_key, feature_key) do update set
  label=excluded.label,
  description=excluded.description,
  category=excluded.category,
  included=excluded.included,
  limit_value=excluded.limit_value,
  sort_order=excluded.sort_order,
  tooltip=excluded.tooltip,
  updated_at=now();

insert into public.package_tools (package_key, tool_key, label, description, enabled_by_default, visible_to_customer, sort_order)
values
('premium','crm','CRM Plus','Kundenverwaltung mit Timeline',true,true,10),
('premium','qr_campaigns','QR Kampagnen Plus','QR mit KPI und Loyalty',true,true,20),
('premium','loyalty','Loyalty Plus','Punkte, Rewards, Codes',true,true,30),
('premium','loyalty_segments','Advanced Loyalty Segmente','Zielgruppen und VIPs',true,true,31),
('premium','smart_loyalty_v2','Smart Loyalty V2','Dynamische Punkte',true,true,32),
('premium','reviews','Reviews Plus','Bewertungen',true,true,40),
('premium','review_intelligence','AI Review Intelligence','Sentiment und Themenanalyse',true,true,41),
('premium','marketing_automation','Marketing Automation','Kampagnen',true,true,50),
('premium','smart_automation','Smart Automation','Regeln und Runs',true,true,60),
('premium','ai_business_assistant','AI Assistant','Empfehlungen',true,true,70),
('premium','customer_health','Customer Health','Ampel und Risiko',true,true,80),
('premium','customer_intelligence','Customer Intelligence','Risiko, Upsell, Nutzung',true,true,81),
('premium','revenue_forecasting','Revenue Forecasting','Forecasts',true,true,90),
('premium','dynamic_billing','Dynamic Billing','Usage Billing',true,true,91),
('premium','booking','Booking','Termine',true,true,100),
('premium','invoices','Rechnungen','Rechnungen und PDFs',true,true,110)
on conflict (package_key, tool_key) do update set
  label=excluded.label,
  description=excluded.description,
  enabled_by_default=true,
  visible_to_customer=true,
  sort_order=excluded.sort_order,
  updated_at=now();

insert into public.customer_tool_access (customer_id, tool_key, enabled, visible_to_customer, metadata)
select '11111111-1111-1111-1111-111111111111', tool_key, true, true, '{}'::jsonb
from (values
('crm'),('qr_campaigns'),('loyalty'),('loyalty_segments'),('smart_loyalty_v2'),('reviews'),
('review_intelligence'),('marketing_automation'),('smart_automation'),('ai_business_assistant'),
('customer_health'),('customer_intelligence'),('revenue_forecasting'),('dynamic_billing'),
('booking'),('invoices')
) as t(tool_key)
on conflict (customer_id, tool_key) do update set
  enabled=true,
  visible_to_customer=true,
  metadata=excluded.metadata,
  updated_at=now();

insert into public.customer_tool_usage (customer_id, tool_key, usage_count, last_used_at, metadata)
select '11111111-1111-1111-1111-111111111111', tool_key, usage_count, now() - (days || ' days')::interval, '{}'::jsonb
from (values
('qr_campaigns',42,1),('loyalty',67,1),('review_intelligence',18,2),('marketing_automation',9,3),
('revenue_forecasting',11,1),('dynamic_billing',6,4),('booking',24,2),('invoices',13,3),
('customer_intelligence',17,1),('ai_business_assistant',21,1)
) as t(tool_key, usage_count, days)
on conflict (customer_id, tool_key) do update set
  usage_count=excluded.usage_count,
  last_used_at=excluded.last_used_at,
  metadata=excluded.metadata;

-- ============================================================
-- 10 DEMO QR / LOYALTY SEEDS
-- ============================================================

insert into public.qr_campaigns (
  id, customer_id, title, name, slug, target_url, scans, conversions, active, status, metadata
)
values
(
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Frühstücks-Loyalty QR',
  'Frühstücks-Loyalty QR',
  'demo-cafe-morgenlicht',
  '/l/demo-cafe-morgenlicht',
  186,
  54,
  true,
  'Aktiv',
  '{"channel":"Tischaufsteller","status":"Top Performer"}'::jsonb
),
(
  '22222222-2222-2222-2222-222222222223',
  '11111111-1111-1111-1111-111111111111',
  'Google Review QR',
  'Google Review QR',
  'demo-review-morgenlicht',
  '/l/demo-cafe-morgenlicht?review=1',
  94,
  31,
  true,
  'Aktiv',
  '{"channel":"Kassenaufsteller","status":"Review Funnel"}'::jsonb
)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  title=excluded.title,
  name=excluded.name,
  slug=excluded.slug,
  target_url=excluded.target_url,
  scans=excluded.scans,
  conversions=excluded.conversions,
  active=excluded.active,
  status=excluded.status,
  metadata=excluded.metadata,
  updated_at=now();

insert into public.loyalty_programs (
  id, customer_id, qr_campaign_id, title, name, slug, points_per_scan, active, require_staff_code, branding, metadata
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
  true,
  '{"primary":"#7c3aed","logoText":"Café Morgenlicht","theme":"dark-premium"}'::jsonb,
  '{"demo":true,"description":"Aktuelle Demo mit VIP-Leveln, Rewards und Segmenten"}'::jsonb
)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  qr_campaign_id=excluded.qr_campaign_id,
  title=excluded.title,
  name=excluded.name,
  slug=excluded.slug,
  points_per_scan=excluded.points_per_scan,
  active=true,
  require_staff_code=true,
  branding=excluded.branding,
  metadata=excluded.metadata,
  updated_at=now();

insert into public.loyalty_rewards (
  id, customer_id, loyalty_program_id, title, name, description, reward_type, points_required, active, require_staff_confirmation, metadata
)
values
('44444444-4444-4444-4444-444444444401','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','Gratis Cappuccino','Gratis Cappuccino','Ein Cappuccino aufs Haus ab 100 Punkten.','free_product',100,true,true,'{"category":"coffee"}'::jsonb),
('44444444-4444-4444-4444-444444444402','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','10% Frühstücksrabatt','10% Frühstücksrabatt','10% Rabatt auf ein Frühstücksmenü.','discount',180,true,true,'{"discount_percent":10}'::jsonb),
('44444444-4444-4444-4444-444444444403','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','VIP Kuchenstück','VIP Kuchenstück','Exklusiver VIP Reward für Stammkunden.','vip_reward',350,true,true,'{"vip_only":true}'::jsonb)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  loyalty_program_id=excluded.loyalty_program_id,
  title=excluded.title,
  name=excluded.name,
  description=excluded.description,
  reward_type=excluded.reward_type,
  points_required=excluded.points_required,
  active=true,
  require_staff_confirmation=true,
  metadata=excluded.metadata,
  updated_at=now();

insert into public.staff_confirmation_codes (
  id, customer_id, loyalty_program_id, code_label, code_hash, active, max_uses, used_count, metadata
)
values (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'Demo Thekencode',
  'demo-hash-2468',
  true,
  null,
  3,
  '{"demo_plain_code":"2468","note":"Nur Demo"}'::jsonb
)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  loyalty_program_id=excluded.loyalty_program_id,
  code_label=excluded.code_label,
  code_hash=excluded.code_hash,
  active=true,
  max_uses=excluded.max_uses,
  used_count=excluded.used_count,
  metadata=excluded.metadata;

insert into public.loyalty_customers (
  id, customer_id, loyalty_program_id, email, member_token, device_id, display_name,
  points_balance, total_points, current_tier, total_scans, total_reviews, last_seen_at, last_activity_at, segment_summary
)
values
('66666666-6666-6666-6666-666666666601','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','anna.demo@example.com','demo-member-anna','device-anna','Anna Stammkundin',420,920,'gold',14,2,now() - interval '1 day',now() - interval '1 day','[{"key":"vip","name":"VIP Kunden"},{"key":"reward_ready","name":"Reward-bereit"}]'::jsonb),
('66666666-6666-6666-6666-666666666602','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','max.demo@example.com','demo-member-max','device-max','Max Reviewfan',160,310,'silver',6,3,now() - interval '3 days',now() - interval '3 days','[{"key":"review_active","name":"Bewertungsaktive Endkunden"},{"key":"reward_ready","name":"Reward-bereit"}]'::jsonb),
('66666666-6666-6666-6666-666666666603','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','lisa.demo@example.com','demo-member-lisa','device-lisa','Lisa Inaktiv',80,120,'basic',2,0,now() - interval '45 days',now() - interval '45 days','[{"key":"inactive","name":"Inaktive Endkunden"}]'::jsonb)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  loyalty_program_id=excluded.loyalty_program_id,
  email=excluded.email,
  member_token=excluded.member_token,
  device_id=excluded.device_id,
  display_name=excluded.display_name,
  points_balance=excluded.points_balance,
  total_points=excluded.total_points,
  current_tier=excluded.current_tier,
  total_scans=excluded.total_scans,
  total_reviews=excluded.total_reviews,
  last_seen_at=excluded.last_seen_at,
  last_activity_at=excluded.last_activity_at,
  segment_summary=excluded.segment_summary;

insert into public.loyalty_transactions (
  id, customer_id, loyalty_program_id, loyalty_customer_id, qr_campaign_id, reward_id, action, points, description, metadata, created_at
)
values
('77777777-7777-7777-7777-777777777701','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','66666666-6666-6666-6666-666666666601','22222222-2222-2222-2222-222222222222',null,'qr_scan',10,'QR Scan Frühstücksaktion','{}'::jsonb,now()-interval '1 day'),
('77777777-7777-7777-7777-777777777702','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','66666666-6666-6666-6666-666666666601','22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444401','reward_redeemed',-100,'Gratis Cappuccino eingelöst','{"staff_code":"confirmed"}'::jsonb,now()-interval '2 days'),
('77777777-7777-7777-7777-777777777703','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','66666666-6666-6666-6666-666666666602','22222222-2222-2222-2222-222222222222',null,'review_bonus',30,'Bonus für Bewertung','{}'::jsonb,now()-interval '3 days')
on conflict (id) do update set
  customer_id=excluded.customer_id,
  loyalty_program_id=excluded.loyalty_program_id,
  loyalty_customer_id=excluded.loyalty_customer_id,
  qr_campaign_id=excluded.qr_campaign_id,
  reward_id=excluded.reward_id,
  action=excluded.action,
  points=excluded.points,
  description=excluded.description,
  metadata=excluded.metadata,
  created_at=excluded.created_at;

insert into public.loyalty_segments (
  id, customer_id, loyalty_program_id, name, segment_key, description, rule_config, member_count, active, color
)
values
('88888888-8888-8888-8888-888888888801','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','VIP Kunden','vip','Sehr aktive Endkunden mit hohem Punktestand.','{"min_points":500}'::jsonb,1,true,'#22c55e'),
('88888888-8888-8888-8888-888888888802','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','Inaktive Endkunden','inactive','Keine Aktivität seit 30 Tagen.','{"inactive_days":30}'::jsonb,1,true,'#f59e0b'),
('88888888-8888-8888-8888-888888888803','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','Reward-bereit','reward_ready','Mindestens 100 Punkte.','{"min_points":100}'::jsonb,2,true,'#7c3aed'),
('88888888-8888-8888-8888-888888888804','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','Review-Aktiv','review_active','Mindestens eine Bewertung.','{"min_reviews":1}'::jsonb,1,true,'#0ea5e9')
on conflict (id) do update set
  customer_id=excluded.customer_id,
  loyalty_program_id=excluded.loyalty_program_id,
  name=excluded.name,
  segment_key=excluded.segment_key,
  description=excluded.description,
  rule_config=excluded.rule_config,
  member_count=excluded.member_count,
  active=true,
  color=excluded.color,
  updated_at=now();

insert into public.loyalty_tiers (
  id, customer_id, loyalty_program_id, tier_key, name, description, min_points, min_scans, min_reviews, multiplier, benefits, active, sort_order
)
values
('89898989-8989-8989-8989-898989898901','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','basic','Basic','Einstiegslevel',0,0,0,1.00,'["Standardpunkte"]'::jsonb,true,1),
('89898989-8989-8989-8989-898989898902','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','silver','Silver','Aktive Kunden',250,3,0,1.10,'["10% Punktebonus"]'::jsonb,true,2),
('89898989-8989-8989-8989-898989898903','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','gold','Gold','Stammkunden',500,8,1,1.25,'["25% Punktebonus","Exklusive Rewards"]'::jsonb,true,3),
('89898989-8989-8989-8989-898989898904','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','vip','VIP','Top Kunden',1000,15,2,1.50,'["50% Punktebonus","VIP Rewards"]'::jsonb,true,4)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  loyalty_program_id=excluded.loyalty_program_id,
  tier_key=excluded.tier_key,
  name=excluded.name,
  description=excluded.description,
  min_points=excluded.min_points,
  min_scans=excluded.min_scans,
  min_reviews=excluded.min_reviews,
  multiplier=excluded.multiplier,
  benefits=excluded.benefits,
  active=true,
  sort_order=excluded.sort_order;

insert into public.loyalty_point_rules (
  id, customer_id, loyalty_program_id, qr_campaign_id, name, rule_type, trigger_key, points_delta, multiplier, condition_config, active, priority
)
values
('99999999-9999-9999-9999-999999999901','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','Doppelte Punkte am Vormittag','bonus','qr_scan',0,2.00,'{"hours":[8,9,10,11]}'::jsonb,true,10),
('99999999-9999-9999-9999-999999999902','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333',null,'VIP Bonus','bonus','qr_scan',25,1.00,'{"segment_key":"vip"}'::jsonb,true,20)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  loyalty_program_id=excluded.loyalty_program_id,
  qr_campaign_id=excluded.qr_campaign_id,
  name=excluded.name,
  rule_type=excluded.rule_type,
  trigger_key=excluded.trigger_key,
  multiplier=excluded.multiplier,
  points_delta=excluded.points_delta,
  condition_config=excluded.condition_config,
  active=true,
  priority=excluded.priority;

-- ============================================================
-- 11 DEMO REVIEWS / REVIEW INTELLIGENCE
-- ============================================================

insert into public.review_topic_dictionary (topic_key, label, topic_type, keywords, severity_weight, active)
values
('wait_time','Wartezeit','negative',array['wartezeit','gewartet','lange warten','zu langsam','verspätung','dauerte lange'],3,true),
('service_negative','Schlechter Service','negative',array['unfreundlich','schlechter service','ignoriert','arrogant','nicht geholfen'],4,true),
('price_negative','Preis Kritik','negative',array['zu teuer','preis','überteuert','abzocke','kosten'],2,true),
('quality_negative','Qualitätsproblem','negative',array['schlecht','kalt','kaputt','fehlerhaft','ungenießbar','mangelhaft'],4,true),
('cleanliness','Sauberkeit','negative',array['dreckig','schmutzig','unsauber','hygiene','klebrig'],4,true),
('service_positive','Guter Service','positive',array['freundlich','netter service','aufmerksam','hilfsbereit','kompetent'],2,true),
('quality_positive','Gute Qualität','positive',array['lecker','gut','toll','perfekt','hochwertig','super'],2,true),
('speed_positive','Schnelligkeit','positive',array['schnell','zügig','kurze wartezeit','sofort'],1,true),
('atmosphere_positive','Atmosphäre','positive',array['gemütlich','atmosphäre','ambiente','wohlgefühlt','schön'],1,true)
on conflict (topic_key) do update set
  label=excluded.label,
  topic_type=excluded.topic_type,
  keywords=excluded.keywords,
  severity_weight=excluded.severity_weight,
  active=true;

insert into public.review_response_templates (id, customer_id, template_key, label, sentiment, body, active)
values
('13131313-1313-1313-1313-131313131301',null,'positive_default','Positive Bewertung bedanken','positive','Vielen Dank für das tolle Feedback! Wir freuen uns sehr, dass Sie zufrieden waren.',true),
('13131313-1313-1313-1313-131313131302',null,'negative_default','Negative Bewertung entschärfen','negative','Vielen Dank für Ihr ehrliches Feedback. Es tut uns leid, dass Ihre Erfahrung nicht wie erwartet war. Wir prüfen den Vorgang intern und möchten uns verbessern.',true),
('13131313-1313-1313-1313-131313131303',null,'neutral_default','Neutrale Bewertung beantworten','neutral','Vielen Dank für Ihr Feedback. Wir nehmen Ihre Rückmeldung ernst und arbeiten stetig daran, besser zu werden.',true)
on conflict (id) do update set
  template_key=excluded.template_key,
  label=excluded.label,
  sentiment=excluded.sentiment,
  body=excluded.body,
  active=true;

insert into public.review_feedback (
  id, customer_id, loyalty_customer_id, qr_campaign_id, rating, feedback_text, comment,
  reviewer_name, reviewer_email, source, status, intelligence_status, sentiment,
  detected_topics, suggested_response, created_at
)
values
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','11111111-1111-1111-1111-111111111111','66666666-6666-6666-6666-666666666601','22222222-2222-2222-2222-222222222223',5,'Super freundlicher Service und der Cappuccino war perfekt.','Super freundlicher Service und der Cappuccino war perfekt.','Anna','anna.demo@example.com','qr_review','new','analyzed','positive','[{"topic_key":"service_positive","label":"Guter Service"},{"topic_key":"quality_positive","label":"Gute Qualität"}]'::jsonb,'Vielen Dank für das tolle Feedback! Wir freuen uns sehr.',now()-interval '2 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','11111111-1111-1111-1111-111111111111','66666666-6666-6666-6666-666666666602','22222222-2222-2222-2222-222222222223',4,'Lecker und gemütlich, Wartezeit war aber etwas lang.','Lecker und gemütlich, Wartezeit war aber etwas lang.','Max','max.demo@example.com','qr_review','new','analyzed','neutral','[{"topic_key":"quality_positive","label":"Gute Qualität"},{"topic_key":"wait_time","label":"Wartezeit"}]'::jsonb,'Vielen Dank für Ihre Rückmeldung. Wir nehmen den Hinweis zur Wartezeit ernst.',now()-interval '5 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','11111111-1111-1111-1111-111111111111',null,'22222222-2222-2222-2222-222222222223',2,'Leider sehr lange gewartet und der Tisch war nicht sauber.','Leider sehr lange gewartet und der Tisch war nicht sauber.','Gast','gast.demo@example.com','qr_review','new','analyzed','negative','[{"topic_key":"wait_time","label":"Wartezeit"},{"topic_key":"cleanliness","label":"Sauberkeit"}]'::jsonb,'Vielen Dank für Ihr ehrliches Feedback. Es tut uns leid – wir prüfen das intern.',now()-interval '8 days')
on conflict (id) do update set
  customer_id=excluded.customer_id,
  loyalty_customer_id=excluded.loyalty_customer_id,
  qr_campaign_id=excluded.qr_campaign_id,
  rating=excluded.rating,
  feedback_text=excluded.feedback_text,
  comment=excluded.comment,
  reviewer_name=excluded.reviewer_name,
  reviewer_email=excluded.reviewer_email,
  source=excluded.source,
  status=excluded.status,
  intelligence_status=excluded.intelligence_status,
  sentiment=excluded.sentiment,
  detected_topics=excluded.detected_topics,
  suggested_response=excluded.suggested_response,
  created_at=excluded.created_at;

insert into public.review_intelligence_items (
  id, customer_id, review_feedback_id, rating, sentiment, sentiment_score,
  detected_topics, issue_tags, praise_tags, summary, suggested_response, escalation_required, metadata
)
values
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1','11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',5,'positive',82,'[{"topic_key":"service_positive","label":"Guter Service"},{"topic_key":"quality_positive","label":"Gute Qualität"}]'::jsonb,'[]'::jsonb,'[{"topic_key":"service_positive","label":"Guter Service"},{"topic_key":"quality_positive","label":"Gute Qualität"}]'::jsonb,'Positive Bewertung mit 5 Sternen zu Service und Qualität.','Vielen Dank für das tolle Feedback! Wir freuen uns sehr.',false,'{}'::jsonb),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2','11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',4,'neutral',18,'[{"topic_key":"quality_positive","label":"Gute Qualität"},{"topic_key":"wait_time","label":"Wartezeit"}]'::jsonb,'[{"topic_key":"wait_time","label":"Wartezeit"}]'::jsonb,'[{"topic_key":"quality_positive","label":"Gute Qualität"}]'::jsonb,'Neutrale Bewertung mit Lob und Wartezeit-Hinweis.','Vielen Dank für die Rückmeldung.',false,'{}'::jsonb),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3','11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',2,'negative',-61,'[{"topic_key":"wait_time","label":"Wartezeit"},{"topic_key":"cleanliness","label":"Sauberkeit"}]'::jsonb,'[{"topic_key":"wait_time","label":"Wartezeit"},{"topic_key":"cleanliness","label":"Sauberkeit"}]'::jsonb,'[]'::jsonb,'Kritische Bewertung mit Wartezeit und Sauberkeit.','Vielen Dank für Ihr ehrliches Feedback. Wir prüfen das intern.',true,'{}'::jsonb)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  review_feedback_id=excluded.review_feedback_id,
  rating=excluded.rating,
  sentiment=excluded.sentiment,
  sentiment_score=excluded.sentiment_score,
  detected_topics=excluded.detected_topics,
  issue_tags=excluded.issue_tags,
  praise_tags=excluded.praise_tags,
  summary=excluded.summary,
  suggested_response=excluded.suggested_response,
  escalation_required=excluded.escalation_required,
  metadata=excluded.metadata;

insert into public.review_intelligence_profiles (
  customer_id, total_reviews, avg_rating, sentiment_score, positive_count, neutral_count, negative_count,
  top_positive_topics, top_negative_topics, recurring_issues, recurring_praises,
  recommended_actions, metrics, calculated_at
)
values (
'11111111-1111-1111-1111-111111111111',3,3.67,13,1,1,1,
'[{"topic_key":"quality_positive","label":"Gute Qualität","count":2},{"topic_key":"service_positive","label":"Guter Service","count":1}]'::jsonb,
'[{"topic_key":"wait_time","label":"Wartezeit","count":2},{"topic_key":"cleanliness","label":"Sauberkeit","count":1}]'::jsonb,
'[{"topic_key":"wait_time","label":"Wartezeit","count":2}]'::jsonb,
'[{"topic_key":"quality_positive","label":"Gute Qualität","count":2}]'::jsonb,
'[{"type":"recovery","text":"Kritische Bewertungen zeitnah beantworten."},{"type":"topic","text":"Häufiges Problem: Wartezeit."},{"type":"marketing","text":"Lob zur Qualität im Marketing nutzen."}]'::jsonb,
'{"demo":true}'::jsonb,
now()
)
on conflict (customer_id) do update set
  total_reviews=excluded.total_reviews,
  avg_rating=excluded.avg_rating,
  sentiment_score=excluded.sentiment_score,
  positive_count=excluded.positive_count,
  neutral_count=excluded.neutral_count,
  negative_count=excluded.negative_count,
  top_positive_topics=excluded.top_positive_topics,
  top_negative_topics=excluded.top_negative_topics,
  recurring_issues=excluded.recurring_issues,
  recurring_praises=excluded.recurring_praises,
  recommended_actions=excluded.recommended_actions,
  metrics=excluded.metrics,
  calculated_at=now();

-- ============================================================
-- 12 DEMO BOOKING / INVOICES / PIPELINE
-- ============================================================

update public.appointments
set
  client_name = coalesce(client_name, title, service_name, 'Demo Kunde – Café Morgenlicht'),
  appointment_date = coalesce(appointment_date, current_date),
  appointment_time = coalesce(appointment_time, '09:00')
where client_name is null
   or appointment_date is null
   or appointment_time is null;

insert into public.appointments (
  id, customer_id, title, client_name, client_email, client_phone, appointment_date, appointment_time, duration_minutes, service_category_name, service_name, price, start_time, end_time, status, is_demo, metadata
)
values
('cccccccc-cccc-cccc-cccc-ccccccccccc1','11111111-1111-1111-1111-111111111111','Social Media Shooting','Demo Kunde – Café Morgenlicht','demo-kunde@mmos.local','+49 381 000000',(now()+interval '2 days')::date,'11:00',120,'Content Paket','Social Media Shooting',249.00,now()+interval '2 days',now()+interval '2 days 2 hours','confirmed',true,'{"source":"demo"}'::jsonb),
('cccccccc-cccc-cccc-cccc-ccccccccccc2','11111111-1111-1111-1111-111111111111','QR Kampagnen Setup','Demo Kunde – Café Morgenlicht','demo-kunde@mmos.local','+49 381 000000',(now()+interval '5 days')::date,'11:00',60,'Marketing Setup','QR Kampagnen Setup',399.00,now()+interval '5 days',now()+interval '5 days 1 hour','confirmed',true,'{"source":"demo"}'::jsonb)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  title=excluded.title,
  client_name=excluded.client_name,
  client_email=excluded.client_email,
  client_phone=excluded.client_phone,
  appointment_date=excluded.appointment_date,
  appointment_time=excluded.appointment_time,
  duration_minutes=excluded.duration_minutes,
  service_category_name=excluded.service_category_name,
  service_name=excluded.service_name,
  price=excluded.price,
  start_time=excluded.start_time,
  end_time=excluded.end_time,
  status=excluded.status,
  is_demo=excluded.is_demo,
  metadata=excluded.metadata;

insert into public.invoices (
  id, customer_id, invoice_number, service_type, amount, total, status, pdf_url, pdf_base64, metadata, created_at
)
values
('dddddddd-dddd-dddd-dddd-ddddddddddd1','11111111-1111-1111-1111-111111111111','RE-DEMO-1001','Premium Lizenz Mai',299.00,299.00,'Bezahlt','data:application/pdf;base64,JVBERi0xLjQKJURlbW8K','JVBERi0xLjQKJURlbW8K','{"demo":true}'::jsonb,now()-interval '12 days'),
('dddddddd-dddd-dddd-dddd-ddddddddddd2','11111111-1111-1111-1111-111111111111','RE-DEMO-1002','QR & Loyalty Setup',499.00,499.00,'Offen','data:application/pdf;base64,JVBERi0xLjQKJURlbW8K','JVBERi0xLjQKJURlbW8K','{"demo":true}'::jsonb,now()-interval '3 days')
on conflict (id) do update set
  customer_id=excluded.customer_id,
  invoice_number=excluded.invoice_number,
  service_type=excluded.service_type,
  amount=excluded.amount,
  total=excluded.total,
  status=excluded.status,
  pdf_url=excluded.pdf_url,
  pdf_base64=excluded.pdf_base64,
  metadata=excluded.metadata,
  created_at=excluded.created_at;

insert into public.pipeline_leads (
  id, customer_id, title, source, stage, value, probability, metadata
)
values
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1','11111111-1111-1111-1111-111111111111','Upgrade: Premium Kampagnenpaket','smart_automation','qualified',799.00,72,'{"reason":"starke QR Performance"}'::jsonb),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2','11111111-1111-1111-1111-111111111111','Zusatzstandort Innenstadt','manual','proposal',1299.00,48,'{"reason":"Expansion"}'::jsonb)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  title=excluded.title,
  source=excluded.source,
  stage=excluded.stage,
  value=excluded.value,
  probability=excluded.probability,
  metadata=excluded.metadata,
  updated_at=now();

-- ============================================================
-- 13 DEMO INTELLIGENCE / HEALTH / AI / AUTOMATION / REVENUE
-- ============================================================

insert into public.customer_intelligence_scores (
  customer_id, customer_lifetime_value, monthly_recurring_revenue, risk_score, upsell_score,
  package_usage_score, loyalty_engagement_score, review_health_score, client_success_score,
  risk_level, upsell_level, recommendations, metrics, calculated_at
)
values (
'11111111-1111-1111-1111-111111111111',4280.50,299.00,22,84,91,78,73,86,'low','high',
'[{"type":"upsell","title":"Hohe Upsell-Chance","text":"QR und Loyalty werden stark genutzt."},{"type":"review","title":"Wartezeit prüfen","text":"Review Intelligence erkennt wiederkehrende Wartezeitkritik."}]'::jsonb,
'{"qrScans":280,"loyaltyParticipants":3,"reviews":3,"openTickets":1,"usedTools":10,"enabledTools":16}'::jsonb,
now()
)
on conflict (customer_id) do update set
  customer_lifetime_value=excluded.customer_lifetime_value,
  monthly_recurring_revenue=excluded.monthly_recurring_revenue,
  risk_score=excluded.risk_score,
  upsell_score=excluded.upsell_score,
  package_usage_score=excluded.package_usage_score,
  loyalty_engagement_score=excluded.loyalty_engagement_score,
  review_health_score=excluded.review_health_score,
  client_success_score=excluded.client_success_score,
  risk_level=excluded.risk_level,
  upsell_level=excluded.upsell_level,
  recommendations=excluded.recommendations,
  metrics=excluded.metrics,
  calculated_at=now();

insert into public.customer_health_snapshots (
  customer_id, health_score, health_level, revenue_health, usage_health, review_health,
  loyalty_health, support_health, qr_health, warnings, opportunities, metrics, calculated_at
)
values (
'11111111-1111-1111-1111-111111111111',86,'green',82,91,73,78,88,94,
'[{"type":"reviews","text":"Wartezeit wird wiederholt erwähnt."}]'::jsonb,
'[{"type":"upsell","text":"Premium Kampagnenpaket anbieten."},{"type":"qr","text":"QR-Kampagne performt überdurchschnittlich."}]'::jsonb,
'{"demo":true}'::jsonb,now()
)
on conflict (customer_id) do update set
  health_score=excluded.health_score,
  health_level=excluded.health_level,
  revenue_health=excluded.revenue_health,
  usage_health=excluded.usage_health,
  review_health=excluded.review_health,
  loyalty_health=excluded.loyalty_health,
  support_health=excluded.support_health,
  qr_health=excluded.qr_health,
  warnings=excluded.warnings,
  opportunities=excluded.opportunities,
  metrics=excluded.metrics,
  calculated_at=now();

insert into public.ai_business_assistant_messages (
  id, customer_id, title, message, recommendation_type, severity, source_modules, status, metadata, created_at
)
values
('ffffffff-ffff-ffff-ffff-fffffffffff1','11111111-1111-1111-1111-111111111111','Hohe Upsell-Chance erkannt','QR, Loyalty und Toolnutzung liegen deutlich über Premium-Schwelle. Zusatzkampagne anbieten.','upsell','success',array['qr','loyalty','customer_intelligence'],'open','{"demo":true}'::jsonb,now()-interval '1 day'),
('ffffffff-ffff-ffff-ffff-fffffffffff2','11111111-1111-1111-1111-111111111111','Review-Thema Wartezeit prüfen','Review Intelligence erkennt Wartezeit als wiederkehrendes Thema.','review_intelligence','warning',array['reviews','review_intelligence'],'open','{"demo":true}'::jsonb,now()-interval '2 days'),
('ffffffff-ffff-ffff-ffff-fffffffffff3','11111111-1111-1111-1111-111111111111','Paketnutzung sehr gut','Der Kunde nutzt 10 von 16 freigeschalteten Tools aktiv.','adoption','info',array['packages','tool_usage'],'open','{"demo":true}'::jsonb,now()-interval '3 days')
on conflict (id) do update set
  customer_id=excluded.customer_id,
  title=excluded.title,
  message=excluded.message,
  recommendation_type=excluded.recommendation_type,
  severity=excluded.severity,
  source_modules=excluded.source_modules,
  status=excluded.status,
  metadata=excluded.metadata,
  created_at=excluded.created_at;

insert into public.smart_automation_rules (
  id, customer_id, name, description, trigger_key, condition_config, action_config, active, scope, run_count, last_run_at, created_by
)
values
('abababab-abab-abab-abab-ababababab01','11111111-1111-1111-1111-111111111111','Negatives Review → Ticket','Kritische Bewertung erzeugt Ticket und AI-Hinweis.','review.negative','{"rating_lte":3}'::jsonb,'{"create_ticket":true,"assistant":true}'::jsonb,true,'customer',2,now()-interval '2 days','Demo'),
('abababab-abab-abab-abab-ababababab02','11111111-1111-1111-1111-111111111111','Starke QR Kampagne → Upsell','Bei hoher QR Performance wird Pipeline-Lead erzeugt.','qr.performance_high','{"min_scans":100}'::jsonb,'{"create_pipeline_lead":true}'::jsonb,true,'customer',1,now()-interval '1 day','Demo')
on conflict (id) do update set
  customer_id=excluded.customer_id,
  name=excluded.name,
  description=excluded.description,
  trigger_key=excluded.trigger_key,
  condition_config=excluded.condition_config,
  action_config=excluded.action_config,
  active=true,
  scope=excluded.scope,
  run_count=excluded.run_count,
  last_run_at=excluded.last_run_at,
  updated_at=now();

insert into public.smart_automation_runs (
  id, rule_id, customer_id, trigger_key, status, actions_executed, result, created_at
)
values
('acacacac-acac-acac-acac-acacacacac01','abababab-abab-abab-abab-ababababab01','11111111-1111-1111-1111-111111111111','review.negative','executed','[{"type":"ticket"},{"type":"assistant_message"}]'::jsonb,'{"matched":true}'::jsonb,now()-interval '2 days'),
('acacacac-acac-acac-acac-acacacacac02','abababab-abab-abab-abab-ababababab02','11111111-1111-1111-1111-111111111111','qr.performance_high','executed','[{"type":"pipeline_lead"}]'::jsonb,'{"matched":true}'::jsonb,now()-interval '1 day')
on conflict (id) do update set
  rule_id=excluded.rule_id,
  customer_id=excluded.customer_id,
  trigger_key=excluded.trigger_key,
  status=excluded.status,
  actions_executed=excluded.actions_executed,
  result=excluded.result,
  created_at=excluded.created_at;

insert into public.marketing_automation_campaigns (
  id, customer_id, name, campaign_type, status, audience_config, trigger_config, message_config,
  linked_qr_campaign_id, linked_loyalty_program_id, linked_reward_id
)
values
('adadadad-adad-adad-adad-adadadadad01','11111111-1111-1111-1111-111111111111','Inaktive Gäste zurückholen','reactivation','draft','{"segment_key":"inactive","member_count":1}'::jsonb,'{"trigger":"inactive_30_days"}'::jsonb,'{"subject":"Wir vermissen dich","body":"Komm zurück und sichere dir doppelte Punkte."}'::jsonb,'22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444402'),
('adadadad-adad-adad-adad-adadadadad02','11111111-1111-1111-1111-111111111111','Review Booster','review_request','ready','{"segment_key":"review_active"}'::jsonb,'{"trigger":"after_visit"}'::jsonb,'{"subject":"Wie war dein Besuch?","body":"Bewerte uns und erhalte Bonuspunkte."}'::jsonb,'22222222-2222-2222-2222-222222222223','33333333-3333-3333-3333-333333333333',null)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  name=excluded.name,
  campaign_type=excluded.campaign_type,
  status=excluded.status,
  audience_config=excluded.audience_config,
  trigger_config=excluded.trigger_config,
  message_config=excluded.message_config,
  linked_qr_campaign_id=excluded.linked_qr_campaign_id,
  linked_loyalty_program_id=excluded.linked_loyalty_program_id,
  linked_reward_id=excluded.linked_reward_id,
  updated_at=now();

insert into public.revenue_forecasts (
  id, customer_id, forecast_period, period_start, period_end, expected_revenue, expected_mrr,
  expected_new_revenue, expected_churn_risk_value, pipeline_weighted_value,
  confidence_score, forecast_level, drivers, metrics
)
values (
'aeaeaeae-aeae-aeae-aeae-aeaeaeaeae01','11111111-1111-1111-1111-111111111111','monthly',
date_trunc('month',now())::date,
(date_trunc('month',now()) + interval '1 month - 1 day')::date,
1442.28,299.00,1080.00,65.78,1198.08,82,'high',
'[{"type":"pipeline","text":"Gewichtete Pipeline: 1198,08 EUR"},{"type":"upsell","text":"Hohe Upgrade-Wahrscheinlichkeit erkannt."},{"type":"qr","text":"QR-Aktivität unterstützt Upsell-Potenzial."}]'::jsonb,
'{"demo":true}'::jsonb
)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  forecast_period=excluded.forecast_period,
  period_start=excluded.period_start,
  period_end=excluded.period_end,
  expected_revenue=excluded.expected_revenue,
  expected_mrr=excluded.expected_mrr,
  expected_new_revenue=excluded.expected_new_revenue,
  expected_churn_risk_value=excluded.expected_churn_risk_value,
  pipeline_weighted_value=excluded.pipeline_weighted_value,
  confidence_score=excluded.confidence_score,
  forecast_level=excluded.forecast_level,
  drivers=excluded.drivers,
  metrics=excluded.metrics;

insert into public.dynamic_billing_usage (
  id, customer_id, period_start, period_end, qr_scans, loyalty_members, loyalty_transactions,
  review_events, invoices_created, automation_runs, ai_messages, active_tools,
  calculated_addon_amount, usage_breakdown
)
values (
'afafafaf-afaf-afaf-afaf-afafafafaf01','11111111-1111-1111-1111-111111111111',
date_trunc('month',now())::date,
(date_trunc('month',now()) + interval '1 month - 1 day')::date,
280,3,3,3,2,2,3,10,7.31,
'{"qr_scans":{"quantity":280,"unit_price":0.01,"amount":2.8},"loyalty_members":{"quantity":3,"unit_price":0.1,"amount":0.3},"review_events":{"quantity":3,"unit_price":0.05,"amount":0.15},"automation_runs":{"quantity":2,"unit_price":0.03,"amount":0.06},"ai_messages":{"quantity":3,"unit_price":0.02,"amount":0.06},"premium_demo_flat":{"quantity":1,"unit_price":3.94,"amount":3.94}}'::jsonb
)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  period_start=excluded.period_start,
  period_end=excluded.period_end,
  qr_scans=excluded.qr_scans,
  loyalty_members=excluded.loyalty_members,
  loyalty_transactions=excluded.loyalty_transactions,
  review_events=excluded.review_events,
  invoices_created=excluded.invoices_created,
  automation_runs=excluded.automation_runs,
  ai_messages=excluded.ai_messages,
  active_tools=excluded.active_tools,
  calculated_addon_amount=excluded.calculated_addon_amount,
  usage_breakdown=excluded.usage_breakdown;

insert into public.package_recommendations (
  id, customer_id, current_package, recommended_package, reason, recommendation_type,
  priority, estimated_revenue_uplift, confidence_score, source_metrics, status
)
values
('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b001','11111111-1111-1111-1111-111111111111','premium','premium_addon','Premium Add-on Kampagnenpaket wegen hoher QR- und Loyalty-Nutzung empfehlen.','addon','high',499.00,86,'{"qrScans":280,"loyaltyMembers":3,"upsellScore":84}'::jsonb,'open')
on conflict (id) do update set
  customer_id=excluded.customer_id,
  current_package=excluded.current_package,
  recommended_package=excluded.recommended_package,
  reason=excluded.reason,
  recommendation_type=excluded.recommendation_type,
  priority=excluded.priority,
  estimated_revenue_uplift=excluded.estimated_revenue_uplift,
  confidence_score=excluded.confidence_score,
  source_metrics=excluded.source_metrics,
  status='open';

insert into public.revenue_share_rules (
  id, name, applies_to_package, customer_id, partner_name, partner_account_reference,
  share_type, share_value, active, metadata
)
values (
  'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b001',
  'MMOS Demo Revenue Share',
  'premium',
  '11111111-1111-1111-1111-111111111111',
  'MMOS Plattform',
  'demo-platform-account',
  'percentage',
  15.0000,
  true,
  '{"demo":true}'::jsonb
)
on conflict (id) do update set
  name=excluded.name,
  applies_to_package=excluded.applies_to_package,
  customer_id=excluded.customer_id,
  partner_name=excluded.partner_name,
  partner_account_reference=excluded.partner_account_reference,
  share_type=excluded.share_type,
  share_value=excluded.share_value,
  active=true,
  metadata=excluded.metadata;

insert into public.revenue_share_events (
  id, customer_id, rule_id, source_type, source_id, gross_amount, share_amount,
  platform_amount, currency, status, metadata
)
values (
  'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b001',
  '11111111-1111-1111-1111-111111111111',
  'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b001',
  'subscription',
  '12121212-1212-1212-1212-121212121212',
  299.00,
  44.85,
  254.15,
  'EUR',
  'calculated',
  '{"demo":true}'::jsonb
)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  rule_id=excluded.rule_id,
  source_type=excluded.source_type,
  source_id=excluded.source_id,
  gross_amount=excluded.gross_amount,
  share_amount=excluded.share_amount,
  platform_amount=excluded.platform_amount,
  currency=excluded.currency,
  status=excluded.status,
  metadata=excluded.metadata;

-- ============================================================
-- 14 DEMO TICKET / TIMELINE / FINAL LOG
-- ============================================================

insert into public.tickets (
  id, customer_id, title, description, status, priority, source, metadata
)
values
('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b001','11111111-1111-1111-1111-111111111111','Kritische Review prüfen','Gast meldet Wartezeit und Sauberkeit. Antwortvorschlag liegt vor.','open','high','review_intelligence','{"demo":true}'::jsonb)
on conflict (id) do update set
  customer_id=excluded.customer_id,
  title=excluded.title,
  description=excluded.description,
  status=excluded.status,
  priority=excluded.priority,
  source=excluded.source,
  metadata=excluded.metadata;

insert into public.customer_timeline_events (
  id, customer_id, event_type, title, description, source_module, severity, actor_name, metadata, created_at
)
values
('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c001','11111111-1111-1111-1111-111111111111','qr_campaign_created','QR-Kampagne erstellt','Frühstücks-Loyalty QR wurde aktiviert.','qr_campaigns','success','Demo Admin','{}'::jsonb,now()-interval '14 days'),
('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c002','11111111-1111-1111-1111-111111111111','loyalty_reward_redeemed','Reward eingelöst','Gratis Cappuccino wurde per Mitarbeitercode bestätigt.','loyalty','success','Theke','{}'::jsonb,now()-interval '2 days'),
('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c003','11111111-1111-1111-1111-111111111111','review_intelligence_escalation','Kritische Bewertung erkannt','Wartezeit und Sauberkeit wurden erkannt.','review_intelligence','warning','Review Intelligence','{}'::jsonb,now()-interval '2 days'),
('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c004','11111111-1111-1111-1111-111111111111','revenue_forecast_created','Revenue Forecast aktualisiert','Erwarteter Monatsumsatz: 1.442,28 EUR.','revenue_forecasting','info','System','{}'::jsonb,now()-interval '1 day'),
('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c005','11111111-1111-1111-1111-111111111111','smart_automation_triggered','Automation ausgelöst','Starke QR-Kampagne erzeugte Upsell-Lead.','smart_automation','success','Smart Automation','{}'::jsonb,now()-interval '1 day')
on conflict (id) do update set
  customer_id=excluded.customer_id,
  event_type=excluded.event_type,
  title=excluded.title,
  description=excluded.description,
  source_module=excluded.source_module,
  severity=excluded.severity,
  actor_name=excluded.actor_name,
  metadata=excluded.metadata,
  created_at=excluded.created_at;

insert into public.security_audit_logs (
  actor_name, action, entity_type, metadata
)
values (
  'System',
  'migrated_v28_production_safe_rebuild',
  'system',
  '{"version":"0038_v28_production_safe_rebuild_v6","demo_customer_id":"11111111-1111-1111-1111-111111111111","safe_mode":"no_drop"}'::jsonb
)
on conflict do nothing;

-- ============================================================
-- DONE
-- ============================================================
