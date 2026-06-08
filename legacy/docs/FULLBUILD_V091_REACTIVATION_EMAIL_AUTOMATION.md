# MMOS V091 – Rückholaktionen E-Mail-Automation

Umgesetzt:

- Live-Versand persönlicher Rückhol-Links per E-Mail.
- Fester Absender: `MecklenburgMarketing Loyalty <loyalty@mecklenburgmarketing.de>`.
- Testmail-Funktion direkt im Rückholaktionen-Panel.
- Versandbutton für offene Rückhol-Links.
- Reminder-Sequenz mit einstellbarem Zeitraum und Maximalanzahl.
- Zustell-/Bounce-Statusfelder auf `customer_reactivation_links`.
- Resend/Webhook-kompatibler Public-Endpunkt: `/api/v33-functional/public/reactivation/mail-webhook`.
- Optionaler Automationsrunner per Backend-ENV: `REACTIVATION_AUTOMATION_ENABLED=true`.

Nicht enthalten:

- Kein eigener E-Mail-Provider im System. Versand läuft über bestehenden `MailService`/Resend.
- Zustell- und Bounce-Auswertung setzt voraus, dass der Provider-Webook in Resend konfiguriert wird.

ENV-Hinweise:

```txt
RESEND_API_KEY=...
REACTIVATION_MAIL_FROM="MecklenburgMarketing Loyalty <loyalty@mecklenburgmarketing.de>"
MAIL_REPLY_TO=info@mecklenburgmarketing.de
FRONTEND_URL=https://deine-vercel-domain.de
# optional:
REACTIVATION_AUTOMATION_ENABLED=true
REACTIVATION_AUTOMATION_INTERVAL_MS=21600000
RESEND_WEBHOOK_SECRET=...
```
