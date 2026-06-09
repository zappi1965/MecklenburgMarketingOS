-- Analytics-Caches + Bewertungs-Widget + GMB-Posts.
-- Idempotent.

-- Peer-Benchmark: pro Customer + Periode + Branche/PLZ-Cluster die
-- anonymisierten Aggregate.
create table if not exists public.peer_benchmark_snapshots (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  industry text,
  region_key text,                                  -- z.B. PLZ-Prefix wie "180"
  customer_revenue numeric(14,2),
  peer_revenue_median numeric(14,2),
  peer_revenue_p25 numeric(14,2),
  peer_revenue_p75 numeric(14,2),
  customer_appointments int,
  peer_appointments_median int,
  customer_reviews int,
  peer_reviews_median int,
  rank_percentile int,                              -- 0..100
  peer_sample_size int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (customer_id, period_start, period_end)
);

create index if not exists idx_peer_benchmark_customer on public.peer_benchmark_snapshots(customer_id);
create index if not exists idx_peer_benchmark_industry on public.peer_benchmark_snapshots(industry);

-- Cohort-Analyse: erste-Aktion-Monat als Cohort, Retention-Werte als jsonb.
create table if not exists public.cohort_snapshots (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  cohort_source text not null,                      -- 'qr_campaign' | 'loyalty_signup' | 'invoice_first'
  cohort_month date not null,
  cohort_size int not null,
  retention jsonb not null default '{}'::jsonb,     -- {"m1": 73, "m2": 58, ...}
  ltv_eur numeric(14,2),
  calculated_at timestamptz not null default now(),
  unique (customer_id, cohort_source, cohort_month)
);

create index if not exists idx_cohort_customer on public.cohort_snapshots(customer_id);

-- CLV pro Endkunden-Segment.
create table if not exists public.clv_segments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  segment_key text not null,                        -- 'all' | 'loyalty_vip' | 'qr_only' | 'first_time' | 'win_back'
  segment_label text not null,
  member_count int not null default 0,
  avg_revenue_eur numeric(14,2) not null default 0,
  median_revenue_eur numeric(14,2),
  total_revenue_eur numeric(14,2) not null default 0,
  avg_lifetime_days int,
  computed_at timestamptz not null default now(),
  unique (customer_id, segment_key)
);

create index if not exists idx_clv_segments_customer on public.clv_segments(customer_id);

-- GMB-Posts: Google-Business-Profile-Veroeffentlichungen.
create table if not exists public.gmb_posts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  account_id text,                                  -- Google account location id
  post_type text not null default 'STANDARD',       -- STANDARD | EVENT | OFFER | ALERT
  summary text not null,
  cta_label text,
  cta_url text,
  image_url text,
  start_time timestamptz,
  end_time timestamptz,
  status text not null default 'draft',             -- draft | scheduled | published | failed
  external_id text,                                  -- Google API name/id
  scheduled_at timestamptz,
  published_at timestamptz,
  error_message text,
  created_by uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_gmb_posts_customer on public.gmb_posts(customer_id);
create index if not exists idx_gmb_posts_status on public.gmb_posts(status);
create index if not exists idx_gmb_posts_scheduled on public.gmb_posts(scheduled_at);

-- Bewertungs-Widget-Configs (was zeigt das iframe).
create table if not exists public.review_widgets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  slug text not null unique,                        -- in URL: /widget/<slug>
  show_count int not null default 5,
  min_rating int not null default 4,
  theme jsonb not null default '{}'::jsonb,          -- {"primary":"#d4af37","background":"#fff",...}
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_review_widgets_customer on public.review_widgets(customer_id);

alter table public.peer_benchmark_snapshots enable row level security;
alter table public.cohort_snapshots enable row level security;
alter table public.clv_segments enable row level security;
alter table public.gmb_posts enable row level security;
alter table public.review_widgets enable row level security;
