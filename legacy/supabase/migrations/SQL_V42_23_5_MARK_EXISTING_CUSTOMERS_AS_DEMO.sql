-- MMOS V42.23.5 – Mark existing customers as demo customers
-- Purpose:
--   All customers that already exist at the time this migration is run are treated as demo customers.
--   They will be hidden from normal Live CRM/customer selectors and remain available only in the internal Demo Umgebung.
--   Newly created customers after this migration keep is_demo = false by default.

create table if not exists public.schema_migrations_mmos (
  version text primary key,
  description text,
  applied_at timestamptz default now()
);

alter table public.customers
  add column if not exists is_demo boolean not null default false;

alter table public.customers
  add column if not exists demo_marked_at timestamptz;

alter table public.customers
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Mark all customers that are already present now as demo.
-- Future customers are not affected unless this migration is run again deliberately.
update public.customers
set
  is_demo = true,
  demo_marked_at = coalesce(demo_marked_at, now()),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'demo_reason', 'marked_as_existing_customer_demo_by_v42_23_5',
    'demo_visible_only_in', 'Adminbereich > Übersicht > Demo Umgebung'
  )
where coalesce(is_demo, false) = false;

insert into public.schema_migrations_mmos (version, description)
values (
  'V42.23.5_MARK_EXISTING_CUSTOMERS_AS_DEMO',
  'Marks all customers existing at migration time as demo customers so they are hidden from normal Live CRM/customer selectors.'
)
on conflict (version) do update set
  description = excluded.description,
  applied_at = now();
