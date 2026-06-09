# MMOS v0.54.1 – Live/Lokal Datenzählung Fix

## Fix

Die Live/Lokal-Datenzählung zeigte mehrere vorhandene Tabellen als `nicht geladen`, weil diese Tabellen im Frontend-Store nicht initialisiert bzw. nicht in der Lade-Liste enthalten waren.

Betroffene Tabellen:

- oauth_tokens
- api_usage_cache
- data_integrity_checks
- user_profiles

## Änderungen

- Tabellen im Frontend-Seed ergänzt
- Tabellen in der `useStore()`-Ladeliste ergänzt
- Tabellen in den Demo/Live-Scope aufgenommen
- Health Center nutzt Backend-Schema-Checks mit Live-Counts als Fallback, wenn lokale Store-Daten noch nicht geladen sind
- Backend `/api/system/status` liefert pro Tabelle nun `count` zurück
- Supabase Service-Role-Diagnose akzeptiert jetzt auch neue Supabase Secret-Key-Formate wie `sb_secret_...`
- Backend CRUD-Allowlist um die vier Tabellen erweitert

## Erwartetes Ergebnis

Im Health Center sollte bei der Live/Lokal-Datenzählung nicht mehr `nicht geladen` für diese vier Tabellen erscheinen. Falls Browser-RLS keinen lokalen Zugriff erlaubt, wird stattdessen der Backend-Live-Count angezeigt.
