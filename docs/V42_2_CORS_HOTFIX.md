# MMOS V42.2 CORS Hotfix Fullbuild

## Problem

Railway Backend ist öffentlich erreichbar:

```text
/api/v33-functional/v42/health
```

liefert:

```json
{"ok":true,"service":"v42-demo-functional-fix"}
```

Trotzdem wirft das Frontend:

```text
TypeError: fetch failed
```

Wenn die Health-URL direkt funktioniert, ist die häufigste Ursache:
Browser/Vercel darf wegen CORS nicht auf Railway zugreifen.

## Fix

In `backend/src/server.js` ergänzt:

```js
const cors = require('cors')

app.use(cors({
  origin: true,
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
app.options('*', cors())
```

In `backend/package.json` ergänzt:

```json
"cors": "^2.8.5"
```

## Deployment

1. Backend auf Railway neu deployen
2. Prüfen:
   `https://DEIN-BACKEND.up.railway.app/api/v33-functional/v42/health`
3. Frontend auf Vercel neu deployen
4. In Vercel prüfen:
   `NEXT_PUBLIC_BACKEND_URL=https://DEIN-BACKEND.up.railway.app`

## Geänderte Dateien

```text
backend/src/server.js
backend/package.json
docs/V42_2_CORS_HOTFIX.md
```
