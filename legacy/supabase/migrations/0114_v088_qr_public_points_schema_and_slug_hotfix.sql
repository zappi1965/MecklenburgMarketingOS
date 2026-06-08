-- MMOS V088: QR public points schema + slug collision hotfix
-- Fixes live errors:
-- 1) v37_loyalty_settings missing require_rescan_for_points / QR limit columns
-- 2) loyalty_programs slug collisions when creating QR campaigns

create extension if not exists "pgcrypto";

create table if not exists public.v37_loyalty_settings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  brand_name text,
  brand_font text,
  brand_primary text,
  brand_secondary text,
  brand_accent text,
  hero_headline text,
  hero_subline text,
  qr_style text,
  qr_foreground text,
  qr_background text,
  qr_logo_text text,
  daily_scan_limit integer default 1,
  weekly_scan_limit integer default 0,
  weekly_scan_limit_enabled boolean default false,
  active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.v37_loyalty_settings add column if not exists customer_id uuid;
alter table if exists public.v37_loyalty_settings add column if not exists brand_name text;
alter table if exists public.v37_loyalty_settings add column if not exists brand_font text;
alter table if exists public.v37_loyalty_settings add column if not exists brand_primary text;
alter table if exists public.v37_loyalty_settings add column if not exists brand_secondary text;
alter table if exists public.v37_loyalty_settings add column if not exists brand_accent text;
alter table if exists public.v37_loyalty_settings add column if not exists hero_headline text;
alter table if exists public.v37_loyalty_settings add column if not exists hero_subline text;
alter table if exists public.v37_loyalty_settings add column if not exists qr_style text;
alter table if exists public.v37_loyalty_settings add column if not exists qr_foreground text;
alter table if exists public.v37_loyalty_settings add column if not exists qr_background text;
alter table if exists public.v37_loyalty_settings add column if not exists qr_logo_text text;
alter table if exists public.v37_loyalty_settings add column if not exists daily_scan_limit integer default 1;
alter table if exists public.v37_loyalty_settings add column if not exists weekly_scan_limit integer default 0;
alter table if exists public.v37_loyalty_settings add column if not exists weekly_scan_limit_enabled boolean default false;
alter table if exists public.v37_loyalty_settings add column if not exists require_rescan_for_points boolean default true;
alter table if exists public.v37_loyalty_settings add column if not exists rotate_qr_after_scan boolean default false;
alter table if exists public.v37_loyalty_settings add column if not exists daily_point_limit_per_member integer default 0;
alter table if exists public.v37_loyalty_settings add column if not exists weekly_point_limit_per_member integer default 0;
alter table if exists public.v37_loyalty_settings add column if not exists suspicion_score_threshold integer default 70;
alter table if exists public.v37_loyalty_settings add column if not exists birthday_bonus_points integer default 0;
alter table if exists public.v37_loyalty_settings add column if not exists referral_bonus_referrer integer default 0;
alter table if exists public.v37_loyalty_settings add column if not exists referral_bonus_friend integer default 0;
alter table if exists public.v37_loyalty_settings add column if not exists level_rules jsonb default '[]'::jsonb;
alter table if exists public.v37_loyalty_settings add column if not exists active boolean default true;
alter table if exists public.v37_loyalty_settings add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.v37_loyalty_settings add column if not exists created_at timestamptz default now();
alter table if exists public.v37_loyalty_settings add column if not exists updated_at timestamptz default now();

create unique index if not exists v37_loyalty_settings_customer_uidx
on public.v37_loyalty_settings(customer_id)
where customer_id is not null;

alter table if exists public.loyalty_programs add column if not exists slug text;
alter table if exists public.loyalty_programs add column if not exists qr_campaign_id uuid;
alter table if exists public.loyalty_programs add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.loyalty_programs add column if not exists updated_at timestamptz default now();

-- Resolve rare old duplicates before creating/updating through the app.
with ranked as (
  select id, slug,
         row_number() over (partition by slug order by updated_at desc nulls last, created_at desc nulls last, id) as rn
  from public.loyalty_programs
  where slug is not null and trim(slug) <> ''
)
update public.loyalty_programs lp
set slug = ranked.slug || '-' || substr(lp.id::text, 1, 8),
    metadata = coalesce(lp.metadata,'{}'::jsonb) || jsonb_build_object('v088_slug_deduped', true, 'previous_slug', ranked.slug),
    updated_at = now()
from ranked
where lp.id = ranked.id and ranked.rn > 1;
