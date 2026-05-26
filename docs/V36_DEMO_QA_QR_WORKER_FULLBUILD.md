# MMOS V36 QA + QR Export + Automation Worker Fullbuild

## Neu

### Dashboard
- API-/Supabase-Status prüfen
- QA-Report pro Kunde laden
- Automation Worker manuell starten
- Kundendemo zurücksetzen
- QR-Code anzeigen
- Scan-Link kopieren
- QR PNG öffnen/downloaden

### Neue Backend-Endpunkte
```text
GET  /api/v33-functional/v36/system-status
GET  /api/v33-functional/v36/:customer_id/qa-report
POST /api/v33-functional/v36/:customer_id/worker/run
POST /api/v33-functional/v36/:customer_id/reset-test-data
```

### Neue SQL
```text
supabase/migrations/0043_v36_demo_qa_qr_worker.sql
```

## Vorführablauf
1. Kunde auswählen.
2. Kunden für QR/Loyalty vorbereiten.
3. QR-Link kopieren oder QR PNG öffnen/downloaden.
4. Mit Smartphone scannen.
5. Name/E-Mail eintragen.
6. Punkte sammeln.
7. QA Report laden.
8. Worker starten.
9. Leads, Engine Runs und Scores prüfen.
