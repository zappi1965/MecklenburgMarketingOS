-- MMOS V095: "Deal der Woche" / Aktions-Builder
-- Zeitlich begrenzte öffentliche Aktionsseiten mit Countdown, QR und Teilen.
-- Idempotent.

create extension if not exists pgcrypto;

create table if not exists public.deal_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  slug text not null,
  title text not null,
  subtitle text,
  body text,
  discount_label text,
  image_url text,
  cta_label text,
  cta_url text,
  starts_at timestamptz,
  expires_at timestamptz,
  status text not null default 'draft', -- draft | active | expired | archived
  qr_campaign_id uuid,
  view_count integer not null default 0,
  share_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_deal_campaigns_slug on public.deal_campaigns(slug);
create index if not exists idx_deal_campaigns_customer on public.deal_campaigns(customer_id);
create index if not exists idx_deal_campaigns_status_expiry on public.deal_campaigns(customer_id, status, expires_at);

alter table public.deal_campaigns enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='deal_campaigns' and policyname='deal_campaigns_self_or_admin'
  ) then
    create policy deal_campaigns_self_or_admin on public.deal_campaigns
      for select to authenticated
      using (
        coalesce(public.mmos_is_admin(), false)
        or customer_id = public.mmos_current_customer_id()
      );
  end if;
exception when others then raise notice 'deal_campaigns policy skipped: %', sqlerrm; end $$;
