# MMOS Production Readiness Operations

Dieses Fullbuild-Paket setzt fünf operative Bausteine um:

1. automatisierte E2E-Tests
2. Monitoring / Error Tracking
3. Backup-/Restore-Konzept
4. API-Kostenkontrolle
5. saubere Admin-Protokolle

## Einbau

```bash
unzip -o MMOS_ProductionReadiness_Fullbuild_Package.zip -d .
node scripts/apply-production-readiness-fullbuild.js
yarn --cwd frontend typecheck
yarn --cwd frontend build
yarn --cwd frontend e2e
yarn --cwd backend test
```

Danach die Supabase-Migration ausführen:

```txt
supabase/migrations/0090_production_readiness_observability.sql
```

## Neue ENV

```env
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
API_COST_CONTROL_ENABLED=true
API_COST_FAIL_OPEN=true
API_COST_DAILY_LIMIT_CENTS=500
API_COST_MONTHLY_LIMIT_CENTS=5000
GOOGLE_PLACES_DAILY_LIMIT_CENTS=300
GOOGLE_PLACES_MONTHLY_LIMIT_CENTS=3000
GOOGLE_PLACES_TEXT_SEARCH_ESTIMATED_CENTS=3
GOTENBERG_DAILY_LIMIT_CENTS=100
GOTENBERG_MONTHLY_LIMIT_CENTS=1000
GOTENBERG_RENDER_PDF_ESTIMATED_CENTS=1
ADMIN_AUDIT_IP_SALT=beliebiger_langer_salt
SUPABASE_DB_URL=postgresql://...
BACKUP_BUCKET=mmos-backups
BACKUP_UPLOAD_TO_SUPABASE=true
```

## E2E-Secrets für GitHub Actions

```txt
E2E_BASE_URL=https://deine-vercel-domain
E2E_ADMIN_EMAIL=...
E2E_ADMIN_PASSWORD=...
E2E_CUSTOMER_EMAIL=...
E2E_CUSTOMER_PASSWORD=...
SUPABASE_DB_URL=...
```

## Restore

Restore nur bewusst und manuell:

```bash
SUPABASE_DB_URL=... ./scripts/restore-supabase.sh ./backups/mmos-YYYY-MM-DD.dump
```

Das Skript fordert zusätzlich die Eingabe `RESTORE`, bevor es schreibt.
