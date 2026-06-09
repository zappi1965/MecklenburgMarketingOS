# MMOS v0.62 — Live-Speicherung strikt Backend/Supabase

## Ziel
Das Live-System darf keine Änderungen mehr still in `localStorage` sichern, wenn Backend/Supabase nicht erreichbar oder die Session ungültig ist.

## Änderungen

- Live-Modus schreibt nicht mehr automatisch in den Demo-Sandbox-Storage.
- Demo-/Local-Fallback ist nur noch aktiv bei:
  - aktivem Demo-Modus (`mmos_mode=demo` / `?demo=...`), oder
  - explizit gesetztem `NEXT_PUBLIC_ENABLE_LOCAL_WRITE_FALLBACK=true`.
- In Live wird bei fehlgeschlagener Speicherung jetzt ein Fehler angezeigt, statt scheinbar erfolgreich lokal zu speichern.
- `useStore.load()` bevorzugt bei aktiver Session den Backend-Store `/api/store`, damit Service-Role/Supabase Live-Daten geladen werden.
- Backend-Store-ALLOWLIST wurde um fehlende Monolith-Tabellen ergänzt, u. a. `ticket_messages`, `activity_logs`, `user_profiles`, `customer_users`, `customer_invites`, `customer_registrations`, `oauth_tokens`, `api_usage_cache`, `data_integrity_checks`, `security_events`, `dsar_requests`, `loyalty_member_security_scores`.
- Haupt-Landingpage speichert im Live-Modus nicht mehr vorab in den lokalen Demo-Sandbox-Storage.
- Generische Toolmodule lesen/schreiben lokale Cache-Daten nur noch im Demo-/Local-Fallback-Modus.

## Deployment

Für diesen Fix nötig:

1. Railway Backend deployen
2. Vercel Frontend deployen

Supabase-Migration ist nicht zwingend nötig, sofern die Tabellen bereits vorhanden sind. Falls einzelne Tabellen fehlen, zeigt der Backend-Store die echte Fehlermeldung statt lokal zu speichern.

## Wichtige ENV

In Vercel live bitte nicht aktivieren:

```env
NEXT_PUBLIC_ENABLE_LOCAL_WRITE_FALLBACK=false
```

Demo bleibt separat möglich über:

```env
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
```
