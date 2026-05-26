# MMOS V39 Stability & Schema Guard Fullbuild

## Ziel
Stabilität vor weiteren Features.

## Umgesetzt

1. Schema Health Check
- `GET /api/v33-functional/v39/schema-health`
- prüft Kern-Tabellen und Spalten
- gibt konkrete Hinweise aus
- Dashboard Panel `V39 Stability & Schema Guard`

2. Bessere Backend Errors
- globaler JSON Error Handler in `backend/src/server.js`
- Antworten enthalten `ok`, `code`, `error`, `details`, `hint`

3. Public Endpoint Hardening
- Public Fehler werden nutzerfreundlicher angezeigt
- Tageslimit/Wochenlimit/Slug fehlt werden sauberer erklärt

4. Duplicate Lead Protection
- `email + slug + 24h` wird gegen doppelte Leads geschützt
- doppelte Leads werden nicht erneut angelegt
- Response enthält `warnings`

5. Idempotente Provisionierung
- `POST /api/v33-functional/v39/:customer_id/provision-safe`
- verwendet vorhandene QR/Loyalty-Daten wieder, statt unnötig zu duplizieren

6. Reward-Limit Enforcement
- Backend prüft:
  - expires_at
  - max_redemptions
  - max_per_customer
  - daily_limit
  - weekly_limit

7. Engine Run Logging
- Helfer `v39LogEngineRun` ergänzt
- vorbereitet für duration/error/warnings

8. Button Loading States
- V39 Stability Panel nutzt busy/disabled states
- zentrale Demo-Aktionen sind doppelklicksicherer

9. QA-Fix-Hinweise
- Schema Panel zeigt „0050 ausführen“ bei fehlenden Tabellen/Spalten

10. Full Schema Stabilizer SQL
- `supabase/migrations/0050_full_schema_stabilizer.sql`
- defensive Create/Alter/Index-Struktur
- keine Drops
- keine gefährlichen Deletes

## Neue Endpunkte

```text
GET  /api/v33-functional/v39/schema-health
POST /api/v33-functional/v39/:customer_id/provision-safe
```

## Neue SQL

```text
supabase/migrations/0050_full_schema_stabilizer.sql
```

## Deployment

1. Fullbuild übernehmen
2. In Supabase ausführen:
   `0050_full_schema_stabilizer.sql`
3. Railway deployen
4. Vercel deployen
5. Dashboard → V39 Stability & Schema Guard → Schema prüfen
