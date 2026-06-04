# MMOS V103.7 Fullbuild — Loyalty Stempelkarte

Basis: V103/V103.6 Fullbuild.

Dieses Fullbuild ergänzt die öffentliche Loyalty-Slugseite um die auswählbare Stempelkarten-Darstellung. MFA, CORS, Login und Scroll wurden nicht absichtlich verändert.

## Feature

Neue Darstellungsmodi:

- `classic` — bisherige Punkteansicht
- `stamp_card` — digitale Stempelkarte mit kompaktem Punktestand
- `hybrid` — Stempelkarte plus bisherige Punkteansicht/Fortschrittsbalken

## Neue Dateien

- `frontend/src/components/loyalty/StampCardView.tsx`
- `supabase/migrations/0103_7_loyalty_stamp_card.sql`
- `docs/V103_7_LOYALTY_STAMP_CARD_NOTES.md`

## Geänderte Dateien

- `frontend/src/app/l/[slug]/page.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/app/globals.css`
- `backend/src/routes/v33FunctionalRoutes.js`

## Deployment

1. Inhalt nach GitHub `main` übernehmen.
2. Supabase SQL-Migration `0103_7_loyalty_stamp_card.sql` ausführen.
3. Vercel/Railway neu deployen.
4. Im Punkteprogramm-Builder die Darstellungsoption setzen.

## Test

- Admin → Punkteprogramm Branding & Rules Builder → Stempelkarten-Ansicht
- Darstellung auf `Stempelkarte` oder `Kombiniert` stellen
- Speichern
- `/l/[slug]` öffnen

## Sicherheit

Die Stempelkarte ist rein visuell. Sie erzeugt keine Punkte und fügt keine neue öffentliche Punkte-API hinzu.
