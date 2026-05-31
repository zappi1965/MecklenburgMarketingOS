-- MMOS MFA Login Enforcement
-- Ensures that active MFA is also requested during login and remembered for a limited admin session.

alter table if exists public.user_profiles
  add column if not exists mfa_verified_until timestamptz;

create index if not exists idx_user_profiles_mfa_verified_until
  on public.user_profiles(mfa_verified_until)
  where mfa_verified_until is not null;

-- Existing columns from 0073 are repeated idempotently for projects that skipped the older file.
alter table if exists public.user_profiles
  add column if not exists mfa_enabled boolean not null default false,
  add column if not exists mfa_secret text,
  add column if not exists mfa_enrolled_at timestamptz,
  add column if not exists mfa_last_used_at timestamptz,
  add column if not exists mfa_backup_codes_hash text[];

create table if not exists public.mfa_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_type text not null,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_mfa_events_user on public.mfa_events(user_id, created_at desc);
create index if not exists idx_mfa_events_type on public.mfa_events(event_type);

alter table public.mfa_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mfa_events' and policyname='authenticated_mfa_events') then
    create policy authenticated_mfa_events on public.mfa_events
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;
