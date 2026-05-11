-- Registrierung / Verkaufsseiten-Zugang

create table if not exists public.customer_modules (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  unique(customer_id, module_key)
);

alter table public.customer_modules enable row level security;

drop policy if exists customer_modules_read on public.customer_modules;
create policy customer_modules_read on public.customer_modules
for select using (public.can_access_customer(customer_id));

drop policy if exists customer_modules_admin_write on public.customer_modules;
create policy customer_modules_admin_write on public.customer_modules
for all using (public.is_admin()) with check (public.is_admin());