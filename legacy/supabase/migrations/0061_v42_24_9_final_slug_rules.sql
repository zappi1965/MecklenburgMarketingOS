-- V42.24.9 FINAL SLUG RULES
-- Nicht-destruktiv: ergänzt nur optionale Spalten für kampagnenbezogene Slug-/QR-Regeln.
-- Die maßgebliche Speicherung bleibt zusätzlich in qr_campaigns.metadata, damit ältere Schemas weiter funktionieren.

alter table if exists public.qr_campaigns
  add column if not exists daily_scan_limit_per_member integer not null default 0;

alter table if exists public.loyalty_programs
  add column if not exists daily_scan_limit_per_member integer not null default 0;

update public.qr_campaigns
set daily_scan_limit_per_member = greatest(0, case when (metadata->>'daily_scan_limit_per_member') ~ '^\d+$' then (metadata->>'daily_scan_limit_per_member')::integer else daily_scan_limit_per_member end)
where metadata is not null
  and metadata->>'daily_scan_limit_per_member' is not null;

update public.loyalty_programs
set daily_scan_limit_per_member = greatest(0, case when (metadata->>'daily_scan_limit_per_member') ~ '^\d+$' then (metadata->>'daily_scan_limit_per_member')::integer else daily_scan_limit_per_member end)
where metadata is not null
  and metadata->>'daily_scan_limit_per_member' is not null;

create table if not exists public.schema_migrations_mmos (
  version text primary key,
  file text,
  applied_at timestamptz not null default now()
);
alter table public.schema_migrations_mmos add column if not exists file text;
alter table public.schema_migrations_mmos add column if not exists file_name text;
alter table public.schema_migrations_mmos add column if not exists description text;

insert into public.schema_migrations_mmos(version, file, file_name, description, applied_at)
values (
  'V42.24.9_FINAL_SLUG_RULES',
  'SQL_V42_24_9_FINAL_SLUG_RULES.sql',
  'SQL_V42_24_9_FINAL_SLUG_RULES.sql',
  'Finale Slug-/QR-Regeln werden kampagnenbezogen gespeichert; tägliche Einlösungen pro Endkunde werden als optionale Spalte ergänzt.',
  now()
)
on conflict (version) do update set
  file = excluded.file,
  file_name = excluded.file_name,
  description = excluded.description,
  applied_at = excluded.applied_at;
