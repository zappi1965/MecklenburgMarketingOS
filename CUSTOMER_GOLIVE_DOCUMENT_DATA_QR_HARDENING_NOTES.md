# MMOS Customer Go-Live + Document/Data Integrity + QR Hardening

## Umgesetzt außerhalb QR

### Invoice & Document Integrity Guard
Prüft Rechnungen, PDFs, XML/E-Rechnung, `customer_files` und `output_documents`.

### Customer Portal Permission Guard
Prüft, ob Kunde, User, Paket und Toolfreigabe zusammenpassen.

### Document Versioning Guard
Prüft Angebote und Verträge auf Kundenbezug, Status, Version und PDF-/Dateiverknüpfung.

### Tool Access Policy Center
Bleibt aus Global Guards erhalten und wird in die Go-Live-Prüfung einbezogen.

### Booking Consistency Guard
Prüft Doppelbuchungen, Slot-Konflikte, inaktive Slots und Warteliste.

### Mail Delivery Guard
Prüft Resend/SMTP, MAIL_FROM, MAIL_DOMAIN und Admin-Empfänger.

### Lead / Data Quality Rules Engine
Prüft Pflichtfelder, fehlende `customer_id`, Kunden- und Lead-Dubletten.

### Audit-to-Offer Consistency Guard
Prüft Mini Audits, Angebote, Paketbezug und Sales-Workflow-Verknüpfung.

### Admin RBAC Guard
Prüft Adminrollen, unbekannte Rollen und Admins ohne MFA.

### Trash & Restore Center
Listet gelöschte/archivierte Datensätze und stellt sie wieder her.

### Customer Go-Live Checklist
Zentrale Kundenprüfung:
- Kunde aktiv
- Paket aktiv
- User vorhanden
- Tools freigeschaltet
- QR-Ziele korrekt
- Rewards plausibel
- Datenqualität
- Dokumente/Rechnungen
- Booking
- Mailversand

Neue Admin-Seite:
- `/admin/production/customer-readiness`

Neue Backend-Routen:
- `/api/production/customer-readiness/overview`
- `/api/production/customer-readiness/go-live/:customer_id`
- `/api/production/customer-readiness/portal-permissions/:customer_id`
- `/api/production/customer-readiness/data-quality`
- `/api/production/customer-readiness/mail`
- `/api/production/customer-readiness/booking`
- `/api/production/customer-readiness/documents/versioning`
- `/api/production/customer-readiness/audit-offer`
- `/api/production/customer-readiness/admin-rbac`
- `/api/production/customer-readiness/trash`
- `/api/production/customer-readiness/trash/restore`

## QR-Fixes zusätzlich

### QR Legacy Target Migration
- Findet alte QR-Kampagnen mit `/l/[slug]`.
- Stellt `target_url` und `public_url` auf `/q/[slug]` um.
- Bewahrt Landing-URL als `/l/[slug]` in metadata.

Route:
- POST `/api/production/customer-readiness/qr/migrate-legacy-targets`

### QR Token Cleanup Job
- Abgelaufene Tokens werden auf `expired` gesetzt.
- Alte `used` Tokens werden archiviert.

Route:
- POST `/api/production/customer-readiness/qr/cleanup-tokens`

### QR End-to-End Diagnostic
Prüft:
- Slug vorhanden
- QR-Ziel nutzt `/q/[slug]`
- Landing `/l/[slug]` vorhanden
- Kampagne aktiv

Route:
- GET `/api/production/customer-readiness/qr/e2e`

## Keine Supabase-Migration nötig

Alle neuen Prüfungen arbeiten mit vorhandenen Tabellen, metadata und bestehenden API-Strukturen.
