# MMOS Update Password UX & Validation

## Umgesetzt

Die Seite `/auth/update-password` wurde verbessert.

### Neue Funktionen

- schöneres UI mit Sicherheits-Badge
- Link-/Session-Prüfung beim Laden
- klare Fehlermeldung bei abgelaufenem oder ungültigem Reset-Link
- Passwort-Regelprüfung im Frontend
- Passwort-Bestätigung
- Speichern erst möglich, wenn alle Regeln erfüllt sind
- Erfolgsmeldung nach Änderung
- Button zurück zum Login
- Mobile Layout nutzt bestehende Auth-Mobile-Optimierungen

### Passwort-Regeln

- mindestens 10 Zeichen
- mindestens ein Großbuchstabe
- mindestens ein Kleinbuchstabe
- mindestens eine Zahl
- mindestens ein Sonderzeichen
- Passwörter müssen übereinstimmen

### Fehlermeldungen

Wenn Supabase keinen gültigen Recovery-Session-Link bereitstellt, zeigt die Seite:

- Reset-Link abgelaufen
- Reset-Link bereits verwendet
- Sitzung konnte nicht hergestellt werden
- neuen Link über Login anfordern

## Hinweis

Live funktioniert Passwort-Reset weiterhin nur, wenn Supabase Auth Redirect URLs korrekt gesetzt sind:

- `https://mecklenburgmarketing.de/auth/update-password`
- ggf. Vercel Preview URL
