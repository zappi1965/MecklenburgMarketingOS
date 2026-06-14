-- SEO-Autopilot (Milestone 1): Brand-DNA, Keyword-Ziele und generierte Artikel.
--
-- Mandantenfaehig pro Kunde (customer_id). Zugriff wird wie im restlichen
-- Backend ueber Service-Role + Route-Guards (requireAdmin) durchgesetzt,
-- daher keine RLS-Policies in dieser Migration (konsistent mit Core-Schema).

create extension if not exists "pgcrypto";

-- Brand-DNA: ein Profil je Kunde (Markenton, Zielgruppe, Themen).
create table if not exists public.seo_brand_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  website_url text,
  audience text,
  tone text,
  topics jsonb not null default '[]'::jsonb,
  value_props jsonb not null default '[]'::jsonb,
  language text not null default 'de',
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id)
);

-- Keyword-Ziele je Kunde.
create table if not exists public.seo_keyword_targets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  keyword text not null,
  intent text not null default 'informational',
  priority int not null default 3,
  status text not null default 'idea',
  created_at timestamptz not null default now(),
  unique (customer_id, keyword)
);

create index if not exists idx_seo_keyword_targets_customer on public.seo_keyword_targets (customer_id);

-- Generierte Artikel je Kunde.
-- status: draft → approved → published
create table if not exists public.seo_articles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  keyword text,
  title text not null,
  slug text,
  meta_description text,
  body_markdown text not null default '',
  internal_link_ideas jsonb not null default '[]'::jsonb,
  language text not null default 'de',
  status text not null default 'draft',
  provider text,
  model text,
  published_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  published_at timestamptz
);

create index if not exists idx_seo_articles_customer on public.seo_articles (customer_id);
create index if not exists idx_seo_articles_status on public.seo_articles (customer_id, status);

-- Veroeffentlichungs-Plan je Kunde (Vorbereitung fuer Auto-Publishing in M3).
create table if not exists public.seo_publishing_schedules (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  cadence text not null default 'daily',
  enabled boolean not null default false,
  auto_publish boolean not null default false,
  target_type text not null default 'in_app',
  target_config jsonb not null default '{}'::jsonb,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id)
);
