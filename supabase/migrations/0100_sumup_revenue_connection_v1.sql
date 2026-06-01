-- 0100_sumup_revenue_connection_v1.sql
-- SumUp V1 / Umsatz & Zahlungen
-- Keine Kassenersetzung: Nur Umsatz- und Transaktionsdaten fuer MMOS-Auswertung.

create index if not exists idx_v33_records_pos_configs
  on public.v33_functional_records(customer_id, resource, local_id)
  where resource = 'pos_provider_configs';

create index if not exists idx_pos_transactions_customer_provider_time
  on public.pos_transactions(customer_id, provider, transaction_time desc);

create index if not exists idx_pos_transactions_customer_status_time
  on public.pos_transactions(customer_id, status, transaction_time desc);

comment on table public.pos_transactions is
  'Extern importierte POS-/Zahlungsdaten, z. B. SumUp. MMOS ist kein Kassensystem und loest in V1 keine Zahlungen aus.';
