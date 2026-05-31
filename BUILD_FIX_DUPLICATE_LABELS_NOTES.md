# Front-/Backoffice Build Fix: Duplicate Labels

Vercel TypeScript-Fehler behoben:

`An object literal cannot have multiple properties with the same name`

## Ursache

Im `labels`-Objekt in `frontend/src/app/page.tsx` waren durch mehrere aufeinanderfolgende Patches einzelne Keys doppelt vorhanden, u. a.:

- `admin_tool_center`
- `admin_training`
- `production_readiness`
- `security_core_live`

## Fix

Das `labels`-Objekt wurde dedupliziert und sauber neu aufgebaut.
Zusätzlich wurde die `admin`-Toolliste auf doppelte Einträge geprüft.

## Betroffene Datei

- `frontend/src/app/page.tsx`

## Erhalten

- Frontoffice-/Backoffice-Trennung
- Backoffice-Zugriff ohne ständige erneute Abfrage
- RoleGate Session-Cache
- Middleware ohne Re-Login-Redirect
