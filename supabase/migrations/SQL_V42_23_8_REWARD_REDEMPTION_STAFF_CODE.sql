-- MMOS V42.23.8 Reward Redemption Staff Code Enforcement
-- Supabase-safe migration for public slug reward redemption with staff code / PIN.

create table if not exists public.loyalty_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  loyalty_program_id uuid,
  loyalty_customer_id uuid,
  qr_campaign_id uuid,
  reward_id text not null,
  reward_title text,
  points_spent integer not null default 0,
  staff_code_used boolean not null default false,
  status text not null default 'redeemed',
  allow_multiple_redemptions boolean not null default false,
  redeemed_at timestamptz default now(),
  metadata jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_loyalty_reward_redemptions_customer on public.loyalty_reward_redemptions(customer_id);
create index if not exists idx_loyalty_reward_redemptions_member_reward on public.loyalty_reward_redemptions(loyalty_customer_id, reward_id);
create index if not exists idx_loyalty_reward_redemptions_program on public.loyalty_reward_redemptions(loyalty_program_id);

alter table if exists public.loyalty_rewards
  add column if not exists staff_code_required boolean not null default true;

alter table if exists public.loyalty_rewards
  add column if not exists allow_multiple_redemptions boolean not null default false;

alter table if exists public.loyalty_rewards
  add column if not exists max_redemptions_per_member integer not null default 1;

alter table if exists public.staff_codes
  add column if not exists pin text;

alter table if exists public.staff_codes
  add column if not exists uses integer not null default 0;

alter table if exists public.staff_codes
  add column if not exists last_used_at timestamptz;

-- v33_functional_records-backed rewards store these values inside payload.
-- This update only fills missing defaults for existing reward payloads.
update public.v33_functional_records
set payload = jsonb_set(
  jsonb_set(
    jsonb_set(coalesce(payload, '{}'::jsonb), '{staff_code_required}', coalesce(payload->'staff_code_required', 'true'::jsonb), true),
    '{allow_multiple_redemptions}', coalesce(payload->'allow_multiple_redemptions', 'false'::jsonb), true
  ),
  '{max_redemptions_per_member}', coalesce(payload->'max_redemptions_per_member', '1'::jsonb), true
),
updated_at = now()
where resource = 'loyalty_rewards';
