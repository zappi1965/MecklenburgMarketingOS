-- SEO-Autopilot (Milestone 2): In-House-Blog.
--
-- blog_slug je Kunde als sprechender, oeffentlicher Pfad fuer den Blog
-- (/blog/<blog_slug>). published_url je Artikel wird beim Veroeffentlichen
-- gesetzt. Indexe fuer schnelle oeffentliche Abfragen nach Slug.

alter table if exists public.seo_brand_profiles
  add column if not exists blog_slug text;

create unique index if not exists idx_seo_brand_profiles_blog_slug
  on public.seo_brand_profiles (blog_slug)
  where blog_slug is not null;

create index if not exists idx_seo_articles_slug
  on public.seo_articles (customer_id, slug);
