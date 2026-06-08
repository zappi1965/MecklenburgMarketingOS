# MMOS Upload-Only Repo-Ready Fullbuild

Diese ZIP ist für deinen Workflow gedacht: **entpacken und den Inhalt 1:1 ins GitHub-Repo hochladen/überschreiben**.

Du musst dafür keine Apply-Scripts ausführen.

## Enthalten

- Internal Access / Admin-Kunden-Trennung
- Customer Portal Reports
- Media Binding / PDF-Storage
- Brand Logo
- Google-only Mini Audit Generator
- Production Readiness
- Consent-safe Error Tracking
- Security Core
- Admin All-Tools Wissenstest unter `/admin/training`
- Supabase Migrationen 0090 und 0091
- GitHub Workflows für E2E/Backups/Security

## Upload-Anleitung

1. ZIP lokal entpacken.
2. Den Inhalt des entpackten Ordners in dein Repo ziehen.
3. Bestehende Dateien überschreiben.
4. Alles committen/pushen.
5. Erst Backend/Railway deployen, dann Frontend/Vercel.

## Trotzdem manuell nötig

### Supabase

Diese Migrationen musst du im Supabase SQL Editor ausführen:

```txt
supabase/migrations/0090_production_readiness_observability.sql
supabase/migrations/0091_security_core_jobs_permissions.sql
```

### ENV prüfen

Backend/Railway:

```env
GOOGLE_PLACES_API_KEY=...
GOTENBERG_URL=...
MMOS_DOCUMENT_BUCKET=generated-pdfs
MMOS_DOCUMENT_SIGNED_URL_TTL_SECONDS=3600
SENTRY_DSN=...
SENTRY_TRACES_SAMPLE_RATE=0.1
API_COST_CONTROL_ENABLED=true
API_COST_FAIL_OPEN=true
API_COST_DAILY_LIMIT_CENTS=500
API_COST_MONTHLY_LIMIT_CENTS=5000
JOB_WORKER_INTERVAL_MS=5000
JOB_MAX_ATTEMPTS=3
ADMIN_AUDIT_IP_SALT=ein_langer_geheimer_salt
```

Frontend/Vercel:

```env
NEXT_PUBLIC_REQUIRE_ROUTE_GUARD=true
NEXT_PUBLIC_ERROR_REPORTING_CONSENT_CATEGORY=analytics
NEXT_PUBLIC_ERROR_REPORTING_ESSENTIAL=false
NEXT_PUBLIC_API_BASE=https://deine-railway-backend-url
NEXT_PUBLIC_BACKEND_URL=https://deine-railway-backend-url
NEXT_PUBLIC_API_URL=https://deine-railway-backend-url
```

## Nach dem Deploy testen

- `/auth`
- Admin-Login
- `/admin/training`
- `/admin/production`
- `/admin/production/security-core`
- `/admin/sales/mini-audit-generator`
- `/portal/reports`
