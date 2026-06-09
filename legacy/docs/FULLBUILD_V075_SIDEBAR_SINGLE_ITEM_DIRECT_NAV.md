# V075 Sidebar Single Item Direct Navigation

## Ziel
Seitenleisten-Gruppen mit nur einem enthaltenen Unterpunkt öffnen kein Dropdown/Akkordeon mehr.

## Änderung
- Gruppen mit genau einem Tool werden als direkter Navigationspunkt gerendert.
- Kein Plus/Minus-Icon und kein ausklappbares Menü bei Einzelpunkten.
- Gruppen mit mehreren Tools behalten das ausklappbare Verhalten.
- Mobile bleibt unverändert nutzbar: Klick auf Einzelpunkt schließt das mobile Menü direkt.

## Betroffene Datei
- `frontend/src/app/page.tsx`

## Migration
Keine Supabase-Migration erforderlich.
