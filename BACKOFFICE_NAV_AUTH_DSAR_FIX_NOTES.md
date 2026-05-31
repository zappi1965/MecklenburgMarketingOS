# Backoffice Navigation / Auth / DSAR Fix

Umgesetzt:

- Backoffice-Button im Frontoffice öffnet jetzt die echte Backoffice-Umgebung `/admin` statt die interne Tool-Zentrale.
- `Zum Frontoffice` in der Backoffice-Sidebar öffnet `/?app=1&view=dashboard` und setzt lokale Admin-Session-Hints, statt den Nutzer aus dem Flow zu werfen.
- Demo-Kundenumgebung ist im Backoffice sichtbar.
- Demo-Kundenumgebung kann auch ohne konkrete customer-ID geöffnet werden.
- RoleGate/ToolAccessGate nutzen Local-Profile-Fallback, damit beim Toolwechsel nicht ständig „Zugriff wird geprüft“ bzw. „Nicht authentifiziert“ erscheint.
- E-Rechnung zeigt Admins ohne customer_id nicht mehr „Dein Konto ist mit keinem Customer verknuepft“, sondern eine globale Admin-Rechnungsansicht.
- DSAR-Kompatibilität für Tabellen mit `request_type`/fehlendem `type`.
- Migration 0095 ergänzt `dsar_requests.type` und `dsar_requests.request_type` falls nötig.
