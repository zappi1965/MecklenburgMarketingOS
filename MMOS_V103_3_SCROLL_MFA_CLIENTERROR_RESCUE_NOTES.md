# MMOS V103.3 — Scroll + MFA + Client-Error Rescue

Basis: originale `mmos-v103-counter-dashboard-only-hotfix-fullbuild.zip`.

## Fixes

1. **Scroll in Chrome/Safari/Firefox**
   - `MmosScrollRescue.tsx` aktiviert bei der Dashboard-Shell einen expliziten Scroll-Container auf `<main class="main appMainShell">`.
   - Zusätzlich gibt es Wheel-/Touch-/Keyboard-Fallbacks, falls Browser-Gesten nicht korrekt an den Main-Container weitergereicht werden.
   - Landingpage/öffentliche Seiten werden nicht global gelockt, weil der Fix nur aktiv wird, wenn `.app.appLike` existiert.

2. **2FA Verify 500 entschärft**
   - `/api/security/mfa/verify` wird vor dem globalen Auth-Guard behandelt.
   - Der Bearer Token wird in der Route selbst validiert.
   - Fehler erscheinen strukturiert als JSON mit Codes wie `SUPABASE_ADMIN_UNCONFIGURED`, `INVALID_SESSION`, `MFA_SCHEMA_MISSING` oder `MFA_VERIFY_INTERNAL`.
   - Railway-Log-Suche: `[MFA_VERIFY_ROUTE_ERROR]`.

3. **Client-Error 401 Noise beseitigt**
   - Beide Pfade sind öffentlich erreichbar: `/api/production/client-error` und `/api/client-error`.
   - Damit verschwinden die `POST /api/client-error 401 Nicht authentifiziert`-Logs.

## Wichtig nach Deployment

Wenn 2FA weiter `MFA_SCHEMA_MISSING` meldet, diese Migration in Supabase ausführen:

`supabase/migrations/0103_3_mfa_schema.sql`

Railway ENV prüfen:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- optional `MFA_REQUIRE_EVERY_LOGIN=true`
- optional `MFA_TOTP_WINDOW=2`

## Deployment

```bash
yarn install
yarn build
```

Danach Frontend und Backend neu deployen. Bei Vercel zusätzlich alten Build-Cache ignorieren bzw. neu deployen.
