# MecklenburgMarketingOS (MMOS)

Lokales B2B-Marketing-Betriebssystem für deutsche Service-SMBs (Friseur,
Gastro, Beauty, Praxen, Handwerk, Hotels, Studios). Verbindet CRM, QR-/
Loyalty, Reviews, Booking, Rechnungen, AI-Tools und DSGVO/Compliance in
einem Tool.

```
backend/   Express-API + Worker (Node 20, Supabase als DB)
frontend/  Next.js 16 App Router (TypeScript)
supabase/  SQL-Migrationen
docs/      Onboarding-, Setup-, Compliance-Anleitungen
```

## Schnellstart

| Zielgruppe | Einstieg |
|---|---|
| Erstes Mal hier? | [`docs/ONBOARDING.md`](docs/ONBOARDING.md) |
| Backend lokal starten | [`docs/SETUP.md`](docs/SETUP.md) |
| Auf Vercel + Railway deployen | [`docs/DEPLOY.md`](docs/DEPLOY.md) |
| DSGVO-Status | [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) (von dir zu pflegen) |
| Verfügbare API-Endpunkte | [`docs/API.md`](docs/API.md) |

## Was MMOS kann

- **Compliance DE:** TSE-Anbindung (KassenSichV), XRechnung + ZUGFeRD,
  DSGVO-Cockpit mit Art.-30-Verzeichnis, 2FA, GoBD-Archiv-Stub.
- **Marketing:** QR-Kampagnen + öffentliche Slug-Seiten, Loyalty-Programm
  mit Wallet-Pass, Newsletter, Geschenkgutscheine, Bewertungs-Widget für
  externe Websites, Google-Business-Posts.
- **AI-Suite:** Provider-agnostisch (Anthropic Claude / OpenAI / Mock) —
  Review-Response-Generator, CRM-Mail-Assistant, Chatbot auf Slug-Seiten.
- **BI & Analytics:** Peer-Benchmark (k-anonym), Cohort-Retention,
  Customer-Lifetime-Value pro Segment, Daily-Briefing per E-Mail.
- **Operations:** Automation-Engine mit konfigurierbaren Cross-Modul-
  Workflows (Termin → Rechnung → Mahnstufe), Predictive No-Show-Risiko,
  Smart-Pricing-Engine, POS-Bridge (SumUp + Stubs für Lightspeed/
  GastroSoft).
- **Integrationen:** Public-API v1 mit Scope-basiertem Key-Management
  (Zapier-/n8n-ready), Stripe + PayPal, Google API (OAuth-vorbereitet).

## Architektur in 60 Sekunden

```
Browser
  │
  ▼
Next.js (Vercel) ─ Stateless, statisch wo möglich
  │
  │  Bearer-Token aus Supabase-Auth-Session ODER X-API-Key für Public-API
  ▼
Express-API (Railway)
  │
  │  Service-Role-Key auf Supabase Admin
  ▼
Supabase (Frankfurt empfohlen) ─ Postgres + Auth + Storage + RLS
```

- Backend ist **stateless**: keine Sessions, alle Anfragen authentifizieren
  sich pro Request.
- **Drittland-Eliminierung** durchgängig: QR-Codes lokal, Google-Redirects
  consent-gated, Mail-Provider EU-tauglich (Mailjet.de empfohlen).
- **Workflows** laufen als Cron-Worker (`automation-worker`,
  `gdpr-worker`, `daily-briefing-worker`).
- **Idempotenz**: alle Cross-Modul-Aktionen prüfen
  `customer_timeline_events` vor dem Ausführen, damit Re-Runs sicher sind.

## Tests + CI

| Suite | Anzahl | Laufzeit |
|---|---|---|
| `npm test` (Backend Unit) | 134+ | < 1 s |
| `npm run smoke:full` (Backend gegen laufenden Server) | 46+ | < 50 s |
| `yarn e2e` (Playwright Smoke) | 9 | < 30 s |
| `yarn typecheck` (Frontend) | — | < 5 s |
| `yarn build` (Next.js) | — | < 60 s |

GitHub Actions Workflow unter `.github/workflows/ci.yml` läuft alle Suites
auf jedem Push.

## Lizenz / Status

Private Vorabversion. Stand und offene Punkte siehe
[`docs/PRODUCTION_PASS.md`](docs/PRODUCTION_PASS.md) und
[`docs/REMAINING_LIMITATIONS.md`](docs/REMAINING_LIMITATIONS.md).


## V49 Stability & Production Guard

Dieser Fullbuild enthält Stabilitätsfixes für den echten Projektstand:

- gepinnte Dependencies
- zentrale Demo-/Live-Logik
- TypeScript-Fixes
- Public Hub API
- Tool-Access-Guard
- Soft Middleware Guard
- Schema Guard Migration 0048
- GitHub Build Check Workflow

Details: `docs/V49_STABILITY_PRODUCTION_GUARD.md`
