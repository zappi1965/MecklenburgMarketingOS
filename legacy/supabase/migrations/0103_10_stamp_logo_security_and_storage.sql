-- V103.10 — sichere Stempel-Logo-Uploads + Variant-A-Stempelreset
-- Defensiv: keine bestehenden Daten löschen, nur ergänzen.

-- Öffentlicher Storage-Bucket für Stempel-Logos der öffentlichen Slugseiten.
insert into storage.buckets (id, name, public)
values ('stamp-logos', 'stamp-logos', true)
on conflict (id) do update set public = true;

-- Direkte Spalte als Fallback für Loyalty-Settings, falls Installationen nicht nur qr_campaigns.metadata nutzen.
alter table if exists public.v37_loyalty_settings
  add column if not exists stamp_card_logo_url text;

-- Dokumentations-/Index-Hinweis: qr_campaigns.metadata bleibt die führende Quelle für QR-Zielseiten.
-- Erwartete Metadatenfelder:
-- metadata.stamp_card_logo_url
-- metadata.stamp_card_logo_storage_path
-- metadata.stamp_card_logo_mime_type
-- metadata.stamp_card_logo_updated_at
-- metadata.stamp_card_logo_uploaded_by
