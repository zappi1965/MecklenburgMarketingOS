-- V42.15: Firmenlogo-Felder für die öffentliche Haupt-Landingpage
alter table public.landing_page_settings
  add column if not exists logo_url text,
  add column if not exists logo_alt text,
  add column if not exists logo_mark_text text,
  add column if not exists logo_show_text boolean not null default true;

update public.landing_page_settings
set
  logo_alt = coalesce(logo_alt, 'Mecklenburg Marketing Logo'),
  logo_mark_text = coalesce(logo_mark_text, 'M'),
  logo_show_text = coalesce(logo_show_text, true)
where id = 'main' or scope = 'public_home';
