# MMOS v20 Loyalty Public Page

## Neu umgesetzt

Die öffentliche Endkunden-Seite `/l/[slug]` wurde ergänzt.

## Zweck

Diese Seite ist nicht für euren MMOS-Kundenlogin gedacht, sondern für den Endkunden eures Geschäftskunden.

Beispiel:
- Ihr seid Admin.
- Euer Geschäftskunde ist ein Café.
- Der Café-Besucher scannt den QR-Code.
- Er landet auf `/l/cafe-bonusprogramm`.
- Er gibt E-Mail oder Telefonnummer ein.
- Punkte werden seinem Loyalty-Profil gutgeschrieben.
- Optional kann er direkt Feedback geben.

## Funktionen

- gestaltete öffentliche Loyalty-Seite
- Punkte sammeln per QR-Scan
- Wiedererkennung per Member Token, E-Mail, Telefon oder Device-ID
- lokale Speicherung des Member Tokens im Browser
- Feedback-/Review-Flow
- positive Bewertungen werden als öffentlich beabsichtigt gespeichert
- negative Bewertungen werden intern gespeichert
- mobile optimiert
- DSGVO-Hinweis / Teilnahme-Checkbox

## Datenverknüpfung

- `/l/[slug]` nutzt `loyalty_programs.slug`
- Scan erzeugt `loyalty_transactions`
- Endkunde wird in `loyalty_customers` gespeichert
- Feedback wird in `review_feedback` gespeichert
- QR-Kampagne bleibt über `loyalty_programs.qr_campaign_id` verknüpft

## Deploy

1. Supabase Migration aus V20 muss vorhanden sein:
`0030_v20_ai_reviews_loyalty_voice.sql`

2. Vercel Frontend neu deployen.

3. Backend muss mit `/api/v20-growth/public/loyalty/:slug/join-or-scan` laufen.

## Hinweis

Ein öffentlicher Google-Review-Redirect ist vorbereitet, aber noch nicht automatisch hart umgeleitet, weil dafür pro Kunde ein sauberer Google-Review-Link hinterlegt werden muss.
