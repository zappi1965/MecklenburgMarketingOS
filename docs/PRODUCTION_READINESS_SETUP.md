
# MMOS v18 Production Readiness Fullbuild

## Umgesetzt

### 1. Auth & Rollen vorbereitet
- `user_profiles` Tabelle
- Rollen: `admin`, `customer`
- Customer-zu-User-Verknüpfung über `customer_id`
- RLS-Grundlage vorbereitet

### 2. API-Sync Layer vorbereitet
- Google Business Placeholder Sync
- Google Search Console Placeholder Sync
- Google Analytics Placeholder Sync
- Activity Logs bei Sync-Versuchen
- Backend Endpoint: `/api/production/sync/:provider/:customer_id`

### 3. Worker / Background Jobs
- Railway Worker: `npm run worker`
- prüft offene Rechnungen
- prüft Paketanfragen
- prüft Integrationen und startet Sync-Platzhalter
- schreibt Notifications und Activity Logs

### 4. PDF Engine vorbereitet
- Platzhalter-Rendering vorhanden
- Backend Endpoint: `/api/production/pdf/render-invoice`
- DOCX/Keynote→PDF benötigt weiterhin LibreOffice oder Gotenberg

### 5. Mailservice vorbereitet
- Resend eingebaut
- Dry-Run wenn kein `RESEND_API_KEY`
- Endpoint: `/api/production/mail/test`

### 6. QR Engine vorbereitet
- QR-Code DataURL Generierung
- Endpoint: `/api/production/qr/campaign`
- `qr_campaigns` speichert `qr_data_url` und `review_url`

### 7. Storage finalisiert / erweitert
- Avatar Bucket
- QR Bucket
- bestehende Upload-Struktur bleibt erhalten

### 8. Validierung & Error Handling
- Zod Schemas
- zentrale Error Middleware
- saubere JSON Fehler

### 9. Production Checks
- Tabelle `production_checks`
- dokumentierter Testplan

### 10. Deployment
- Backend Healthcheck
- Worker Start Command
- Railway Start-Dateien

## Nicht vollständig ohne externe Konfiguration

### Echte Google APIs
Benötigt:
- Google Cloud Project
- OAuth Consent Screen
- OAuth Client
- Google Business Profile API
- Search Console API
- Analytics Data API
- Token-Speicherung pro Kunde

### Mailversand
Benötigt:
- Resend Account
- Domain verifizieren
- `RESEND_API_KEY`
- `MAIL_FROM`

### Echte DOCX/Keynote→PDF Konvertierung
Benötigt:
- Gotenberg als separater Railway Docker Service
oder
- LibreOffice Headless in einem Docker Worker

### Echte Auth im Frontend
Vorbereitet, aber Demo-Login ist weiterhin aktiv.
Für Live:
- Supabase Auth UI einbauen
- echte Sessions verwenden
- Demo-Buttons optional verstecken

## Deploy

1. Supabase SQL ausführen:
`supabase/migrations/0018_v18_production_readiness_patch.sql`

2. Railway Backend deployen:
Root: `backend`
Start Command:
`npm start`

3. Railway Worker als separaten Service deployen:
Root: `backend`
Start Command:
`npm run worker`

4. Vercel Frontend deployen.

## ENV Backend / Worker

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
MAIL_FROM=MecklenburgMarketingOS <noreply@deinedomain.de>
PUBLIC_APP_URL=https://deine-domain.de
WORKER_CRON=*/5 * * * *
```

## ENV Frontend

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE=https://dein-railway-backend.up.railway.app
```

## Mailversand installieren

1. Resend Account erstellen.
2. Domain hinzufügen.
3. DNS Einträge setzen.
4. API Key erstellen.
5. In Railway Backend und Worker setzen:
`RESEND_API_KEY`
6. Absender setzen:
`MAIL_FROM=MecklenburgMarketingOS <noreply@deinedomain.de>`
7. Test:
POST `/api/production/mail/test`

## Gotenberg installieren

1. In Railway neuen Docker Service erstellen.
2. Image verwenden:
`gotenberg/gotenberg:8`
3. Public/Private URL kopieren.
4. Backend ENV setzen:
`GOTENBERG_URL=http://gotenberg:3000`
5. PDF Service erweitern, um DOCX an Gotenberg zu schicken.

## Google APIs installieren

1. Google Cloud Console öffnen.
2. Projekt erstellen.
3. APIs aktivieren:
   - Google Business Profile API
   - Google Search Console API
   - Google Analytics Data API
4. OAuth Client erstellen.
5. Redirect URL auf Backend setzen.
6. Tokens pro Kunde speichern.
7. `apiSyncService.js` von Placeholder auf echte Fetches umstellen.
