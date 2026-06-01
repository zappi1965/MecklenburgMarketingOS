# MMOS QR Campaign Growth Center

## Umgesetzt

### QR-Kampagnen-Typen
Backend liefert Vorlagen für:
- Bewertungen sammeln
- Loyalty / Punkte sammeln
- Feedback intern
- Gutschein
- Gewinnspiel
- Terminbuchung
- Freunde werben
- Newsletter
- Event Check-in

### QR Placement Tracking
Neue Placement-Vorlagen:
- Tischaufsteller
- Kassenbon
- Tresen
- Schaufenster
- Flyer
- Visitenkarte
- Social Story
- Verpackung

Admin kann aus einer Parent-Kampagne mehrere Varianten erzeugen:
- `/q/[slug]-table-tent`
- `/q/[slug]-receipt`
- `/q/[slug]-counter`

### QR-Kampagnen-Funnel
Neue Resource:
- `v33_functional_records.resource = qr_funnel_events`

Events können erfasst werden:
- page_view
- form_started
- form_completed
- points_collected
- reward_redeemed
- google_opened

### QR-Kampagnen-Ampel / Auto-Fix Empfehlungen
System erkennt:
- viele Scans, niedrige Conversion
- wenige Scans
- Review-Kampagne ohne Bewertungen
- QR-Ziel nicht auf `/q/[slug]`

### QR-Druckpaket Generator
Neue Resource:
- `v33_functional_records.resource = qr_print_packages`

Erzeugt PDF-ready Asset-Struktur für:
- Tischaufsteller
- A5 Flyer
- Kassenbon-Hinweis
- Social Story

### Neue Admin-Seite
- `/admin/qr-campaigns/growth`

### Neue Backend-Routen
- `GET /api/production/qr-growth/templates`
- `GET /api/production/qr-growth/overview/:customer_id`
- `POST /api/production/qr-growth/placements/:customer_id`
- `POST /api/production/qr-growth/event`
- `POST /api/production/qr-growth/print-package/:customer_id/:qr_campaign_id`
- `GET /api/production/qr-growth/recommendations/:customer_id`

## Keine Supabase-Migration nötig
Die zusätzlichen Funnel-/Print-Daten laufen über `v33_functional_records`.
