# MMOS V22 – AI & Automation Core Fullbuild

## Umgesetzt

### 1. Smart Automation Engine
Unterordnung:
- Adminbereich: Automationen / CRM Detailansicht / Customer Intelligence
- Kundenbereich: optional Automationen / Analytics

Funktionen:
- intelligente Regeln mit Triggern, Bedingungen und Aktionen
- automatische Assistant-Hinweise
- automatische Timeline-Events
- automatische Pipeline-Opportunities
- Automation Runs mit Status und Ergebnissen

### 2. AI Business Assistant
Unterordnung:
- Adminbereich: CRM Detailansicht / KPI Analytics
- Kundenbereich: Dashboard / Analytics

Funktionen:
- Business-Hinweise aus Customer Intelligence und Health-Daten
- Warnungen bei Risiko, schlechter Review-Health und geringer Nutzung
- Upsell-Hinweise bei hoher Opportunity
- Status offen/gelöst

### 5. Marketing Automation
Unterordnung:
- QR / Loyalty / Reviews
- Kundenbereich: Marketing Automation

Funktionen:
- Reaktivierungskampagne
- Review Request Flow
- Loyalty Boost Kampagne
- Kampagnen sind mit QR, Loyalty und Rewards verknüpfbar

### 8. Customer Health Dashboard
Unterordnung:
- CRM Detailansicht
- Customer Intelligence
- KPI Analytics

Funktionen:
- Health Score
- Ampelstatus green/yellow/red
- Teil-Scores: Umsatz, Nutzung, Reviews, Loyalty, Support, QR
- Warnungen und Chancen

## Datenverknüpfungen

- Customer Intelligence → Customer Health
- Health/Risk/Upsell → AI Assistant
- QR Performance → Automationen / Upsell
- Reviews → Automationen / Warnungen
- Paketnutzung → Assistant / Onboarding-Hinweis
- Loyalty Engagement → Health Score
- Marketing Automation → QR / Loyalty / Rewards

## Neue Migration

`0034_v22_ai_automation_core.sql`

## Neue Backend Route

`/api/ai-automation-core`

## Neue Frontend-Dateien

- `aiAutomationCoreClient.ts`
- `AiAutomationCorePanel.tsx`

## Deploy

1. Supabase SQL ausführen:
`0034_v22_ai_automation_core.sql`

2. Backend redeployen

3. Frontend redeployen

## Hinweis

Das System arbeitet aktuell regelbasiert. Für echte generative KI-Texte kann später ein OpenAI API-Key ergänzt werden.
