# MMOS V089 – 401 Noise / Production Auth Guard Hotfix

## Ziel
Reduziert unnötige 401-Fehler in Railway-Logs, ohne Admin-Endpunkte öffentlich zu machen.

## Änderungen
- `/api/production/client-error` wird nun vor dem globalen Auth-Guard als öffentlicher Collector beantwortet.
- Public QR-/Slug-Seiten erzeugen dadurch keine 401-Logs mehr, wenn der Browser Client-Fehler ohne Admin-Session meldet.
- Production-Readiness-Panel ist jetzt mit `AdminOnly` geschützt.
- Production-Readiness lädt Daten erst, wenn eine gültige Supabase-Session vorhanden ist.

## Wichtig
Die eigentlichen Admin-Endpunkte bleiben geschützt:
- `/api/production/status`
- `/api/production/admin-logs`
- `/api/production/api-usage`
- `/api/production/backup-runs`

Wenn diese weiterhin 401 werfen, ist die Session abgelaufen oder der Benutzer ist nicht als Admin erkannt.
