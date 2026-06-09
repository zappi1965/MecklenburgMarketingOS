MMOS V103.9

Umgesetzt:
- Stempelkarte visuell an das dunkle Premium-Design der öffentlichen Slugseite angepasst.
- QR Zielseite unterstützt jetzt zusätzlich `stamp_card_logo_url` als eigene Quelle.
- Upload für Stempel-Logo (PNG/JPG/WEBP) in `QR Kampagnen -> QR Zielseite` ergänzt.
- Upload nutzt `/api/avatars/upload`, damit ein dauerhaft öffentlicher URL zurückgegeben wird.
- Öffentliche Slugseite liest bevorzugt `stamp_card_logo_url`, danach Fallbacks.
- Backend trennt jetzt `stamp_card_logo_url` und `stamp_card_background` sauber.
