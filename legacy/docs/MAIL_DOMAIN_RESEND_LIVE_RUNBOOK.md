# Mail-Domain & Resend Live Runbook

## Ziel

Dieses Runbook führt die Live-Aktivierung für `mecklenburgmarketing.de` durch:

1. Resend-Domain hinzufügen/verifizieren
2. SPF setzen
3. DKIM setzen
4. DMARC setzen
5. Testmail senden
6. Abmeldelink testen
7. Datenschutztext prüfen
8. technische Consent-Formulierung prüfen

## Wichtig

Die DNS-Einträge können nicht durch den Code selbst gesetzt werden. Sie müssen im DNS-Provider der Domain eingetragen werden.

## ENV

Backend/Railway:

```env
MAIL_DOMAIN=mecklenburgmarketing.de
MAIL_FROM=MecklenburgMarketing <noreply@mecklenburgmarketing.de>
MAIL_REPLY_TO=info@mecklenburgmarketing.de
ADMIN_NOTIFY_EMAIL=info@mecklenburgmarketing.de
RESEND_API_KEY=...
FRONTEND_URL=https://mecklenburgmarketing.de
PUBLIC_APP_URL=https://mecklenburgmarketing.de
EXPECTED_SPF_INCLUDE=include:amazonses.com
RESEND_DKIM_SELECTORS=<selector1>,<selector2>,<selector3>
```

`RESEND_DKIM_SELECTORS` muss mit den tatsächlichen DKIM-Hosts aus Resend gefüllt werden.

## DNS-Einträge

### SPF

```txt
Host: @
Typ: TXT
Wert: v=spf1 include:amazonses.com ~all
```

Falls bereits SPF existiert: nicht zweiten SPF anlegen, sondern bestehenden SPF erweitern.

### DKIM

Die exakten Records aus Resend übernehmen. Meist werden 3 DKIM-Einträge angezeigt.

### DMARC Startphase

```txt
Host: _dmarc
Typ: TXT
Wert: v=DMARC1; p=none; rua=mailto:postmaster@mecklenburgmarketing.de; adkim=s; aspf=s
```

Nach erfolgreichem Betrieb später auf `p=quarantine` oder `p=reject` verschärfen.

## Live-Prüfung

Adminseite:

```txt
/admin/production/mail-domain
```

Dort:
- Domain prüfen
- Testmail senden
- Abmeldelink-Test erzeugen
- Legal Guard prüfen
- Datenschutz-Ergänzung ansehen

## Abmeldelink Live-Test

1. Testmail mit echtem Empfänger senden.
2. Reminder-Entwurf erzeugen.
3. Versandroute nutzen.
4. Abmeldelink aus der Mail öffnen.
5. Prüfen: `marketing_consent_status = withdrawn`
6. Prüfen: `marketing_consent_withdrawals` wurde geschrieben.

## Was Code nicht automatisch kann

- Domain bei Registrar kaufen/registrieren
- DNS beim Domainprovider setzen
- Resend-Domain im Resend-Dashboard klicken/verifizieren
- Anwaltliche Freigabe ersetzen
