# MMOS 99/100 Live Execution Runbook

## 1. Deployment

- Fullbuild deployen.
- Railway Backend aktualisieren.
- Vercel Frontend aktualisieren.
- Backend `/api/health` prüfen.

## 2. Supabase

Migration ausführen:

```sql
supabase/migrations/0099_final_production_performance_indexes.sql
```

Danach optional in Railway setzen:

```txt
MMOS_MIGRATION_0099_CONFIRMED=true
```

## 3. Live Runner

Lokal oder CI:

```bash
MMOS_BACKEND_URL=https://dein-backend.up.railway.app \
MMOS_ADMIN_BEARER_TOKEN=<admin-access-token> \
MMOS_CUSTOMER_ID=<kunde> \
node scripts/production-99-live-runner.mjs
```

## 4. Final Hardening UI

Öffnen:

```txt
/admin/production/final-hardening
```

Prüfen:

- Smoke Tests
- Tenant Isolation
- Webhooks
- Mail Compliance
- Error Center
- Background Jobs
- Activation Readiness

## 5. Final-Flags erst nach echter Prüfung setzen

```txt
MMOS_FINAL_99_DEPLOYED=true
MMOS_MIGRATION_0099_CONFIRMED=true
MMOS_LIVE_SMOKE_GREEN=true
MMOS_TENANT_AUDIT_GREEN=true
MMOS_MAIL_DOMAIN_VERIFIED=true
MMOS_GOTENBERG_LIVE_GREEN=true
MMOS_RESTORE_TEST_GREEN=true
MMOS_PLAYWRIGHT_E2E_GREEN=true
MMOS_LEGAL_REVIEW_DONE=true
```

## 6. Was nicht automatisiert ersetzt werden kann

- Provider-Domain-Verifizierung
- Webhook-Secrets im echten Dashboard
- Restore-Probe mit echten Backups
- Anwaltliche Prüfung
- Manuelle Endabnahme
