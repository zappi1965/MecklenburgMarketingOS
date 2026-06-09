# Backend Auth QR/Loyalty Fix

Behoben:

- `v33FunctionalClient` hängt jetzt bei geschützten Backend-Routen automatisch den Supabase Bearer Token an.
- Same-Origin Proxy `/api/v33-functional/...` und direkter Railway-Fallback erhalten denselben Authorization Header.
- Auth-Fehler werden nicht mehr durch weitere Fallbacks versteckt.
- QR-Kampagnen werden bei Auth-Fehlern nicht mehr lokal-only erstellt.
- Live-Speicherung für QR/Loyalty/Customer-Tool-Tabellen wird nur noch akzeptiert, wenn `/api/store` wirklich backend-authentifiziert ist.
- Bei Auth-Fehlern erscheint eine klare Meldung: neu einloggen + 2FA bestätigen.
- `storeClient` hat jetzt eine explizite Auth-Prüfung für Live-Speicherung.

Wichtig:

- Keine neue Supabase-Migration nötig.
- Nach Deploy ausloggen, neu einloggen, 2FA bestätigen.
- Danach QR-Kampagne und Loyalty-Einstellungen erneut speichern.
