# V42.24.8 Live Admin Demo Switch

## Änderung

- In der Live-Admin-Umgebung wurde ein direkter Button **Zur Demo-Admin-Umgebung** ergänzt.
- Der Button erscheint nur für Admins und nur, wenn `NEXT_PUBLIC_ENABLE_DEMO_MODE=true` gesetzt ist.
- Der Wechsel setzt `mmos_mode=demo` und öffnet die interne Demo-Admin-Ansicht über `?demo=admin`.
- In der Demo-Admin-Umgebung erscheint zusätzlich ein Button **Zur Live-Admin-Umgebung**.
- Live-Daten und Demo-Daten bleiben weiterhin getrennt; der Wechsel löscht oder migriert keine Daten.

## Minimal zu deployen

- `frontend/src/app/page.tsx`

## ENV Voraussetzung

- Vercel: `NEXT_PUBLIC_ENABLE_DEMO_MODE=true`
- Railway: `ENABLE_DEMO_MODE=true`
