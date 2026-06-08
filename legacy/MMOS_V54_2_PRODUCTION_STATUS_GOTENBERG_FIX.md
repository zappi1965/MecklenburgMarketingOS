# MMOS v0.54.2 – Production Status & Gotenberg Diagnostics Fix

## Ziel
Dieser Patch korrigiert zwei Produktionsmeldungen:

1. `Production Status -> Backend: Nicht verbunden / Service: Nicht authentifiziert`
2. `PDF-Erzeugung über Gotenberg nicht möglich: fetch failed`

## Änderungen

### Frontend
- `ProductionStatusCard` nutzt jetzt den öffentlichen `/api/system/status` statt `/api/v33-functional/v42/health`.
- Dadurch erscheint der Backend-Status auch ohne aktive Admin-Session korrekt.
- PDF-Fehler werden nutzerfreundlicher angezeigt: Wenn Gotenberg nicht erreichbar ist, wird die HTML-/Druckansicht als Fallback geöffnet.
- Der Production Status zeigt zusätzlich den PDF-/Gotenberg-Zustand an.

### Backend
- `/api/v33-functional/v42/health` ist zusätzlich public whitelisted.
- `/api/system/health`, `/api/system/status` und `/api/system/integration-status` prüfen Gotenberg nicht mehr nur anhand vorhandener ENV, sondern über einen echten `/health`-Check.
- `/api/business-tools/health` liefert jetzt `gotenberg_status` mit `connected`, `configured`, `status`, `error` und `hint`.
- Gotenberg-Fehler in `gotenbergService` werden mit Code/Hinweis angereichert (`GOTENBERG_UNREACHABLE`, `GOTENBERG_RENDER_FAILED`).

## Wichtig
Wenn Gotenberg weiterhin als nicht erreichbar angezeigt wird, liegt es an der Railway-ENV `GOTENBERG_URL` oder am Gotenberg-Service selbst.

Empfehlung:
- `GOTENBERG_URL` muss vom Railway Backend aus erreichbar sein.
- Nicht verwenden: `localhost`, Frontend-Domain, Browser-only URL.
- Möglich: öffentliche Railway-URL des Gotenberg-Services oder private Railway-URL, wenn Backend und Gotenberg im gleichen Railway-Projekt/Netz erreichbar sind.
