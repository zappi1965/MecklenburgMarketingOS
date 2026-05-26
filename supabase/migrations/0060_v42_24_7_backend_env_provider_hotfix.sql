-- V42.24.7 BACKEND ENV / PROVIDER HOTFIX - NICHT-DESTRUKTIV
-- Dieses Script löscht keine Demo- oder Live-Daten.
-- Zweck: Migrationshistorie markieren und sichere Live/Demo-Trennung dokumentieren.

create table if not exists public.schema_migrations_mmos (
  version text primary key,
  file text,
  applied_at timestamptz not null default now()
);
alter table public.schema_migrations_mmos add column if not exists file_name text;
alter table public.schema_migrations_mmos add column if not exists description text;

insert into public.schema_migrations_mmos(version, file, file_name, description, applied_at)
values (
  'V42.24.7_BACKEND_ENV_PROVIDER_HOTFIX',
  'SQL_V42_24_7_BACKEND_ENV_PROVIDER_HOTFIX.sql',
  'SQL_V42_24_7_BACKEND_ENV_PROVIDER_HOTFIX.sql',
  'Backend ENV diagnostics, Google Places key restriction guidance, provider mapping stability; no data deletion.',
  now()
)
on conflict (version) do update set
  file = excluded.file,
  file_name = excluded.file_name,
  description = excluded.description,
  applied_at = excluded.applied_at;
