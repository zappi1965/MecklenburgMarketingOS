# MMOS v18 Demo Tables Functional Tools Fullbuild

## Umgesetzt

### Separate Demo-Tabellen
- `demo_workflow_runs`
- `demo_notifications`
- `demo_invoices`
- `demo_qr_campaigns`
- `demo_mail_jobs`

### Demo Workflows
Endpoint:
`POST /api/demo-tools/workflow/:key`

Keys:
- `invoice_overdue`
- `new_ticket`
- `seo_decline`
- `package_requested`
- `monthly_report`
- `review_funnel`

### Demo QR Codes
Endpoint:
`POST /api/demo-tools/qr-campaign`

Erzeugt:
- `slug`
- `public_url`
- `redirect_url`
- `qr_svg`
- `qr_png_base64`

Beim Öffnen der Kampagne wird der QR-Code angezeigt.

### Demo Rechnungs-PDF
Endpoint:
`POST /api/demo-tools/invoice`

Erzeugt auch ohne Vorlage eine einfache PDF als Base64/Data-URL.

### Demo Mail / Resend Test
Endpoint:
`POST /api/demo-tools/mail/test`

Funktioniert, wenn folgende ENV gesetzt sind:
- `RESEND_API_KEY`
- `MAIL_FROM`

Wenn `RESEND_API_KEY` fehlt, wird der Mailjob als skipped markiert.

## Deploy

1. Supabase SQL ausführen:
`0025_v18_demo_tables_functional_tools.sql`

2. Railway Backend redeployen:
Root Directory: `backend`
Start Command: `npm start`

3. Railway Worker redeployen:
Root Directory: `backend`
Start Command: `npm run worker`

4. Vercel Frontend redeployen:
Wichtig für Demo-Client-Funktionen.

## Test

Backend:
`/api/demo-tools/health`

Demo Status:
`/api/demo-tools/state`

Rechnung:
`POST /api/demo-tools/invoice`

QR:
`POST /api/demo-tools/qr-campaign`

Resend:
`POST /api/demo-tools/mail/test`
