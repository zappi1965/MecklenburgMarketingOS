# MMOS V24 – Revenue Forecasting & Dynamic Billing Fullbuild

## Umgesetzt

### 3. Revenue Forecasting
Unterordnung:
- Adminbereich: KPI Analytics / Customer Intelligence / Billing
- Kundenbereich: Reports / Analytics

Funktionen:
- erwarteter Monatsumsatz
- erwarteter MRR
- erwarteter Neuumsatz
- Churn-Risk-Value
- gewichteter Pipeline-Wert
- Confidence Score
- Forecast-Treiber

### 14. Smart Pricing / Dynamic Billing
Unterordnung:
- Pakete & Billing
- Customer Intelligence
- KPI Analytics

Funktionen:
- usage-basierte Zusatzabrechnung
- QR-Scan-Metering
- Loyalty-Member-Metering
- Review-/Automation-/AI-Metering
- automatische Paketempfehlungen
- Upgrade-Empfehlung Starter → Growth → Premium
- Revenue-Share-Berechnung
- Stripe-Connect-Vorbereitung über `stripe_connect_account_id`

## Neue Tabellen

- `revenue_forecasts`
- `dynamic_billing_usage`
- `package_recommendations`
- `revenue_share_rules`
- `revenue_share_events`

## Erweiterte Tabelle

- `customer_subscriptions.usage_billing_enabled`
- `customer_subscriptions.revenue_share_enabled`
- `customer_subscriptions.recommended_package`
- `customer_subscriptions.forecasted_mrr`

## Neue Backend Route

`/api/revenue-dynamic-billing`

## Neue Frontend-Dateien

- `revenueDynamicBillingClient.ts`
- `RevenueDynamicBillingPanel.tsx`

## Paketzuordnung

Growth:
- Revenue Forecasting Basis

Premium:
- Revenue Forecasting Plus
- Dynamic Billing
- Revenue Share Vorbereitung

## Datenverknüpfungen

- Rechnungen + Booking → tatsächlicher Umsatz
- Pipeline → gewichteter Forecast
- Customer Intelligence → Risiko / Upsell
- Health Score → Confidence
- QR/Loyalty/Reviews/Automationen/AI → Usage Billing
- Paketnutzung → Paketempfehlung
- Subscription → MRR und Revenue Share

## Deploy

1. Supabase SQL ausführen:
`0036_v24_revenue_dynamic_billing.sql`

2. Backend redeployen

3. Frontend redeployen

## Hinweis

Stripe-Zahlungen und echte Transfers sind vorbereitet, aber noch nicht live aktiv. Dafür müssen Stripe Keys, Price IDs, Webhooks und optional Stripe Connect Accounts ergänzt werden.
