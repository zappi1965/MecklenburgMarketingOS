-- MMOS V103.7: Loyalty Stamp Card public slug visualization settings
-- Defensive, additive-only migration. No existing data is deleted or overwritten.

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

alter table if exists public.v37_loyalty_settings add column if not exists loyalty_display_mode text default 'classic';
alter table if exists public.v37_loyalty_settings add column if not exists stamp_card_slots integer default 10;
alter table if exists public.v37_loyalty_settings add column if not exists stamp_card_reward_text text default 'Volle Karte = Prämie sichern';
alter table if exists public.v37_loyalty_settings add column if not exists stamp_card_stamp_style text default 'logo';
alter table if exists public.v37_loyalty_settings add column if not exists stamp_card_show_logo boolean default true;
alter table if exists public.v37_loyalty_settings add column if not exists stamp_card_background text;
alter table if exists public.v37_loyalty_settings add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.v37_loyalty_settings add column if not exists updated_at timestamptz default now();

-- Keep old rows usable without forcing a value over intentional settings.
update public.v37_loyalty_settings
set
  loyalty_display_mode = coalesce(nullif(loyalty_display_mode, ''), metadata->>'loyalty_display_mode', 'classic'),
  stamp_card_slots = case
    when stamp_card_slots in (6,8,10,12) then stamp_card_slots
    when (metadata->>'stamp_card_slots') ~ '^[0-9]+$' and (metadata->>'stamp_card_slots')::int in (6,8,10,12) then (metadata->>'stamp_card_slots')::int
    else 10
  end,
  stamp_card_reward_text = coalesce(nullif(stamp_card_reward_text, ''), metadata->>'stamp_card_reward_text', 'Volle Karte = Prämie sichern'),
  stamp_card_stamp_style = coalesce(nullif(stamp_card_stamp_style, ''), metadata->>'stamp_card_stamp_style', 'logo'),
  stamp_card_show_logo = coalesce(stamp_card_show_logo, true),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'loyalty_display_mode', coalesce(nullif(loyalty_display_mode, ''), metadata->>'loyalty_display_mode', 'classic'),
    'stamp_card_slots', case when stamp_card_slots in (6,8,10,12) then stamp_card_slots else 10 end,
    'stamp_card_reward_text', coalesce(nullif(stamp_card_reward_text, ''), metadata->>'stamp_card_reward_text', 'Volle Karte = Prämie sichern'),
    'stamp_card_stamp_style', coalesce(nullif(stamp_card_stamp_style, ''), metadata->>'stamp_card_stamp_style', 'logo'),
    'stamp_card_show_logo', coalesce(stamp_card_show_logo, true)
  ),
  updated_at = coalesce(updated_at, now())
where customer_id is not null;

create index if not exists v37_loyalty_settings_stamp_mode_idx
on public.v37_loyalty_settings (loyalty_display_mode)
where customer_id is not null;
