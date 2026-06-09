# MMOS Mail Domain Live, Datenschutz & Legal Guard

## Umgesetzt

### Mail-Domain Live Readiness
Neue Admin-Seite:
- `/admin/production/mail-domain`

Neue Backend-Routen:
- `GET /api/production/mail-domain/readiness`
- `POST /api/production/mail-domain/test-mail`
- `POST /api/production/mail-domain/unsubscribe-self-test`
- `GET /api/production/mail-domain/privacy-reminder-text`
- `GET /api/production/mail-domain/legal-checklist`

### Resend / DNS Prüfung
Das System prüft:
- DNS erreichbar
- SPF TXT
- DMARC TXT
- DKIM-Selectors aus ENV
- MAIL_FROM
- RESEND_API_KEY
- FRONTEND_URL/PUBLIC_APP_URL

### Testmail
Über `MailService` kann eine echte Testmail versendet werden, wenn `RESEND_API_KEY` und `MAIL_FROM` gesetzt sind.

### Abmeldelink-Test
Das System kann einen Abmeldelink-Test erzeugen und im Admin anzeigen.

### Datenschutzerklärung
`/datenschutz` wurde ergänzt um:
- Newsletter, Werbeeinwilligungen und Reminder-Mails
- Double-Opt-in
- Abmeldelink/Widerruf
- Resend als E-Mail-Dienstleister
- Bonusprogramm, Kundenbindung und Reaktivierung

### Legal Guard
Die technische Consent-Prüfung ist jetzt auch im Mail-Domain-Center sichtbar.

## Nicht automatisch möglich

- Domain live registrieren
- DNS-Einträge beim Provider setzen
- Resend-Domain im Resend-Dashboard verifizieren
- Echte Zustellung ohne gesetzte ENV/DNS testen
- Anwaltliche Endfreigabe ersetzen
