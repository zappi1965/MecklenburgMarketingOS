# MMOS Double-Opt-in, Mailversand, Abmeldelink, Kundenportal & Legal Guard

## Umgesetzt

### 1. Echter Versand per Resend/Mail
- `MailService` wird für Double-Opt-in-Mails und Reminder-Mails genutzt.
- Wenn `RESEND_API_KEY` und `MAIL_FROM` gesetzt sind, wird real über Resend gesendet.
- Ohne Resend bleibt Dry-Run erhalten; Versandroute kann `require_delivery` erzwingen.

### 2. Double-Opt-in-Mail
- Checkbox auf `/l/[slug]` löst keine sofortige Werbeeinwilligung mehr aus.
- Stattdessen:
  - Status `pending_double_opt_in`
  - Double-Opt-in-Token
  - Bestätigungsmail
  - Bestätigungslink
- Erst nach Klick auf den Bestätigungslink wird `consent_marketing = true`.

### 3. Abmeldelink in jeder Reminder-Mail
- Jede Reminder-Mail bekommt eine individuelle Abmelde-URL.
- Abmeldungen werden über Token verarbeitet.
- Widerrufe werden protokolliert.

### 4. Kundenportal-Ansicht
Neue Seite:
- `/portal/consents`

Neue Backend-Route:
- `GET /api/customer-portal/marketing-consents`

Zeigt:
- aktive Werbeeinwilligungen
- offene Double-Opt-in-Bestätigungen
- Widerrufe
- Reminder-Entwürfe

### 5. Technische Legal Guard Prüfung
Neue Backend-Route:
- `POST /api/production/retention-intelligence/marketing-consent/legal-review`

Prüft technisch:
- Zweckklarheit
- E-Mail-Kanal
- Widerrufshinweis
- Checkbox nicht vorausgewählt
- keine unnötige Kopplung an Bonusprogramm
- Double-Opt-in aktiv
- Abmeldelink aktiv
- verständliche Länge

Wichtig:
- Das ist keine anwaltliche Endprüfung.
- Es ist eine produktionsnahe technische Plausibilitätsprüfung der Formulierung und Mechanik.

## Neue Public Pages

- `/marketing/confirm?token=...&slug=...`
- `/marketing/unsubscribe?token=...&slug=...&email=...`

## Neue Public Backend-Routen

- `GET /api/v33-functional/public/loyalty/:slug/marketing-consent/confirm`
- `POST /api/v33-functional/public/loyalty/:slug/marketing-consent/confirm`
- `POST /api/v33-functional/public/loyalty/:slug/marketing-consent/withdraw`

## Neue Retention Routes

- `POST /api/production/retention-intelligence/marketing-reminders/:customer_id/generate`
- `POST /api/production/retention-intelligence/marketing-reminders/:customer_id/send`
- `POST /api/production/retention-intelligence/marketing-consent/legal-review`

## Neue Datenressourcen

- `marketing_double_opt_in_tokens`
- `marketing_consents`
- `marketing_consent_withdrawals`
- `marketing_unsubscribe_tokens`
- `marketing_reminder_drafts`

## Produktionsschutz

- Teilnahme am Bonusprogramm bleibt ohne Werbeeinwilligung möglich.
- Checkbox ist nicht vorausgewählt.
- Werbeeinwilligung wird erst nach Double-Opt-in aktiv.
- IP wird nur gehasht gespeichert.
- Reminder-Mails werden nur für bestätigte Einwilligungen erzeugt/versendet.
- Jede Reminder-Mail enthält einen Abmeldelink.
- Mailversand protokolliert in `mail_events`.
