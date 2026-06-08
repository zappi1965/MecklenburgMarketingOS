# MMOS V41 Railway/Vercel Hotfix Fullbuild

## Behoben

### Railway Crash
Fehler:
```text
SyntaxError: missing ) after argument list
expected_reach: Math.max(2, reviews + members // 2)
```

Ursache:
`//` ist in JavaScript ein Kommentar, kein Division-Operator.

Fix:
```text
expected_reach: Math.max(2, Math.round((reviews + members) / 2))
```

### Vercel Build Crash
Fehler:
```text
Cannot find name 'v37Settings'
```

Ursache:
Die Branding-Variable wurde im `/l/[slug]` Frontend nicht zuverlässig im Component-Scope definiert.

Fix:
`frontend/src/app/l/[slug]/page.tsx` wurde sauber neu aufgebaut:
- v37Settings State im Component-Scope
- Branding-Variablen im Component-Scope
- Public Scan weiterhin aktiv
- getLoyaltySettings nach erfolgreichem Scan
- mobile CTA weiterhin aktiv
- nutzerfreundliche Public Fehlerhinweise

## Zusätzlich geprüft

Backend:
```text
node --check backend/src/routes/v33FunctionalRoutes.js
node --check backend/src/server.js
node --check backend/src/services/v35BusinessEngine.js
```

## Geänderte Hauptdateien

```text
backend/src/routes/v33FunctionalRoutes.js
frontend/src/app/l/[slug]/page.tsx
frontend/src/app/globals.css
docs/V41_RAILWAY_VERCEL_HOTFIX.md
```
