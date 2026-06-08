-- MMOS V103.5 MFA rescue schema check
-- In Supabase SQL Editor ausführen, wenn /api/security/mfa/verify MFA_SCHEMA/MFA_SESSION_UPDATE Fehler meldet.

alter table if exists public.user_profiles
  add column if not exists mfa_secret text,
  add column if not exists mfa_enabled boolean not null default false,
  add column if not exists mfa_enrolled_at timestamptz,
  add column if not exists mfa_last_used_at timestamptz,
  add column if not exists mfa_verified_until timestamptz,
  add column if not exists mfa_backup_codes_hash jsonb;

create table if not exists public.mfa_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  event_type text not null,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_mfa_email on public.user_profiles (lower(email));
create index if not exists idx_mfa_events_user_created on public.mfa_events (user_id, created_at desc);
