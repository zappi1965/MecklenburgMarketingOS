
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key,
  email text unique,
  full_name text,
  role text not null default 'customer',
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branch text,
  email text unique,
  status text default 'Lead',
  created_at timestamptz not null default now()
);

create table if not exists public.user_customer_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  access_role text default 'owner',
  created_at timestamptz not null default now(),
  primary key(user_id, customer_id)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  invoice_number text unique not null,
  amount numeric(12,2) default 0,
  status text default 'Offen',
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  title text not null,
  description text,
  status text default 'Offen',
  priority text default 'Normal',
  created_at timestamptz not null default now()
);

create table if not exists public.seo_snapshots (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  snapshot_date date default current_date,
  organic_traffic integer default 0,
  impressions integer default 0,
  clicks integer default 0,
  ctr numeric(6,2) default 0,
  top10_keywords integer default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  client_name text not null,
  appointment_date date not null,
  start_time text,
  end_time text,
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  title text,
  amount numeric(12,2) default 0,
  status text default 'Offen',
  probability integer default 50,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  title text,
  monthly_amount numeric(12,2) default 0,
  status text default 'Aktiv',
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(12,2) default 0,
  status text default 'Erfolgreich',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  title text not null,
  message text,
  created_at timestamptz not null default now()
);

create or replace function public.current_role()
returns text language sql stable as $$
  select coalesce((select role::text from public.profiles where id = auth.uid()), 'anonymous');
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.current_role() in ('admin','employee','support','sales','seo_manager','buchhaltung');
$$;

create or replace function public.can_access_customer(c_id uuid)
returns boolean language sql stable as $$
  select public.is_admin()
  or exists(select 1 from public.user_customer_access where user_id = auth.uid() and customer_id = c_id);
$$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.user_customer_access enable row level security;
alter table public.invoices enable row level security;
alter table public.tickets enable row level security;
alter table public.seo_snapshots enable row level security;
alter table public.appointments enable row level security;
alter table public.offers enable row level security;
alter table public.recurring_invoices enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (id = auth.uid() or public.is_admin());

drop policy if exists customers_read on public.customers;
create policy customers_read on public.customers for select using (public.can_access_customer(id));

drop policy if exists customers_admin_write on public.customers;
create policy customers_admin_write on public.customers for all using (public.is_admin()) with check (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['invoices','tickets','seo_snapshots','appointments','offers','recurring_invoices','payments','notifications']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select using (public.can_access_customer(customer_id))', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format('create policy %I on public.%I for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id))', t || '_write', t);
  end loop;
end $$;



create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger_type text not null,
  action_type text not null,
  enabled boolean default true,
  created_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  name text not null,
  status text default 'Getrennt',
  created_at timestamptz not null default now()
);

create table if not exists public.package_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  package_name text not null,
  status text default 'Angefragt',
  created_at timestamptz not null default now()
);

create table if not exists public.customer_tool_access (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  tool_key text not null,
  enabled boolean default false,
  created_at timestamptz not null default now(),
  unique(customer_id, tool_key)
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  title text not null,
  status text default 'Entwurf',
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  title text not null,
  status text default 'Fertig',
  created_at timestamptz not null default now()
);

alter table public.automations enable row level security;
alter table public.integrations enable row level security;
alter table public.package_requests enable row level security;
alter table public.customer_tool_access enable row level security;
alter table public.contracts enable row level security;
alter table public.reports enable row level security;

drop policy if exists automations_admin on public.automations;
create policy automations_admin on public.automations for all using (public.is_admin()) with check (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['integrations','package_requests','customer_tool_access','contracts','reports','customer_files','notification_queue','worker_jobs','workflow_runs','activity_logs']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select using (public.can_access_customer(customer_id))', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format('create policy %I on public.%I for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id))', t || '_write', t);
  end loop;
end $$;


