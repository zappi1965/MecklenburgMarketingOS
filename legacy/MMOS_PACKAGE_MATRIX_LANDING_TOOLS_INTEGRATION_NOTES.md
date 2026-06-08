# MMOS Package Matrix, Landingpage & Tool Access Integration

## Umgesetzt

### 1. customerToolModules.ts erweitert
Neue verkaufbare / zubuchbare Module:
- Monatsreport PDF & Versand
- Kundenportal Pro
- Retention Intelligence Suite
- Customer Value Score
- Segmentbasierte Kampagnen
- Consent Center & Double-Opt-in Reminder
- Churn Prevention Center
- Feedback-to-Action Board
- Service Recovery Tool
- Mail-Domain & Consent Guard
- Go-Live Cockpit

### 2. toolRegistry.ts erweitert
Neue Tools wurden in die zentrale Tool Registry aufgenommen, damit sie paket- und navigationslogisch verfügbar sind:
- `/portal`
- `/portal/reports`
- `/portal/consents`
- `/marketing/consent-center`
- `/admin/reports/monthly`
- `/admin/retention/intelligence`
- `/admin/production/mail-domain`
- `/admin/go-live`

### 3. Paketmatrix Starter/Growth/Premium aktualisiert
Starter:
- Audit
- Reviews
- Dashboard / Reporting
- Monatsreport PDF Basis

Growth:
- Alles aus Starter
- Google & Listings
- QR / Loyalty
- Kundenportal Pro
- Retention Intelligence
- Customer Value Score
- Segment-Kampagnen
- Consent Center

Premium:
- Alles aus Growth
- Churn Prevention
- Feedback-to-Action
- Service Recovery
- Mail-Domain & Consent Guard
- Go-Live Cockpit
- weitere Premium-Module

### 4. /tools und /admin/tools
Beide Seiten nutzen die zentrale `customerToolModules`-Logik. Die neuen Module erscheinen dort automatisch mit Preis, Setup, Paketzuordnung und Link.

### 5. Landingpage Paketkarten
Die Default-Texte und Featurelisten der Landingpage wurden aktualisiert:
- Starter zeigt Monatsreport PDF-Basis
- Growth zeigt Retention Intelligence, Consent Center und Segment-Kampagnen
- Premium zeigt Churn Prevention, Service Recovery, Mail-Domain Guard, Go-Live Cockpit und Kundenportal Pro

### 6. Zubuchbare Tools
Die optionalen Tool-Chips auf der Landingpage wurden erweitert um:
- Monatsreport PDF-Versand
- Retention Intelligence
- Consent Center / Double-Opt-in
- Segment-Kampagnen
- Churn Prevention
- Service Recovery
- Mail-Domain & Consent Guard
- Go-Live Cockpit
- Kundenportal Pro

### 7. /admin/tool-access-v2
Diese Seite liest aus `customerToolModules`; die neuen Module erscheinen dadurch automatisch in den Freigaben.
