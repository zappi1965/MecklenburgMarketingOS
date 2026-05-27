-- Loyalty-Staff-Scan: zusaetzliche Felder fuer Idempotenz + Transaktionstyp.
-- Idempotent.

alter table if exists public.loyalty_transactions
  add column if not exists transaction_type text not null default 'manual',
  add column if not exists idempotency_key text,
  add column if not exists qr_campaign_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_loyalty_transactions_idempotency
  on public.loyalty_transactions(loyalty_customer_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_loyalty_transactions_type
  on public.loyalty_transactions(transaction_type);

-- last_scan_at auf loyalty_customers (falls noch nicht da).
alter table if exists public.loyalty_customers
  add column if not exists last_scan_at timestamptz;
