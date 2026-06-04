# MMOS V103.7 — Loyalty Stempelkarten-Ansicht

## Ziel
Die öffentliche Loyalty-Slugseite `/l/[slug]` kann Punkte optional als digitale Stempelkarte anzeigen. Die Stempelkarte ist nur eine Visualisierung; die Punktevergabe bleibt weiterhin ausschließlich über den bestehenden Backend-Ablauf geschützt.

## Geänderte Dateien

- `frontend/src/components/loyalty/StampCardView.tsx`
  - neue mobile-first Komponente für digitale Stempelkarten
  - unterstützt `classic` nicht direkt, sondern wird nur in `stamp_card`/`hybrid` gerendert
  - gefüllte Felder zeigen Logo, Haken oder Stern
  - volle Karte zeigt „Prämie freigeschaltet“

- `frontend/src/app/l/[slug]/page.tsx`
  - liest Loyalty-Darstellungsmodus aus `v37_loyalty_settings`, `metadata`, `program.metadata` oder `qr_campaign.metadata`
  - `classic`: bisherige Punkteansicht bleibt unverändert
  - `stamp_card`: Stempelkarte + kompakter Punktestand
  - `hybrid`: Stempelkarte + klassische Punkteansicht/Fortschritt

- `frontend/src/app/globals.css`
  - Styles für `.stampCardView`, `.stampSlot`, `.publicStampCompactPoints`

- `backend/src/routes/v33FunctionalRoutes.js`
  - V37 Loyalty Settings bekommen neue Defaults
  - Settings-Speicherroute akzeptiert/sanitized neue Felder
  - keine neue öffentliche Punkte-API

- `supabase/migrations/0103_7_loyalty_stamp_card.sql`
  - additive Migration für `v37_loyalty_settings`

## Neue Einstellungen

- `loyalty_display_mode`: `classic`, `stamp_card`, `hybrid`
- `stamp_card_slots`: `6`, `8`, `10`, `12`
- `stamp_card_reward_text`: Text auf der Karte
- `stamp_card_stamp_style`: `logo`, `check`, `star`
- `stamp_card_show_logo`: Logo als Stempel verwenden, wenn vorhanden
- `stamp_card_background`: optionale Logo-/Stempel-URL

## Test

1. SQL-Migration in Supabase ausführen.
2. Im Adminbereich `Punkteprogramm Branding & Rules Builder` öffnen.
3. Unter `Stempelkarten-Ansicht` Darstellung auf `Stempelkarte` oder `Kombiniert` setzen.
4. Speichern.
5. Öffentliche `/l/[slug]`-Seite öffnen.
6. Erwartung:
   - `classic`: alte Punkteansicht
   - `stamp_card`: Karte mit Stempeln
   - `hybrid`: Karte + alte Punkteansicht

## Fallbacks

- ungültiger Modus → `classic`
- ungültige Slot-Anzahl → `10`
- fehlendes Logo → Haken/Stern-Fallback
- fehlender Punktestand → `0`
- fehlender Reward-Text → `Volle Karte = Prämie sichern`

## Sicherheit

Die Stempelkarte verändert keine Punkte. Sie zeigt nur den serverseitig geladenen `pointsBalance` an. Es wurde keine öffentliche API hinzugefügt, über die Punkte clientseitig manipuliert werden können.
