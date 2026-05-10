# Mecklenburg Marketing OS – 1:1 Live Build

Diese Version ist eine deutlich funktionalere SaaS/MVP-Version.

## Eingebaut
- Mockup-naher SaaS-Look
- Klickbare Buttons und Modals
- CRUD/Demo-Logik für Leads, Termine, Social Posts, Outreach, QR, Reports, Angebote, Onboarding und Reputation Alerts
- Zwei Admin-Accounts:
  - admin@agentur.local / admin123
  - mitarbeiter@agentur.local / mitarbeiter123
- Review Funnel
- Kundenportal
- Modulfreischaltung
- Mobile-Optimierung
- Provider-Platzhalter für WhatsApp, Google, Stripe, OpenAI, Lexoffice und SMTP

## Start
Backend:
cd backend
npm install
cp .env.example .env
npm start

Frontend:
cd frontend
npm install
cp .env.example .env.local
npm run dev

## Hinweis
Externe Dienste funktionieren erst mit echten API-Keys. Intern ist die Version als Demo/MVP bedienbar.
