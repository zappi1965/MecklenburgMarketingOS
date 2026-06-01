# MMOS Operations Layer: Support, Onboarding, Reporting, Billing, Lifecycle, Incidents

## Umgesetzt

### Support-Diagnose-Cockpit
Neue UI:
- `/admin/production/support-diagnostics`

Neue Backend-Route:
- `/api/production/operations/support-diagnostics/:customer_id`

Prüft:
- Kunde aktiv
- QR-Kampagnen
- QR-Ziel `/q/[slug]`
- Slug
- Loyalty-Verknüpfung
- Rewards
- abgelaufene QR-Tokens
- letzte Fehler
- Billing-Hinweise

### Geführter Kunden-Onboarding-Wizard
Neue UI:
- `/admin/onboarding/customer-wizard`

Neue Backend-Routen:
- `GET /api/production/operations/onboarding/:customer_id`
- `POST /api/production/operations/onboarding/:customer_id/step`

Schritte:
- Kunde angelegt
- Paket gewählt
- Tools freigeschaltet
- Vertrag/AVV Status
- Branding
- QR/Loyalty
- Slug-Test
- Billing
- Go-Live
- Zugang

### Automatischer Monatsreport-Generator
Neue UI:
- `/admin/reports/monthly`

Neue Backend-Route:
- `POST /api/production/operations/monthly-report/:customer_id`

Erzeugt Report-Entwurf mit:
- QR-Kampagnen
- Bewertungen
- Leads
- Loyalty-Transaktionen
- Punkte earned/redeemed
- aktive Rewards
- Rechnungsvolumen
- Handlungsempfehlungen

### Billing Consistency Guard
Neue Backend-Route:
- `GET /api/production/operations/billing-consistency`

Prüft:
- Rechnungsnummer
- Dubletten
- customer_id
- Betrag
- PDF/File-Link bei gesendet/bezahlt/überfällig
- Mahnfall bei überfällig
- paid_at bei bezahlt

### Full Route Permission Guard
Neu:
- `backend/src/middleware/permissionGuard.js`

Beispielhaft genutzt für:
- Monatsreport erstellen
- Onboarding-Schritt ändern
- Lifecycle ändern
- Incident speichern
- Restore-Test protokollieren

### Backup-/Restore Readiness
Neue UI:
- `/admin/production/backup-restore`

Neue Backend-Routen:
- `GET /api/production/operations/backup-restore`
- `POST /api/production/operations/backup-restore/restore-test`

### Customer Lifecycle Status
Neue Backend-Routen:
- `GET /api/production/operations/lifecycle/:customer_id`
- `POST /api/production/operations/lifecycle/:customer_id`

Status:
- lead
- angebot_erstellt
- vertrag_gesendet
- vertrag_angenommen
- onboarding
- pilot
- live
- pausiert
- gekuendigt
- archiviert

### Incident Center
Neue UI:
- `/admin/production/incident-center`

Neue Backend-Routen:
- `GET /api/production/operations/incidents`
- `POST /api/production/operations/incidents`

## Keine Supabase-Migration nötig
Die neuen Operations-Daten nutzen vorhandene Tabellen, metadata und `v33_functional_records`.
