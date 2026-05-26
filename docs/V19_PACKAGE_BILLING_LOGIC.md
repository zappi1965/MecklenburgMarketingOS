# MMOS v19 Package & Billing Logic Fullbuild

## Umgesetzt
- echte Paketlogik mit `package_catalog`
- dynamische Paketfeatures mit `package_features`
- Tool-Sichtbarkeit je Paket mit `package_tools`
- Billing-/Pricing-Sync vorbereitet mit `billing_plan_sync`
- automatische Toolfreischaltung bei Paketfreigabe
- automatische Tool-Ausblendung über Kunden-Toolliste
- saubere Paket-Matrix Starter/Growth/Premium
- Tooltips ohne Formulierung „im Paket enthalten“
- Pakete & Billing Schreibweise bereinigt

## Backend-Endpunkte
- `GET /api/package-billing/catalog`
- `GET /api/package-billing/customer/:customer_id/tools`
- `POST /api/package-billing/request`
- `POST /api/package-billing/grant`

## Frontend
Neue Clients:
- `packageBillingClient`
- `packageMatrix`

## Deploy
1. Supabase SQL ausführen:
`0029_v19_package_billing_logic.sql`

2. Railway Backend redeployen:
`npm start`

3. Vercel Frontend redeployen.

## Hinweis
Stripe ist vorbereitet, aber noch nicht live verbunden. Aktuell ist der Provider `manual`.
