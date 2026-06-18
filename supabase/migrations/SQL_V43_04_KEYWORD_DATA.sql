-- SEO-Autopilot (Erweiterung): echte Keyword-Kennzahlen.
--
-- search_volume (monatliche Suchanfragen), difficulty (0-100) und cpc (€)
-- je Keyword. Quelle ist provider-abhaengig (z. B. DataForSEO) oder im
-- Mock-Modus deterministisch geschaetzt.

alter table if exists public.seo_keyword_targets
  add column if not exists search_volume integer,
  add column if not exists difficulty integer,
  add column if not exists cpc numeric(8,2),
  add column if not exists data_provider text;
