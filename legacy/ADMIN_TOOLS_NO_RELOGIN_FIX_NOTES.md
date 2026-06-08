# Admin Tools No Re-Login Fix

Gefixt wurden zwei Punkte:

## 1. Admin-Tools unter `Neu & wichtig` erzwingen keinen erneuten Login mehr

Ursache:
`frontend/src/middleware.ts` hat geschützte Routen serverseitig anhand von Cookies geprüft.
Supabase Browser-Auth liegt aber clientseitig im Browser. Dadurch konnte Middleware die aktive Session nicht zuverlässig sehen und hat gültige Admins zurück nach `/auth` geschickt.

Fix:
Die Middleware lässt geschützte Routen durch. Die eigentliche Zugriffskontrolle bleibt clientseitig über `AdminOnly`, `RoleGate` und `ToolAccessGate`.

Betroffene Datei:
- `frontend/src/middleware.ts`

## 2. `Neu & wichtig` wurde aus Kundentool/Kundenansicht entfernt

Ursache:
Der Legacy-Sidebar-Block wurde in `frontend/src/app/page.tsx` unabhängig von der Rolle angezeigt.

Fix:
Der Block wird jetzt nur noch bei `role === 'admin'` gerendert.

Betroffene Datei:
- `frontend/src/app/page.tsx`

## Direkte Tests nach Deploy

- als Admin: `/admin/training`
- als Admin: `/admin/sales/mini-audit-generator`
- als Admin: `/admin/production`
- als Admin: `/admin/production/security-core`
- als Kunde: kein Abschnitt `Neu & wichtig` in der Legacy-/Kunden-Sidebar
