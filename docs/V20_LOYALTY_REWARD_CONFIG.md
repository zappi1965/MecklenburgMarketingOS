# MMOS v20 Loyalty Reward Configuration

## Neu umgesetzt

Es wurde ein eigenes Konfigurationsmodul für Loyalty Rewards ergänzt.

## Einordnung

Adminbereich:
- QR-Code Kampagnen → Loyalty
- dort als Bereich „Rewards / Belohnungen“

Kundenbereich:
- Loyalty & Rewards
- Kunde sieht später die angelegten Rewards und Einlösungen

Öffentliche Endkundenseite:
- `/l/[slug]`
- Endkunde sieht verfügbare Rewards und kann Punkte einlösen, sobald UI-seitig eingebunden

## Konfigurierbare Reward-Typen

- Rabatt
- Gratisprodukt
- Gutschein
- Freigetränk
- Geburtstagsreward
- VIP-Vorteil
- Individuell

## Konfigurierbare Regeln

- benötigte Punkte
- maximal pro Endkunde
- Gesamtlimit
- Mindestanzahl QR-Scans
- Mindestanzahl Bewertungen
- Gültigkeit von/bis
- nur bestimmte Wochentage
- gesamtes Programm oder nur bestimmte QR-Kampagne
- Einlösart:
  - Voucher-Code
  - Mitarbeiterbestätigung
  - QR-Voucher
  - manuelle Prüfung
- Teilnahmebedingungen
- Aktiv/Inaktiv

## Backend-Endpunkte

- `POST /api/v20-growth/loyalty/rewards`
- `PATCH /api/v20-growth/loyalty/rewards/:id`
- `GET /api/v20-growth/loyalty/rewards/program/:program_id`
- `GET /api/v20-growth/loyalty/reward-rule-templates`
- `POST /api/v20-growth/loyalty/rewards/:id/check`
- `POST /api/v20-growth/loyalty/redeem`

## Datenverknüpfung

- `loyalty_rewards.loyalty_program_id` → Loyalty Programm
- `loyalty_rewards.qr_campaign_id` → optionale QR-Kampagnenbindung
- `loyalty_redemptions.reward_id` → eingelöster Reward
- `loyalty_redemptions.loyalty_customer_id` → Endkunde
- `loyalty_transactions` → Punktestand/Scan-/Review-Historie

## Was noch UI-seitig eingebunden werden muss

Die Komponente `LoyaltyRewardConfig.tsx` ist erstellt. Sie sollte im QR-Code-Kampagnen-Reiter im Loyalty-Tab gerendert werden, sobald `customerId`, `programId` und optional `qrCampaignId` vorhanden sind.

Beispiel:
`<LoyaltyRewardConfig customerId={customer.id} programId={program.id} qrCampaignId={campaign.id} />`

## Deploy

1. Supabase SQL ausführen:
`0031_v20_loyalty_reward_config.sql`

2. Railway Backend redeployen.

3. Vercel Frontend redeployen.
