# V42.16 Stability & API Hardening

## Enthaltene Fixes

- Backend `systemRoutes` wird unter `/api/system` aktiv registriert.
- `/api/system/ready` prüft jetzt echte Supabase-Erreichbarkeit über Core-Tabellen.
- `/api/system/schema` listet fehlende optionale Tabellen/Migrationen.
- Backend hat nur noch einen zentralen CORS-Block und einen zentralen Error-Handler.
- Google-Route `/api/google` ist critical und wird nicht mehr still als optional übersprungen.
- Google/API Provider-Mapping unterstützt UI-Labels und technische Provider-Keys.
- Meta Business Suite erhält einen sauberen Placeholder-Status statt Unknown-Provider-Fehler.
- Google OAuth Health Route: `/api/google/health`.
- Frontend-API-Requests für Google/System nutzen Timeout, HTML-Guard und klare Fehlertexte.
- `v33FunctionalClient` hat einen 15s Timeout und bessere Timeout-Meldungen.
- Upload-Calls für Avatar und Storage laufen über den robusteren API-Request-Helper.
- Safe LocalStorage Helper verhindert Crashes bei kaputtem JSON.
- Admin Dashboard enthält ein neues Panel `System Stability` mit Ready-/Schema-Check.

## Wichtige ENV-Werte für Railway

```env
SUPABASE_URL=https://deinprojekt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://deine-domain.de/api/google/callback
```

## Optionales SQL

Für Sync-Statusfelder und OAuth-Token:

```txt
SQL_V42_16_STABILITY_INTEGRATION_STATUS.sql
```
