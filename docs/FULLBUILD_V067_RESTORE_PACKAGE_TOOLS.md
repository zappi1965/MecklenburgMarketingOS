# MMOS V067 – Restore Package Tools

## Problem

Nach der Fusion von Backoffice und Frontoffice waren mehrere verkaufbare Growth/Premium-Tools nicht mehr sichtbar:

- Churn Prevention
- SumUp Integration / SumUp Umsatzdaten
- Retention Intelligence
- Consent Center
- Segment Kampagnen

## Fix

- Tool-Keys wieder in Admin-Navigation aufgenommen
- Paket-Routen wieder gemappt
- Paketmatrix erkennt diese Tools wieder
- V33 ToolConfig ergänzt
- Seed-/Live-Zählung erweitert
- Backend Store-Allowlist optional ergänzt
- Migration fuer Live-Tabellen ergänzt

## Prüfen

```bash
yarn quality:guard
yarn --cwd frontend typecheck
yarn --cwd frontend build
```

Danach Migration ausführen:

```txt
supabase/migrations/0097_v067_restore_package_tools.sql
```
