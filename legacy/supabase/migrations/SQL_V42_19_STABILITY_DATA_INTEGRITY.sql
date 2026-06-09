-- V42.19 Stability & Data Integrity
-- Führt zusätzliche Tabellen/Spalten für Aktivitätslog, API-Cache/Rate-Limit und Datenintegritätschecks ein.

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  type text,
  title text,
  ref_table text,
  ref_id text,
  severity text default 'success',
  metadata jsonb default '{}'::jsonb,
  customer_id uuid null,
  actor_name text,
  created_at timestamptz default now()
);

create table if not exists api_usage_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  cache_key text not null,
  request_hash text,
  response jsonb default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique(provider, cache_key)
);

create table if not exists data_integrity_checks (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'global',
  status text not null default 'OK',
  issues jsonb default '[]'::jsonb,
  checked_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table prospect_leads add column if not exists archived_at timestamptz;
alter table google_business_audits add column if not exists archived_at timestamptz;
alter table mini_audits add column if not exists archived_at timestamptz;
alter table generated_offers add column if not exists archived_at timestamptz;
alter table generated_contracts add column if not exists archived_at timestamptz;
alter table dunning_cases add column if not exists archived_at timestamptz;
alter table acquisition_campaigns add column if not exists archived_at timestamptz;
alter table acquisition_campaigns add column if not exists updated_at timestamptz;
alter table acquisition_campaigns add column if not exists next_step text;

create index if not exists idx_activity_logs_ref on activity_logs(ref_table, ref_id);
create index if not exists idx_activity_logs_created_at on activity_logs(created_at desc);
create index if not exists idx_api_usage_cache_provider_key on api_usage_cache(provider, cache_key);
