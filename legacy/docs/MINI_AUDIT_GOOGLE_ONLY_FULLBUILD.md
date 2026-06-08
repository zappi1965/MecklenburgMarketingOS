# Mini Audit Generator – Google-only Fullbuild

Dieser Fullbuild trennt den Mini-Audit-Generator bewusst vom normalen MMOS-Audit.

## Datenlogik

- **Mini Audit:** ausschließlich öffentlich sichtbare Google-/Maps-Daten
- **Normales Audit:** kann später Google-Daten + MMOS-Daten kombinieren
- **Ausgeschlossen im Mini Audit:** CRM, QR-Kampagnen, Loyalty, interne Reviews, Kundenkonto, MMOS-Dashboarddaten

## Dateien

- `frontend/src/app/admin/sales/mini-audit-generator/page.tsx`
- `frontend/src/app/admin/sales/lead-engine/page.tsx` als direkte Tool-Route
- `frontend/src/components/mini-audit/MiniAuditGeneratorClient.tsx`
- `frontend/src/app/api/mini-audit/google-place/route.ts`
- `frontend/src/app/api/mini-audit/generate-pptx/route.ts`
- `frontend/src/lib/mini-audit/googleDataAnalyzer.ts`
- `frontend/src/lib/mini-audit/pptxBuilder.ts`
- `frontend/src/lib/mini-audit/badgeLibrary.ts`
- `frontend/src/lib/mini-audit/templateManifest.ts`
- `frontend/public/templates/mini-audit/badge_library.json`
- `frontend/public/templates/mini-audit/template_manifest.json`

## Environment Variable

Für den Live-Abruf wird eine Google Places / Maps API benötigt:

```txt
GOOGLE_MAPS_API_KEY=...
```

Alternativ wird auch `GOOGLE_PLACES_API_KEY` gelesen.

## Ablauf

```txt
Unternehmen + Ort oder Place ID eingeben
↓
/api/mini-audit/google-place ruft öffentliche Google-Place-Daten ab
↓
googleDataAnalyzer berechnet Status automatisch
↓
badgeLibrary setzt Farben intern
↓
/api/mini-audit/generate-pptx erzeugt PPTX
```

## Keine manuelle Ampelauswahl

Die UI enthält keine Auswahlfelder für `kritisch`, `bedingt`, `stark`, `gering`, `mittel` oder `hoch`.
Diese Werte werden automatisch aus öffentlichen Google-Signalen berechnet.
