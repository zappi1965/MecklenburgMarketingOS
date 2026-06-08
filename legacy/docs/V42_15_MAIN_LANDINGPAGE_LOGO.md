# V42.15 Haupt-Landingpage Logo

Dieser Fix erweitert den Haupt-Landingpage-Editor im Adminbereich um Firmenlogo-Felder.

## Position

Adminbereich → Übersicht → Haupt-Landingpage → Logo, Hero & Navigation

## Neue Felder

- Logo-URL
- Alternativtext für das Logo
- Fallback-Kürzel, falls kein Logo hinterlegt ist
- Checkbox: Navigationstext neben dem Logo anzeigen

## Anzeige

Die öffentliche Startseite `/` nutzt `logo_url`, wenn vorhanden. Falls kein Logo hinterlegt ist, bleibt der bisherige Fallback mit dem Kürzel, standardmäßig `M`, erhalten.

## Persistenz in Supabase

Für Live-Persistenz muss die bestehende Tabelle erweitert werden:

```sql
alter table public.landing_page_settings
  add column if not exists logo_url text,
  add column if not exists logo_alt text,
  add column if not exists logo_mark_text text,
  add column if not exists logo_show_text boolean not null default true;
```

Die vollständige SQL liegt als `SQL_LANDING_PAGE_LOGO_V42_15.sql` im Build.
