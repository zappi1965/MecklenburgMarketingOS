# Legacy Sidebar New Tools Fix

Der Abschnitt `Neu & wichtig` wurde zusätzlich in die alte/monolithische App-Seitenleiste eingebaut.

## Warum?

Die neuen Admin-Links waren bereits in `frontend/src/components/AdminShell.tsx` enthalten.
Wenn du aber die bisherige App-UI über `frontend/src/app/page.tsx` siehst, nutzt diese eine eigene Sidebar.
Dort war `Neu & wichtig` vorher nicht sichtbar.

## Jetzt sichtbar in der alten Sidebar

- Tool-Zentrale `/admin`
- Wissenstest `/admin/training`
- Mini Audit Generator `/admin/sales/mini-audit-generator`
- Lead Engine `/admin/sales/lead-engine`
- Production Readiness `/admin/production`
- Security Core `/admin/production/security-core`

## Betroffene Dateien

- `frontend/src/app/page.tsx`
- `frontend/src/app/globals.css`
