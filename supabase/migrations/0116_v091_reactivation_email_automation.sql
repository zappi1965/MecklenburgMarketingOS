-- MMOS V091: Rückholaktionen E-Mail-Automation + Testfunktion + Mailtracking
-- Ergänzt V090 um Live-E-Mail-Versand über loyalty@mecklenburgmarketing.de,
-- Reminder-Sequenzen und Zustell-/Bounce-Auswertung.

create extension if not exists "pgcrypto";

create table if not exists public.customer_reactivation_settings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  qr_campaign_id uuid,
  active boolean not null default true,
  inactive_after_days integer not null default 30,
  reward_name text not null default 'Wir vermissen dich: Gratis Kaffee',
  reward_type text not null default 'free_item',
  reward_points integer not null default 20,
  valid_days integer not null default 14,
  staff_code_required boolean not null default true,
  email_subject text not null default 'Wir haben dich vermisst ☕',
  email_intro text not null default 'Komm wieder vorbei und sichere dir deine persönliche Rückhol-Prämie.',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_reactivation_settings add column if not exists email_from text not null default 'MecklenburgMarketing Loyalty <loyalty@mecklenburgmarketing.de>';
alter table public.customer_reactivation_settings add column if not exists email_automation_enabled boolean not null default false;
alter table public.customer_reactivation_settings add column if not exists require_marketing_consent boolean not null default true;
alter table public.customer_reactivation_settings add column if not exists reminder_enabled boolean not null default true;
alter table public.customer_reactivation_settings add column if not exists reminder_after_days integer not null default 3;
alter table public.customer_reactivation_settings add column if not exists reminder_max_count integer not null default 1;
alter table public.customer_reactivation_settings add column if not exists reminder_subject text not null default 'Erinnerung: Deine Rückhol-Prämie wartet noch';
alter table public.customer_reactivation_settings add column if not exists reminder_intro text not null default 'Deine persönliche Rückhol-Prämie ist noch verfügbar.';
alter table public.customer_reactivation_settings add column if not exists last_automation_run_at timestamptz;
alter table public.customer_reactivation_settings add column if not exists updated_at timestamptz not null default now();

create table if not exists public.customer_reactivation_links (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  qr_campaign_id uuid,
  loyalty_program_id uuid,
  loyalty_customer_id uuid,
  email text,
  display_name text,
  token text,
  status text not null default 'open',
  reward_name text,
  reward_type text,
  reward_points integer not null default 0,
  staff_code_required boolean not null default true,
  sent_at timestamptz,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  opened_count integer not null default 0,
  redeemed_at timestamptz,
  reactivated_at timestamptz,
  staff_code_used text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_reactivation_links add column if not exists email_status text not null default 'created';
alter table public.customer_reactivation_links add column if not exists mail_provider_id text;
alter table public.customer_reactivation_links add column if not exists mail_sent_at timestamptz;
alter table public.customer_reactivation_links add column if not exists delivered_at timestamptz;
alter table public.customer_reactivation_links add column if not exists bounced_at timestamptz;
alter table public.customer_reactivation_links add column if not exists failed_at timestamptz;
alter table public.customer_reactivation_links add column if not exists last_mail_error text;
alter table public.customer_reactivation_links add column if not exists reminder_count integer not null default 0;
alter table public.customer_reactivation_links add column if not exists last_reminder_at timestamptz;
alter table public.customer_reactivation_links add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_reactivation_links_mail_provider on public.customer_reactivation_links(mail_provider_id);
create index if not exists idx_reactivation_links_email_status on public.customer_reactivation_links(customer_id, qr_campaign_id, email_status);
create index if not exists idx_reactivation_links_reminder_due on public.customer_reactivation_links(customer_id, qr_campaign_id, status, last_reminder_at);

create table if not exists public.customer_reactivation_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  qr_campaign_id uuid,
  loyalty_customer_id uuid,
  reactivation_link_id uuid,
  event_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mail_events (
  id uuid primary key default gen_random_uuid(),
  customer_id text,
  recipient text,
  subject text,
  template_key text,
  provider text,
  status text not null default 'created',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.mail_events add column if not exists customer_id text;
alter table public.mail_events add column if not exists recipient text;
alter table public.mail_events add column if not exists subject text;
alter table public.mail_events add column if not exists template_key text;
alter table public.mail_events add column if not exists provider text;
alter table public.mail_events add column if not exists status text not null default 'created';
alter table public.mail_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.mail_events add column if not exists created_at timestamptz not null default now();

create index if not exists idx_mail_events_reactivation on public.mail_events(customer_id, template_key, created_at desc);

-- Add-on-Key für Freischaltungen:
-- customer_tool_access.tool_key = 'Rückholaktionen' oder 'customer_reactivation'
-- Live-Mail-Absender im Backend: REACTIVATION_MAIL_FROM="MecklenburgMarketing Loyalty <loyalty@mecklenburgmarketing.de>"
-- Resend: RESEND_API_KEY setzen und Domain mecklenburgmarketing.de verifizieren.
-- Optional Automation im Railway-Backend: REACTIVATION_AUTOMATION_ENABLED=true
