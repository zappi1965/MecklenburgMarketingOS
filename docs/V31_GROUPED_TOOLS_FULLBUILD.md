# MMOS V31 Grouped Tools Fullbuild

## Ziel

Die Tools sind jetzt nicht mehr flach in der Seitenliste verteilt, sondern sinnvoll untersortiert.

## Neue Menüstruktur

### Adminbereich
- Übersicht
  - Dashboard
  - Demo Kunden
- CRM & Betrieb
  - CRM
  - Rechnungen
  - Tickets
  - Booking
  - Pipeline
  - Media Center
  - Timeline Events
- QR & Loyalty
  - QR Kampagnen
  - Öffentliche /l/[slug] Seite
  - Loyalty Programm
  - Rewards
  - Reward Regeln
  - Mitarbeiter-Bestätigungscode
  - Loyalty Segmente
  - Smart Loyalty V2
- Reviews
  - Reviews
  - Review Intelligence
  - Antwortvorlagen
- Automation & Marketing
  - Automationen
  - Workflows
  - Smart Automation
  - Marketing Automation
  - AI Business Assistant
- Analytics & Billing
  - Customer Health
  - Customer Intelligence
  - Dynamic Billing
  - Revenue Forecasting
  - Revenue Share
  - Package Recommendations
  - Paket-Matrix

### Kundenbereich
- Übersicht
- QR & Loyalty
- Reviews
- Marketing & Automation
- Betrieb
- Analytics

## Funktionalität

- Alle vorhandenen Views bleiben über ihre bisherigen `view` Keys erreichbar.
- QR & Loyalty ist nur optisch gruppiert, die einzelnen Funktionen bleiben anklickbar.
- QR Kampagnen sind jetzt auch im Kundenbereich sichtbar, nicht nur im Adminbereich.
- Kunden können nicht auf andere Kunden umschalten; Admins behalten die Kundensuche.
- Die V30.5 JSX-Korrektur bleibt enthalten.
- Railway-Fix `reviewIntelligenceRoutes.js` bleibt enthalten.
- SQL Dedupe v3 bleibt enthalten.
