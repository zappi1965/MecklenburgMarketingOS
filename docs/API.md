# MMOS API-Referenz

Grobe Übersicht aller HTTP-Endpunkte. Drei Auth-Zonen:

| Zone | Erkennungszeichen | Wer darf rein |
|---|---|---|
| **Public** | Pfad in PUBLIC_PATHS-Whitelist (server.js) | Anonym |
| **Bearer** | `Authorization: Bearer <supabase-jwt>` | Eingeloggte User |
| **API-Key** | `X-API-Key: mmos_live_…` oder `Authorization: ApiKey …` | Externe Apps mit Scope |

## Public-Endpunkte (kein Token nötig)

| Methode + Pfad | Zweck |
|---|---|
| `GET /api/health` | Health-Check |
| `GET /api/system/health` | System-Health |
| `*   /api/auth/*` | Login, Register, Forgot-Password |
| `GET /api/qr?value=…&size=…&fg=&bg=` | QR-PNG, ersetzt Drittland-APIs |
| `GET /api/v33-functional/public/loyalty/:slug/status` | Slug-Status |
| `POST /api/v33-functional/public/loyalty/:slug/join-or-scan` | Loyalty-Scan |
| `POST /api/v33-functional/public/loyalty/:slug/rewards/:reward_id/redeem` | Reward-Einlösung |
| `POST /api/v33-functional/public/loyalty/:slug/password-reset-request` | Endkunden-Passwort-Reset |
| `POST /api/v33-functional/public/loyalty/:slug/review` | Slug-Review |
| `POST /api/pos/webhook/:provider` | POS-Webhook (HMAC-signaturverifiziert) |
| `POST /api/chatbot/start` + `/message` | AI-Chatbot |
| `GET /api/review-widget/embed/:slug` | iframe-Embed |
| `* /api/public/v1/…` | Public-API v1 (X-API-Key statt Bearer) |

## Bearer-Token-Endpunkte (eingeloggte User)

### Auth & Profil
- `GET /api/auth/me` — Profil + Rolle

### DSGVO (Art. 15 + 17)
- `GET /api/gdpr/requests` — eigene DSAR-Liste
- `POST /api/gdpr/export` — Auskunftsanfrage
- `POST /api/gdpr/delete-request` — Löschung mit 30-Tage-Grace
- `POST /api/gdpr/delete-cancel/:id` — Stornieren

### Sicherheit & MFA
- `POST /api/security/mfa/enroll | activate | verify | disable`

### Onboarding (Wizard)
- `GET /api/onboarding/status/:customer_id`
- `POST /api/onboarding/{brand|qr|loyalty|samples|complete}/:customer_id`

### Customer-Intelligence
- `POST /api/customer-intelligence/event`
- `GET  /api/customer-intelligence/score/:customer_id`
- `POST /api/customer-intelligence/calculate/:customer_id`
- `POST /api/customer-intelligence/monthly-snapshot/:customer_id`

### Analytics
- `POST /api/analytics/peer-benchmark/:customer_id`
- `POST /api/analytics/cohorts/:customer_id`
- `POST /api/analytics/clv/:customer_id`

### Workflows / Automation (Admin)
- `GET  /api/automations/rules`
- `POST /api/automations/rules/:name/toggle`
- `POST /api/automations/run-now`

### Marketing-Tools
- `POST /api/data-quality/ai/review-response` (Admin)
- `POST /api/ai-crm-mail/draft/:customer_id`
- `GET|POST|DELETE /api/gmb/posts/:customer_id`
- `GET|POST|PATCH /api/review-widget/customer/:customer_id`
- `POST /api/newsletter/{subscribe|confirm|unsubscribe|campaigns|campaigns/:id/send}`
- `POST /api/vouchers/{|/lookup/:code|/redeem|/customer/:id}`
- `POST /api/referrals/{redeem|confirm/:id|customer/:id}`
- `GET  /api/wallet/loyalty-member/:member_id`

### Operativ
- `GET|POST /api/dunning/levels/:customer_id` + `/run-now`
- `GET|POST /api/pricing/rules/:customer_id` + `/calculate/:customer_id`
- `POST /api/no-show/scan` + `/calculate/:appointment_id` + `/high-risk/:customer_id`
- `POST /api/pos/transactions/:customer_id`

### Datenqualität (Admin)
- `GET  /api/data-quality/duplicates`
- `POST /api/data-quality/duplicates/merge`
- `POST /api/data-quality/validate/email`
- `POST /api/data-quality/validate/customer/:id`

### Buchhaltungs-Export (Admin)
- `GET /api/accounting/export?format=datev_extf|lexoffice_csv|sevdesk_csv&period_start=&period_end=`
- `GET /api/e-invoice/invoices/:id/xml`
- `GET /api/e-invoice/invoices/:id/zugferd`
- `GET /api/e-invoice/invoices/:id/preview`

### Compliance-Cockpit (Admin)
- `GET /api/compliance/snapshot`
- `GET|POST /api/compliance/processing-activities`
- `GET|POST /api/compliance/processors`

### API-Key-Management (Customer-Owner)
- `GET /api/api-keys/scopes` — Liste verfügbarer Scopes
- `GET|POST /api/api-keys/customer/:customer_id`
- `POST /api/api-keys/customer/:customer_id/:id/revoke`

## Public-API v1 (X-API-Key)

Auth-Header (eine der beiden Varianten):
```
X-API-Key: mmos_live_<24-byte-base64url>
Authorization: ApiKey mmos_live_<24-byte-base64url>
```

| Pfad | Scope | Liefert |
|---|---|---|
| `GET /api/public/v1/me` | (alle) | Customer-Daten + verbundene Scopes |
| `GET /api/public/v1/invoices?limit=50` | `read:invoices` | Rechnungen |
| `GET /api/public/v1/appointments?limit=50` | `read:appointments` | Termine |
| `GET /api/public/v1/reviews?limit=50` | `read:reviews` | Bewertungen |
| `GET /api/public/v1/loyalty/members?limit=50` | `read:loyalty` | Loyalty-Mitglieder |

## Verfügbare Scopes

| Scope | Beschreibung |
|---|---|
| `read:invoices` / `write:invoices` | Rechnungen |
| `read:loyalty` / `write:loyalty` | Loyalty-Member + Rewards |
| `read:appointments` / `write:appointments` | Termine |
| `read:reviews` / `write:reviews` | Bewertungen |
| `read:customers` / `write:customers` | Kundenstammdaten |
| `read:reports` | Reports / Analytics |

## Fehler-Codes

Antworten haben das einheitliche Format:
```json
{ "ok": false, "code": "ERROR_CODE", "error": "Klartext-Meldung", "hint": "..." }
```

Häufige Codes:
- `UNAUTHENTICATED` — kein/leerer Token
- `INVALID_SESSION` — Token kann nicht validiert werden
- `FORBIDDEN` — Rolle reicht nicht (z.B. kein Admin)
- `CUSTOMER_ACCESS_DENIED` — User hat keinen Zugriff auf den genannten Customer
- `API_KEY_MISSING` / `API_KEY_INVALID` / `API_SCOPE_MISSING` — Public-API
- `SUPABASE_UNCONFIGURED` — Backend-ENV fehlt
- `INTERNAL_ERROR` — generischer Fallback

## Rate-Limits

- Global: 700 Requests / 15 Min / IP (überschreibbar via `RATE_LIMIT_MAX`)
- Public QR-Endpoint: 120 / Min / IP (`QR_RATE_LIMIT_PER_MIN`)
- Chatbot: 20 / Min / IP (`CHATBOT_RATE_LIMIT_PER_MIN`)
