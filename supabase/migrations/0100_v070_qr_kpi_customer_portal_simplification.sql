-- MMOS V070 Customer Portal Simplification + QR KPI compatibility
-- Keine destruktiven Änderungen. Stellt sicher, dass QR/Loyalty KPI-Tabellen existieren.

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  loyalty_customer_id uuid,
  qr_campaign_id uuid,
  points numeric not null default 0,
  type text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  loyalty_customer_id uuid,
  reward_id uuid,
  qr_campaign_id uuid,
  points_spent numeric not null default 0,
  status text not null default 'Eingelöst',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_loyalty_transactions_customer_id on public.loyalty_transactions(customer_id);
create index if not exists idx_loyalty_reward_redemptions_customer_id on public.loyalty_reward_redemptions(customer_id);

alter table public.loyalty_transactions enable row level security;
alter table public.loyalty_reward_redemptions enable row level security;

drop policy if exists authenticated_loyalty_transactions on public.loyalty_transactions;
create policy authenticated_loyalty_transactions on public.loyalty_transactions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists authenticated_loyalty_reward_redemptions on public.loyalty_reward_redemptions;
create policy authenticated_loyalty_reward_redemptions on public.loyalty_reward_redemptions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
