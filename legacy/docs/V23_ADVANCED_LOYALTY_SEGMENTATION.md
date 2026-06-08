# MMOS V23 – Advanced Loyalty & Segmentation Fullbuild

## Umgesetzt

### 4. Endkunden-Segmentierung
Unterordnung:
- QR / Loyalty
- Kundenbereich: Loyalty & Rewards
- Adminbereich: CRM / Customer Intelligence / Marketing Automation

Funktionen:
- automatische Endkunden-Segmente
- VIP
- inaktive Endkunden
- bewertungsaktive Endkunden
- neue Mitglieder
- Reward-bereite Endkunden
- eigene Segmente mit Regel-Config

### 7. Smart Loyalty V2
Unterordnung:
- QR-Kampagnen → Loyalty
- Kundenbereich: Loyalty & Rewards

Funktionen:
- VIP-Level / Tiers
- Punkte-Multiplikatoren je Tier
- dynamische Punkte-Regeln
- 2x-Punkte-Aktionen
- segmentbasierte Regeln
- QR-kampagnenspezifische Regeln
- Smart Actions

### Marketing-Automation-Verknüpfung
Unterordnung:
- Marketing Automation
- QR / Loyalty

Funktionen:
- aus Segmenten können Marketing-Kampagnen erzeugt werden
- Verknüpfung zu `marketing_automation_campaigns`
- Loyalty Smart Actions werden erzeugt

## Neue Tabellen

- `loyalty_segments`
- `loyalty_member_segments`
- `loyalty_tiers`
- `loyalty_point_rules`
- `loyalty_smart_actions`

## Erweiterte Tabellen

- `loyalty_customers.current_tier`
- `loyalty_customers.total_scans`
- `loyalty_customers.total_reviews`
- `loyalty_customers.last_activity_at`
- `loyalty_customers.segment_summary`

## Neue Backend Route

`/api/advanced-loyalty`

## Neue Frontend-Dateien

- `advancedLoyaltyClient.ts`
- `AdvancedLoyaltyPanel.tsx`

## Paketzuordnung

Growth:
- Loyalty Segmente Basis

Premium:
- Advanced Loyalty Segmente
- Smart Loyalty V2

## Deploy

1. Supabase SQL ausführen:
`0035_v23_advanced_loyalty_segmentation.sql`

2. Backend redeployen

3. Frontend redeployen

## Hinweis

Die Segmentierung ist funktionsfähig, sobald ein Loyalty-Programm existiert. Im Panel zuerst „Defaults anlegen“ klicken, danach „Segmente neu berechnen“.
