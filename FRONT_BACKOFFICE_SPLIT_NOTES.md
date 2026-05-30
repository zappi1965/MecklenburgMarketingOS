# Frontoffice / Backoffice Split

Umgesetzt wurde die Trennung:

## Frontoffice

Die direkt nach dem Login sichtbare bestehende MMOS-App zeigt jetzt kundennahes Arbeiten:

- Dashboard
- CRM
- Pipeline
- Customer Health / Intelligence
- Akquise & Leads
- Mini Audit / Lead Scraper / Akquise-Kampagnen
- Google / SEO / KPI / Wettbewerber
- QR & Loyalty
- Reviews & Reputation
- Tickets / Booking / Media / Reports / Freigaben
- Marketing Automation / Workflows / AI Assistant

## Backoffice

Backoffice öffnet sich über den neuen Button `Backoffice öffnen`.
Dort liegen interne Tools:

- Rechnungen
- E-Rechnung
- Buchhaltungs-Export
- Kassen-Anbindung
- Mahnwesen
- Umsatz-Prognose
- Smart Pricing
- Pakete & Billing
- Tool-Freigaben
- Production Readiness
- Security Core
- DSGVO / Compliance
- API-Keys
- Demo-Daten
- Wissenstest

## Zugriff

Backoffice fragt den Zugriff nicht mehr bei jedem Öffnen neu an:

- Middleware erzwingt keinen Cookie-Redirect mehr.
- RoleGate cached das Profil für 10 Minuten in `sessionStorage`.
- Direkte Admin-Routen bleiben geschützt, aber ohne ständige Re-Login-Schleife.

## Betroffene Dateien

- `frontend/src/app/page.tsx`
- `frontend/src/components/AdminShell.tsx`
- `frontend/src/components/security/RoleGate.tsx`
- `frontend/src/middleware.ts`
- `frontend/src/app/globals.css`
