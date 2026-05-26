# V42.14 Main Landingpage Editor

Dieser Fix ergänzt zusätzlich zur kundenspezifischen `/l/[slug]`-Bearbeitung ein Admin-Modul für die öffentliche Haupt-Landingpage (`/`).

## Neue Admin-Position

Adminbereich → Übersicht → Haupt-Landingpage

## Bearbeitbare Inhalte

- Logo-/Navigationstext
- Firmenlogo-URL, Alternativtext und Fallback-Kürzel
- Hero-Überschrift
- Hero-Unterzeile
- Login-Button-Text
- Demo-Button-Text
- Paketbereich-Überschrift
- Paketbereich-Unterzeile
- Paketbeschreibungen für Starter, Growth, Premium
- Footer-/Hinweistext

## Persistenz

Die UI nutzt `landing_page_settings` mit einem Datensatz `id = 'main'` und `scope = 'public_home'`.
Falls die Tabelle in Supabase noch nicht existiert, fällt die App lokal zurück. Für echte persistente Live-Bearbeitung sollte die Tabelle angelegt werden.

```sql
create table if not exists public.landing_page_settings (
  id text primary key,
  scope text not null default 'public_home',
  brand_name text,
  nav_title text,
  logo_url text,
  logo_alt text,
  logo_mark_text text,
  logo_show_text boolean not null default true,
  hero_title text,
  hero_subline text,
  primary_cta_label text,
  secondary_cta_label text,
  package_headline text,
  package_subline text,
  footer_note text,
  packages jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
