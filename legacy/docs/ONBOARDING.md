# MMOS Onboarding für neue Customers

Diese Anleitung führt durch den ersten Login eines neuen Kunden bis zur
einsatzbereiten Slug-Seite. Geschätzte Zeit: **~10 Minuten**.

## 0 · Voraussetzungen

- Du wurdest von einem MMOS-Admin als Customer angelegt (oder hast dich
  selbst über `/auth/register` registriert und wurdest freigeschaltet).
- Login-E-Mail + Passwort liegen vor.
- Du brauchst einen modernen Browser (Chrome, Firefox, Safari) auf
  Desktop **oder** Smartphone.

## 1 · Erstes Login

1. Gehe zu `https://<deine-mmos-domain>/auth`.
2. Logge dich mit E-Mail + Passwort ein.
3. Du landest automatisch auf `/admin/onboarding` — dem 4-Schritte-Wizard.

> **Hinweis:** Falls du nach Login auf einer leeren Seite landest, öffne
> manuell `/admin/onboarding`. Der Wizard erkennt automatisch, welche
> Schritte schon erledigt sind, und überspringt sie.

## 2 · Wizard-Schritte

### Schritt 1 · Branding (~1 Min.)

- **Markenname:** wie dein Unternehmen heißt (auf jeder Slug-Seite sichtbar).
- **Primärfarbe:** typisch deine Logofarbe — wird für Buttons + Sterne
  verwendet.
- **Sekundärfarbe:** typisch ein dunkler Akzent für Hintergründe.
- **Tonalität für AI:** ein Satz, wie deine Marke klingt
  (z.B. *"locker mit Augenzwinkern"* oder *"sachlich präzise"*).
  Wird vom AI-Review-Response-Generator und vom AI-Mail-Assistant
  verwendet.

### Schritt 2 · Erste QR-Kampagne (~1 Min.)

- **Interner Titel:** wie die Kampagne im Admin-Bereich heißt.
- **Headline:** die große Überschrift, die deine Endkunden auf der
  Slug-Seite sehen.
- **Slug:** der URL-Teil, z.B. `bonusclub-mueller` → ergibt
  `https://<domain>/l/bonusclub-mueller`. Leer lassen = automatisch aus
  dem Titel generiert.

Nach diesem Schritt ist die Slug-Seite **sofort live**. Du kannst sie zu
diesem Zeitpunkt schon auf dem Smartphone öffnen.

### Schritt 3 · Loyalty-Programm + erstes Reward (~2 Min.)

- **Programm-Name:** typischerweise dasselbe wie deine Marke,
  z.B. *"Friseur-Mueller-Bonusclub"*.
- **Erstes Reward:** der typische "erste Gutschein" — Beispiel:
  *"Gratis-Kaffee"* für 50 Punkte oder *"10% Rabatt"* für 100 Punkte.

Du kannst später beliebig viele weitere Rewards in `/admin` (Loyalty)
anlegen.

### Schritt 4 · Demo-Daten (~30 Sek.)

- Wir legen automatisch **3 Demo-Reviews** und **5 Demo-Loyalty-Mitglieder**
  an, damit deine Dashboards beim ersten Besuch nicht leer wirken.
- Die Demo-Daten sind im CRM gekennzeichnet (E-Mail enthält `@deleted.local`,
  Display-Name beginnt mit `Demo-`) und können jederzeit gelöscht werden.

### Schritt 5 · Fertig 🎉

Der Wizard zeigt:
- Direktlink zu deiner Slug-Seite (zum sofortigen Testen mit dem Handy)
- Hinweis auf 2FA-Aktivierung (`/admin/security`) — **dringend empfohlen**
- Hinweis auf DSGVO-Cockpit (`/admin/compliance`) — Verfahrensverzeichnis
  ausfüllen
- Direktlink zu `/admin/insights` — alle KPIs auf einen Blick

## 3 · Was du JETZT machen solltest (nach dem Wizard)

In dieser Reihenfolge:

1. **2FA aktivieren** unter `/admin/security`.
   - Du brauchst eine Authenticator-App (Google Authenticator, 1Password,
     Authy, Bitwarden).
   - Scanne den QR-Code, gib den 6-stelligen Code ein.
   - **Speichere die 10 Backup-Codes** in deinem Passwort-Manager.

2. **Slug-Seite testen:** Öffne die URL aus dem Wizard-Schritt 5 auf dem
   Smartphone. Du solltest sehen:
   - Den Markennamen mit deiner Primärfarbe
   - Headline + Subline
   - Login-Formular für Bonuskonto-Endkunden
   - Den Consent-Banner unten (DSGVO/TDDDG-konform)

3. **QR-Code drucken:** In `/qr-campaigns` findest du deine Kampagne.
   Klick auf "QR als Bild öffnen" → speichern → ausdrucken → an der Kasse
   aufstellen.

4. **DSGVO-Verfahrensverzeichnis ausfüllen** unter `/admin/compliance`.
   Mindestens 3 Verfahrenstätigkeiten anlegen (CRM, Loyalty, Reviews).
   Empfohlen: 5 Auftragsverarbeiter eintragen (Supabase, Vercel, Railway,
   Anthropic/OpenAI, Mail-Provider).

## 4 · Optional: Erweiterte Tools

| Tool | Pfad | Wann sinnvoll |
|---|---|---|
| API-Keys | `/admin/api-keys` | Wenn du Zapier, n8n oder eigene Apps anbinden willst |
| GMB-Posts | `/admin/gmb` | Wenn du Google-Business-Profile verbunden hast |
| Newsletter | `/admin/newsletter` | Sobald du Subscriber gesammelt hast |
| Mahnstufen | `/admin/dunning` | Bei wiederkehrenden Rechnungen |
| Smart-Pricing | `/admin/pricing` | Wenn du dynamische Preise willst |
| No-Show-Risiko | `/admin/no-show` | Sobald Bookings genutzt werden |
| Bewertungs-Widget | `/admin/widget` | Sobald >5 echte Bewertungen vorliegen |
| AI-Mail-Assistant | `/admin/mail-assistant` | Für individuelle Kunden-Mails |

## 5 · Hilfe?

- Technische Probleme: Logs unter Railway → Project → Logs prüfen.
- DSGVO-Fragen: `docs/COMPLIANCE.md` und `docs/REMAINING_LIMITATIONS.md`.
- Setup-Probleme: `docs/SETUP.md`.
