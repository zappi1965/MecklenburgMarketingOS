
# MMOS v18 Auth + Security + Monitoring Fullbuild

## Umgesetzt
- echte Supabase Auth Login-Seite unter `/auth`
- Passwort-Reset und neues Passwort unter `/auth/update-password`
- `user_profiles` mit Rollen `admin` und `customer`
- Kundenbindung über `customer_id`
- Live Login zusätzlich zum Demo-Modus
- Logout meldet auch Supabase Session ab
- Security Headers via Helmet
- Rate Limiting im Backend
- RLS-Funktionen und Policies für zentrale Tabellen
- Security Audit Logs
- Monitoring Endpoint `/api/monitoring/status`
- Audit Summary Endpoint `/api/monitoring/audit-summary`
- Backup-Restore-Point Tabelle
- optionaler Security Audit Worker

## Deploy
1. Supabase Patch ausführen:
   `supabase/migrations/0022_v18_auth_security_monitoring_patch.sql`
2. Vercel Frontend redeployen.
3. Railway Backend redeployen.
4. Optional separater Railway Worker:
   Root: `backend`
   Start Command: `npm run security-audit`

## Supabase Auth einrichten
1. Supabase → Authentication → Providers → Email aktivieren.
2. Authentication → URL Configuration:
   - Site URL: `https://mecklenburgmarketing.de`
   - Redirect URLs:
     - `https://mecklenburgmarketing.de/auth/update-password`
     - `https://mecklenburgmarketing.de/auth`
3. User anlegen:
   Supabase → Authentication → Users → Add User.

## Admin-Profil verbinden
```sql
insert into public.user_profiles (id, display_name, role)
values ('AUTH_USER_ID_HIER', 'DominiqueMM', 'admin')
on conflict (id) do update set role='admin', display_name='DominiqueMM';
```

## Kundenprofil verbinden
```sql
insert into public.user_profiles (id, display_name, role, customer_id)
values ('AUTH_USER_ID_HIER', 'Kundenname', 'customer', 'CUSTOMER_UUID_HIER');
```

## Monitoring
- Sentry Account erstellen und `SENTRY_DSN` in Railway setzen.
- UptimeRobot oder Uptime Kuma nutzen für:
  - `https://DEIN-BACKEND/api/monitoring/status`
  - `https://mecklenburgmarketing.de`

## Backups
Supabase:
- Project Settings → Backups prüfen/aktivieren
- vor großen Deploys manuelle SQL Dumps exportieren

Storage:
- wichtige Rechnungen/Verträge regelmäßig exportieren
- Restore Points in `backup_restore_points` dokumentieren

## Security Hardening
Bereits vorbereitet:
- RLS
- Rate Limit
- Security Headers
- Audit Logs

Extern noch prüfen:
- Demo Login für Livebetrieb verstecken
- Datenschutz/AVV anwaltlich final prüfen
- Sentry aktivieren
- regelmäßige Backups prüfen
