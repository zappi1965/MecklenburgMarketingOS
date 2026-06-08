# MMOS v0.60 Mail, Gotenberg und UI Fix

- Paketanfrage-Mailversand robuster: Resend-Fehler werden erkannt, nicht mehr als `sent` gewertet.
- Paketanfragen bekommen Mail-Status im Admin-Dashboard.
- `GOTENBERG_URL=null` / `undefined` / leer wird als nicht konfiguriert behandelt und erzeugt nicht mehr `null/health`.
- Paketkarten und Bearbeiten-Formulare erhalten harte Dark-Mode-Kontrastregeln.

ENV Backend:
- RESEND_API_KEY erforderlich für echten Mailversand.
- MAIL_FROM empfohlen und muss in Resend verifiziert sein.
- PACKAGE_INQUIRY_TO optional, Standard: zapf@mecklenburgmarketing.de.
- GOTENBERG_URL leer lassen, wenn kein Service aktiv ist; niemals `null` eintragen.
