-- MMOS V081: QR/CRM/Landing Hotfix
-- Fixes:
-- - landing_page_settings.demo_audit / rich landing fields for package matrix and landing editor
-- - customer soft-delete columns for reliable CRM deletion
-- - loyalty/QR addon columns for Starter + Loyalty customers

create extension if not exists "pgcrypto";

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
  package_cta_label text,
  package_addon_headline text,
  package_addon_subline text,
  package_addon_note text,
  package_addon_cta_label text,
  package_form_title text,
  package_form_subline text,
  package_form_success text,
  package_form_submit_label text,
  optional_tools_headline text,
  optional_tools_subline text,
  proof_headline text,
  proof_subline text,
  monthly_headline text,
  monthly_subline text,
  portal_preview_headline text,
  portal_preview_subline text,
  trust_headline text,
  trust_subline text,
  footer_note text,
  packages jsonb not null default '{}'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  example_metrics jsonb not null default '[]'::jsonb,
  optional_tools jsonb not null default '[]'::jsonb,
  demo_audit jsonb not null default '{}'::jsonb,
  monthly_items jsonb not null default '[]'::jsonb,
  portal_preview_items jsonb not null default '[]'::jsonb,
  trust_points jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.landing_page_settings add column if not exists brand_name text;
alter table public.landing_page_settings add column if not exists nav_title text;
alter table public.landing_page_settings add column if not exists logo_url text;
alter table public.landing_page_settings add column if not exists logo_alt text;
alter table public.landing_page_settings add column if not exists logo_mark_text text;
alter table public.landing_page_settings add column if not exists logo_show_text boolean not null default true;
alter table public.landing_page_settings add column if not exists hero_title text;
alter table public.landing_page_settings add column if not exists hero_subline text;
alter table public.landing_page_settings add column if not exists primary_cta_label text;
alter table public.landing_page_settings add column if not exists secondary_cta_label text;
alter table public.landing_page_settings add column if not exists show_public_demo_button boolean default true;
alter table public.landing_page_settings add column if not exists package_headline text;
alter table public.landing_page_settings add column if not exists package_subline text;
alter table public.landing_page_settings add column if not exists package_cta_label text;
alter table public.landing_page_settings add column if not exists package_addon_headline text;
alter table public.landing_page_settings add column if not exists package_addon_subline text;
alter table public.landing_page_settings add column if not exists package_addon_note text;
alter table public.landing_page_settings add column if not exists package_addon_cta_label text;
alter table public.landing_page_settings add column if not exists package_form_title text;
alter table public.landing_page_settings add column if not exists package_form_subline text;
alter table public.landing_page_settings add column if not exists package_form_success text;
alter table public.landing_page_settings add column if not exists package_form_submit_label text;
alter table public.landing_page_settings add column if not exists optional_tools_headline text;
alter table public.landing_page_settings add column if not exists optional_tools_subline text;
alter table public.landing_page_settings add column if not exists proof_headline text;
alter table public.landing_page_settings add column if not exists proof_subline text;
alter table public.landing_page_settings add column if not exists monthly_headline text;
alter table public.landing_page_settings add column if not exists monthly_subline text;
alter table public.landing_page_settings add column if not exists portal_preview_headline text;
alter table public.landing_page_settings add column if not exists portal_preview_subline text;
alter table public.landing_page_settings add column if not exists trust_headline text;
alter table public.landing_page_settings add column if not exists trust_subline text;
alter table public.landing_page_settings add column if not exists footer_note text;
alter table public.landing_page_settings add column if not exists packages jsonb not null default '{}'::jsonb;
alter table public.landing_page_settings add column if not exists steps jsonb not null default '[]'::jsonb;
alter table public.landing_page_settings add column if not exists faq jsonb not null default '[]'::jsonb;
alter table public.landing_page_settings add column if not exists example_metrics jsonb not null default '[]'::jsonb;
alter table public.landing_page_settings add column if not exists optional_tools jsonb not null default '[]'::jsonb;
alter table public.landing_page_settings add column if not exists demo_audit jsonb not null default '{}'::jsonb;
alter table public.landing_page_settings add column if not exists monthly_items jsonb not null default '[]'::jsonb;
alter table public.landing_page_settings add column if not exists portal_preview_items jsonb not null default '[]'::jsonb;
alter table public.landing_page_settings add column if not exists trust_points jsonb not null default '[]'::jsonb;
alter table public.landing_page_settings add column if not exists created_at timestamptz not null default now();
alter table public.landing_page_settings add column if not exists updated_at timestamptz not null default now();

alter table if exists public.customers add column if not exists is_deleted boolean not null default false;
alter table if exists public.customers add column if not exists deleted_at timestamptz;
alter table if exists public.customers add column if not exists deleted_reason text;
create index if not exists idx_customers_is_deleted_v081 on public.customers(is_deleted);

alter table if exists public.qr_campaigns add column if not exists points_per_scan integer default 0;
alter table if exists public.qr_campaigns add column if not exists require_rescan_for_points boolean default true;
alter table if exists public.qr_campaigns add column if not exists rotate_qr_after_scan boolean default false;
alter table if exists public.qr_campaigns add column if not exists loyalty_enabled boolean default false;
alter table if exists public.qr_campaigns add column if not exists loyalty_program_id uuid;
alter table if exists public.qr_campaigns add column if not exists metadata jsonb default '{}'::jsonb;

alter table if exists public.loyalty_rewards add column if not exists name text;
alter table if exists public.loyalty_rewards add column if not exists reward_type text default 'discount';
alter table if exists public.loyalty_rewards add column if not exists required_points integer default 100;
alter table if exists public.loyalty_rewards add column if not exists qr_campaign_id uuid;
alter table if exists public.loyalty_rewards add column if not exists metadata jsonb default '{}'::jsonb;

insert into public.landing_page_settings (id, scope, packages, updated_at)
values ('main','public_home','{}'::jsonb,now())
on conflict (id) do update set
  scope = coalesce(public.landing_page_settings.scope, excluded.scope),
  packages = coalesce(public.landing_page_settings.packages, '{}'::jsonb),
  updated_at = now();

notify pgrst, 'reload schema';
