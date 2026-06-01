# MMOS Portal, Reports, Segment-Kampagnen, Consent Center & Go-Live Cockpit

## Umgesetzt

### 1. Kundenseitige Portal-Ansicht verbessert
Neue Seite:
- `/portal`

Neue Route:
- `GET /api/customer-portal/overview`

Zeigt:
- Kunde
- Dokumentanzahl
- Reports
- aktive Werbeeinwilligungen
- Kampagnen
- neueste Dokumente
- aktuelle Kampagnen
- Links zu Reports, Einwilligungen, Retention und Go-Live Status

### 2. Echter PDF-/Report-Versand für Monatsreports
Neue Services:
- `monthlyReportDeliveryService.js`

Neue Routen:
- `POST /api/production/operations/monthly-report/:customer_id/pdf`
- `POST /api/production/operations/monthly-report/:customer_id/send`

Funktionen:
- Monatsreport erzeugen
- HTML-Report rendern
- PDF über Gotenberg erstellen
- PDF im Kundenportal freigeben
- PDF per MailService/Resend als Anhang senden

Hinweis:
- Für echte PDF-Erzeugung muss `GOTENBERG_URL` gesetzt sein.
- Für echten Versand müssen `RESEND_API_KEY` und `MAIL_FROM` gesetzt sein.

### 3. Segmentbasierte Kampagnen aus Retention Intelligence starten
Neue Services:
- `retentionSegmentCampaignService.js`

Neue Route:
- `POST /api/production/retention-intelligence/segment-campaign/:customer_id/start`

Funktionen:
- Segment auswählen
- passende Kampagnenvorlage bestimmen
- Loyalty-Kampagne als Entwurf erzeugen
- optional Coupon-Entwürfe für Segmentmitglieder erstellen
- Ergebnisse unter `segment_campaigns` speichern

### 4. Consent-Center für Endkunden schöner
Neue Seite:
- `/marketing/consent-center`

Neue Public Routen:
- `POST /api/v33-functional/public/loyalty/:slug/marketing-consent/status`
- `POST /api/v33-functional/public/loyalty/:slug/marketing-consent/resend-double-opt-in`

Funktionen:
- Endkunde kann Consent-Status prüfen
- Double-Opt-in erneut anfordern
- Einwilligung widerrufen
- Link wurde auf Confirm/Unsubscribe-Seiten ergänzt

### 5. Admin-Dashboard Go-Live Cockpit
Neue Seite:
- `/admin/go-live`

Neue Routen:
- `GET /api/production/go-live-cockpit/overview`

Führt zusammen:
- 99/100 Activation Readiness
- Mail-Domain Readiness
- Kunden-Go-Live
- Support-Diagnose
- Billing Consistency
- Retention Intelligence
- Backup/Restore

## Produktionshinweise

- PDF-Versand benötigt Gotenberg + Resend.
- Segment-Kampagnen werden als Entwürfe erzeugt, nicht automatisch an Endkunden versendet.
- Consent Center nutzt bestehende E-Mail/Passwort-Authentifizierung des Bonusprogramms.
- Go-Live Cockpit zeigt Blocker und nächste Schritte, ersetzt aber keine echten Live-Checks.
