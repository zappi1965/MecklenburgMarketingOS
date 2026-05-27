-- DSGVO-Cockpit + Public-API + Smart-Pricing.
-- Idempotent.

-- Verarbeitungstaetigkeiten gemaess Art. 30 DSGVO.
create table if not exists public.data_processing_activities (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  name text not null,
  purpose text not null,
  legal_basis text not null,                       -- Art. 6 Abs. 1 lit. a/b/c/f
  data_categories text[] not null default '{}',
  data_subjects text[] not null default '{}',     -- Endkunden, Mitarbeitende
  retention_period text,
  processor text,                                  -- ggf. Drittauftragsverarbeiter
  storage_location text,
  toms text[] not null default '{}',               -- TOM-Schlagworte
  status text not null default 'active',           -- active | retired
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dpa_customer on public.data_processing_activities(customer_id);
create index if not exists idx_dpa_status on public.data_processing_activities(status);

-- Auftragsverarbeiter (Stripe, Vercel, Supabase, ...).
create table if not exists public.data_processors (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  name text not null,
  purpose text not null,
  country_code text,
  contract_signed_at date,
  contract_url text,
  dpa_version text,                                -- z.B. SCC 2021
  scc_required boolean not null default false,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_data_processors_customer on public.data_processors(customer_id);

-- Public-API-Keys.
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  key_prefix text not null,                        -- erste 8 Zeichen fuer UI
  key_hash text not null,                          -- scrypt-Hash des vollen Keys
  scopes text[] not null default '{}',             -- z.B. read:invoices, write:loyalty
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists idx_api_keys_prefix on public.api_keys(key_prefix);
create index if not exists idx_api_keys_customer on public.api_keys(customer_id);
create index if not exists idx_api_keys_revoked on public.api_keys(revoked_at);

-- Smart-Pricing-Regeln.
create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  scope text not null default 'global',            -- global | service | category | slot
  scope_value text,                                -- z.B. service_id oder category name
  base_price_eur numeric(12,2) not null,
  occupancy_threshold int,                         -- ab welcher Auslastung % aktiv
  uplift_pct int,                                  -- Aufschlag in Prozent
  downlift_pct int,                                -- Rabatt bei niedriger Auslastung
  weekend_uplift_pct int,
  off_peak_downlift_pct int,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pricing_rules_customer on public.pricing_rules(customer_id);
create index if not exists idx_pricing_rules_scope on public.pricing_rules(scope, scope_value);

alter table public.data_processing_activities enable row level security;
alter table public.data_processors enable row level security;
alter table public.api_keys enable row level security;
alter table public.pricing_rules enable row level security;
