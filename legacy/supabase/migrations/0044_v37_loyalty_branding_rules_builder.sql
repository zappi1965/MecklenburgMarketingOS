-- ============================================================
-- 0044_v37_loyalty_branding_rules_builder.sql
-- Loyalty Branding, Limits, Level Rules, Birthday/Referral Bonus, QR Design
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.v37_loyalty_settings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  brand_name text not null default 'Bonusclub',
  brand_font text not null default 'Pacifico',
  brand_primary text not null default '#d4af37',
  brand_secondary text not null default '#111827',
  brand_accent text not null default '#f8fafc',
  hero_headline text not null default 'Willkommen im Bonusclub',
  hero_subline text not null default 'Sammle Punkte, sichere dir Rewards und werde VIP.',
  qr_style text not null default 'luxury',
  qr_foreground text not null default '#111827',
  qr_background text not null default '#ffffff',
  qr_logo_text text,
  daily_scan_limit integer not null default 1,
  weekly_scan_limit integer not null default 5,
  birthday_bonus_points integer not null default 100,
  referral_bonus_referrer integer not null default 100,
  referral_bonus_friend integer not null default 50,
  level_rules jsonb not null default '[{"tier":"Basic","min_points":0,"multiplier":1},{"tier":"Silver","min_points":250,"multiplier":1.1},{"tier":"Gold","min_points":500,"multiplier":1.25},{"tier":"VIP","min_points":1000,"multiplier":1.5}]'::jsonb,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists v37_loyalty_settings_customer_uidx
on public.v37_loyalty_settings (customer_id);

alter table public.loyalty_customers add column if not exists birthday date;
alter table public.loyalty_customers add column if not exists tier text not null default 'Basic';
alter table public.loyalty_customers add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.loyalty_transactions add column if not exists action text not null default 'points';
alter table public.loyalty_transactions add column if not exists points integer not null default 0;
alter table public.loyalty_transactions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.loyalty_transactions add column if not exists created_at timestamptz not null default now();

-- Generic reward records in v33_functional_records get the new payload fields.
-- No extra table required; fields are stored in payload:
-- expires_at, max_redemptions, max_per_customer, daily_limit, weekly_limit.

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values (
  'System',
  'v37_loyalty_branding_rules_builder_schema_applied',
  'system',
  '{"version":"0044_v37_loyalty_branding_rules_builder"}'::jsonb
)
on conflict do nothing;
