
-- MMOS v18 Booking Categories Package Tools Fix

alter table public.customers add column if not exists contact_person text;

create table if not exists public.customer_service_categories (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  description text,
  price numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.customer_service_categories enable row level security;

drop policy if exists customer_service_categories_access on public.customer_service_categories;
create policy customer_service_categories_access on public.customer_service_categories
for all using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

alter table public.appointments add column if not exists notes text;
alter table public.appointments add column if not exists end_time text;
alter table public.invoices add column if not exists service_type text;
alter table public.invoices add column if not exists is_demo boolean default false;

create table if not exists public.customer_seo_metrics (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customers(id) on delete cascade,
 keyword text,
 ranking integer,
 visibility integer,
 clicks integer,
 impressions integer,
 created_at timestamptz default now()
);

create table if not exists public.review_funnel_stats (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customers(id) on delete cascade,
 positive_reviews integer default 0,
 negative_reviews integer default 0,
 redirected_to_google integer default 0,
 internal_feedback integer default 0,
 created_at timestamptz default now()
);

create table if not exists public.client_success_events (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customers(id) on delete cascade,
 score integer,
 note text,
 created_at timestamptz default now()
);

alter table public.customer_seo_metrics enable row level security;
alter table public.review_funnel_stats enable row level security;
alter table public.client_success_events enable row level security;

drop policy if exists customer_seo_metrics_access on public.customer_seo_metrics;
create policy customer_seo_metrics_access on public.customer_seo_metrics
for all using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

drop policy if exists review_funnel_stats_access on public.review_funnel_stats;
create policy review_funnel_stats_access on public.review_funnel_stats
for all using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

drop policy if exists client_success_events_access on public.client_success_events;
create policy client_success_events_access on public.client_success_events
for all using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));
