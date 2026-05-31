# MFA Login Enforcement Fix

Behoben:

- eingerichtete 2FA wird jetzt beim Admin-Login abgefragt
- `/api/auth/me` liefert `mfa_required`, `mfa_enabled`, `mfa_verified`
- Login bleibt nach Passwort im 2FA-Zwischenschritt stehen
- 2FA-Code wird gegen `/api/security/mfa/verify` geprüft
- nach erfolgreicher Prüfung wird `mfa_verified_until` gesetzt
- Admin-API-Routen blockieren bei aktiver 2FA ohne gültige MFA-Session mit `MFA_REQUIRED`
- Backend-MFA-Service findet Profile per Auth-ID oder E-Mail
- CORS erlaubt `X-MFA-Code` / `X-MMOS-MFA-Code`
- Migration 0096 ergänzt `mfa_verified_until`

Nach Upload ausführen:

```txt
supabase/migrations/0096_mfa_login_enforcement.sql
```
