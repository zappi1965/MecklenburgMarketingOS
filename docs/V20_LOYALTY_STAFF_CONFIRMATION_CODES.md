# MMOS v20 Loyalty Staff Confirmation Codes

## Neu umgesetzt

Reward-Einlösungen können jetzt per Mitarbeiter-Code bestätigt werden.

## Einordnung

Kundenbereich:
- Loyalty & Rewards
- QR-Kampagne → Loyalty → Mitarbeiter-Bestätigungscodes

Adminbereich:
- QR-Code Kampagnen / Loyalty Detailansicht
- Admin kann Codes sehen, deaktivieren oder neu setzen

Öffentliche Endkundenseite:
- Endkunde löst Reward aus
- Mitarbeiter gibt Code ein oder bestätigt Einlösung über Kundenbereich

## Funktionen

- Codes pro Loyalty-Programm
- Codes optional nur für eine bestimmte QR-Kampagne
- Code wird gehasht gespeichert, nicht im Klartext
- Code-Hinweis wird angezeigt, z. B. „endet auf 21“
- aktiv/inaktiv
- maximale Nutzungen
- gültig von/bis
- Used Count
- Einlösung mit Code bestätigt `loyalty_redemptions`
- `confirmed_at`, `confirmed_by_label`, `confirmation_method`

## Neue Tabellen/Spalten

- `loyalty_staff_codes`
- `loyalty_redemptions.staff_code_id`
- `loyalty_redemptions.confirmed_by_label`
- `loyalty_redemptions.confirmed_at`
- `loyalty_redemptions.confirmation_method`
- `loyalty_rewards.staff_code_required`

## Neue Backend-Endpunkte

- `POST /api/v20-growth/loyalty/staff-codes`
- `PATCH /api/v20-growth/loyalty/staff-codes/:id`
- `GET /api/v20-growth/loyalty/staff-codes/program/:program_id`
- `POST /api/v20-growth/loyalty/redemptions/:id/confirm`

## Neue Frontend-Komponente

- `LoyaltyStaffCodeConfig.tsx`

Einbindung:
`<LoyaltyStaffCodeConfig customerId={customer.id} programId={program.id} qrCampaignId={campaign.id} />`

## Reward-Konfiguration

Im Reward-Konfigurationsmodul gibt es zusätzlich:
- „Mitarbeiter-Code zur Bestätigung verlangen“

## Deploy

1. Supabase SQL ausführen:
`0032_v20_loyalty_staff_confirmation_codes.sql`

2. Backend redeployen.

3. Frontend redeployen.
