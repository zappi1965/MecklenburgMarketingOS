# MMOS Setup für Entwickler

## Voraussetzungen

- Node.js 20+
- Yarn 1.x (Frontend) und npm (Backend) — beide bereits vorhanden
- Supabase-Projekt (kostenfreier Plan reicht für Dev)
- Optional: Anthropic-API-Key oder OpenAI-API-Key für die AI-Features

## 1 · Repo klonen

```bash
git clone https://github.com/zappi1965/MecklenburgMarketingOS.git
cd MecklenburgMarketingOS
```

## 2 · Supabase einrichten

1. Neues Projekt in [supabase.com](https://supabase.com) anlegen
   (**Region Frankfurt** für EU-DSGVO-Konformität).
2. SQL-Migrationen in der numerischen Reihenfolge ausführen (Supabase
   Studio → SQL Editor → Datei für Datei):
   ```
   supabase/migrations/0001_core_schema.sql
   supabase/migrations/0008_ux_flow_fix_patch.sql
   ...
   supabase/migrations/0079_compliance_api_pricing.sql
   ```
   Alle Migrationen sind idempotent.
3. Aus Settings → API kopieren:
   - `URL` (z.B. `https://abc.supabase.co`)
   - `service_role` Key (NIE in den Browser geben)
   - `anon` Key (für Frontend)

## 3 · Backend starten

```bash
cd backend
npm install
cp .env.example .env  # falls vorhanden, sonst manuell anlegen
```

`backend/.env` (mindestens):
```dotenv
PORT=4000
SUPABASE_URL=https://<projekt>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NODE_ENV=development
TRUST_PROXY_HOPS=1

# Optional, fallback auf Mock-Provider
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
SENTRY_DSN=
TSE_PROVIDER=mock
GMB_PROVIDER=mock
GEOCODER_PROVIDER=nominatim
MFA_ISSUER_NAME=MMOS-Dev
```

Starten:
```bash
npm start
```
→ Backend läuft auf `http://localhost:4000`.

Tests:
```bash
npm test              # 134+ Unit-Tests
npm run smoke:full    # 46+ Smoke-Tests gegen lokalen Server (Auto-Start)
```

## 4 · Frontend starten

```bash
cd frontend
yarn install
```

`frontend/.env.local`:
```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

Starten:
```bash
yarn dev
```
→ Frontend läuft auf `http://localhost:3000`.

Build + Typecheck:
```bash
yarn typecheck
yarn build
```

## 5 · Ersten Admin anlegen

Über Supabase Studio → Authentication → Users → Add user (z.B.
`admin@example.com`). Dann im SQL Editor:

```sql
insert into public.user_profiles (id, email, role, status)
select id, email, 'admin', 'active' from auth.users where email = 'admin@example.com'
on conflict (id) do update set role='admin', status='active';
```

Login auf `http://localhost:3000/auth` → du landest auf `/admin/onboarding`.

## 6 · Worker starten (optional, für Produktion)

In separaten Prozessen:
```bash
npm run automation-worker     # alle 15 min
npm run gdpr-worker           # täglich 04:30
npm run daily-briefing-worker # täglich 07:00
```

Einmaliger Lauf für Tests:
```bash
npm run automation-worker:once
npm run gdpr-worker:once
npm run daily-briefing-worker:once
```

## 7 · Häufige Probleme

| Symptom | Ursache | Lösung |
|---|---|---|
| Backend startet, alle Routen 503 | `SUPABASE_*` ENV fehlt | `.env` prüfen, Backend neustarten |
| Frontend Build crasht mit "supabaseUrl is required" | `NEXT_PUBLIC_SUPABASE_URL` leer | ENV setzen ODER ignorieren (Stub-Client greift) |
| `/api/*` liefert 401 trotz Login | Bearer-Token im Frontend fehlt | `authClient.getCurrentSession()` prüfen |
| AI-Endpunkte liefern Mock-Antworten | Kein `ANTHROPIC_API_KEY` gesetzt | Key in `backend/.env` setzen |
| Playwright-E2E hängt | Browser nicht installiert | `yarn e2e:install` einmalig |
