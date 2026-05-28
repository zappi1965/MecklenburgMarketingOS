# MMOS V42.3 Express OPTIONS Hotfix Fullbuild

## Behobener Railway Crash

Railway Crash:
```text
PathError [TypeError]: Missing parameter name at index 1: *
originalPath: '*'
```

## Ursache

In V42.2 wurde für CORS eine globale OPTIONS-Route mit Stern-Pattern ergänzt. Die verwendete Express/Router/path-to-regexp-Version akzeptiert dieses Pattern nicht mehr.

## Fix

Die Stern-Route wurde entfernt und durch einen route-losen Middleware-Handler ersetzt:

```js
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  return next()
})
```

Damit läuft kein `path-to-regexp` über ein Stern-Pattern, und Preflight Requests werden trotzdem beantwortet.

## Geänderte Dateien

```text
backend/src/server.js
backend/package.json
docs/V42_3_EXPRESS_OPTIONS_HOTFIX.md
```

## Deployment

1. Backend auf Railway mit V42.3 deployen.
2. Health prüfen:
   `https://mecklenburgmarketingos-production.up.railway.app/api/v33-functional/v42/health`
3. Frontend auf Vercel erneut testen.
