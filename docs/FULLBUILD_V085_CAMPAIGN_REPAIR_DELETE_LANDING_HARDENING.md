# MMOS V085 · Campaign Repair, CRM Delete & Landing Hardening

## Enthalten

- Admin-Aktion **Kampagnen reparieren** im Bereich QR Kampagnen verwalten.
- Alte QR-Kampagnen werden auf `/q/[slug]` normalisiert.
- QR-Metadata bekommt wieder `qr_scan_url`, `landing_url`, `require_rescan_for_points` und `final_slug_rules_source`.
- Bestehende Loyalty-Programme werden über `qr_campaign_id`, Slug oder Public URL gesucht und wieder verknüpft.
- Falls nötig wird für Loyalty-/Kombi-Kampagnen ein Loyalty-Programm erstellt.
- Rewards werden neu auf Kampagne und Programm verknüpft; gelöschte/archivierte Rewards bleiben deaktiviert.
- CRM-Kundenlöschung läuft jetzt primär über den gehärteten Backend-Cascade und entfernt danach lokal alle zugehörigen sichtbaren Daten.
- Landingpage/Paketmatrix speichert schema-sicherer: unbekannte Spalten werden backendseitig aus dem Payload entfernt bzw. auf packages-only zurückgefahren.

## Migration

`supabase/migrations/0112_v085_campaign_repair_delete_landing_hardening.sql`

Die Migration ist additiv und ergänzt nur fehlende Spalten/Indizes.

## Checks

- `node --check backend/src/services/storeService.js`
- `node --check scripts/quality-guard.mjs`
- `node scripts/quality-guard.mjs`
