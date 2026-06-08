# MMOS V066 – Paketmatrix Landingpage Fix

## Problem

Die Paketmatrix war nur als Tool sichtbar, aber Änderungen wurden nicht als öffentliche Landingpage-Konfiguration gespeichert.

Die Haupt-Landingpage nutzt `landing_page_settings` mit `id='main'` und `scope='public_home'`. Dort existiert ein `packages` JSONB-Feld, das bisher für Texte genutzt wurde, aber nicht sauber als Preisquelle der Paketmatrix.

## Fix

- Neuer `V66PackageMatrixEditor`
- Speichern in `landing_page_settings.packages`
- Preise und Setup-Gebühren pro Paket:
  - Starter
  - Growth
  - Premium
- Landingpage-Helfer `packageDisplayMatrix(store.data)`
- Default Landingpage-Pakete enthalten jetzt `price` und `setupFee`
- Migration `0096_v066_package_matrix_landing_settings.sql`

## Nach dem Patch prüfen

```bash
yarn quality:guard
yarn --cwd frontend typecheck
yarn --cwd frontend build
```

Danach Migration in Supabase ausführen/deployen.
