# V42.19 Stability & Data Integrity

## Schwerpunkt
Diese Version stabilisiert die mit V42.17/V42.18 eingeführten Business- und Akquise-Tools.

## Enthaltene Fixes
- zentrale Statuswerte mit Dropdowns für Leads, Kampagnen, Angebote, Verträge, Rechnungen, Mahnfälle, Audits und Mini-Audits
- Status-Normalisierung gegen Schreibfehler
- Pflichtfeld-Validierung für Akquise-Kampagnen, Angebote und Verträge
- Live/Lokal-Badge in sensiblen Tools
- Soft-Archivierung statt hartem Löschen für Business-Objekte
- Aktivitätslog für kritische Create/Update/Delete-Aktionen
- verwaiste Lead-Verknüpfungen in Akquise-Kampagnen bereinigen
- einheitliche TXT-Export-Kopfzeile mit Mecklenburg Marketing OS
- Health Center um Migrationen, SQL-Dateien, Live/Lokal-Zählung und Aktivitätslog erweitert
- Google Places Rate-Limit pro Stunde
- Google Places Cache mit TTL
- Google Places Timeout und verständliche Fehlercodes
- Backend-Endpunkt `/api/business-tools/data-integrity-check`

## Neue SQL-Datei
`SQL_V42_19_STABILITY_DATA_INTEGRITY.sql`

Legt an/ergänzt:
- `activity_logs`
- `api_usage_cache`
- `data_integrity_checks`
- `archived_at`-Spalten für Business-Objekte
- `updated_at` und `next_step` für `acquisition_campaigns`

## Optionale Railway ENV
```env
GOOGLE_PLACES_CACHE_TTL_MS=21600000
GOOGLE_PLACES_MAX_SEARCHES_PER_HOUR=60
```

Ohne diese ENV werden Defaults verwendet.
