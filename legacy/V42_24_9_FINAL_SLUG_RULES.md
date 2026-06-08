# V42.24.9 Final Slug Rules

Ziel: Die mehrfach vorhandenen QR-/Loyalty-Regeln werden für öffentliche `/l/[slug]` Seiten eindeutig getrennt.

## Finale Quelle

Die öffentliche Slug-Seite nutzt final die Werte der konkreten `qr_campaigns`-Kampagne:

- `points_per_scan`
- `max_scans_per_member`
- `daily_scan_limit_per_member`
- `scan_cooldown_minutes`
- `daily_point_limit_per_member`
- `suspicion_score_threshold`
- zusätzlich gespiegelt in `qr_campaigns.metadata`

## UI

Der Bereich **Öffentliche /l/[slug] Seite** enthält jetzt den Block:

**Finale Einstellungen für diese öffentliche Slug-Seite**

Dort werden die Regeln gespeichert, die wirklich auf der öffentlichen Slug-Seite greifen.

## Backend

Neu:

- `POST /api/v33-functional/v42/qr-campaigns/:id/final-slug-settings`
- tägliches Scan-/Einlöselimit pro Endkunde wird geprüft
- `0` bedeutet beim kampagnenbezogenen Limit wirklich: kein Limit / unbegrenzt
- globale Security-/Loyalty-Regeln dienen nur als Fallback, wenn in der Kampagne kein Wert gesetzt ist

## SQL

Optional/nicht-destruktiv:

- `SQL_V42_24_9_FINAL_SLUG_RULES.sql`
- `supabase/migrations/0061_v42_24_9_final_slug_rules.sql`

Die Migration ergänzt `daily_scan_limit_per_member` als optionale Spalte und übernimmt vorhandene Werte aus `metadata`.
