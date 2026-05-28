-- V42.16 Stability & API Hardening
-- Optional: erweitert die Integrationen um Sync-Statusfelder.
-- Wenn Spalten bereits existieren, passiert nichts.

alter table if exists integrations
  add column if not exists provider text,
  add column if not exists last_sync_at timestamptz,
  add column if not exists last_sync_status text,
  add column if not exists last_sync_error text,
  add column if not exists metadata jsonb default '{}'::jsonb;

create index if not exists integrations_customer_provider_idx
  on integrations (customer_id, provider);

-- Optional, falls OAuth-Token noch nicht existieren.
create table if not exists oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  provider text not null,
  access_token text,
  refresh_token text,
  scope text,
  token_type text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(customer_id, provider)
);

create index if not exists oauth_tokens_customer_provider_idx
  on oauth_tokens (customer_id, provider);
