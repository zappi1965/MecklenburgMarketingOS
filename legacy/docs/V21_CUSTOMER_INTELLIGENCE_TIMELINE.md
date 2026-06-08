# MMOS v21 Customer Intelligence & Timeline Fullbuild

Umgesetzt:
- Customer Timeline / Aktivitätsverlauf
- Customer Lifetime Value
- Risiko-Score / Kündigungsrisiko
- Upsell-Empfehlungen
- automatische Rechnung aus Booking
- Loyalty → CRM / Success Score Verknüpfung
- Review → Ticket / CRM-Warnung
- QR → Pipeline-Upsell-Lead
- Paketnutzung messen
- Monatsreport-Datenbasis inkl. optionalem PDF

Einordnung:
- Adminbereich: CRM Detailansicht, KPI Analytics, Pipeline, Booking, Reports
- Kundenbereich: Customer Intelligence / Reports / Dashboard
- Pakete: Growth = Basis, Premium = Plus

Neue Migration:
`0033_v21_customer_intelligence_timeline.sql`

Neue Backend-Route:
`/api/customer-intelligence`

Neue Frontend-Dateien:
- `customerIntelligenceClient.ts`
- `CustomerIntelligencePanel.tsx`

Wichtig:
Die Backend-Endpunkte sind funktionsfähig. Für komplett automatische Abläufe können die Actions zusätzlich in Buttons, Worker-Jobs oder Trigger eingebunden werden.

Deploy:
1. Supabase SQL ausführen
2. Backend redeployen
3. Frontend redeployen
