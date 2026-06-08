-- DATEV-/lexoffice-Export-Jobs.
-- Idempotent.

create table if not exists public.accounting_exports (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  format text not null,                            -- 'datev_extf' | 'lexoffice_csv' | 'sevdesk_csv'
  period_start date not null,
  period_end date not null,
  status text not null default 'pending',          -- pending | ready | failed
  row_count int not null default 0,
  storage_url text,
  metadata jsonb not null default '{}'::jsonb,
  requested_by uuid,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_accounting_exports_period on public.accounting_exports(period_start, period_end);
create index if not exists idx_accounting_exports_status on public.accounting_exports(status);
create index if not exists idx_accounting_exports_customer on public.accounting_exports(customer_id);

alter table public.accounting_exports enable row level security;
