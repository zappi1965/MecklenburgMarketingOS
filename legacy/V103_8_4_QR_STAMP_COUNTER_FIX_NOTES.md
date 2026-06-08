# V103.8.4 – QR Kampagnen: Stempelkarte, Tresenmodus, Kampagnenauswahl

## Änderungen

### 1. Tresen-PIN / Tresen-Backup nur wenn aktiviert
- Die öffentliche Slugseite zeigt den Einlösecode nicht mehr als „Tresen-Backup“, wenn der Tresenmodus nicht ausgewählt ist.
- Der Einlösecode erscheint nur noch bei `redemption_mode = counter_customer_code`.
- `show_staff_pin_on_counter` ist nicht mehr automatisch aktiv, sondern muss bewusst eingeschaltet werden.
- Backend `/counter-status` liefert Mitarbeiter-PINs nur noch aus, wenn `metadata.show_staff_pin_on_counter === true`.

### 2. Stempelkarte sichtbar vor Login
- Die Stempelkarte liest QR-Kampagnen-Metadaten nun mit höchster Priorität.
- Ältere globale Loyalty-Settings können die konkrete Auswahl einer QR-Zielseite nicht mehr überschreiben.
- Wenn `stamp_card` oder `hybrid` ausgewählt ist, wird die Stempelkarte auch anonym mit 0 Stempeln angezeigt.
- Nach Login/Scan werden gesammelte Stempel angezeigt.

### 3. QR-Kampagnenauswahl bei mehreren Kampagnen
- Unter `QR Kampagnen verwalten → QR Zielseite` gibt es bei mehreren QR-Kampagnen eine Auswahl, welche QR-Zielseite bearbeitet wird.
- Unter `QR Kampagnen verwalten → Rückholaktion` gibt es ebenfalls eine Kampagnenauswahl.
- Es wird nicht mehr automatisch jede vorhandene QR-Kampagne gleichzeitig als Editor angezeigt.

## Geänderte Dateien
- `frontend/src/app/page.tsx`
- `frontend/src/app/l/[slug]/page.tsx`
- `backend/src/routes/v33FunctionalRoutes.js`

## Prüfung
- Backend JS Syntax Check: OK
- MMOS Quality Guard: OK
- Fullbuild Check: OK

Hinweis: Ein echter Vercel/Next Typecheck konnte in der Sandbox nicht vollständig ausgeführt werden, da keine Registry-Dependencies installiert sind.
