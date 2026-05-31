# Customer Mail & Package Live Binding

Umgesetzt:

- Mail-Absender auf `MecklenburgMarketing GbR <noreply@mecklenburgmarketing.de>` gesetzt.
- Reply-To standardmäßig `info@mecklenburgmarketing.de`.
- Kundenregistrierung sendet Bestätigung an Kunden und Hinweis ans Admin-Postfach.
- Kundeneinladung sendet echte Einladung per Mail.
- Einladung erneut senden sendet erneut die Einladungsmail.
- Registrierung freigeben sendet Freischaltungs-Mail.
- Einladung annehmen sendet Admin-Hinweis.
- Paket-Anfrage sendet Bestätigung an Kunden.
- Kundenportal-Public-Routen sauber freigegeben:
  - `/api/customer-portal/register`
  - `/api/customer-portal/invite/:token`
  - `/api/customer-portal/accept-invite`
- Admin-Routen im Customer-Portal sind zusätzlich admin-only:
  - Registrierungen anzeigen
  - Registrierung freigeben
  - Einladung erstellen
  - Einladung widerrufen / erneut senden
- Paket-Toolfreigaben werden bei Freigabe/Invite-Aktivierung automatisch gesetzt.
- `mail_events` protokolliert Mailversand bzw. Dry-Run.

Wichtig nach Upload:

```txt
supabase/migrations/0097_customer_mail_package_live_binding.sql
```

Empfohlene ENV:

```txt
RESEND_API_KEY=...
MAIL_FROM=MecklenburgMarketing GbR <noreply@mecklenburgmarketing.de>
MAIL_REPLY_TO=info@mecklenburgmarketing.de
MAIL_DOMAIN=mecklenburgmarketing.de
MAIL_COMPANY_NAME=MecklenburgMarketing GbR
ADMIN_NOTIFY_EMAIL=info@mecklenburgmarketing.de
FRONTEND_URL=https://mecklenburgmarketing.de
```
