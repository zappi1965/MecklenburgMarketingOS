
# MMOS v18 Production Hardening Fullbuild

## Umgesetzt

### Auth UI vorbereitet
- Frontend-Library für Supabase Auth
- `AuthPanel` vorbereitet
- Demo-Modus kann parallel bestehen bleiben
- echte `user_profiles`/Rollenstruktur bleibt nutzbar

### Security / RLS
- Security Headers via Helmet
- Rate Limiting
- RLS-Policies für neue Tabellen
- Audit-Log-Tabelle
- Job-Run-Tabelle
- Stripe-Kunden-Tabelle

### Mail
- Resend Service
- Ticketantwort-Mailtemplate
- Rechnungs-Mailtemplate
- Internes Review-Mailtemplate
- Dry-Run, wenn `RESEND_API_KEY` fehlt

### Worker
- neuer `hardenedWorker`
- Retry-/Job-Logging über `job_runs`
- verhindert doppelte Invoice-/Package-Notifications
- API-Sync-Placeholder angebunden

### Stripe
- Stripe Service vorbereitet
- Checkout Session Endpoint
- Tabellen für Stripe Customers / Subscriptions

### PDF / Gotenberg
- Gotenberg Service vorbereitet
- `/api/hardening/pdf/convert-office`
- DOCX/Office→PDF vorbereitet, sobald `GOTENBERG_URL` gesetzt ist

### Monitoring / ENV Checks
- `/api/hardening/health`
- zeigt Mail, Stripe, Gotenberg, Supabase, Sentry Status

### E2E Tests
- Playwright Smoke Tests
- Landingpage
- Admin Login
- Kunden Login

## Deploy

1. Supabase Patch ausführen:
`supabase/migrations/0019_v18_production_hardening_patch.sql`

2. Backend Railway redeployen:
- Root: `backend`
- Start: `npm start`

3. Worker Railway Service:
- Root: `backend`
- Start: `npm run worker`

4. Frontend Vercel redeployen.

## ENV Backend / Worker

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PUBLIC_APP_URL=https://deine-domain.de

RESEND_API_KEY=
MAIL_FROM=MecklenburgMarketingOS <noreply@deinedomain.de>

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

GOTENBERG_URL=

SENTRY_DSN=

RATE_LIMIT_MAX=500
AUTH_RATE_LIMIT_MAX=50
WORKER_CRON=*/5 * * * *
```

## ENV Frontend

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE=https://dein-railway-backend.up.railway.app
```

# Restliche Tools hinterlegen

## Mailversand mit Resend

1. Resend Account erstellen.
2. Domain hinzufügen.
3. DNS Records bei deinem Domainanbieter setzen.
4. Domain in Resend verifizieren.
5. API Key erstellen.
6. Railway Backend + Worker Variables setzen:
   - `RESEND_API_KEY`
   - `MAIL_FROM=MecklenburgMarketingOS <noreply@deinedomain.de>`
7. Test:
   POST `/api/hardening/mail/ticket-reply`

## Stripe

1. Stripe Account erstellen.
2. Developers → API Keys.
3. `STRIPE_SECRET_KEY` in Railway setzen.
4. Webhook Endpoint in Stripe anlegen:
   - `https://dein-backend/api/stripe/webhook` 
   - Webhook Route ist als Gerüst vorbereitet, kann bei Bedarf aktiviert werden.
5. `STRIPE_WEBHOOK_SECRET` in Railway setzen.
6. Checkout über `/api/hardening/stripe/checkout` testen.

## Gotenberg für Word/PDF

1. Railway → New Service → Docker Image.
2. Image:
   `gotenberg/gotenberg:8`
3. Service starten.
4. Interne Railway URL kopieren.
5. Im Backend setzen:
   `GOTENBERG_URL=http://dein-gotenberg-service:3000`
6. Test:
   POST `/api/hardening/pdf/convert-office` mit DOCX Datei.

## Google APIs

1. Google Cloud Projekt erstellen.
2. APIs aktivieren:
   - Google Business Profile API
   - Search Console API
   - Google Analytics Data API
3. OAuth Consent Screen konfigurieren.
4. OAuth Client erstellen.
5. Redirect URI auf dein Backend setzen.
6. Tokens pro Kunde in `integrations` oder eigener `oauth_tokens` Tabelle speichern.
7. `apiSyncService.js` von Placeholder auf echte Fetches erweitern.

## Sentry Monitoring

1. Sentry Projekt erstellen.
2. DSN kopieren.
3. Railway setzen:
   `SENTRY_DSN=...`
4. Optional Frontend:
   `NEXT_PUBLIC_SENTRY_DSN=...`

## E2E Tests

Im Frontend/Repo:
```bash
npm install
npx playwright install
E2E_BASE_URL=https://deine-vercel-url npx playwright test
```
