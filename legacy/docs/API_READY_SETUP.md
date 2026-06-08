
# MMOS v18 API Ready Fullbuild

## Ziel

Dieser Build bringt MMOS so weit, dass möglichst viele Integrationen nach Hinterlegen der ENV/API Keys direkt nutzbar oder zumindest mit einem echten API-Pfad verbunden sind.

## Jetzt deutlich weiter umgesetzt

### Mail / Resend
- Resend-Service ist aktiv, sobald `RESEND_API_KEY` und `MAIL_FROM` gesetzt sind.
- Mail-Jobs werden vom Worker verarbeitet.
- Templates:
  - Ticketantwort
  - Rechnung
  - internes Review

### Gotenberg / PDF
- `GOTENBERG_URL` aktiviert echte Office/DOCX→PDF Konvertierung.
- `/api/hardening/pdf/convert-office`
- mit `customer_id` speichert der Endpoint das PDF direkt in Supabase Storage + `customer_files`.

### Stripe
- Checkout Endpoint:
  - `/api/stripe/checkout`
- Webhook Endpoint:
  - `/api/stripe/webhook`
- Stripe Events werden in `stripe_events` gespeichert.
- Subscription-Status-Update-Gerüst ist vorhanden.

### Google APIs
- OAuth URL:
  - `/api/google/auth-url/:customer_id`
- OAuth Callback:
  - `/api/google/callback`
- Token Speicherung:
  - `oauth_tokens`
- Refresh Token Logik
- Search Console Sync mit echten API Calls, wenn `site_url` vorhanden ist.
- Analytics Sync mit echten API Calls, wenn `property_id` vorhanden ist.
- Google Business OAuth-Ready; Location Discovery ist vorbereitet.

### Worker
- `npm run worker` startet `apiReadyWorker.js`
- verarbeitet:
  - `mail_jobs`
  - `api_sync_jobs`
  - Rechnungsreminder
  - Paketanfragen
- reduziert doppelte Notifications.

### Monitoring
- `/api/hardening/health`
- zeigt konkret, welche Services per ENV aktiv sind.

## Was nach ENV direkt funktionieren sollte

### Direkt nutzbar nach Keys
- Resend Mailversand
- Gotenberg DOCX→PDF
- Stripe Checkout
- QR-Code Erstellung
- Worker Mail Jobs
- Worker Notifications
- Sentry Basic Init

### Teilweise nutzbar nach Keys
- Google Search Console, wenn OAuth abgeschlossen und `site_url` gespeichert ist
- Google Analytics, wenn OAuth abgeschlossen und `property_id` gespeichert ist
- Google Business, OAuth vorhanden, Location Discovery muss je Kunde final gemappt werden

## ENV Backend / Worker

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PUBLIC_APP_URL=https://deine-domain.de

RESEND_API_KEY=
MAIL_FROM=MecklenburgMarketingOS <noreply@deinedomain.de>

GOTENBERG_URL=http://gotenberg:3000

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://dein-backend.up.railway.app/api/google/callback

SENTRY_DSN=
WORKER_CRON=*/5 * * * *
```

## ENV Frontend

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE=https://dein-backend.up.railway.app
```

## Google Einrichtung

1. Google Cloud Projekt erstellen.
2. APIs aktivieren:
   - Google Search Console API
   - Google Analytics Data API
   - Google Business Profile API
3. OAuth Consent Screen einrichten.
4. OAuth Client erstellen.
5. Redirect URI setzen:
   `https://dein-backend.up.railway.app/api/google/callback`
6. ENV setzen:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
7. Im Backend `/api/google/auth-url/:customer_id` öffnen und OAuth verbinden.
8. Für Search Console `site_url` speichern.
9. Für Analytics `property_id` speichern.

## Gotenberg Einrichtung

1. Railway → New Service → Docker Image.
2. Image:
   `gotenberg/gotenberg:8`
3. Interne URL als `GOTENBERG_URL` im Backend setzen.
4. DOCX Upload über `/api/hardening/pdf/convert-office` testen.

## Stripe Einrichtung

1. Stripe Account erstellen.
2. `STRIPE_SECRET_KEY` setzen.
3. Webhook Endpoint:
   `https://dein-backend.up.railway.app/api/stripe/webhook`
4. Webhook Secret setzen:
   `STRIPE_WEBHOOK_SECRET`
5. Test Checkout:
   `/api/stripe/checkout`

## Was noch echte Feinarbeit bleibt

- Google Business Location Discovery und genaue KPI-Zuordnung pro Standort.
- Stripe Webhook Mapping auf konkrete Pakete und Kunden.
- Vollständige Auth-UX mit Passwort Reset/Invite.
- PDF Layout-Finalisierung für deine echten Word-Vorlagen.
- E2E Tests nach Live-Deploy wirklich laufen lassen.
