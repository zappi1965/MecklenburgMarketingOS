# MMOS v16 UX Flow Fix Pass

Umgesetzt:
- Kunden-Dropdowns durch Kundensuche ersetzt.
- CRM-Kundendetail als zentrale Ansicht für Rechnungen, Tickets, Integrationen, Verträge, Rechte und KPI-Erklärungen.
- Rechnungen erkennen aktiv gebuchtes Paket und setzen Standardpreis.
- Rechnungen sind im CRM Detail sichtbar und Status kann dort geändert werden.
- Admin-Tickets zeigen bestehende Tickets, Kunden können Tickets erstellen.
- Ticket-Priorität Mittel ergänzt.
- Ticket-Erstellung erzeugt Notification mit Kundenname, Titel und Vorschau.
- SEO Admin kann Snapshots je Kunde speichern; Kunden sehen SEO Dashboard mit Graphen/KPIs.
- Booking kann Termine mit Kundenbezug anlegen; Tagesübersicht per Klick.
- Pipeline kann Paket auswählen und Preis automatisch übernehmen.
- Automationen haben deutsche Labels.
- Integrationen im Kundenbereich mit SEO-Tools + API-Key; im Admin CRM Detail sichtbar.
- Pakete markieren aktives Paket, Kunden können andere Pakete anfragen.
- Admin-Toolfreigabe setzt customer_id korrekt.
- Activity Log Fehler durch falsches .catch Pattern entfernt.
- KPI Info-i ergänzt.
- Dateien/PDF Upload UI ergänzt; nutzt Backend Upload, sonst Metadaten-Fallback.
- Kundenbereich verschlankt.
- react-is Dependency ergänzt.

Nicht vollständig live prüfbar:
- echter Upload gegen Supabase Storage braucht API_BASE + Railway Backend + Bucket.
- echte Kundendaten-Isolation hängt zusätzlich an korrekt ausgeführter RLS Migration.
- Browser-QA/Pixel-Polish auf Live-Deploy muss manuell geprüft werden.
