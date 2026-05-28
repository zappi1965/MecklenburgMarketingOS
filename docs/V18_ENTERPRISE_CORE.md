# MMOS v18 Enterprise Core Fullbuild

## Sinnvoll eingebaut, ohne neue Menüflut

Die Enterprise-Funktionen wurden nicht als viele neue Tabs eingebaut, sondern untergeordnet in bestehende Bereiche:

### 1. Workflows
Hier hängen jetzt Enterprise-Jobs:
- Security Check
- Mandantenprüfung
- Retry fehlgeschlagener Jobs
- Report-Paket vorbereiten

### 2. Automationen
Hier hängt die neue Job Queue:
- `enterprise_job_queue`
- Retry-Status
- Background Processing
- Enterprise Worker

### 3. Monitoring/Security
Hier hängen:
- `security_events`
- Audit Events
- Healthchecks
- Sicherheitsereignisse

### 4. Backup/Production Readiness
Untergeordnet als Restore-Point-/Backup-Jobs:
- `backup_jobs`
- Backup Snapshot Job
- Dokumentation für Supabase Backups

## Neu umgesetzt

### Multi-Tenant Core
- `tenants`
- `tenant_id` an Kunden/User-Profilen
- Demo Tenant getrennt vom Live Tenant

### Rollen & Rechte
- `roles`
- `permissions` an `user_profiles`
- Funktionen:
  - `current_tenant_id()`
  - `has_permission()`
  - `can_access_tenant()`

### Feature Flags
- `feature_flags`
- z. B. PDF, QR, Mail, Workflow Engine, Audit Logs, Backup Center

### Enterprise Event System
- `enterprise_events`
- zentrale Ereignis-Historie

### Enterprise Queue
- `enterprise_job_queue`
- neuer Worker:
  - `npm run enterprise-worker`

### Security Events
- `security_events`

### Backup Jobs
- `backup_jobs`

## Backend Endpoints

- `GET /api/enterprise/overview`
- `POST /api/enterprise/run-preset/security_check`
- `POST /api/enterprise/run-preset/backup_snapshot`
- `POST /api/enterprise/run-preset/tenant_audit`
- `POST /api/enterprise/run-preset/queue_retry`
- `POST /api/enterprise/run-preset/report_pack`
- `POST /api/enterprise/backup`
- `POST /api/enterprise/feature-flags`
- `POST /api/enterprise/events`
- `POST /api/enterprise/security-events`

## Deploy beachten

### 1. Supabase
SQL ausführen:
`0026_v18_enterprise_core.sql`

### 2. Railway Backend
Redeploy:
- Root Directory: `backend`
- Start Command: `npm start`

### 3. Railway Worker
Bestehender Worker:
- Root Directory: `backend`
- Start Command: `npm run worker`

### 4. Neuer optionaler Enterprise Worker
Empfohlen als eigener Railway Service:
- Root Directory: `backend`
- Start Command: `npm run enterprise-worker`

### 5. Vercel Frontend
Redeploy, wenn du die Enterprise-Client-Helfer im Frontend nutzen willst.

## Was extern weiterhin nötig bleibt

- Supabase automatische Backups im Dashboard aktivieren/prüfen
- Sentry/Monitoring extern verbinden
- echte Rollen im Admin-UI später noch schöner verwalten
- echte Queue mit Redis/BullMQ erst bei größerer Last notwendig

## Status
Dieser Build bringt MMOS näher an Production/Enterprise Readiness, ohne die Oberfläche mit vielen neuen Menüpunkten zu überladen.
