# MMOS V103.8.2 – QR-Zielseite: Stempelkarte + Rückholaktion getrennt

## Ziel
Diese Version verschiebt die Stempelkarten-Konfiguration aus dem allgemeinen Punkteprogramm-Builder in den Bereich:

`QR Kampagnen verwalten → QR Zielseite → Finale Einstellungen für diese öffentliche QR-Zielseite`

Außerdem wurde die Rückholaktion aus der QR-Zielseiten-Bearbeitung entfernt und als eigener QR-Unterbereich neben Mitarbeitercodes angelegt:

`QR Kampagnen verwalten → Rückholaktion`

## Geänderte Dateien

- `frontend/src/app/page.tsx`
  - QR-Unterbereiche erweitert: `Kampagnen`, `QR Zielseite`, `Mitarbeitercodes`, `Rückholaktion`
  - Stempelkarten-Felder in `LandingTextEditor` integriert
  - Rückholaktion aus `LandingTextEditor` entfernt
  - `ReactivationPanel` wird jetzt nur noch im neuen Bereich `Rückholaktion` angezeigt
  - alter Stempelkarten-Block im Punkteprogramm-Builder entfernt, damit die Einstellung nicht doppelt liegt
  - Paket-/Tool-Routing für `Rückholaktionen` auf den neuen QR-Unterbereich gesetzt

- `backend/src/routes/v33FunctionalRoutes.js`
  - `/v42/qr-campaigns/:id/final-slug-settings` speichert nun zusätzlich folgende Felder in `qr_campaigns.metadata`:
    - `loyalty_display_mode`
    - `stamp_card_slots`
    - `stamp_card_reward_text`
    - `stamp_card_stamp_style`
    - `stamp_card_show_logo`
    - `stamp_card_background`
    - `stamp_card_logo_url`
    - `points_per_stamp`

## Bedienung

### Stempelkarte einstellen

1. Admin-Dashboard öffnen
2. `QR Kampagnen verwalten`
3. `QR Zielseite`
4. gewünschte Zielseite im Block `Finale QR-Zielseiten-Regeln & Texte bearbeiten` öffnen
5. im Abschnitt `Stempelkarten-Ansicht auf der QR-Zielseite` einstellen:
   - Punkteansicht
   - Stempelkarte
   - Kombiniert
   - Anzahl Felder
   - Stempelstil
   - Punkte pro Stempel
   - Belohnungstext
   - Logo-/Stempel-URL
6. `QR-Zielseite speichern`
7. `/l/[slug]` öffnen

### Rückholaktion einstellen

1. `QR Kampagnen verwalten`
2. `Rückholaktion`
3. gewünschte QR-Zielseite/Kampagne bearbeiten
4. Rückhol-Regeln und E-Mail-Vorlagen speichern

## Datenhaltung

Für die Stempelkarten-Ansicht ist keine neue Tabelle nötig. Die Konfiguration wird bewusst direkt pro QR-Kampagne unter `qr_campaigns.metadata` gespeichert, weil die öffentliche Slugseite ebenfalls kampagnenbezogen liest.

## Prüfungen

- Backend JS Syntax: OK
- `node scripts/quality-guard.mjs`: bestanden
- `node scripts/v061-fullbuild-check.mjs`: bestanden

Ein vollständiger Next/Vercel-Build konnte in der Sandbox nicht ausgeführt werden, weil keine installierten Frontend-Abhängigkeiten verfügbar sind. Die Änderungen sind jedoch ohne neue Dependencies umgesetzt.
