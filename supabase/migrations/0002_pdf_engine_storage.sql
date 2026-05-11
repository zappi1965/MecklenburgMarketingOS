-- PDF Engine Storage + report/reminder compatibility
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', true)
on conflict (id) do nothing;

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  level text not null default '1. Mahnung',
  fee numeric(12,2) not null default 15,
  pdf_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  selected_kpis text[] not null default '{}',
  pdf_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.reminders enable row level security;
alter table public.reports enable row level security;

drop policy if exists reminders_admin_all on public.reminders;
create policy reminders_admin_all on public.reminders
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists reports_access on public.reports;
create policy reports_access on public.reports
for select using (public.can_access_customer(customer_id));

drop policy if exists reports_admin_write on public.reports;
create policy reports_admin_write on public.reports
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public PDF read" on storage.objects;
create policy "Public PDF read"
on storage.objects for select
using (bucket_id = 'pdfs');

drop policy if exists "Service role PDF write" on storage.objects;
create policy "Service role PDF write"
on storage.objects for all
using (bucket_id = 'pdfs')
with check (bucket_id = 'pdfs');