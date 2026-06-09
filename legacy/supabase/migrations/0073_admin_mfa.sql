-- 2FA / MFA fuer Admin-Logins.
-- Erweitert user_profiles um TOTP-Secrets und Backup-Codes.
-- Idempotent.

alter table if exists public.user_profiles
  add column if not exists mfa_enabled boolean not null default false,
  add column if not exists mfa_secret text,
  add column if not exists mfa_enrolled_at timestamptz,
  add column if not exists mfa_last_used_at timestamptz,
  add column if not exists mfa_backup_codes_hash text[];

create index if not exists idx_user_profiles_mfa_enabled on public.user_profiles(mfa_enabled) where mfa_enabled = true;

-- Audit-Tabelle fuer MFA-Events (Aktivierung, Failed Verifications, Backup-Code-Einlosung).
create table if not exists public.mfa_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_type text not null,                        -- enrolled | verified | failed | backup_used | disabled
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_mfa_events_user on public.mfa_events(user_id, created_at desc);
create index if not exists idx_mfa_events_type on public.mfa_events(event_type);

alter table public.mfa_events enable row level security;
