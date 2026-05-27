-- Quick-Win-Bundle: Newsletter und Vouchers.
-- Wallet-Pass benoetigt keine eigene Tabelle (Daten werden zur Laufzeit
-- aus loyalty_customers + customers gerendert).
-- Idempotent.

create extension if not exists pgcrypto;

-- Newsletter -----------------------------------------------------------------

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  email text not null,
  status text not null default 'pending', -- pending | active | unsubscribed
  source text default 'web',
  confirm_token text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (customer_id, email)
);

create index if not exists idx_newsletter_subscribers_customer on public.newsletter_subscribers(customer_id);
create index if not exists idx_newsletter_subscribers_email on public.newsletter_subscribers(email);
create index if not exists idx_newsletter_subscribers_status on public.newsletter_subscribers(status);
create index if not exists idx_newsletter_subscribers_confirm_token on public.newsletter_subscribers(confirm_token);

create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  subject text not null,
  body text not null,
  audience text not null default 'active',
  status text not null default 'draft', -- draft | sent
  created_by uuid,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_newsletter_campaigns_customer on public.newsletter_campaigns(customer_id);

create table if not exists public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  email text not null,
  status text not null default 'queued', -- queued | sent | bounced | failed
  delivery_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_newsletter_deliveries_campaign on public.newsletter_deliveries(campaign_id);
create index if not exists idx_newsletter_deliveries_status on public.newsletter_deliveries(status);

alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_campaigns enable row level security;
alter table public.newsletter_deliveries enable row level security;

-- Vouchers / Geschenkgutscheine ----------------------------------------------

create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  code text not null unique,
  value_eur numeric(12,2) not null default 0,
  value_points integer not null default 0,
  recipient_email text,
  recipient_name text,
  note text,
  status text not null default 'active', -- active | redeemed | expired
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by_loyalty_customer_id uuid,
  redeemed_by_user_id uuid,
  redemption_metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_vouchers_customer on public.vouchers(customer_id);
create index if not exists idx_vouchers_code on public.vouchers(code);
create index if not exists idx_vouchers_status on public.vouchers(status);
create index if not exists idx_vouchers_expires on public.vouchers(expires_at);

alter table public.vouchers enable row level security;
