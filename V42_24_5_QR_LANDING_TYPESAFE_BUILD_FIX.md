# V42.24.5 – QR Landing Type-Safe Build Fix

## Problem
Vercel/Next.js 16.2.6 brach beim TypeScript-Check in `frontend/src/app/page.tsx` ab:

`Property 'daily_point_limit_per_member' does not exist on type ...`

Ursache: Der State des `LandingTextEditor` wurde ohne die neu ergänzten QR-/Loyalty-Sicherheitsfelder initialisiert, obwohl diese Felder im UI gelesen und beim Speichern gesetzt werden.

## Fix
- `daily_point_limit_per_member` im `LandingTextEditor`-State ergänzt.
- `suspicion_score_threshold` im `LandingTextEditor`-State ergänzt.
- Beide Felder werden jetzt auch beim Speichern in `qr_campaigns` und `metadata` übernommen.

## Verhalten
- Live-/Demo-Trennung aus V42.24.4 bleibt unverändert erhalten.
- SQL-Typensicherheit aus V42.24.4 bleibt unverändert erhalten.
- Demo-Datensätze werden weiterhin nicht gelöscht.