create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid null references public.customers(id) on delete cascade,
  action text not null,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid null references public.customers(id) on delete cascade,
  workflow_name text not null,
  status text default 'queued',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid null references public.customers(id) on delete cascade,
  title text not null,
  message text,
  channel text default 'in_app',
  status text default 'queued',
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid null references public.customers(id) on delete cascade,
  job_type text not null,
  status text default 'queued',
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_files (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  name text not null,
  file_type text default 'general',
  url text,
  storage_path text,
  version integer default 1,
  created_at timestamptz not null default now()
);

alter table public.activity_logs enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.notification_queue enable row level security;
alter table public.worker_jobs enable row level security;
alter table public.customer_files enable row level security;

drop policy if exists activity_logs_read on public.activity_logs;
create policy activity_logs_read on public.activity_logs for select using (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists activity_logs_write on public.activity_logs;
create policy activity_logs_write on public.activity_logs for all using (customer_id is null or public.can_access_customer(customer_id)) with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists workflow_runs_read on public.workflow_runs;
create policy workflow_runs_read on public.workflow_runs for select using (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists workflow_runs_write on public.workflow_runs;
create policy workflow_runs_write on public.workflow_runs for all using (customer_id is null or public.can_access_customer(customer_id)) with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists notification_queue_read on public.notification_queue;
create policy notification_queue_read on public.notification_queue for select using (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists notification_queue_write on public.notification_queue;
create policy notification_queue_write on public.notification_queue for all using (customer_id is null or public.can_access_customer(customer_id)) with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists worker_jobs_read on public.worker_jobs;
create policy worker_jobs_read on public.worker_jobs for select using (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists worker_jobs_write on public.worker_jobs;
create policy worker_jobs_write on public.worker_jobs for all using (customer_id is null or public.can_access_customer(customer_id)) with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists customer_files_read on public.customer_files;
create policy customer_files_read on public.customer_files for select using (public.can_access_customer(customer_id));

drop policy if exists customer_files_write on public.customer_files;
create policy customer_files_write on public.customer_files for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));


insert into storage.buckets (id, name, public)
values ('uploads','uploads',true),('invoices','invoices',true),('reports','reports',true)
on conflict (id) do update set public = true;


-- Stability indexes
create index if not exists idx_invoices_customer_created on public.invoices(customer_id, created_at desc);
create index if not exists idx_tickets_customer_created on public.tickets(customer_id, created_at desc);
create index if not exists idx_seo_snapshots_customer_date on public.seo_snapshots(customer_id, snapshot_date desc);
create index if not exists idx_appointments_customer_date on public.appointments(customer_id, appointment_date desc);
create index if not exists idx_offers_customer_status on public.offers(customer_id, status);
create index if not exists idx_activity_logs_customer_created on public.activity_logs(customer_id, created_at desc);
create index if not exists idx_notifications_customer_created on public.notifications(customer_id, created_at desc);
create index if not exists idx_worker_jobs_status_created on public.worker_jobs(status, created_at asc);

-- Basic value constraints
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_amount_nonnegative') then
    alter table public.invoices add constraint invoices_amount_nonnegative check (amount >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'offers_amount_nonnegative') then
    alter table public.offers add constraint offers_amount_nonnegative check (amount >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'offers_probability_range') then
    alter table public.offers add constraint offers_probability_range check (probability >= 0 and probability <= 100);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'seo_ctr_nonnegative') then
    alter table public.seo_snapshots add constraint seo_ctr_nonnegative check (ctr >= 0);
  end if;
end $$;


create table if not exists public.package_catalog (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  price_monthly numeric(12,2) not null default 0,
  currency text default 'EUR',
  interval text default 'month',
  tools text[] not null default '{}',
  limits jsonb not null default '{}'::jsonb,
  active boolean default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid unique references public.customers(id) on delete cascade,
  package_name text not null,
  status text default 'active',
  price_monthly numeric(12,2) default 0,
  currency text default 'EUR',
  billing_interval text default 'month',
  provider text,
  provider_subscription_id text,
  started_at timestamptz default now(),
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.license_entitlements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid unique references public.customers(id) on delete cascade,
  package_name text not null,
  tools text[] not null default '{}',
  limits jsonb not null default '{}'::jsonb,
  status text default 'active',
  created_at timestamptz not null default now()
);

alter table public.package_catalog enable row level security;
alter table public.customer_subscriptions enable row level security;
alter table public.license_entitlements enable row level security;

drop policy if exists package_catalog_read on public.package_catalog;
create policy package_catalog_read on public.package_catalog for select using (true);

drop policy if exists package_catalog_admin on public.package_catalog;
create policy package_catalog_admin on public.package_catalog for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists customer_subscriptions_read on public.customer_subscriptions;
create policy customer_subscriptions_read on public.customer_subscriptions for select using (public.can_access_customer(customer_id));

drop policy if exists customer_subscriptions_write on public.customer_subscriptions;
create policy customer_subscriptions_write on public.customer_subscriptions for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

drop policy if exists license_entitlements_read on public.license_entitlements;
create policy license_entitlements_read on public.license_entitlements for select using (public.can_access_customer(customer_id));

drop policy if exists license_entitlements_write on public.license_entitlements;
create policy license_entitlements_write on public.license_entitlements for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

insert into public.package_catalog (name, price_monthly, currency, interval, tools, limits, active)
values
('Starter',199,'EUR','month',array['crm','tickets','invoices','files','reports_basic'],'{"users":1,"customers":25,"reports_per_month":2,"automations":0}'::jsonb,true),
('Growth',499,'EUR','month',array['crm','tickets','invoices','files','reports','seo','booking','pipeline','integrations','kpi','activity'],'{"users":3,"customers":100,"reports_per_month":10,"automations":5}'::jsonb,true),
('Premium',899,'EUR','month',array['crm','tickets','invoices','files','reports','seo','booking','pipeline','integrations','kpi','activity','automations','workflows','permissions'],'{"users":10,"customers":500,"reports_per_month":50,"automations":25}'::jsonb,true)
on conflict (name) do update set
price_monthly = excluded.price_monthly,
tools = excluded.tools,
limits = excluded.limits,
active = excluded.active;


alter table public.contracts add column if not exists package_name text;
alter table public.contracts add column if not exists monthly_amount numeric(12,2) default 0;
alter table public.contracts add column if not exists contract_payload jsonb not null default '{}'::jsonb;


create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid null references public.customers(id) on delete cascade,
  recipient text,
  subject text,
  html text,
  status text default 'prepared',
  provider text,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger_type text not null,
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  enabled boolean default true,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid null references public.customers(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.customer_contacts enable row level security;
alter table public.customer_notes enable row level security;
alter table public.email_outbox enable row level security;
alter table public.workflow_rules enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists customer_contacts_read on public.customer_contacts;
create policy customer_contacts_read on public.customer_contacts for select using (public.can_access_customer(customer_id));
drop policy if exists customer_contacts_write on public.customer_contacts;
create policy customer_contacts_write on public.customer_contacts for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

drop policy if exists customer_notes_read on public.customer_notes;
create policy customer_notes_read on public.customer_notes for select using (public.can_access_customer(customer_id));
drop policy if exists customer_notes_write on public.customer_notes;
create policy customer_notes_write on public.customer_notes for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

drop policy if exists email_outbox_read on public.email_outbox;
create policy email_outbox_read on public.email_outbox for select using (customer_id is null or public.can_access_customer(customer_id));
drop policy if exists email_outbox_write on public.email_outbox;
create policy email_outbox_write on public.email_outbox for all using (customer_id is null or public.can_access_customer(customer_id)) with check (customer_id is null or public.can_access_customer(customer_id));

drop policy if exists workflow_rules_admin on public.workflow_rules;
create policy workflow_rules_admin on public.workflow_rules for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists audit_events_read on public.audit_events;
create policy audit_events_read on public.audit_events for select using (customer_id is null or public.can_access_customer(customer_id));
