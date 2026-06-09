# MMOS Admin Knowledge Quiz – All Tools

Dieses Fullbuild ersetzt/erweitert den bisherigen Wissenstest um einen vollständigen Fragenpool zu allen relevanten MMOS-Tools.

## Route

```txt
/admin/training
```

## Fragenpool

Aktuell enthalten: **78 Fragen**.

## Kategorien

- Grundlogik & Rollen
- CRM, Pipeline & Kunden
- Vertrieb & Angebote
- Google, SEO & Sichtbarkeit
- Reviews & Reputation
- Automation & Workflows
- Content, Social & Mail
- QR, Loyalty & Booking
- Reports, Media & Dokumente
- Finanzen & Abrechnung
- Betrieb, Health & Qualität
- Datenschutz & Sicherheit

## Abgedeckte Tools/Bereiche

- CRM, Kundenakte, Pipeline, Leadquellen, Customer Health
- Customer Intelligence
- Mini Audit Generator
- Lead Engine
- Angebotsgenerator
- Vertragsgenerator
- Google Business, SEO & Sichtbarkeit, Keywords, Places API
- Reputation Center, Review Intelligence, Bewertungs-Widget
- Workflows, Automation Playbooks, AI Automation Core
- AI Social Posts, Newsletter, AI Mail Assistant
- QR-Kampagnen, Slug-Hub, Loyalty Growth, Loyalty-Scan, Booking, No-Show
- Media & Reports, Document Engine v2, Signed URLs, Value Dashboard, Monatsreports
- E-Rechnung, Buchhaltungs-Export, POS/Kasse, Mahnstufen, Umsatz-Prognose, Smart Pricing
- Health-Cockpit, Wartungs-Reminder, Onboarding-Audits, Insights, Growth Command, Einrichtungs-Assistent, Datenqualität, Demo-Daten
- DSGVO-Cockpit, Sicherheit & 2FA, API-Keys, Consent, Sentry, Admin-Logs, Backup/Restore, Least Privilege

## Einbau

```bash
unzip -o MMOS_AdminKnowledgeQuiz_AllTools_Fullbuild_Package.zip -d .
node scripts/apply-admin-knowledge-quiz-all-tools-fullbuild.js
yarn --cwd frontend typecheck
yarn --cwd frontend build
```

## Datenschutz

Testergebnisse werden nur lokal im Browser gespeichert (`localStorage`) und nicht an den Server gesendet.
