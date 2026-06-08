# MMOS Fullbuild Redeploy – Vereinfachte Pakete + Backoffice

## Enthalten

- Starter-Paket radikal vereinfacht:
  - Google Business Optimierung
  - SEO KPI Übersicht
  - SEO Heatmap
  - QR-Code Kampagne ohne Loyalty
  - Kundenübersicht für hochgeladene Rechnungen/Reports
- Growth ohne SumUp Feature.
- Retention Intelligence heißt nun verständlicher: **Kundenbindung & Wiederkehrer**.
- Backoffice ist wieder als eigener Admin-Menüpunkt vorhanden und enthält die alten internen Funktionen.
- Kundennavigation ist verschlankt: Starter erhält nur Sichtbarkeit/QR/Reports/Rechnungen/Dateien.
- Vercel-/Railway-Buildfehler aus V067 wurden bereinigt.

## Migration

Nach dem Deploy in Supabase ausführen/deployen:

```txt
supabase/migrations/0098_v068_simplified_packages_backoffice.sql
```

## Prüfen

```bash
node --check backend/src/services/storeService.js
yarn quality:guard
yarn --cwd frontend typecheck
yarn --cwd frontend build
```
