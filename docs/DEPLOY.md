# MMOS Deployment-Guide (Vercel + Railway + Supabase)

Vollstaendige Anleitung für Production-Deployment. Geschaetzte Zeit:
**60 Minuten** wenn du alle Accounts schon hast.

---

## 1 · Supabase einrichten

### Projekt anlegen
- [supabase.com](https://supabase.com) → New Project
- **Region: Frankfurt (eu-central-1)** — wichtig für DSGVO
- Projektname: `mmos-prod` (oder eigener Name)

### Migrationen einspielen
SQL-Editor → der Reihe nach (idempotent):

```
supabase/migrations/0001_core_schema.sql
supabase/migrations/0008_ux_flow_fix_patch.sql
... alle 00XX_*.sql in numerischer Reihenfolge ...
supabase/migrations/0081_admin_write_policies.sql
```

**Zusätzlich** die historischen Production-Migrationen (`SQL_V42_*`),
falls du auf einem frischen Projekt startest. Wenn du auf einem
bestehenden Production-Projekt arbeitest, überspringe die `SQL_V42_*`
— die sind dort schon eingespielt.

### Schlüssel notieren
- Settings → API → kopieren:
  - **URL** (`https://<projekt>.supabase.co`)
  - **anon key** (für Frontend)
  - **service_role key** (für Backend — NIEMALS in Frontend exposen)

### Ersten Admin anlegen
Authentication → Users → Add user (E-Mail + Passwort), dann SQL Editor:

```sql
insert into public.user_profiles (id, email, role, status)
select id, email, 'admin', 'active' from auth.users
where email = 'admin@deine-domain.de'
on conflict (id) do update set role='admin', status='active';
```

---

## 2 · Railway (Backend) einrichten

### Backend-Service anlegen
- [railway.app](https://railway.app) → New Project → Deploy from GitHub
- Repository: `zappi1965/MecklenburgMarketingOS`
- Branch: `main` (oder dein Production-Branch)
- Root Directory: `backend`
- Start Command: `npm start` (auto)
- Region: **Amsterdam (eu-west-1)** oder Frankfurt — EU-konform

### ENV-Variablen (Railway → Variables)

#### Pflicht
```bash
PORT=4000
NODE_ENV=production
SUPABASE_URL=https://<projekt>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
TRUST_PROXY_HOPS=1
PUBLIC_APP_URL=https://app.deine-domain.de
```

#### Sentry (empfohlen)
```bash
SENTRY_DSN=https://<...>.ingest.de.sentry.io/<...>
SENTRY_TRACES_SAMPLE_RATE=0.1
```

#### AI (optional, Mock-Fallback ohne Key)
```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5

# ODER:
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini
```

#### MFA / 2FA
```bash
MFA_ISSUER_NAME=MMOS
```

#### Wallet Magic-Link (Endkunden-Self-Service)
```bash
WALLET_TOKEN_SECRET=<min-32-zufaellige-zeichen>
WALLET_REQUEST_LIMIT_PER_HOUR=5
```

#### TSE (Kassen-Signatur, optional, Mock-Fallback)
```bash
TSE_PROVIDER=mock                # mock | fiskaly | dtrust | epson
TSE_API_KEY=<falls != mock>
TSE_DEVICE_ID=device-1
```

#### Wallet-Pass (optional — siehe docs/WALLET_PASS_SETUP.md)
```bash
# Google Wallet
GOOGLE_WALLET_ISSUER_ID=...
GOOGLE_WALLET_CLASS_SUFFIX=mmos-loyalty
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_WALLET_ORIGINS=https://app.deine-domain.de

# Apple Wallet
APPLE_WALLET_PASS_TYPE_ID=pass.de.deine-domain.loyalty
APPLE_WALLET_TEAM_ID=ABCDE12345
APPLE_WALLET_ORG_NAME=Deine Firma
APPLE_WALLET_CERT_PEM="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
APPLE_WALLET_KEY_PEM="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
APPLE_WALLET_WWDR_PEM="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
APPLE_WALLET_KEY_PASSPHRASE=
```

#### POS (optional)
```bash
POS_SUMUP_SECRET=<HMAC-aus-SumUp-Dashboard>
```

#### Geocoding (Adress-Validierung)
```bash
GEOCODER_PROVIDER=nominatim       # nominatim (kostenlos, EU) | google
GOOGLE_GEOCODING_KEY=             # nur wenn provider=google
NOMINATIM_USER_AGENT=MMOS-Backend/1.0
```

#### E-Rechnung
```bash
E_INVOICE_SELLER_NAME=Mecklenburg Marketing
E_INVOICE_SELLER_ADDRESS=Musterstr 1
E_INVOICE_SELLER_POSTAL_CODE=18055
E_INVOICE_SELLER_CITY=Rostock
E_INVOICE_SELLER_COUNTRY=DE
E_INVOICE_SELLER_VAT_ID=DE123456789
E_INVOICE_SELLER_TAX_ID=12/345/67890
E_INVOICE_SELLER_EMAIL=rechnung@deine-domain.de
E_INVOICE_SELLER_IBAN=DE89370400440532013000
E_INVOICE_SELLER_BIC=COBADEFFXXX
```

#### Google Places (Lead-Scraper, optional)
```bash
GOOGLE_PLACES_API_KEY=AIza...
```

#### Rate-Limits (Defaults sind sinnvoll)
```bash
RATE_LIMIT_MAX=700                # global, 700 req / 15min / IP
QR_RATE_LIMIT_PER_MIN=120
CHATBOT_RATE_LIMIT_PER_MIN=20
```

#### Worker-Cron-Schedules (optional)
```bash
AUTOMATION_WORKER_CRON="*/15 * * * *"
GDPR_WORKER_CRON="30 4 * * *"
DAILY_BRIEFING_CRON="0 7 * * *"
```

### Worker-Services im selben Railway-Projekt anlegen

Drei zusätzliche Services (gleiches Repo, nur anderer Start-Command).
Im Railway-Project: + New Service → GitHub Repo → Settings → Start Command:

| Service-Name | Start Command | Was es macht |
|---|---|---|
| `mmos-automation-worker` | `npm run automation-worker` | Cross-Modul-Workflows (Termin → Rechnung, Review → Ticket, QR → Upsell-Lead, Monatsreport) — läuft alle 15 min |
| `mmos-gdpr-worker` | `npm run gdpr-worker` | Führt überfällige DSGVO-Löschanfragen aus (mit § 147 AO-Anonymisierung) — läuft täglich 04:30 UTC |
| `mmos-daily-briefing-worker` | `npm run daily-briefing-worker` | Sendet pro aktivem Customer eine tägliche Briefing-Mail (heutige Termine, neg. Reviews, überfällige Rechnungen, neue Leads) — läuft täglich 07:00 |

**Alle Worker** brauchen dieselben ENV-Variablen wie das Backend (vor
allem `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`). Railway erlaubt
das über "Shared Variables" oder "Templates".

**Wichtig:** Worker brauchen KEINEN `PORT` — sie lauschen nicht auf HTTP.

#### Optional: dunning-Worker
Aktuell läuft `dunningService.runDunningSweep()` nur on-demand über den
`/api/dunning/run-now`-Endpoint (Admin-Button). Wenn du automatischen
Mahnlauf willst, lege einen vierten Worker an:

```
Start Command: node -e "require('./src/services/dunningService').runDunningSweep().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exit(1)})"
Schedule: 0 6 * * *  (täglich 06:00)
```

#### Optional: no-show-Scan-Worker
Analog für `noShowService.scanUpcoming`:

```
Start Command: node -e "require('./src/services/noShowService').scanUpcoming({days_ahead:14}).then(r=>console.log(JSON.stringify(r)))"
Schedule: 0 5 * * *  (täglich 05:00)
```

---

## 3 · Vercel (Frontend) einrichten

### Projekt anlegen
- [vercel.com](https://vercel.com) → Add New Project → Import GitHub Repo
- Repository: `zappi1965/MecklenburgMarketingOS`
- Framework: Next.js (auto-detected)
- Root Directory: `frontend`
- Build Command: `yarn build` (auto)

### ENV-Variablen (Vercel → Settings → Environment Variables)
Für alle drei Scopes setzen (Production / Preview / Development):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_BASE=https://<railway-backend-domain>.up.railway.app
```

### Production-Domain
- Settings → Domains → Add → `app.deine-domain.de`
- DNS bei deinem Provider auf Vercel-IPs zeigen lassen
- HTTPS automatisch via Let's Encrypt

### Region
- Settings → Functions → Region → **Frankfurt (fra1)** wählen.
  Senkt Latenz innerhalb Europas + DSGVO-Vorteil.

---

## 4 · Smoke-Test nach Deployment

```bash
# Backend-Health
curl -i https://<railway-backend>.up.railway.app/api/health
# Erwartet: {"ok":true,...}

# Public QR
curl -i -o /dev/null -w "%{http_code} %{content_type}\n" \
  "https://<railway-backend>.up.railway.app/api/qr?value=test"
# Erwartet: 200 image/png

# Auth-Pflicht
curl -i "https://<railway-backend>.up.railway.app/api/billing/packages"
# Erwartet: 401 UNAUTHENTICATED
```

Im Browser: https://app.deine-domain.de/auth → einloggen → wird auf
`/admin/onboarding` weitergeleitet.

---

## 5 · Checkliste

- [ ] Supabase-Projekt in Frankfurt
- [ ] Migrationen eingespielt (00XX_* + SQL_V42_*)
- [ ] Erster Admin in `user_profiles` markiert
- [ ] Railway-Backend deployt mit Pflicht-ENV
- [ ] 3 Worker-Services laufen
- [ ] Sentry-DSN gesetzt
- [ ] Vercel-Frontend deployt
- [ ] NEXT_PUBLIC_* in Vercel
- [ ] Domain + HTTPS aktiv
- [ ] Onboarding-Wizard durchlaufen
- [ ] 2FA aktiviert + Backup-Codes
- [ ] Compliance-Verfahrensverzeichnis ausgefüllt
- [ ] (optional) Google Wallet Issuer
- [ ] (optional) Apple Developer Membership
- [ ] (optional) SumUp Webhook
- [ ] AV-Verträge mit allen Auftragsverarbeitern
