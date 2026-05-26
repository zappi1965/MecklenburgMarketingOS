# V42.21.4 Live Admin Profiles

Ergänzt einen separaten Reiter **Admin Profile** im Adminbereich.

## Enthalten

- Echte Supabase-Auth-Adminuser aus dem UI anlegen
- Benutzername, Anzeigename, E-Mail, Passwort, Status
- Adminprofile laden, bearbeiten, sperren und aktivieren
- Optionaler Setup-Key für Bootstrap/Demo-Adminmodus
- Backendroute `/api/admin-profiles`
- SQL-Migration `SQL_V42_21_4_LIVE_ADMIN_PROFILES.sql`

## Sicherheit

Die Profile sind keine lokalen Demo-Profile. Das Passwort wird nicht lokal gespeichert, sondern an das Railway-Backend übergeben und dort mit Supabase Auth verarbeitet.

Für die Erstellung gibt es zwei Wege:

1. Als aktiver Live-Admin eingeloggt sein.
2. `ADMIN_PROFILE_SETUP_TOKEN` in Railway setzen und den Setup-Key im UI eintragen.

Für den ersten Admin ohne vorhandenen Admin kann alternativ `ALLOW_ADMIN_BOOTSTRAP=true` genutzt werden. Empfohlen ist der Setup-Key.
