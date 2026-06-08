# V42.24.3 Live/Demo Split

Ziel: Demo-Datensätze bleiben für interne Demo/Testansichten bestehen, werden im Live-System aber nicht angezeigt.

## Wichtigste Änderungen

- Die vorherige V42.24.2-Purge-Migration wurde entschärft und löscht keine Demo-Daten mehr.
- Neue nicht-destruktive Migration: `SQL_V42_24_3_LIVE_DEMO_SPLIT_NON_DESTRUCTIVE.sql`.
- Demo-Daten werden über `is_demo = true` markiert, nicht gelöscht.
- `demo_*` Tabellen bleiben erhalten und werden im Live-Modus ausgeblendet.
- Demo-Ansichten nutzen Demo-Kunden (`is_demo=true` / `demo_customers`) und mischen keine Live-Kunden in die Demo-Kundenauswahl.
- Frontend lädt Live-Tabellen nach Möglichkeit direkt mit `is_demo = false` und filtert zusätzlich clientseitig.
- In der Demo erzeugte Datensätze werden automatisch mit `is_demo = true` markiert, damit sie nicht ins Live-System rutschen.
- Der Demo-Reset-Endpunkt ist nicht-destruktiv und löscht keine Demo-Rechnungen, Demo-QR-Kampagnen oder Demo-Kunden mehr.
- Live erzeugte Datensätze werden bei unterstützten Tabellen mit `is_demo = false` gespeichert.

## Betriebslogik

### Live

- `NEXT_PUBLIC_ENABLE_DEMO_MODE` kann `false` sein.
- Live-Ansichten zeigen nur echte Kunden und echte kundengebundene Datensätze.
- `demo_*` Tabellen und `is_demo = true` werden nicht angezeigt.

### Interne Demo

- Demo bleibt über `NEXT_PUBLIC_ENABLE_DEMO_MODE=true` und Backend `ENABLE_DEMO_MODE=true` nutzbar.
- Demo-Kunden und Demo-Tools bleiben bestehen.
- Demo-Schreibvorgänge werden als Demo markiert.

## Achtung

Falls die alte V42.24.2-Purge-Migration bereits auf einer Datenbank ausgeführt wurde, kann dieses Update gelöschte Demo-Daten nicht automatisch wiederherstellen. Dann bitte Supabase-Backup wiederherstellen oder Demo-Seeds erneut ausführen.
