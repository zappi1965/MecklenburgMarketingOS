-- MMOS V066 Package Matrix Landing Settings
-- Sichert, dass landing_page_settings Pakete inkl. price/setupFee speichern kann.

create table if not exists public.landing_page_settings (
  id text primary key,
  scope text not null default 'public_home',
  brand_name text,
  nav_title text,
  logo_url text,
  logo_alt text,
  logo_mark_text text,
  logo_show_text boolean not null default true,
  hero_title text,
  hero_subline text,
  primary_cta_label text,
  secondary_cta_label text,
  package_headline text,
  package_subline text,
  footer_note text,
  packages jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.landing_page_settings enable row level security;

drop policy if exists authenticated_landing_page_settings on public.landing_page_settings;
create policy authenticated_landing_page_settings
on public.landing_page_settings
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists public_read_landing_page_settings on public.landing_page_settings;
create policy public_read_landing_page_settings
on public.landing_page_settings
for select
using (true);

insert into public.landing_page_settings (id, scope, packages, created_at, updated_at)
values (
  'main',
  'public_home',
  '{
    "Starter":{"headline":"Starter","price":199,"setupFee":399},
    "Growth":{"headline":"Growth","price":499,"setupFee":749},
    "Premium":{"headline":"Premium","price":899,"setupFee":1199}
  }'::jsonb,
  now(),
  now()
)
on conflict (id) do update
set
  scope = excluded.scope,
  packages = coalesce(public.landing_page_settings.packages, '{}'::jsonb) || excluded.packages,
  updated_at = now();
