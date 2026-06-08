# V101 QR Print/PNG/Rotating Display

Umgesetzt:

- QR-PNG Download direkt aus dem MMOS-Backend über `/api/qr` statt Drittanbieter.
- Druckvorlage für QR-Codes mit A4-ähnlichem Layout, QR, Link und kurzen Schritten.
- QR-Ausgabe im Bereich `QR Zielseite` und in der Kampagnenübersicht.
- Neue Live-Anzeige `/qr-display/[slug]` für Tablet/Monitor.
- Neue Public-API `GET /api/v33-functional/public/loyalty/:slug/current-qr`.
- Die Live-Anzeige folgt automatisch `next_qr_slug`, wenn `rotate_qr_after_scan` aktiv ist und nach einem Scan ein neuer QR erzeugt wurde.
- Nach erfolgreichem Scan zeigt die öffentliche Loyalty-Seite den neu erzeugten QR-Code samt Link zur QR-Anzeige an.

Keine neue Supabase-Migration nötig.
