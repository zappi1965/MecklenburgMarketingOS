# V098 Security Hardening

Dieses Build haertet den V097/V096 Rueckholaktionen- und Public-QR-Bereich fuer den Pilotbetrieb.

## Umgesetzt

- Customer-IDOR-Schutz fuer alle `v33-functional` Routen mit `:customer_id`.
- Customer-Nutzer duerfen nur noch auf Kunden zugreifen, denen sie in `customer_users` aktiv zugeordnet sind; Admins bleiben freigeschaltet.
- Rate-Limits fuer Rueckhol-Testmails, Rueckholmails, Reminder, Statusabrufe, Einloesungen und Webhook.
- Rueckhol-Einloesung mit Mitarbeitercode: Sperre nach mehreren falschen Codes, inklusive Token/IP-bezogenem Schutz.
- Mail-Webhook braucht in Production zwingend ein Secret (`REACTIVATION_WEBHOOK_SECRET` oder `RESEND_WEBHOOK_SECRET`).
- Public JSON-Body-Limit reduziert (`PUBLIC_JSON_LIMIT`, Standard 250kb), interne/private Routen behalten hoehere Grenze (`JSON_BODY_LIMIT`, Standard 50mb).
- Public Reactivation-Status gibt keine E-Mail und keine internen Metadata mehr aus.
- Fehlerausgaben in Production fuer 500er werden generischer, Details bleiben in Railway-Logs.
- CORS-Allowlist vorbereitet ueber `CORS_ALLOWED_ORIGINS` / `FRONTEND_URL`; Development bleibt ohne Konfiguration offen.

## Empfohlene ENV fuer Railway

```txt
FRONTEND_URL=https://deine-vercel-domain.de
CORS_ALLOWED_ORIGINS=https://deine-vercel-domain.de,https://www.mecklenburgmarketing.de,https://mecklenburgmarketing.de
REACTIVATION_WEBHOOK_SECRET=<langes-zufaelliges-secret>
PUBLIC_JSON_LIMIT=250kb
JSON_BODY_LIMIT=50mb
REACTIVATION_REDEEM_RATE_MAX=8
REACTIVATION_REDEEM_LOCK_MAX_FAILS=5
REACTIVATION_REDEEM_LOCK_MINUTES=15
REACTIVATION_TEST_MAIL_RATE_MAX=5
REACTIVATION_SEND_MAIL_RATE_MAX=5
```

Keine Supabase-Migration erforderlich.
