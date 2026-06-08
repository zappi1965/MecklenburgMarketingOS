# MMOS v20 AI, Reviews, Loyalty QR & Voice CRM Fullbuild

## Umgesetzt

### 2. AI Business Insights
Einordnung:
- Adminbereich: KPI Analytics / CRM Detailansicht
- Kundenbereich: Dashboard / Analytics

Umgesetzt:
- Insight-Erzeugung aus Umsatz, QR-Scans, Conversions, Reviews, Tickets und Leads.
- Insight Cards mit Empfehlung, Severity und Datenquelle.
- Datenverknüpfung mit CRM, QR, Reviews, Booking, Tickets und Pipeline.

### 4. Bewertungsmanagement
Einordnung:
- Adminbereich: QR Kampagnen / KPI Analytics / CRM
- Kundenbereich: Bewertungen / QR Kampagnen

Umgesetzt:
- Review-Quellen.
- Internes Feedback.
- Rating-Auswertung.
- Review Funnel Logik: positive Bewertungen können öffentlich weitergeleitet werden, negatives Feedback bleibt intern.
- Verknüpfung zu QR-Kampagne und Loyalty-Kunde.

### 15. Loyalty & Rewards über QR Kampagnen
Einordnung:
- Adminbereich: QR Code Kampagnen Reiter.
- Kundenbereich: QR Kampagnen / Loyalty & Rewards.
- Endkunde: öffentliche Mini-Seite ohne MMOS-Login.

Umgesetzt:
- Loyalty-Programm kann für den jeweiligen Kunden im QR-Kampagnen-Reiter aktiviert werden.
- Loyalty läuft über QR-Code.
- Bestehende QR-Kampagnen können nachträglich mit Loyalty verknüpft werden.
- Endkunden-Wiedererkennung über E-Mail, Telefon, Member Token oder optional Device-ID.
- Punkte für QR-Scan, Review und vorbereitete Booking-Verknüpfung.
- Rewards und Einlösungen.
- KPI-Übersicht: Teilnehmer, Punkte, Scans, Einlösungen.
- QR-Kampagne enthält `loyalty_enabled` und `loyalty_program_id`.

### 16. Voice Notes / Audio CRM
Einordnung:
- Adminbereich: CRM Detailansicht.
- Kundenbereich: nicht sichtbar.

Umgesetzt:
- Upload/Anlage von Sprachnotizen.
- Transcript-Feld.
- automatische einfache Zusammenfassung.
- Action Items aus Transcript.
- Tags.
- Verknüpfung mit Kunde, Ansprechpartner oder Lead.

## Paketzuordnung

Growth:
- Bewertungsmanagement
- AI Business Insights
- Loyalty QR

Premium:
- Bewertungsmanagement Plus
- AI Business Insights Plus
- Loyalty & Rewards
- Voice CRM, nur Admin / nicht im Kundenportal sichtbar

Starter:
- keine neuen Premium-Module

## Nicht vollständig umgesetzt

- Echte OpenAI/Whisper-Transkription benötigt noch einen OpenAI API-Key und Storage-Anbindung. Aktuell ist Transcript/Audio-Upload vorbereitet und funktional mit manuellem Transcript.
- Öffentliche Endkunden-Frontend-Seite `/l/[slug]` ist backendseitig vorbereitet, aber noch nicht als schöne Next.js-Seite gestaltet.
- Echter Google Review Import benötigt weiterhin Google API/OAuth.

## Deploy

1. Supabase SQL ausführen:
`0030_v20_ai_reviews_loyalty_voice.sql`

2. Railway Backend redeployen:
`npm start`

3. Vercel Frontend redeployen.

## Wichtige Datenverknüpfungen

- `qr_campaigns.loyalty_program_id` → `loyalty_programs.id`
- `loyalty_transactions.qr_campaign_id` → QR Kampagne
- `review_feedback.qr_campaign_id` → QR Kampagne
- `review_feedback.loyalty_customer_id` → Loyalty-Endkunde
- `ai_business_insights.customer_id` → CRM/Kunde
- `crm_voice_notes.customer_id` → CRM Detailansicht
