# MFA Every Login & Landing Mobile Graphics Fix

## 2FA

Warum bisher nicht bei jedem Login gefragt wurde:

- Nach erfolgreicher 2FA wurde `mfa_verified_until` in `user_profiles` gesetzt.
- Solange dieser Zeitpunkt noch in der Zukunft lag, galt die Session als bereits 2FA-verifiziert.
- Dadurch wurde innerhalb des TTL-Fensters nicht erneut gefragt.

Neu:

- `MFA_REQUIRE_EVERY_LOGIN=true` erzwingt 2FA bei jedem neuen Passwort-Login.
- Dafür wird `mfa_last_used_at` mit `auth.users.last_sign_in_at` verglichen.
- Erst wenn die 2FA nach dem aktuellen Login bestätigt wurde, gilt die aktuelle Session als verifiziert.

Empfohlene ENV in Railway:

```env
MFA_REQUIRE_EVERY_LOGIN=true
MFA_TOTP_WINDOW=2
MFA_SESSION_TTL_HOURS=12
MFA_ISSUER_NAME=MecklenburgMarketing
```

## Landingpage Mobile

Behoben:

- Hero-Mockups und Floating Cards werden mobil nicht mehr abgeschnitten.
- Grafiken werden mobil zu gestapelten App-Karten.
- Logo/CTA/Proof/Portal/Audit-Blöcke sind mobil vollständig sichtbar.
- Horizontale Chip-Listen statt abgeschnittener Elemente.
- Kleine iPhones bekommen zusätzliche Einspalten-Layouts.

Keine neue Supabase-Migration nötig.
