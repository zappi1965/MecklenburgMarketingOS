# V099/V100 – Pilot Stability & Customer Dashboard QoL

## V099 Pilot Readiness
- Neuer Backend-Check: `GET /api/v33-functional/customers/:customer_id/pilot-readiness`
- Prüft kundenbezogene Pilotfähigkeit für QR, Loyalty, Mitarbeitercodes, Prämien, Rückholaktionen, Double-Opt-in und Testmail/Testlink.
- Prüft wichtige Railway-ENV-Flags ohne Secrets offenzulegen.
- Prüft Pflichttabellen/-spalten für QR/Loyalty/Rückholaktionen und meldet fehlende Spalten als Schema-Hinweis.
- Neues Admin-Menü: **Pilot Readiness**.

## V100 Kunden-Dashboard QoL
- Kunden-Dashboard zeigt jetzt direkt den Bereich **Heute wichtig: QR & Loyalty**.
- QR-Link kopieren, Kundensicht öffnen und QR-Zielseite öffnen sind direkt im Dashboard erreichbar.
- Pilot-Checkliste zeigt die wichtigsten offenen Punkte ohne Tool-Suche.
- Admin-Dashboard zeigt eine kompakte Pilot-Readiness-Karte für den aktuell ausgewählten Kunden.

## Migration
- Keine neue Supabase-Migration nötig.
