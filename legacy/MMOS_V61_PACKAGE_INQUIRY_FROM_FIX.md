# MMOS v0.61 – Package Inquiry From Fix

- Paketanfragen nutzen jetzt standardmäßig `Mecklenburg Marketing <noreply@mecklenburgmarketing.de>` als Absender.
- `PACKAGE_INQUIRY_FROM` überschreibt den Absender nur für öffentliche Paket-/Setup-Anfragen.
- Der globale MailService-Fallback wurde ebenfalls von Resend-Demo auf `noreply@mecklenburgmarketing.de` geändert.
- Damit wird verhindert, dass Paketanfragen versehentlich mit `noreply@example.com` oder Demo-Absendern laufen, sofern kein expliziter korrekter Absender gesetzt ist.

Empfohlene Railway-ENV:

```env
RESEND_API_KEY=...
MAIL_FROM=Mecklenburg Marketing <noreply@mecklenburgmarketing.de>
PACKAGE_INQUIRY_FROM=Mecklenburg Marketing <noreply@mecklenburgmarketing.de>
PACKAGE_INQUIRY_TO=zapf@mecklenburgmarketing.de
```

Wichtig: Die Domain `mecklenburgmarketing.de` muss in Resend als Sending Domain verifiziert sein.
