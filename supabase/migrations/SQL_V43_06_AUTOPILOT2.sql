-- SEO-Autopilot 2.0: Nachschärfen schwacher Artikel.
--
-- is_refinement markiert automatisch erzeugte Verbesserungs-Entwuerfe;
-- source_article_id verweist auf den (schwachen) Ursprungs-Artikel und
-- verhindert Mehrfach-Ueberarbeitungen.

alter table if exists public.seo_articles
  add column if not exists is_refinement boolean not null default false,
  add column if not exists source_article_id uuid references public.seo_articles(id) on delete set null;

create index if not exists idx_seo_articles_source on public.seo_articles (source_article_id);
