# MMOS V103.5 – Scroll + MFA Rescue

Basis: originale V103 Fullbuild, nicht V103.1/V103.2/V103.3/V103.4.

## Fixes

1. Scrollfix neu aufgebaut:
   - Kein `html/body overflow:hidden` mehr.
   - Kein Wheel-/Touch-Hijacking mehr.
   - Dokument-Scroll wird aktiv freigeschaltet.
   - `MmosScrollUnlock` entfernt alte Lock-Klassen und Inline-Locks.

2. 2FA-Verify robuster:
   - Neuer schema-toleranter Helper: `backend/src/services/mfaVerifyRescueService.js`.
   - `/api/security/mfa/verify` prüft die Supabase-Session und verifiziert danach TOTP/Backup-Code.
   - Fehler werden als JSON-Code ausgegeben statt generischem `Interner Serverfehler`.
   - Zusätzlich wurde `securityRoutes.js` gepatcht, falls der Request nicht über die Pre-Auth-Route läuft.

3. Client Error:
   - `/api/client-error` bleibt öffentlich, damit keine 401-Log-Spam-Schleife entsteht.

## Falls 2FA danach noch fehlschlägt

Railway gibt dann konkrete Codes aus, z. B.:
- `MFA_PROFILE_NOT_FOUND_OR_SCHEMA_MISSING`
- `MFA_SESSION_UPDATE_FAILED`
- `MFA_INVALID`
- `SUPABASE_ADMIN_UNCONFIGURED`

Bei Schema-/Update-Fehlern bitte ausführen:
`supabase/migrations/0103_5_mfa_rescue_schema.sql`

## Wichtig

Bitte diese Version frisch auf Basis von V103 deployen, nicht über V103.1–V103.4 drüberkopieren.
