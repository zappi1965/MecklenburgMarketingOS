-- CRM + Customer Environment Restore v2

create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_files (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  platform text not null default 'Google',
  author_name text,
  rating integer not null check (rating between 1 and 5),
  text text,
  created_at timestamptz not null default now()
);

alter table public.customer_contacts enable row level security;
alter table public.customer_notes enable row level security;
alter table public.customer_files enable row level security;
alter table public.reviews enable row level security;

drop policy if exists customer_contacts_read on public.customer_contacts;
create policy customer_contacts_read on public.customer_contacts for select using (public.can_access_customer(customer_id));
drop policy if exists customer_contacts_write on public.customer_contacts;
create policy customer_contacts_write on public.customer_contacts for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

drop policy if exists customer_notes_read on public.customer_notes;
create policy customer_notes_read on public.customer_notes for select using (public.can_access_customer(customer_id));
drop policy if exists customer_notes_write on public.customer_notes;
create policy customer_notes_write on public.customer_notes for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

drop policy if exists customer_files_read on public.customer_files;
create policy customer_files_read on public.customer_files for select using (public.can_access_customer(customer_id));
drop policy if exists customer_files_write on public.customer_files;
create policy customer_files_write on public.customer_files for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select using (public.can_access_customer(customer_id));
drop policy if exists reviews_write on public.reviews;
create policy reviews_write on public.reviews for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

insert into public.customers(name, contact_name, email, phone, status, branch, revenue, rating)
values
('Demo Friseur Rostock','Max Mustermann','demo-friseur@example.de','0381 123456','Aktiv','Beauty',2480,4.8),
('Echter Kunde Mustermann','Erika Mustermann','kontakt@mustermann.de','0381 000000','Aktiv','',0,0)
on conflict do nothing;

insert into public.email_template_categories(name)
values ('Bewertungsanfrage'),('Mahnung'),('Monatsreport'),('Terminbestätigung')
on conflict(name) do nothing;