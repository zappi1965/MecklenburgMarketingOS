
# MMOS v18 Demo Sandbox Isolation Fullbuild

## Ziel
Die Demo-Ansicht ist vollständig vom Live-System getrennt.

## Was geändert wurde
- Demo Admin und Demo Kunde schreiben nicht mehr in Supabase.
- Alle Demo-Änderungen laufen lokal im Browser über LocalStorage.
- RLS/Security Policies können die Demo nicht mehr blockieren.
- Live Login bleibt weiterhin über Supabase Auth + RLS geschützt.
- Demo kann über „Demo zurücksetzen“ zurückgesetzt werden.
- Demo-Daten zählen nicht in echte Umsätze.

## Betroffene Demo-Aktionen
- Booking Termine erstellen/bearbeiten
- CRM Notizen
- Pakete freischalten
- Toolfreigaben
- Kundenkategorien
- Rechnungen aus Kategorien
- Tickets
- Integrationen
- Workflows
- Notifications
- Media/Datei-Metadaten
- SEO/KPI Demo-Daten

## Deploy
1. Vercel Frontend neu deployen.
2. Optional Supabase Patch ausführen:
   `0024_v18_demo_sandbox_isolation.sql`

Backend, Worker und Gotenberg müssen für diesen Demo-Isolation-Fix nicht neu deployt werden.

## Wichtig
Live-Kunden arbeiten weiterhin mit Supabase. Demo ist bewusst nur eine isolierte Sandbox für Tests und Präsentationen.
