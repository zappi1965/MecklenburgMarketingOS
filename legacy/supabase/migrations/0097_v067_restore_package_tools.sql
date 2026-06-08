-- MMOS V067 Restore Package Tools
-- Legt einfache Live-Tabellen fuer die nach der Front-/Backoffice-Fusion verschwundenen Tools an.

create extension if not exists pgcrypto;

create table if not exists public.retention_intelligence (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text,
  score numeric,
  recommendation text,
  status text not null default 'Aktiv',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consent_center (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text,
  channel text,
  status text not null default 'Aktiv',
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.segment_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text,
  audience text,
  reward text,
  status text not null default 'Entwurf',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.churn_prevention (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text,
  risk numeric,
  action text,
  status text not null default 'Aktiv',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sumup_revenue_connection (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text,
  provider text not null default 'SumUp',
  status text not null default 'Vorbereitet',
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_retention_intelligence_customer_id on public.retention_intelligence(customer_id);
create index if not exists idx_consent_center_customer_id on public.consent_center(customer_id);
create index if not exists idx_segment_campaigns_customer_id on public.segment_campaigns(customer_id);
create index if not exists idx_churn_prevention_customer_id on public.churn_prevention(customer_id);
create index if not exists idx_sumup_revenue_connection_customer_id on public.sumup_revenue_connection(customer_id);

alter table public.retention_intelligence enable row level security;
alter table public.consent_center enable row level security;
alter table public.segment_campaigns enable row level security;
alter table public.churn_prevention enable row level security;
alter table public.sumup_revenue_connection enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'retention_intelligence',
    'consent_center',
    'segment_campaigns',
    'churn_prevention',
    'sumup_revenue_connection'
  ]
  loop
    execute format('drop policy if exists authenticated_%I on public.%I', t, t);
    execute format('create policy authenticated_%I on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t, t);

    execute format('drop policy if exists service_role_%I on public.%I', t, t);
    execute format('create policy service_role_%I on public.%I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')', t, t);
  end loop;
end $$;
