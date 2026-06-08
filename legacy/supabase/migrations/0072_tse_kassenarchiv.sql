-- TSE (Technische Sicherheitseinrichtung) + GoBD-Kassenarchiv.
-- Erfuellt Anforderungen der KassenSichV / KassenSichV (Deutschland)
-- fuer jede bar-/kartenbasierte Transaktion.
-- Idempotent.

create extension if not exists pgcrypto;

create table if not exists public.tse_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  source_type text not null,                       -- 'invoice' | 'appointment' | 'voucher_redemption'
  source_id uuid,
  transaction_number bigint not null,              -- streng aufsteigend pro tse_device
  tse_device_id text not null,
  signature_counter bigint not null,
  start_time timestamptz not null,
  log_time timestamptz not null default now(),
  process_type text not null default 'Kassenbeleg-V1',
  process_data text not null,                      -- raw process data string per KassenSichV
  signature_algorithm text not null default 'ecdsa-plain-SHA256',
  signed_payload text not null,                    -- base64-signed string from TSE
  signature_value text not null,                   -- base64 signature
  qr_signature text,                               -- QR-code payload for receipt
  provider text not null default 'mock',           -- mock | fiskaly | dtrust | epson
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tse_transactions_customer on public.tse_transactions(customer_id);
create index if not exists idx_tse_transactions_source on public.tse_transactions(source_type, source_id);
create index if not exists idx_tse_transactions_log_time on public.tse_transactions(log_time desc);
create unique index if not exists idx_tse_transactions_counter on public.tse_transactions(tse_device_id, signature_counter);

create table if not exists public.kassenarchiv_exports (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'pending',          -- pending | building | ready | failed
  format text not null default 'gobd-zip',
  storage_url text,
  checksum_sha256 text,
  transaction_count int not null default 0,
  exported_at timestamptz,
  retain_until date,                                -- 10 Jahre ab Periodende
  created_at timestamptz not null default now()
);

create index if not exists idx_kassenarchiv_exports_period on public.kassenarchiv_exports(period_start, period_end);
create index if not exists idx_kassenarchiv_exports_status on public.kassenarchiv_exports(status);

alter table public.tse_transactions enable row level security;
alter table public.kassenarchiv_exports enable row level security;
