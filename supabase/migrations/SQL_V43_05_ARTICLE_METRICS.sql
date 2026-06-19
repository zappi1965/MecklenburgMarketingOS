-- SEO-Autopilot (Erweiterung): Performance-Kennzahlen je Artikel.
--
-- Eine Zeile je Artikel und Tag (Impressionen, Klicks, Position, CTR).
-- Quelle: 'gsc' (Google Search Console) oder 'mock'.

create table if not exists public.seo_article_metrics (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.seo_articles(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  metric_date date not null default current_date,
  impressions integer not null default 0,
  clicks integer not null default 0,
  position numeric(6,2),
  ctr numeric(6,4),
  source text not null default 'mock',
  created_at timestamptz not null default now(),
  unique (article_id, metric_date)
);

create index if not exists idx_seo_article_metrics_customer on public.seo_article_metrics (customer_id, metric_date desc);
create index if not exists idx_seo_article_metrics_article on public.seo_article_metrics (article_id, metric_date desc);
