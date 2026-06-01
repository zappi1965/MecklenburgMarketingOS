# MMOS Global Live Write & Legacy Cleanup Fix

Umgesetzt über alle kritischen Tool-Gruppen:

## QR / Loyalty
- QR- und Loyalty-Fixes aus den vorherigen Paketen bleiben enthalten.
- Versteckte Wochenlimits bleiben deaktiviert, Wochenlimits müssen explizit aktiviert werden.
- Reward-Wochenlimits greifen nur noch, wenn `weekly_limit_enabled=true` gesetzt ist.
- Legacy-Reward-Defaults setzen keine versteckten max_per_customer/daily/weekly Limits mehr.

## V44/V45 Tools
- LocalStorage-Fallback im Livebetrieb deaktiviert.
- Lokal gespeicherte Daten werden im Livebetrieb nicht mehr mit echten Daten gemischt.
- LocalStorage bleibt nur in Demo-Modus oder bei `NEXT_PUBLIC_ENABLE_LOCAL_WRITE_FALLBACK=true`.

Betroffen:
- Listing Management
- Booking Utilization
- Unified Inbox
- Payments & Vouchers
- Referral Program
- Customer Value / V46-nahe Auswertungen

## v33_functional_records
- Gelöschte/archivierte/deaktivierte Records werden in der generischen Record-API ausgeblendet.
- Delete von v33_functional_records ist jetzt Soft Delete mit `status='deleted'`, `payload.deleted=true`.
- Staff-Code-Prüfung ignoriert gelöschte/deaktivierte Codes.
- Package Matrix liest nur aktive Records.

## /api/store
- List/Get blendet gelöschte/archivierte Datensätze zentral aus.
- `include_deleted=true` kann bei Bedarf explizit alte Datensätze anzeigen.

## Paket-/Toolfreigaben
- Paket-Sync überschreibt manuell gesperrte Tools nicht mehr, wenn `source='manual'` oder `metadata.manual_override=true` gesetzt ist.
- Manuelle Sperren bleiben dadurch erhalten.

Keine neue Supabase-Migration nötig.
