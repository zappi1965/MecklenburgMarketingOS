-- SEO, Mahnungen, Uploads und Erweiterungen

create table if not exists public.seo_traffic (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  month text not null,
  organic_traffic integer default 0,
  impressions integer default 0,
  clicks integer default 0,
  ctr numeric(6,2) default 0,
  avg_position numeric(6,2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.seo_keywords (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  keyword text not null,
  position numeric(6,2) default 0,
  impressions integer default 0,
  clicks integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.seo_checks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  status text default 'Offen',
  description text,
  created_at timestamptz default now()
);

create table if not exists public.seo_recommendations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  priority text default 'Mittel',
  description text,
  created_at timestamptz default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  reminder_number text,
  level text default '1. Mahnung',
  fee numeric(12,2) default 15,
  pdf_url text,
  created_at timestamptz default now()
);

create table if not exists public.customer_uploads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  area text not null,
  file_name text not null,
  file_url text,
  created_at timestamptz default now()
);

alter table public.seo_traffic enable row level security;
alter table public.seo_keywords enable row level security;
alter table public.seo_checks enable row level security;
alter table public.seo_recommendations enable row level security;
alter table public.reminders enable row level security;
alter table public.customer_uploads enable row level security;

do $$
declare t text;
begin
  foreach t in array array['seo_traffic','seo_keywords','seo_checks','seo_recommendations','reminders','customer_uploads']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_read', t);
    execute format('create policy %I on public.%I for select using (public.can_access_customer(customer_id))', t||'_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_write', t);
    execute format('create policy %I on public.%I for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id))', t||'_write', t);
  end loop;
end $$;

-- Seed Demo SEO
insert into public.seo_traffic(customer_id,month,organic_traffic,impressions,clicks,ctr,avg_position)
select id, 'Jan', 420, 9400, 360, 3.83, 14.2 from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;
insert into public.seo_traffic(customer_id,month,organic_traffic,impressions,clicks,ctr,avg_position)
select id, 'Feb', 520, 11000, 420, 3.82, 12.8 from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;
insert into public.seo_traffic(customer_id,month,organic_traffic,impressions,clicks,ctr,avg_position)
select id, 'Mär', 690, 13800, 610, 4.42, 10.1 from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;

insert into public.seo_keywords(customer_id,keyword,position,impressions,clicks)
select id,'friseur rostock',3.2,4200,310 from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;
insert into public.seo_keywords(customer_id,keyword,position,impressions,clicks)
select id,'barber rostock',5.8,2500,130 from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;
insert into public.seo_keywords(customer_id,keyword,position,impressions,clicks)
select id,'fade cut rostock',2.1,1200,96 from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;

insert into public.seo_checks(customer_id,title,status,description)
select id,'Ladezeit mobil prüfen','In Arbeit','Mobile Ladezeit liegt über Zielwert.' from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;
insert into public.seo_checks(customer_id,title,status,description)
select id,'Google Business Kategorien optimieren','Offen','Sekundärkategorien ergänzen.' from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;

insert into public.seo_recommendations(customer_id,title,priority,description)
select id,'Landingpage für Fade Cut erstellen','Hoch','Suchvolumen und Conversion-Potenzial vorhanden.' from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;