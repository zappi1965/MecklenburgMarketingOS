# UI / Sidebar Fix

Neue interne Tools wurden sauber in die Admin-Seitenleiste eingebaut.

## Neu sichtbar in der Sidebar

Abschnitt: `Neu & wichtig`

- `/admin` Tool-Zentrale
- `/admin/training` Wissenstest
- `/admin/sales/mini-audit-generator` Mini Audit Generator
- `/admin/sales/lead-engine` Lead Engine
- `/admin/production` Production Readiness
- `/admin/production/security-core` Security Core
- `/media/report-center` Media & Reports
- `/portal/reports` Kundenportal Reports

Zusätzlich wurde `/admin` als zentrale Tool-Übersicht angelegt.

## Weitere Anpassung

Doppelte AdminShell-Wrappings in `/admin/tools` und `/admin/demo-data` wurden entfernt, weil `/admin/layout.tsx` bereits die Admin-Seitenleiste rendert.
