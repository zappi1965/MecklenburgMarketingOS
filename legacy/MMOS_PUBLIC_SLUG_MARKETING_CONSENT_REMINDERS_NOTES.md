# MMOS Public Slug Marketing Consent & Reminder Drafts

## Umgesetzt

### Public Slug Checkbox
Auf `/l/[slug]` wurde eine separate, nicht vorausgewählte Checkbox ergänzt:

- Kontakt zu Werbezwecken erlauben
- Zweck: Bonuspunkte, Rewards, Coupons, Reaktivierungsaktionen
- Einwilligung ist getrennt vom Bonusprogramm-Login
- Teilnahme bleibt auch ohne Werbeeinwilligung möglich

### Backend Speicherung
Beim Absenden von `/public/loyalty/:slug/join-or-scan` wird bei aktivierter Checkbox gespeichert:

- `loyalty_customers.metadata.consent_marketing = true`
- `loyalty_customers.metadata.marketing_consent`
- Zeitstempel
- Consent-Version
- Consent-Text
- Zwecke
- Source `public_slug_page`
- IP-Hash statt Klar-IP
- User-Agent
- zugehörige campaign/program/customer IDs

Zusätzlich wird ein Nachweis erzeugt:

- `v33_functional_records.resource = marketing_consents`

### Widerruf vorbereitet
Neue Public Route:

- `POST /api/v33-functional/public/loyalty/:slug/marketing-consent/withdraw`

Speichert:
- `marketing_consent_status = withdrawn`
- `marketing_consent_withdrawn_at`
- Nachweis in `marketing_consent_withdrawals`

### Automatisierte Reminder vorbereitet
Retention Intelligence wurde erweitert:

- `POST /api/production/retention-intelligence/marketing-reminders/:customer_id/generate`

Erzeugt nur Entwürfe für:
- inaktive / reaktivierungsrelevante Kunden
- mit gespeicherter Werbeeinwilligung
- mit E-Mail-Adresse

Kein automatischer Versand. Es entstehen sichere Entwürfe:

- `v33_functional_records.resource = marketing_reminder_drafts`

### Admin UI
In `/admin/retention/intelligence` wurde ergänzt:

- Button `Reminder-Entwürfe`
- Anzeige erzeugter Entwürfe
- Anzeige übersprungener Kontakte wegen fehlender E-Mail oder fehlender Werbeeinwilligung

## Produktiv-Schutz

- Checkbox ist nicht vorausgewählt
- Einwilligung ist getrennt und verständlich
- Teilnahme am Bonusprogramm ist nicht an Werbeeinwilligung gekoppelt
- Nachweis wird protokolliert
- Widerruf technisch vorbereitet
- Reminder werden nur als Entwürfe erzeugt
- Kein Versand ohne zusätzliche Versandlogik/Freigabe
- Kontaktvorschläge sind consent-aware
