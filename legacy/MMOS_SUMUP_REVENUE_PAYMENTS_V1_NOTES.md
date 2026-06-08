# MMOS SumUp Umsatz & Zahlungen V1

## Ziel

Variante 1 wurde umgesetzt:

- SumUp verbinden
- Transaktionen abrufen
- Umsatz im Dashboard anzeigen
- Umsatzentwicklung darstellen
- Zahlung optional einem Kunden-/MMOS-Kontext zuordnen

MMOS wird dadurch **nicht** zum Kassensystem und ersetzt keine TSE-/KassenSichV-relevante Kasse.

## Neue/erweiterte Seiten

- `/admin/pos`

Die Seite wurde inhaltlich als **Umsatz & Zahlungen** aufgebaut.

## Neue Backend-Routen

- `GET /api/pos/providers/sumup/status/:customer_id`
- `POST /api/pos/providers/sumup/connect/:customer_id`
- `POST /api/pos/providers/sumup/sync/:customer_id`
- `GET /api/pos/summary/:customer_id`
- `GET /api/pos/transactions/:customer_id`
- `PATCH /api/pos/transactions/:transaction_id/link`

## Funktionen

### SumUp verbinden

Speichert kundenbezogene SumUp-Konfiguration in:

- `v33_functional_records`
- resource: `pos_provider_configs`
- local_id: `sumup_<customer_id>`

Alternativ kann global per ENV gearbeitet werden:

```env
SUMUP_ACCESS_TOKEN=...
SUMUP_MERCHANT_CODE=...
SUMUP_API_BASE=https://api.sumup.com
SUMUP_TRANSACTIONS_ENDPOINT=/v0.1/me/transactions/history
```

### Sync

Ruft SumUp-Transaktionen ab, normalisiert sie und schreibt sie in:

- `pos_transactions`

Idempotenz:

- unique pro `provider + provider_transaction_id`
- vorhandene Transaktionen werden aktualisiert

### Dashboard

Zeigt:

- Tagesumsatz
- Monatsumsatz
- Umsatz 90 Tage
- Durchschnittsbon
- Transaktionsliste
- Umsatzentwicklung als Mini-Chart
- Anbieter / Status / Betrag / Zuordnung

### Zuordnung

Eine Transaktion kann als manuell geprüft/verknüpft markiert werden. Technisch vorbereitet sind Felder für:

- QR-Kampagne
- Termin
- Loyalty-Kunde
- Lead
- Notiz

## Paket-/Tool-Logik

Neues verkaufbares/zubuchbares Modul:

- `sumup_revenue_connection`
- Label: SumUp Umsatzdaten
- ab Paket: Growth
- Einzelpreis: 39 €/Monat
- Setup: 149 €

Landingpage und Paketmatrix wurden ergänzt.

## Wichtige Abgrenzung

Nicht umgesetzt in V1:

- Zahlung aus MMOS starten
- SumUp Reader steuern
- Checkout erstellen
- eigene Kassenlogik
- Bar-Kassenbuch
- TSE-/DSFinV-K-Ersatz
- Belegausgabe durch MMOS

Das bleibt extern beim Kassensystem.
