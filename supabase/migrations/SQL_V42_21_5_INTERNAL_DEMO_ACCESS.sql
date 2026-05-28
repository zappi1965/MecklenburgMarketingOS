-- MMOS V42.21.5 Internal Demo Access
-- Macht den öffentlichen Demo-Button in den Landingpage-Einstellungen steuerbar.
-- Kann mehrfach ausgeführt werden.

alter table if exists public.landing_page_settings
  add column if not exists show_public_demo_button boolean default true;
