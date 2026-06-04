# MMOS V103.6 — CORS + MFA Rescue

Basis: V103.5 Fullbuild.

## Fix

Der Backend-CORS-Block wurde angepasst, damit `/api/security/mfa/verify` nicht mehr mit `CORS origin not allowed` blockiert wird, wenn Vercel-Preview-URLs oder die Produktivdomain genutzt werden.

Erlaubt sind jetzt:

- `CORS_ALLOWED_ORIGINS` aus Railway, kommasepariert
- `FRONTEND_URL`
- `PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_URL`
- `VERCEL_URL`
- `https://mecklenburgmarketing.de`
- `https://www.mecklenburgmarketing.de`
- `https://*.vercel.app`
- `https://*.mecklenburgmarketing.de`

Zusätzlich kann `CORS_ALLOWED_ORIGIN_PATTERNS` gesetzt werden, z. B.:

```env
CORS_ALLOWED_ORIGIN_PATTERNS=https://*.vercel.app,https://*.mecklenburgmarketing.de
```

Emergency nur kurzfristig:

```env
CORS_ALLOW_ALL=true
```

## Railway Empfehlung

Setze in Railway für das Backend mindestens:

```env
FRONTEND_URL=https://deine-vercel-domain.vercel.app
CORS_ALLOWED_ORIGINS=https://deine-vercel-domain.vercel.app,https://mecklenburgmarketing.de,https://www.mecklenburgmarketing.de
```

Falls du Vercel Preview Deployments testest, reicht V103.6 durch `https://*.vercel.app` grundsätzlich aus.

## Wichtig

Der vorherige Fehler kam vor der MFA-Logik. Nach diesem Fix sollte bei 2FA entweder Erfolg kommen oder ein echter MFA-Fehlercode wie `MFA_INVALID`, `INVALID_SESSION`, `MFA_SESSION_UPDATE_FAILED` usw.
