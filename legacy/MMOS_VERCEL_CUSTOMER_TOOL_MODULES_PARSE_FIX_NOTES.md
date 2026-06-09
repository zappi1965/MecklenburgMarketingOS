# MMOS Vercel Build Fix: customerToolModules.ts

## Fehler

Vercel/Turbopack brach ab mit:

`frontend/src/lib/customerToolModules.ts:425:10 Expected ';', '}' or <eof>`

Ursache:
Das Modul `sumup_revenue_connection` stand versehentlich außerhalb des Arrays `customerToolModules` hinter den Export-Funktionen.

## Fix

- Stray Objekt hinter `singleModuleValue()` entfernt
- `sumup_revenue_connection` korrekt in `customerToolModules` vor `customerPackageComposition` eingefügt
- Paketzuordnungen Growth/Premium bleiben erhalten
- Keine doppelte Moduldefinition

## Erwartung

Der konkrete Turbopack-Parsingfehler ist damit behoben.
