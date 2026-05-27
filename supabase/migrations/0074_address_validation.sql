-- Adress-Qualitaet + Geokodierung + E-Mail-Verifikation.
-- Idempotent.

alter table if exists public.customers
  add column if not exists geo_lat numeric(10,7),
  add column if not exists geo_lng numeric(10,7),
  add column if not exists address_quality_score int,
  add column if not exists address_validated_at timestamptz,
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verified_at timestamptz;

create index if not exists idx_customers_geo on public.customers(geo_lat, geo_lng);
create index if not exists idx_customers_address_quality on public.customers(address_quality_score);

-- Optionale Wegwerf-E-Mail-Domain-Blocklist im DB-Format, damit auch
-- non-Code-Updates moeglich sind.
create table if not exists public.disposable_email_domains (
  domain text primary key,
  source text default 'manual',
  created_at timestamptz not null default now()
);

-- Initial-Seed mit den haeufigsten Wegwerf-Anbietern.
insert into public.disposable_email_domains (domain, source) values
  ('mailinator.com', 'seed'),
  ('10minutemail.com', 'seed'),
  ('guerrillamail.com', 'seed'),
  ('temp-mail.org', 'seed'),
  ('throwaway.email', 'seed'),
  ('yopmail.com', 'seed'),
  ('trashmail.com', 'seed'),
  ('getnada.com', 'seed'),
  ('sharklasers.com', 'seed'),
  ('maildrop.cc', 'seed')
on conflict (domain) do nothing;
