# Wallet-Pass-Setup (Google + Apple)

Diese Anleitung zeigt, wie du echte signierte Wallet-Pässe für deine
Loyalty-Mitglieder ausgibst. Solange die Zertifikate nicht hinterlegt
sind, läuft MMOS im Mock-Modus weiter — der Backend-Endpunkt
`/api/wallet/loyalty-member/:id` liefert dann unsignierte JSON-Strukturen.

---

## Google Wallet (kostenlos)

**Voraussetzung:** Google-Konto, Google Cloud Platform Zugang.

**Kostenrahmen:** Free Tier deckt bis zu 100.000 Pässe / Monat ab. Danach
gestaffelte Preise.

**Dauer:** Account-Setup ca. 30 Min., Issuer-Freischaltung durch Google
3–7 Werktage.

### Schritte

1. **Google Cloud Console** → [console.cloud.google.com](https://console.cloud.google.com)
   - Neues Projekt anlegen (z.B. `mmos-wallet-prod`)
   - APIs & Services → Bibliothek → **Google Wallet API** aktivieren

2. **Service Account anlegen**
   - IAM & Verwaltung → Dienstkonten → Neues Dienstkonto
   - Name: `mmos-wallet-issuer`
   - Rolle: `Wallet Objects Issuer` (falls verfügbar) oder `Bearbeiter`
   - Tab "Schlüssel" → Schlüssel hinzufügen → JSON → herunterladen
   - Im JSON findest du: `client_email`, `private_key`, `private_key_id`

3. **Issuer-Konto bei Google beantragen**
   - [pay.google.com/business/console](https://pay.google.com/business/console)
   - Mit dem Google-Konto einloggen, das auch Cloud-Projekt-Owner ist
   - **Issuer-Account anlegen** → Firmendaten ausfüllen
   - Mit dem Service Account (E-Mail aus Schritt 2) verknüpfen
   - **Issuer-ID** notieren (8-stellige Zahl)
   - Status zunächst `temporary issuer` → Antrag auf Production stellen
     (Formular im Console, Google prüft 3–7 Tage)

4. **ENV-Variablen in Railway / Backend setzen**

   ```bash
   GOOGLE_WALLET_ISSUER_ID=1234567890123456789
   GOOGLE_WALLET_CLASS_SUFFIX=mmos-loyalty
   GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=mmos-wallet-issuer@<projekt>.iam.gserviceaccount.com
   GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_WALLET_ORIGINS=https://app.mmos.de,https://staging.mmos.de
   ```

   **Wichtig:** `\n` im Private-Key bleibt als wörtliches Backslash-n in
   der ENV — der Service ersetzt das beim Laden zu echten Zeilenumbrüchen.

5. **Loyalty-Class einmalig anlegen** (vor dem ersten Pass)
   - `wallet-lab-tools.web.app` → Form ausfüllen, Class-ID:
     `<ISSUER_ID>.mmos-loyalty`
   - Class-Inhalte: Name, Logo, Programm-Hinweise

6. **Testen:** `/api/wallet/loyalty-member/<member-id>` aufrufen — das
   `saveUrl`-Feld im Response sollte jetzt mit gültigem JWT enden.

---

## Apple Wallet (99 USD / Jahr)

**Voraussetzung:** Apple-ID + Apple Developer Program Membership.

**Kostenrahmen:** 99 USD / Jahr (auch für Einzelpersonen).

**Dauer:** Apple-Developer-Anmeldung 1–2 Tage, Pass-Setup 1 Stunde.

### Schritte

1. **Apple Developer Program** → [developer.apple.com/programs](https://developer.apple.com/programs)
   - Einschreibung als Einzelperson oder Organisation
   - Bezahlung 99 USD / Jahr
   - Nach Aktivierung E-Mail mit Zugangsdaten

2. **Pass Type ID anlegen**
   - [developer.apple.com/account/resources/identifiers/list/passTypeId](https://developer.apple.com/account/resources/identifiers/list/passTypeId)
   - "+" → Pass Type IDs → Continue
   - Description: "MMOS Loyalty Pass"
   - Identifier: `pass.de.mmos.loyalty` (reverse-DNS, eigene Domain)
   - Register

3. **Signing-Zertifikat erzeugen**
   - Auf dem Pass Type ID → Configure → Create Certificate
   - Du brauchst eine **CSR-Datei** (Certificate Signing Request):
     - macOS: Schlüsselbund → Schlüsselbundverwaltung → Zertifikatsassistent
       → CSR erzeugen mit deiner E-Mail
     - Linux/Windows: `openssl req -new -newkey rsa:2048 -nodes -keyout key.pem -out request.csr`
   - CSR im Browser hochladen → Apple gibt `.cer` zurück, herunterladen

4. **WWDR-Zertifikat herunterladen**
   - [developer.apple.com/certificationauthority/AppleWWDRCAG3.cer](https://developer.apple.com/certificationauthority/AppleWWDRCAG3.cer)
   - Auf dem System ablegen

5. **Zertifikat + Schlüssel zu PEM konvertieren**
   ```bash
   # Cert von Apple (.cer) zu PEM
   openssl x509 -inform DER -in pass.cer -out pass-cert.pem
   # WWDR (.cer) zu PEM
   openssl x509 -inform DER -in AppleWWDRCAG3.cer -out wwdr-cert.pem
   # Privater Schluessel: hattest du beim CSR-Generieren als key.pem
   ```

6. **Team-ID notieren**
   - Apple Developer Account → Membership → Team ID (10-stellig)

7. **ENV-Variablen in Railway / Backend setzen**

   ```bash
   APPLE_WALLET_PASS_TYPE_ID=pass.de.mmos.loyalty
   APPLE_WALLET_TEAM_ID=ABCDE12345
   APPLE_WALLET_ORG_NAME=Mecklenburg Marketing

   # Pfade ODER inline-PEM-Inhalte:
   APPLE_WALLET_CERT_PEM="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
   APPLE_WALLET_KEY_PEM="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   APPLE_WALLET_WWDR_PEM="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
   APPLE_WALLET_KEY_PASSPHRASE=optional-falls-pem-passwort-geschuetzt
   ```

8. **Icons hinterlegen** (`backend/src/assets/wallet/`)
   - `icon.png` 29×29, `icon@2x.png` 58×58
   - `logo.png` 160×50, `logo@2x.png` 320×100
   - Optional: `strip.png`, `thumbnail.png`

9. **Testen:** `/api/wallet/loyalty-member/<id>/apple.pkpass` lädt ein
   echtes `.pkpass`-Bundle — beim Öffnen auf iPhone fragt iOS "Zu Apple
   Wallet hinzufügen?"

---

## Häufige Probleme

| Symptom | Ursache | Lösung |
|---|---|---|
| Google: "Class does not exist" beim ersten Save | Loyalty-Class nicht angelegt | Schritt 5 nachholen |
| Google: 403 bei JWT | Service Account ohne Wallet-Berechtigung | Issuer-Konto-Verknüpfung prüfen |
| Apple: ".pkpass invalid signature" | WWDR-Zert fehlt im Bundle | Schritt 4 nachholen |
| Apple: Pässe öffnen nicht in iOS Wallet | Pass Type ID stimmt nicht mit Cert überein | Schritte 2 + 3 wiederholen |
| Pässe ohne Logo | Icons fehlen im Backend | Schritt 8 (Apple) |

## Tipps für die Live-Phase

- **Staging-Issuer (Google)**: lege im ersten Schritt einen zweiten
  Issuer für Staging an, damit du nicht in Production-Pässe versehentlich
  Test-Mitglieder eintragst.
- **Pass-Updates**: sobald sich `points_balance` ändert, kann Apple
  Wallet aktualisiert werden (Push via APNs). Wir bauen das ein, sobald
  du in echten Betrieb gehst.
- **Rollback-fähig**: alle ENV-Variablen sind optional. Wenn du sie
  entfernst, läuft MMOS auf den Mock-Modus zurück — kein Datenverlust.
