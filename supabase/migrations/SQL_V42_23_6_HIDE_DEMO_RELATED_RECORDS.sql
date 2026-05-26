-- MMOS V42.23.6 Hide demo-related records from Live dashboards
-- Purpose: mark all customer-scoped records belonging to demo customers as demo records.

alter table if exists public.customers
  add column if not exists is_demo boolean not null default false;

-- Ensure migration table is compatible with existing MMOS variants.
create table if not exists public.schema_migrations_mmos (
  version text primary key,
  file_name text not null,
  applied_at timestamptz default now()
);

alter table public.schema_migrations_mmos
  add column if not exists file_name text;

alter table public.schema_migrations_mmos
  add column if not exists description text;

alter table public.schema_migrations_mmos
  add column if not exists applied_at timestamptz default now();

-- Mark all customer-scoped tables/records linked to demo customers.
do $$
declare
  tbl text;
begin
  for tbl in
    select distinct c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'customer_id'
      and t.table_type = 'BASE TABLE'
      and c.table_name not in ('customers')
  loop
    execute format('alter table public.%I add column if not exists is_demo boolean not null default false', tbl);
    execute format($fmt$
      update public.%I
      set is_demo = true
      where customer_id is not null
        and customer_id::text in (
          select id::text from public.customers where coalesce(is_demo,false) = true
        )
    $fmt$, tbl);
  end loop;
end $$;

-- Mark invoice-linked rows too, e.g. dunning cases or payment records with invoice_id but no customer_id.
do $$
declare
  tbl text;
begin
  for tbl in
    select distinct c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'invoice_id'
      and t.table_type = 'BASE TABLE'
  loop
    execute format('alter table public.%I add column if not exists is_demo boolean not null default false', tbl);
    execute format($fmt$
      update public.%I
      set is_demo = true
      where invoice_id is not null
        and invoice_id::text in (
          select id::text from public.invoices where coalesce(is_demo,false) = true
        )
    $fmt$, tbl);
  end loop;
exception when undefined_table then
  -- invoices may not exist in very old installs; ignore safely.
  null;
end $$;

-- Optional: mark activity logs that reference demo customers directly.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='activity_logs'
  ) then
    alter table public.activity_logs add column if not exists is_demo boolean not null default false;
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='activity_logs' and column_name='ref_table'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='activity_logs' and column_name='ref_id'
    ) then
      update public.activity_logs
      set is_demo = true
      where ref_table = 'customers'
        and ref_id::text in (select id::text from public.customers where coalesce(is_demo,false)=true);
    end if;
  end if;
end $$;

insert into public.schema_migrations_mmos (
  version,
  file_name,
  description,
  applied_at
)
values (
  'V42.23.6_HIDE_DEMO_RELATED_RECORDS',
  'SQL_V42_23_6_HIDE_DEMO_RELATED_RECORDS.sql',
  'Marks tickets, package requests, invoices, reports, notifications and other customer-scoped records of demo customers as demo so Live views remain clean.',
  now()
)
on conflict do nothing;
