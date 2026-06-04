# MMOS V103.2 Scroll + 2FA Rescue Fullbuild

Basis: originale `mmos-v103-counter-dashboard-only-hotfix-fullbuild.zip`.

## Enthalten

1. **Scrollfix V103.2**
   - Neuer Client-Guard: `frontend/src/components/MmosScrollRescue.tsx`
   - Einbindung in `frontend/src/app/layout.tsx`
   - Finaler CSS-Block am Ende von `frontend/src/app/globals.css`
   - Ziel: Chrome, Safari und Firefox wieder über normalen Dokument-Scroll scrollbar machen.
   - Wichtig: V103.1 wurde nicht weitergestapelt, sondern die Original-V103 wurde neu gepatcht.

2. **2FA Fehlerbehandlung**
   - `frontend/src/app/auth/page.tsx`: 2FA-Response wird robuster gelesen; keine JSON-/Fetch-Crashes.
   - `backend/src/routes/securityRoutes.js`: `/api/security/mfa/verify` gibt klare JSON-Fehler zurück statt generischem 500.
   - `backend/src/services/mfaService.js`: MFA-Profilupdates prüfen Supabase-Fehler und versuchen ID-/E-Mail-Fallback.

3. **Supabase MFA Schema Rescue**
   - Neue idempotente Migration: `supabase/migrations/0103_2_mfa_scroll_rescue_schema_check.sql`
   - Falls nach Deploy weiterhin `MFA_VERIFY_INTERNAL` erscheint: diese SQL in Supabase ausführen und Railway neu deployen.

## Nach Deploy testen

```bash
yarn install
yarn build
```

Dann in Chrome/Safari/Firefox Hard Reload.

## Wenn 2FA weiterhin Fehler zeigt

Bitte in Railway Logs nach `[MFA_VERIFY_ERROR]` suchen. Die neue Version zeigt dort die echte Ursache.
