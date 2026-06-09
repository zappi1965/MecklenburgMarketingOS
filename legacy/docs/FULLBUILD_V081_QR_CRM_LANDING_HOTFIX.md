# MMOS V081 QR/CRM/Landing Hotfix

## Fixes
- Paketmatrix speichert schema-sicher nur noch `landing_page_settings.packages` und verursacht keinen `demo_audit`-PGRST204-Fehler mehr.
- Migration `0108` ergänzt `demo_audit` und die weiteren Landingpage-Felder sauber als Spalten.
- Kundensuche setzt den aktiven Kunden beim Tippen nicht mehr leer.
- Starter-Kunden mit einzeln freigeschaltetem Loyalty-Zugriff können im Admin wieder Punkte-QRs und Kombi-QRs erhalten.
- CRM-Kundenlöschung wurde backendseitig mit Cascade-Cleanup abgesichert.
- Live-Kundenliste blendet gelöschte/archivierte Kunden aus.

## Migration
`supabase/migrations/0108_v081_qr_crm_landing_hotfix.sql`
