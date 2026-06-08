-- MMOS v16 UX Flow Fix Patch
alter table public.integrations add column if not exists api_key text;
alter table public.invoices add column if not exists service_type text;
alter table public.customers add column if not exists package_name text default 'Starter';
alter table public.offers add column if not exists package_name text;
alter table public.automations add column if not exists config jsonb not null default '{}'::jsonb;
