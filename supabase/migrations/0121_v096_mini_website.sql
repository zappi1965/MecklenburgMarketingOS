-- MMOS V096: Mini-Website / Google-Booster
-- Öffentliche One-Pager-Microsite je Kunde (landing_page_settings ist ein
-- globaler Singleton, daher eigene Per-Kunde-Tabelle). Inhalte werden zur
-- Renderzeit mit Live-MMOS-Daten angereichert. Idempotent.

create extension if not exists pgcrypto;

create table if not exists public.mini_websites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  slug text not null,
  enabled boolean not null default false,
  brand jsonb not null default '{}'::jsonb,   -- { name, logo_url, primary_color }
  hero jsonb not null default '{}'::jsonb,     -- { headline, subline, image_url }
  hours jsonb not null default '[]'::jsonb,    -- [{ day, open, close }]
  services jsonb not null default '[]'::jsonb, -- [{ name, price, note }]
  cta jsonb not null default '{}'::jsonb,      -- { label, url, phone }
  show_reviews boolean not null default true,
  google_place_id text,
  booster_state jsonb not null default '{}'::jsonb, -- { items: [...], score, computed_at }
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_mini_websites_customer on public.mini_websites(customer_id);
create unique index if not exists uq_mini_websites_slug on public.mini_websites(slug);

alter table public.mini_websites enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='mini_websites' and policyname='mini_websites_self_or_admin'
  ) then
    create policy mini_websites_self_or_admin on public.mini_websites
      for select to authenticated
      using (
        coalesce(public.mmos_is_admin(), false)
        or customer_id = public.mmos_current_customer_id()
      );
  end if;
exception when others then raise notice 'mini_websites policy skipped: %', sqlerrm; end $$;
