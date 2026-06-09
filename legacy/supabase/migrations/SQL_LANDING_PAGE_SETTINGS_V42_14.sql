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
  show_public_demo_button boolean default true,
  package_headline text,
  package_subline text,
  footer_note text,
  packages jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.landing_page_settings add column if not exists show_public_demo_button boolean default true;

