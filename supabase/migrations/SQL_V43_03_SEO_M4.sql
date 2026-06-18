-- SEO-Autopilot (Milestone 4): KI-Titelbilder.
--
-- cover_image_url speichert die generierte Bild-URL (gehostet via Bildanbieter
-- oder ein data:-URI Platzhalter im Mock-Modus). Mehrsprachigkeit nutzt die
-- bereits vorhandene language-Spalte; WordPress-Zugangsdaten liegen in
-- seo_publishing_schedules.target_config (jsonb, bereits vorhanden).

alter table if exists public.seo_articles
  add column if not exists cover_image_url text;
