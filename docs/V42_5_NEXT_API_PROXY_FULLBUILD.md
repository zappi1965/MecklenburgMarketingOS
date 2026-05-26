# MMOS V42.5 Next API Proxy + Legacy Production API Fix Fullbuild

## Problem

Backend ist direkt erreichbar und CORS funktioniert:

```text
fetch('https://mecklenburgmarketingos-production.up.railway.app/api/v33-functional/v42/health')
→ JSON OK
```

Aber die App zeigt weiterhin:
```text
/api/production/health → 404
/api/production/provision → 500
/api/production/customer-360 → 500
```

## Ursache

Im Frontend gab es noch alte/legacy API-Aufrufe wie:

```text
/api/production/health
/api/production/provision
/api/production/customer-360
```

Außerdem war der Browser weiterhin direkt gegen Railway unterwegs. V42.5 routet deshalb alle v33-Functional-Aufrufe über Vercel.

## Fix

### Neuer Next API Proxy

```text
frontend/src/app/api/v33-functional/[...path]/route.ts
```

Leitet weiter:

```text
Browser
→ Vercel /api/v33-functional/...
→ Railway /api/v33-functional/...
```

### Generischer Next API Proxy

```text
frontend/src/app/api/[...path]/route.ts
```

Leitet auch ältere Clients weiter:

```text
Browser
→ Vercel /api/...
→ Railway /api/...
```

Dadurch funktionieren Module wie Storage, Ops, Enterprise, Billing und Loyalty auch dann, wenn keine Public-Backend-URL im Browser gesetzt ist.

### Legacy Production API Proxy

```text
frontend/src/app/api/production/[...path]/route.ts
```

Unterstützt:

```text
GET  /api/production/health
POST /api/production/provision
GET  /api/production/customer-360
```

Mapping:

```text
/api/production/health
→ Railway /api/system/health

/api/production/provision?customer_id=...
→ Railway /api/v33-functional/v39/:customer_id/provision-safe

/api/production/customer-360?customer_id=...
→ Railway /api/v33-functional/v38/:customer_id/customer-360
```

### Client geändert

`v33FunctionalClient` nutzt jetzt zuerst:

```text
/api/v33-functional/...
```

und nur als Fallback direkt:

```text
https://mecklenburgmarketingos-production.up.railway.app/api/v33-functional/...
```

## Vercel Variables

Empfohlen:

```text
BACKEND_URL=https://mecklenburgmarketingos-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://DEINE-VERCEL-DOMAIN.vercel.app
```

`BACKEND_URL` ist serverseitig in Vercel und ideal für den Proxy. `NEXT_PUBLIC_BACKEND_URL` kann leer bleiben, damit der Browser Same-Origin `/api/...` nutzt.

## Railway Variables

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NODE_ENV=production
```

Optional:

```text
RESEND_API_KEY
GOTENBERG_URL
```

## Geänderte Dateien

```text
frontend/src/app/api/v33-functional/[...path]/route.ts
frontend/src/app/api/[...path]/route.ts
frontend/src/app/api/production/[...path]/route.ts
frontend/src/app/api/_proxy/backend.ts
frontend/src/lib/backendUrl.ts
frontend/src/lib/v33FunctionalClient.ts
frontend/src/lib/supabase.ts
frontend/src/app/page.tsx
docs/V42_5_NEXT_API_PROXY_FULLBUILD.md
```
