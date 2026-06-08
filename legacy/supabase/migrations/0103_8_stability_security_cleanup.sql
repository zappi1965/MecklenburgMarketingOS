-- MMOS V103.8 Stability & Security Cleanup
-- Additive-only: persistent Public Shield, stamp card conversion setting, runtime diagnostics support.

create extension if not exists "pgcrypto";

alter table if exists public.v37_loyalty_settings
  add column if not exists points_per_stamp integer default 10;

update public.v37_loyalty_settings
set
  points_per_stamp = case
    when points_per_stamp is not null and points_per_stamp > 0 then points_per_stamp
    when (metadata->>'points_per_stamp') ~ '^[0-9]+$' and (metadata->>'points_per_stamp')::int > 0 then (metadata->>'points_per_stamp')::int
    else 10
  end,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'points_per_stamp', case
      when points_per_stamp is not null and points_per_stamp > 0 then points_per_stamp
      when (metadata->>'points_per_stamp') ~ '^[0-9]+$' and (metadata->>'points_per_stamp')::int > 0 then (metadata->>'points_per_stamp')::int
      else 10
    end
  )
where customer_id is not null;

create table if not exists public.public_endpoint_shield_attempts (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  action text not null,
  slug text,
  email_hash text,
  ip_hash text,
  count integer not null default 0,
  max_count integer not null default 30,
  window_ms integer not null default 900000,
  reset_at timestamptz not null default now(),
  blocked_until timestamptz,
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_endpoint_shield_attempts_action_slug_idx
  on public.public_endpoint_shield_attempts (action, slug);

create index if not exists public_endpoint_shield_attempts_reset_idx
  on public.public_endpoint_shield_attempts (reset_at);

create index if not exists public_endpoint_shield_attempts_block_idx
  on public.public_endpoint_shield_attempts (blocked_until)
  where blocked_until is not null;

-- Optional housekeeping query for cron/manual maintenance:
-- delete from public.public_endpoint_shield_attempts
-- where reset_at < now() - interval '7 days'
--   and (blocked_until is null or blocked_until < now() - interval '7 days');
