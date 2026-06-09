# MMOS V28 – Demo Environment Sync Fullbuild

## Ziel
Die Demo-Umgebung war noch auf altem Stand. V28 bringt Demo-Admin und Demo-Kundenbereich auf den aktuellen Buildstand.

## Enthalten
- CRM
- Customer Timeline
- Customer Intelligence
- Customer Health
- QR-Kampagnen
- Loyalty
- Rewards
- Mitarbeitercodes
- Loyalty Segmente
- VIP-Level
- Smart Loyalty V2
- Reviews
- Review Intelligence
- AI Business Assistant
- Smart Automations
- Marketing Automation
- Pipeline
- Booking
- Rechnungen
- Revenue Forecasting
- Dynamic Billing
- Paketlogik / Toolfreigaben
- Mobile UX Layer

## Neue Migration
`0038_v28_demo_environment_sync.sql`

## Demo-Kunde
`11111111-1111-1111-1111-111111111111`

## Neue Backend Route
`/api/demo-environment`

Endpunkte:
- `GET /api/demo-environment/dashboard`
- `POST /api/demo-environment/check`
- `GET /api/demo-environment/customer-id`

## Neue Frontend-Komponente
`DemoEnvironmentDashboard.tsx`

## Deploy
1. Supabase SQL ausführen: `0038_v28_demo_environment_sync.sql`
2. Backend redeployen
3. Frontend redeployen
