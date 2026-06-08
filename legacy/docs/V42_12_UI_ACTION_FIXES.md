# V42.12 UI Action Fixes

## Enthaltene Fixes

- Public Slug-Seite lädt jetzt Kampagnenstatus, Rewards und aktive Aktionen.
- QR-Scan Backend-Bug behoben: `warnings` wird vor Nutzung initialisiert.
- Öffentliche `/l/[slug]`-Seite zeigt nach Scan verfügbare und nächste Rewards an.
- Anzeige aktiver Aktionen auf der Slug-Seite, z. B. Bonuspunkte-/Multiplikator-Aktion.
- QR-Kampagnen können jetzt als `review`, `loyalty` oder `both` angelegt werden.
- Punkte pro QR-Code/Kampagne sind im UI einstellbar.
- QR-Vorschau wurde kleiner gemacht.
- Google-Bewertungslink kann aus der QR-Kampagnenliste geöffnet werden.
- Rechnungsstatus ist per Dropdown änderbar.
- Booking-Termine können bearbeitet und gelöscht werden.
- Pipeline ist nicht mehr an den aktuell geöffneten Kunden gebunden und Deals können bearbeitet/gelöscht werden.
- CRM-Kundeninfos unterstützen mehrere Ansprechpartner mit E-Mail und Telefonnummer.
- Benachrichtigungen sind löschbar.
- Tooltip für „Warum?“ in CRM 360 ergänzt.
- Mehrere Versionsbezeichnungen in UI-Titeln entfernt.
- Review Intelligence und Antwortvorlagen wurden aus der Navigation herausgenommen und im Reviews-Tab zusammengeführt.
- Analytics & Billing enthält zusätzliche Info-Tooltips.
- SEO Analytics und SEO Heatmap wurden in Paketlisten/Kundenumgebung ergänzt.

## Validierung

- Frontend TypeScript-Syntaxprüfung mit temporären Modul-Stubs erfolgreich.
- Backend-Syntaxprüfung mit `node --check backend/src/routes/v33FunctionalRoutes.js` erfolgreich.

## Hinweis

Für die neue öffentliche Slug-Statusabfrage muss das Backend mit deployed werden, weil eine neue Route hinzugekommen ist:

`GET /api/v33-functional/public/loyalty/:slug/status`
