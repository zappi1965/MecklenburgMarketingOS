# V45 Stability + Demo Data Fullbuild

## Ziel

V45 stabilisiert die V44-Funktionsmodule und stellt sicher, dass die neuen Tools in der Demo-Umgebung mit Demo-Daten gefuellt sind.

## Neu in V45

- Demo-Datenquelle `frontend/src/lib/v45DemoData.ts`
- Demo-/Live-Filter im Datenclient
- lokales Demo-Seeding, falls Supabase fehlt oder Tabellen leer sind
- Admin-Seite `/admin/demo-data`
- Demo-Zahlungslink `/pay/pay_demo_kuestenblick_001`
- Demo-Empfehlungslink `/r/DEMO-HANSE`
- Supabase-Migration `0045_v45_stability_demo_data.sql`

## Demo-Daten fuer neue Tools

### Listings / Branchenbuch
- Google Business Demo-Eintrag
- Apple Maps Demo-Check
- Bing Places Fehlerbeispiel

### Termin- & Auslastung
- freie Slots
- Warteliste
- Rebooking Reminder

### Nachrichten-Zentrale
- Demo-Nachrichten
- Tickets, Reviews und Leads werden als Kontext zusammengefuehrt

### Zahlungen & Gutscheine
- Demo-Zahlungslink
- Gutscheinprodukte

### Empfehlungsprogramm
- Demo-Empfehlungskampagne
- Demo-Empfehlungsereignis

## Demo-/Live-Trennung

- Demo-Datensaetze erhalten `is_demo=true`
- In der Demo-Umgebung werden Demo-Daten geladen
- In der Live-Umgebung werden Demo-Daten ausgefiltert
- Neue Datensaetze werden automatisch mit `is_demo` passend zur aktuellen Umgebung gespeichert

## Bestehende Rechtstexte

Impressum, Datenschutz, Cookies, AGB, Widerruf und Meine Datenrechte werden nicht geaendert.
