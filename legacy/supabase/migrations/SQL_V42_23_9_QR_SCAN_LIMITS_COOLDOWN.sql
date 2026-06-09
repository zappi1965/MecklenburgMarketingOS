-- MMOS V42.23.9 QR Scan Limits & Cooldown
-- Adds per-QR-campaign scan redemption limits and cooldown minutes.
-- 0 means unlimited / no cooldown.

alter table if exists public.qr_campaigns
  add column if not exists max_scans_per_member integer not null default 0;

alter table if exists public.qr_campaigns
  add column if not exists scan_cooldown_minutes integer not null default 0;

alter table if exists public.loyalty_programs
  add column if not exists max_scans_per_member integer not null default 0;

alter table if exists public.loyalty_programs
  add column if not exists scan_cooldown_minutes integer not null default 0;

-- Preserve existing metadata-based settings if they already exist and are numeric.
update public.qr_campaigns
set
  max_scans_per_member = case
    when coalesce(max_scans_per_member, 0) > 0 then max_scans_per_member
    when metadata ? 'max_scans_per_member' and (metadata->>'max_scans_per_member') ~ '^[0-9]+$' then greatest(0, (metadata->>'max_scans_per_member')::int)
    else coalesce(max_scans_per_member, 0)
  end,
  scan_cooldown_minutes = case
    when coalesce(scan_cooldown_minutes, 0) > 0 then scan_cooldown_minutes
    when metadata ? 'scan_cooldown_minutes' and (metadata->>'scan_cooldown_minutes') ~ '^[0-9]+$' then greatest(0, (metadata->>'scan_cooldown_minutes')::int)
    else coalesce(scan_cooldown_minutes, 0)
  end
where metadata is not null
  and (
    metadata ? 'max_scans_per_member'
    or metadata ? 'scan_cooldown_minutes'
  );

update public.loyalty_programs
set
  max_scans_per_member = case
    when coalesce(max_scans_per_member, 0) > 0 then max_scans_per_member
    when metadata ? 'max_scans_per_member' and (metadata->>'max_scans_per_member') ~ '^[0-9]+$' then greatest(0, (metadata->>'max_scans_per_member')::int)
    else coalesce(max_scans_per_member, 0)
  end,
  scan_cooldown_minutes = case
    when coalesce(scan_cooldown_minutes, 0) > 0 then scan_cooldown_minutes
    when metadata ? 'scan_cooldown_minutes' and (metadata->>'scan_cooldown_minutes') ~ '^[0-9]+$' then greatest(0, (metadata->>'scan_cooldown_minutes')::int)
    else coalesce(scan_cooldown_minutes, 0)
  end
where metadata is not null
  and (
    metadata ? 'max_scans_per_member'
    or metadata ? 'scan_cooldown_minutes'
  );

-- Optional migration log. This block is defensive because schema_migrations_mmos varied between builds.
do $$
begin
  create table if not exists public.schema_migrations_mmos (
    version text primary key,
    file_name text,
    applied_at timestamptz default now(),
    description text
  );

  alter table public.schema_migrations_mmos add column if not exists file_name text;
  alter table public.schema_migrations_mmos add column if not exists applied_at timestamptz default now();
  alter table public.schema_migrations_mmos add column if not exists description text;

  insert into public.schema_migrations_mmos (version, file_name, description, applied_at)
  values (
    'V42.23.9_QR_SCAN_LIMITS_COOLDOWN',
    'SQL_V42_23_9_QR_SCAN_LIMITS_COOLDOWN.sql',
    'Adds max scans per member and cooldown minutes per QR campaign.',
    now()
  )
  on conflict (version) do nothing;
exception when others then
  raise notice 'Migration log skipped: %', sqlerrm;
end $$;
