# Backoffice Customer Context Bugfix

Behoben:

- Backoffice-Kundensuche im AdminShell Topbar ergänzt.
- POS/Kassen-Anbindung nutzt für Admins den gewählten Backoffice-Kunden statt `profile.customer_id`.
- Umsatz-Prognose nutzt für Admins den gewählten Backoffice-Kunden.
- Review Intelligence nutzt für Admins den gewählten Backoffice-Kunden.
- Production Readiness Client refresh/retry bei abgelaufenem Supabase Token.
- Tool-Freigaben Pro bekommt eine stabile native Backoffice-UI statt V47-Dark-Standalone-Modul.
- `/admin/tools` Wrapper auf Backoffice-Layout angepasst.
- Dubletten-Scan toleriert fehlende Spalte `customers.postal_code` und fällt auf `zip`/`plz`/leer zurück.
- AI Review Antwort zeigt Quelle/Kunde und rendert Vorschläge ohne Textarea-UI-Bug.

Keine neue Supabase-Migration nötig.
