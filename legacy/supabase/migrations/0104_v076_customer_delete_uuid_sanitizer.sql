-- MMOS V076 Customer Delete + UUID Sanitizer
-- Optional schema hardening for safer customer deletion.

alter table if exists public.customers
  add column if not exists is_deleted boolean not null default false;

alter table if exists public.customers
  add column if not exists deleted_at timestamptz;

alter table if exists public.customers
  add column if not exists deleted_reason text;

create index if not exists idx_customers_is_deleted on public.customers(is_deleted);
