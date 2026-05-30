# Neu & Wichtig Same-System Fix

Gefixt wurde, dass unter `Neu & wichtig` ein komplett anderes Admin-System geöffnet wurde.

## Ursache

Die Legacy-Sidebar in `frontend/src/app/page.tsx` hatte echte Links auf `/admin/...`.
Diese Routen nutzen das neue AdminShell-System und sahen deshalb wie ein anderes System aus.

## Fix

Die Einträge unter `Neu & wichtig` sind jetzt keine Links mehr, sondern interne Dashboard-Buttons.
Sie setzen die bestehende `view` im aktuellen MMOS-Dashboard.

## Neue interne Views

- `admin_tool_center`
- `admin_training`
- `production_readiness`
- `security_core_live`

## Weiterhin erhalten

Die direkten `/admin/...` Routen funktionieren weiter, aber die Legacy-Sidebar öffnet die Tools jetzt im gleichen System.

## Kundensicht

`Neu & wichtig` bleibt weiterhin nur für `role === 'admin'` sichtbar.
