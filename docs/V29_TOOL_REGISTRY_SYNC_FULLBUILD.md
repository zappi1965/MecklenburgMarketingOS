# MMOS V29 Tool Registry Sync Fullbuild

Dieser Build baut sauber auf dem zuletzt erzeugten V28-Fullbuild auf und synchronisiert die gestern erstellten Module wieder in Code, Navigation, Paketlogik und Demo-Zugriffe.

## Enthaltene Korrekturen

### Backend
- `backend/src/routes/reviewIntelligenceRoutes.js` bereinigt.
- Entfernt den Railway-Crash durch `/templates/:customer_id?`.
- Verwendet jetzt Express-5-kompatibel:
  - `/templates`
  - `/templates/:customer_id`

### Frontend
- Neue zentrale Tool Registry:
  - `frontend/src/lib/toolRegistry.ts`
- Paketlogik neu mit Registry verbunden:
  - `frontend/src/lib/packageConfig.ts`
- Admin-Navigation synchronisiert:
  - `frontend/admin-navigation.json`
- Kunden-Navigation synchronisiert:
  - `frontend/customer-navigation.json`

### Supabase
- Neue Migration:
  - `0039_v29_tool_registry_sync.sql`
- Optional beigefügt:
  - `0038_v28_production_safe_rebuild_v6.sql`

## Wieder eingetragene Module

QR & Loyalty:
- QR Kampagnen
- öffentliche `/l/[slug]` Seite
- Loyalty Programm
- Rewards
- Reward Regeln
- Mitarbeiter-Bestätigungscode
- Loyalty Segmente
- VIP-Level / Smart Loyalty V2

Reviews:
- Reviews
- Review Intelligence
- Review Themen
- Antwortvorlagen
- Eskalation zu Tickets

Automation / Marketing:
- Smart Automation
- Marketing Automation
- Reaktivierung
- Review Booster
- AI Business Assistant

Analytics / Billing:
- Customer Health
- Customer Intelligence
- Dynamic Billing
- Revenue Forecasting
- Revenue Share
- Package Recommendations
- Paket-Matrix

Operations:
- Booking
- Rechnungen
- Tickets
- Pipeline
- Timeline Events

## Deployment

1. Dateien in dein Projekt übernehmen.
2. Supabase ausführen:
   - falls DB noch Probleme macht: `0038_v28_production_safe_rebuild_v6.sql`
   - danach: `0039_v29_tool_registry_sync.sql`
3. Backend auf Railway redeployen.
4. Frontend auf Vercel redeployen.

## Hinweis

Dieser Build basiert auf dem von mir erzeugten V28-Fullbuild. Falls du danach manuell Änderungen in GitHub gemacht hast, bitte nicht blind überschreiben, sondern die geänderten Dateien gezielt übernehmen.
