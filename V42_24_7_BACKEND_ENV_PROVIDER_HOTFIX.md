# V42.24.7 Backend ENV / Provider Hotfix

## Behebt

- Railway/Express `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` durch `app.set('trust proxy', TRUST_PROXY_HOPS || 1)`.
- Google Places Fehler bei Website-/HTTP-Referrer-Key mit klarer Fehlermeldung `GOOGLE_PLACES_KEY_RESTRICTION_INVALID`.
- API Provider Mapping akzeptiert jetzt `google-business` und `google_business`, `search-console` und `search_console`.
- Live-API-Syncs schreiben keine erfolgreichen Placeholder-Syncs mehr, wenn OAuth-ENV fehlt.
- Worker markiert unbekannte oder nicht konfigurierte API-Sync-Jobs als Fehler statt als erfolgreich mit `null`/Placeholder.
- `/api/system/env-check` ergänzt für maskierte Railway-ENV-Diagnose.
- Alte destruktive V42.24.2 Purge-SQL aus diesem Paket entfernt, damit Demo-Daten nicht versehentlich gelöscht werden.

## Railway ENV

```env
TRUST_PROXY_HOPS=1
GOOGLE_PLACES_API_KEY=<serverseitiger Google Maps API Key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
ENABLE_DEMO_MODE=false
```

## Google Key

Der `GOOGLE_PLACES_API_KEY` läuft im Backend und darf keine Website-/HTTP-Referrer-Restriktion haben. Für diesen Key API-Restriktion auf Places API setzen. Eine IP-Restriktion nur nutzen, wenn Railway eine stabile Egress-IP liefert.

## Deploy minimal

Backend neu deployen mit:

- `backend/src/server.js`
- `backend/src/routes/businessToolsRoutes.js`
- `backend/src/routes/systemRoutes.js`
- `backend/src/routes/googleRoutes.js`
- `backend/src/routes/productionRoutes.js`
- `backend/src/services/apiSyncService.js`
- `backend/src/workers/apiReadyWorker.js`
- `backend/.env.example` optional

SQL optional ausführen:

- `SQL_V42_24_7_BACKEND_ENV_PROVIDER_HOTFIX.sql`

Die SQL ist nur ein nicht-destruktiver Migrationsmarker.
