# MMOS Final Production Readiness

Umgesetzt in diesem Paket:

- echte Live-E2E-Checks über Admin-API
- serverseitige Admin-Pflicht für `/api/production`
- Dokumentenvalidierung für customer_files/output_documents/sales_workflow_documents
- Rechnung-/E-Rechnung-Validierung mit XRechnung-Build-Check
- Supabase-RLS-Audit-RPC `mmos_rls_audit`
- Backup-/Restore-Dry-Run-Skript
- Monitoring-Testalarm
- Legal-/AVV-Checklisten als Startset
- Backoffice-Ansicht `Production Validation`

Nach Upload ausführen:

```txt
supabase/migrations/0094_production_validation_rls_backup_monitoring.sql
```

Lokale Checks:

```bash
yarn production:live-e2e
yarn backup:drill
```
