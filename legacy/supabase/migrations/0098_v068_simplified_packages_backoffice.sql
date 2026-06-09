-- MMOS V068 Simplified Packages + Backoffice Restore
-- Aktualisiert die öffentliche Paketmatrix auf die vereinfachte Paketlogik.

create table if not exists public.landing_page_settings (
  id text primary key,
  scope text not null default 'public_home',
  packages jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.landing_page_settings (id, scope, packages, created_at, updated_at)
values (
  'main',
  'public_home',
  '{
    "Starter": {
      "headline": "Starter",
      "price": 199,
      "setupFee": 399,
      "audience": "Für Betriebe, die Google sichtbar machen und eine einfache QR-Kampagne ohne Loyalty starten wollen.",
      "description": "Google Business Optimierung mit SEO KPI Übersicht, Heatmap, QR-Code-Kampagne und Kundenübersicht für Reports/Rechnungen.",
      "features": ["Google Business Optimierung", "SEO KPI Übersicht", "SEO Heatmap", "QR-Code Kampagne ohne Loyalty", "Reports & Rechnungen im Kundenportal"]
    },
    "Growth": {
      "headline": "Growth",
      "price": 499,
      "setupFee": 749,
      "audience": "Für Betriebe, die zusätzlich Bewertungen, Loyalty und Kundenbindung nutzen wollen.",
      "description": "Alles aus Starter plus Reviews, Loyalty, Kundenbindung & Wiederkehrer, Consent Center und Zielgruppen-Kampagnen.",
      "features": ["Alles aus Starter", "Reviews & Bewertungsaufbau", "Loyalty Programm & Rewards", "Kundenbindung & Wiederkehrer", "Consent Center & Segment-Kampagnen"]
    },
    "Premium": {
      "headline": "Premium",
      "price": 899,
      "setupFee": 1199,
      "audience": "Für Betriebe, die Kundenbindung, Automationen und Steuerung maximal ausbauen wollen.",
      "description": "Alles aus Growth plus Smart Loyalty, Churn Prevention, Service Recovery, Automationen, AI und erweitertes Kundenportal.",
      "features": ["Alles aus Growth", "Smart Loyalty & Reward Regeln", "Churn Prevention & Service Recovery", "Automationen & AI Business Assistant", "Kundenportal Pro & Revenue-Tools"]
    }
  }'::jsonb,
  now(),
  now()
)
on conflict (id) do update
set
  scope = excluded.scope,
  packages = excluded.packages,
  updated_at = now();
