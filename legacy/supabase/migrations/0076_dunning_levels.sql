-- Mahnstufen-Konfigurator (Dunning).
-- Pro Customer mehrere Stufen mit Tagen-ueberfaellig, Aufschlag,
-- Aktionstyp und Template.
-- Idempotent.

create table if not exists public.dunning_levels (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  level int not null,                              -- 1, 2, 3 ...
  days_overdue int not null,                       -- ab wie vielen Tagen ueber due_date
  fee_eur numeric(12,2) not null default 0,
  action text not null default 'reminder',         -- reminder | warning | escalation | inkasso
  template text,                                   -- Mail-/Brief-Template Key
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, level)
);

create index if not exists idx_dunning_levels_customer on public.dunning_levels(customer_id);

create table if not exists public.dunning_runs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null,
  customer_id uuid references public.customers(id) on delete set null,
  dunning_level_id uuid references public.dunning_levels(id) on delete set null,
  level int not null,
  days_overdue int not null,
  fee_charged numeric(12,2) not null default 0,
  status text not null default 'queued',           -- queued | sent | failed
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (invoice_id, level)
);

create index if not exists idx_dunning_runs_invoice on public.dunning_runs(invoice_id);
create index if not exists idx_dunning_runs_status on public.dunning_runs(status);

alter table public.dunning_levels enable row level security;
alter table public.dunning_runs enable row level security;

-- Default-Mahnstufen (werden nur bei leerem Customer angelegt — wird vom
-- Service beim ersten Zugriff per ensureDefaults gemacht, nicht hier).
