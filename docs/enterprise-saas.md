# Mecklenburg Marketing OS – Enterprise SaaS Build

Diese Version erweitert dein MVP so weit wie hier sinnvoll möglich zu einer Enterprise-SaaS-Struktur.

## Neu enthalten

- PostgreSQL/Supabase Schema
- Mandantenfähige Tabellen
- Rollen-/User-Grundlage
- Audit Logs
- Enterprise Control Center unter `/enterprise`
- Redis/BullMQ Queue-Struktur
- Worker-Prozess
- Webhook-Routen für Stripe, WhatsApp und Google
- Stripe Checkout-Gerüst
- File Upload / Storage-Gerüst
- Provider-Status-System
- Dockerfiles
- Docker Compose Enterprise Stack
- Nginx Reverse Proxy Beispiel
- GitHub Actions CI/CD
- Monitoring-Dokumentation
- Erweiterte ENV-Struktur

## Was intern funktioniert

- Bestehende Demo-/MVP-Module
- JSON-Demo-Datenbank
- Enterprise Status
- Audit Log Anzeige
- Queue Mocking, falls Redis fehlt
- File Upload lokal
- Billing Mock, falls Stripe fehlt

## Was mit echten Keys live wird

- Supabase/PostgreSQL
- Stripe Billing
- WhatsApp Webhooks/API
- Google APIs
- OpenAI
- Lexoffice
- SMTP
- Redis Worker

## Start lokal klassisch

```bash
cd backend
npm install
cp .env.example .env
npm start
```

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Start mit Docker

```bash
cd infra
docker compose -f docker-compose.enterprise.yml up --build
```

## Logins

admin@agentur.local / admin123  
mitarbeiter@agentur.local / mitarbeiter123
