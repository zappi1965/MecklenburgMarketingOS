# SEO-Autopilot — Go-Live-Runbook

Dieser Leitfaden bringt den SEO-Autopilot vom Mock-Modus in den Live-Betrieb.
Reihenfolge einhalten.

## 1. Migrationen einspielen (Supabase)

In dieser Reihenfolge ausführen (SQL-Editor oder Migrations-Pipeline):

1. `supabase/migrations/SQL_V43_01_SEO_AUTOPILOT_SCHEMA.sql`
2. `supabase/migrations/SQL_V43_02_SEO_BLOG.sql`
3. `supabase/migrations/SQL_V43_03_SEO_M4.sql`
4. `supabase/migrations/SQL_V43_04_KEYWORD_DATA.sql`
5. `supabase/migrations/SQL_V43_05_ARTICLE_METRICS.sql`
6. `supabase/migrations/SQL_V43_06_AUTOPILOT2.sql`

Alle Skripte sind idempotent (`if not exists`).

### Verifikation

```bash
cd backend
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node ../scripts/verifySeoSchema.js
```

Erwartet: alle Tabellen mit `✓`. Bei `✗` fehlt eine Migration.

## 2. Environment-Variablen setzen (Railway-Backend)

| Variable | Zweck | Ohne → |
| --- | --- | --- |
| `SEO_SECRET_KEY` | Verschlüsselung der CMS-Zugangsdaten (AES-256-GCM) | In Produktion **blockiert** das Speichern von CMS-Secrets |
| `ANTHROPIC_API_KEY` (+ `AI_PROVIDER=anthropic`) | Echte Artikel-Texte | Mock-Texte (Platzhalter) |
| `OPENAI_API_KEY` (+ `AI_IMAGE_PROVIDER=openai`) | Echte KI-Titelbilder | SVG-Platzhalter |
| `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` | Echte Keyword-Kennzahlen | geschätzte Werte |
| `SEO_METRICS_PROVIDER=gsc` | Echte Performance-Daten | Mock-Kennzahlen |
| `SEO_AUTOPILOT_CRON` | Cron-Ausdruck (Default `0 6 * * *`) | täglich 06:00 UTC |
| `SEO_AUTOPILOT_MAX_AGE_HOURS` | Schwelle für Health-„overdue" (Default 26) | — |

> **Wichtig:** `SEO_SECRET_KEY` setzen **bevor** echte CMS-Zugänge (WordPress/Shopify/Webflow) gespeichert werden.

## 3. Cron-Worker starten (Railway)

Separater Dyno/Service:

```bash
yarn --cwd backend seo-autopilot-worker:cron
```

Einmaliger Testlauf (ohne Daemon):

```bash
yarn --cwd backend seo-autopilot-worker
```

## 4. Health & Betrieb

- **Health-Endpoint:** `GET /api/seo-autopilot/health` (Admin) → letzter Lauf + `overdue`.
- Worker-Fehler werden an **Sentry** gemeldet (falls `SENTRY_DSN` gesetzt).
- Lauf-Historie in Tabelle `job_runs` (`job_name = 'seo_autopilot'`).

## 5. Smoke-Test pro Kunde

1. Admin → `/admin/seo-autopilot`, gültige Kunden-ID, **Laden**.
2. Brand-DNA generieren & speichern.
3. Keywords generieren & speichern (mit Kennzahlen-Spalten).
4. Artikel generieren → bearbeiten → **Freigeben** → **Veröffentlichen**.
5. **Live ansehen** (In-House-Blog: `/blog/<slug>/<artikel>`, oder CMS-URL).
6. Autopilot-Tab: Ziel + Takt + Auto-Publish, speichern.
7. Performance-Tab: **Aktualisieren** → Kennzahlen erscheinen.

## Rollback

Die Tabellen sind additiv. Bei Bedarf einzeln entfernen (Reihenfolge umgekehrt,
Abhängigkeiten beachten):

```sql
drop table if exists public.seo_article_metrics;
alter table public.seo_articles drop column if exists is_refinement, drop column if exists source_article_id;
alter table public.seo_articles drop column if exists cover_image_url;
alter table public.seo_keyword_targets drop column if exists search_volume, drop column if exists difficulty, drop column if exists cpc, drop column if exists data_provider;
drop table if exists public.seo_publishing_schedules;
drop table if exists public.seo_articles;
drop table if exists public.seo_keyword_targets;
alter table public.seo_brand_profiles drop column if exists blog_slug;
drop table if exists public.seo_brand_profiles;
```
