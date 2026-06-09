# MMOS V30.2 Fullbuild Final

Dieser Fullbuild enthält alle zuletzt notwendigen Fixes gemeinsam.

## Enthalten

### Frontend / Vercel
- `frontend/src/app/page.tsx`
- V30 Demo Tool Visibility
- V30.1 Buildfix für kaputte JSX-Klammer bei `DemoCustomers`
- Neue Tools im Demo-Tool sichtbar:
  - Öffentliche `/l/[slug]` Seite
  - Loyalty Programm
  - Rewards
  - Reward Regeln
  - Mitarbeiter-Bestätigungscode
  - Loyalty Segmente
  - Smart Loyalty V2
  - Reviews
  - Review Intelligence
  - Antwortvorlagen
  - Smart Automation
  - Marketing Automation
  - AI Business Assistant
  - Customer Health
  - Customer Intelligence
  - Dynamic Billing
  - Revenue Forecasting
  - Revenue Share
  - Package Recommendations
  - Paket-Matrix
  - Timeline Events

### Backend / Railway
- `backend/src/routes/reviewIntelligenceRoutes.js`
- Express-5-kompatibler Fix:
  - `/templates`
  - `/templates/:customer_id`
- Alte crashende Route `/templates/:customer_id?` ist entfernt.

### Supabase / SQL
- `supabase/migrations/0039_v29_tool_registry_sync_v2.sql`
- Behebt:
  - `ON CONFLICT DO UPDATE command cannot affect row a second time`
- Dedupliziert `customer_tool_access` sauber nach `tool_key`.

Optional weiterhin enthalten, falls im Paket vorhanden:
- `0038_v28_production_safe_rebuild_v6.sql`

---

# Deployment-Anleitung

## Variante A: Ganzen Fullbuild übernehmen

1. ZIP entpacken.
2. Inhalt in dein Projekt kopieren.
3. Bestehende Dateien überschreiben.
4. Committen:

```bash
git add .
git commit -m "Deploy MMOS V30.2 fullbuild"
git push
```

5. Vercel deployt Frontend automatisch.
6. Railway deployt Backend automatisch.

## Variante B: Nur gezielte Dateien übernehmen

Mindestens übernehmen:

```text
frontend/src/app/page.tsx
backend/src/routes/reviewIntelligenceRoutes.js
supabase/migrations/0039_v29_tool_registry_sync_v2.sql
```

Dann:

```bash
git add frontend/src/app/page.tsx backend/src/routes/reviewIntelligenceRoutes.js supabase/migrations/0039_v29_tool_registry_sync_v2.sql
git commit -m "Fix V30 demo tools and Railway routes"
git push
```

## Supabase

In Supabase SQL Editor ausführen:

```text
supabase/migrations/0039_v29_tool_registry_sync_v2.sql
```

Falls deine Datenbank noch alte Schema-Probleme hat, zuerst ausführen:

```text
supabase/migrations/0038_v28_production_safe_rebuild_v6.sql
```

Danach:

```text
supabase/migrations/0039_v29_tool_registry_sync_v2.sql
```

## Prüfen nach Deploy

### Vercel
- Build darf nicht mehr bei `page.tsx` abbrechen.
- Demo-Tool muss neue Module anzeigen.

### Railway
- Backend darf nicht mehr bei `reviewIntelligenceRoutes.js` crashen.
- Kein Fehler mehr durch `/templates/:customer_id?`.

### Demo Tool
Im Admin- und Kundenbereich prüfen:
- Loyalty Programm
- Rewards
- Reward Regeln
- Mitarbeiter-Bestätigungscode
- Loyalty Segmente
- Smart Loyalty V2
- Review Intelligence
- Smart Automation
- Marketing Automation
- AI Business Assistant
- Customer Health
- Customer Intelligence
- Dynamic Billing
- Revenue Forecasting
- Revenue Share
- Paket-Matrix
