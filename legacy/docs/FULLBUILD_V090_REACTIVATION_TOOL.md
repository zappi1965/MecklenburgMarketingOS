# MMOS V090 · Rückholaktionen Add-on

## Umgesetzt

- Neues zubuchbares Tool **Rückholaktionen** als eigene Freischaltung pro Kunde.
- Eingebunden unter **QR Kampagnen → QR Zielseite**.
- Kunde kann pro QR-Zielseite einstellen:
  - Rückholaktion aktiv/inaktiv
  - Kunde gilt als inaktiv nach X Tagen
  - Rückhol-Prämie / Prämientyp / Bonuspunkte
  - Link-Gültigkeit in Tagen
  - Mitarbeitercode-Pflicht
  - E-Mail-Betreff und E-Mail-Text
- System erkennt inaktive Loyalty-Kunden anhand `last_seen_at`, `last_activity_at` oder letzter Loyalty-Transaktion.
- Pro inaktivem Endkunden wird ein persönlicher Einmal-Link erzeugt: `/reactivate/[token]`.
- Öffnungen, Einlösungen und Reaktivierungen werden als KPIs sichtbar.
- Public-Route für Rückhol-Link:
  - `GET /api/v33-functional/public/reactivation/:token/status`
  - `POST /api/v33-functional/public/reactivation/:token/redeem`
- Einlösung mit Mitarbeitercode möglich und standardmäßig erforderlich.
- Bei Einlösung werden Link, Events, Loyalty-Transaktion und Punktestand aktualisiert.

## Noch nicht umgesetzt

- Kein vollautomatischer E-Mail-Versand im Hintergrund.
- E-Mail wird aktuell als Mailto-Vorlage geöffnet oder Link kopiert.
- Keine Bounce-/Zustellstatus-Überwachung.
- Keine mehrstufigen Reminder-Sequenzen.
- Keine SMS-/WhatsApp-Automation.

## Nächste Schritte

1. Migration `0115_v090_customer_reactivation_tool.sql` ausführen.
2. Beim gewünschten Kunden Tool **Rückholaktionen** freischalten.
3. Unter **QR Kampagnen → QR Zielseite → Rückholaktionen** Regeln speichern.
4. Inaktive Kunden prüfen und persönliche Links erzeugen.
5. Link per E-Mail manuell versenden bzw. Mailto öffnen.
6. Vor Ort Einlösung mit Mitarbeitercode testen.
7. Danach optional echten Mailversand mit Double-Opt-in/Opt-out-Anforderungen einbauen.
