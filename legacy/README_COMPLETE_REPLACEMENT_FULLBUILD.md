# MMOS Complete Repo Replacement Fullbuild

Dieser Stand basiert auf deinem hochgeladenen aktuellen Fullbuild:

`MecklenburgMarketingOS-main-2-v066-stability-speed-foundation-fullbuild.zip`

und wurde um alle zuletzt erstellten Neuerungen ergänzt:

- Internal Access / Admin-Kunden-Trennung
- Customer Portal Reports
- Media Binding / PDF-Storage
- Brand Logo
- Google-only Mini Audit Generator
- Production Readiness
- Consent-safe Error Tracking
- Security Core
- Admin All-Tools Wissenstest unter `/admin/training`

## Verwendung

Diese ZIP ist als kompletter Repo-Ersatz gedacht.

1. ZIP entpacken.
2. Inhalt komplett in dein GitHub-Repo hochladen/ersetzen.
3. Commit/Push.
4. Backend/Railway zuerst deployen.
5. Frontend/Vercel danach deployen.

## Manuell weiterhin nötig

Supabase SQL Editor:

```txt
supabase/migrations/0090_production_readiness_observability.sql
supabase/migrations/0091_security_core_jobs_permissions.sql
```

Wichtige ENV prüfen:

```env
GOOGLE_PLACES_API_KEY=...
GOTENBERG_URL=...
MMOS_DOCUMENT_BUCKET=generated-pdfs
MMOS_DOCUMENT_SIGNED_URL_TTL_SECONDS=3600
NEXT_PUBLIC_REQUIRE_ROUTE_GUARD=true
NEXT_PUBLIC_ERROR_REPORTING_CONSENT_CATEGORY=analytics
NEXT_PUBLIC_ERROR_REPORTING_ESSENTIAL=false
JOB_WORKER_INTERVAL_MS=5000
JOB_MAX_ATTEMPTS=3
```

## Nach dem Deploy prüfen

```txt
/auth
/admin/training
/admin/production
/admin/production/security-core
/admin/sales/mini-audit-generator
/portal/reports
```
