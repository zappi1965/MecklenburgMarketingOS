# Logo Visibility Fix

Gefixt wurde, dass das Mecklenburg-Marketing-Logo auf der Landingpage und in der Seitenleiste nicht sichtbar war.

## Änderungen

- Landingpage nutzt jetzt standardmäßig `/brand/mecklenburg-marketing-logo-full.png`.
- Landingpage rendert immer ein echtes Logo-Bild, auch wenn in Settings kein Logo gespeichert ist.
- Die alte monolithische App-Sidebar zeigt jetzt das Markenlogo statt nur `M / MMOS`.
- `BrandLogo` nutzt robuste `<img>`-Tags statt `next/image`, damit die Assets in jeder Build-/Deploy-Situation direkt sichtbar sind.
- CSS für `.logo.hasImage`, Landing-Logo und Sidebar-Logo wurde ergänzt.

## Betroffene Dateien

- `frontend/src/app/page.tsx`
- `frontend/src/components/brand/BrandLogo.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/styles/brand.css`
- `frontend/src/components/AdminShell.tsx`
