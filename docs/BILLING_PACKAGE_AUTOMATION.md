
# Billing & Package Automation

Umgesetzt/vorbereitet:

- Paketkatalog: Starter, Growth, Premium
- dynamische Preisverwaltung in `package_catalog`
- Customer Subscriptions
- License Entitlements
- Paketregel-Engine im Backend
- automatische Toolfreischaltung je Paket
- automatische Vertragsgenerierung
- automatische Rechnung je Paket
- wiederkehrende Rechnung Basis
- Upgrade-/Downgrade-Basis
- Stripe Checkout Vorbereitung
- PayPal Provider-Struktur vorbereitet
- Activity Logs + Notification bei Freischaltung

Backend Routes:

- `GET /api/billing/packages`
- `POST /api/billing/packages/sync`
- `POST /api/billing/package-requests/:id/approve`
- `POST /api/billing/subscriptions/change`
- `POST /api/billing/contracts/generate`
- `POST /api/billing/invoices/package`
- `POST /api/billing/checkout/stripe`
- `POST /api/billing/checkout/paypal`

ENV:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox
APP_PUBLIC_URL=
```
