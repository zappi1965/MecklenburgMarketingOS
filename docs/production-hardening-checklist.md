# MMOS Production Hardening Checklist

## Vor jedem Deploy

```bash
yarn quality:guard
yarn --cwd frontend typecheck
yarn --cwd frontend build
```

## Neue Migration

```txt
supabase/migrations/0092_sales_workflow_production.sql
```

## Verkaufsworkflow-Abnahme

1. Lead finden oder Demo-Workflow anlegen
2. Kundenakte prüfen
3. Mini Audit erzeugen
4. Angebot/Paket wählen
5. QR/Review/Google freischalten
6. Report erzeugen
7. Rechnung schreiben
8. Workflow-Historie prüfen
