# MMOS Unified Guards + Public Shield Fullsystem Fix

## Umgesetzt

### Public Endpoint Shield
- Honeypot-Felder für öffentliche Slug-Aktionen.
- IP/E-Mail/Slug/Action Rate-Limit.
- Temporäre Sperren bei zu vielen Aktionen.
- Security-Event Logging bei blockierten/auffälligen Aktionen.

Betroffen:
- `/public/loyalty/:slug/join-or-scan`
- `/public/loyalty/:slug/review`
- `/public/loyalty/:slug/rewards/:reward_id/redeem`

### Unified Limit Engine
- Zentraler Service zur Normalisierung von QR-, Punkte- und Reward-Limits.
- Wochenlimits greifen nur, wenn aktiv konfiguriert.
- Reward-Wochenlimits greifen nur mit `weekly_limit_enabled=true`.

### Neues Loyalty-Setting: erneutes QR-Scannen erforderlich
- Neue Einstellung im Frontoffice/Backoffice: `require_rescan_for_points`.
- UI-Feld: „Neues Punkte sammeln erfordert erneutes QR-Scannen“.
- Wenn aktiv, wird nach erfolgreicher Punktevergabe die aktuelle Scan-Session verbraucht.
- Weitere Punkte benötigen eine neue Scan-Session durch erneutes Öffnen/Scannen des QR-Codes.
- Transaktionen speichern `metadata.scan_session_id` und `metadata.require_rescan_for_points`.

### Critical Action Audit Guard
- Kritische `/api/store`-Änderungen werden über `activity_logs` protokolliert.
- Betroffen: QR, Loyalty, Rewards, Staff Codes, Tool Access, Invoices, Documents, DSAR, User Profiles.

### Global Soft Delete Standard
- `/api/store` Delete versucht zuerst Soft Delete.
- List/Get blenden gelöschte/archivierte Datensätze aus.
- Hard Delete nur als Fallback, wenn Soft-Delete-Spalten fehlen.

### Tool Access Policy Engine
- Bewertet Toolzugriff nach Priorität:
  1. Security Block
  2. Manual Override
  3. Trial/Demo
  4. Package Access
  5. Add-on
  6. Default Deny

### Document Integrity Guard
- Prüft Rechnungen, PDF/XML-Dokumente und `customer_files`-Verknüpfungen.

### Schema Migration Doctor
- Prüft zentrale Tabellen und Spalten.
- Liefert konkrete Hinweise, falls Migrationen/Spalten fehlen.

### Admin Customer Context Guard
- Backoffice zeigt sichtbaren Kundenkontext-Chip.
- Warnhinweis, wenn kein Kundenkontext gewählt ist.

### Global Guards Admin-Seite
Neue Route:
- `/admin/production/global-guards`

Neue Backend-Route:
- `/api/production/global-guards/schema-doctor`
- `/api/production/global-guards/document-integrity`
- `/api/production/global-guards/public-shield-status`
- `/api/production/global-guards/tool-access-policy/:customer_id`
- `/api/production/global-guards/limit-policy/:customer_id`

## Keine Supabase-Migration nötig
Alle neuen Funktionen arbeiten mit vorhandenen Tabellen und metadata-Feldern.
