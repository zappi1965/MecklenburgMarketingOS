
# MMOS v17 Runtime Schema + Demo Customers

Umgesetzt:
- echte UUIDs statt c1/c2
- customer_name aus invoice Inserts entfernt
- Kundenadresse ergänzt
- Stack-depth RLS Helper entschärft
- Kundenspezifische invoice_categories
- Demo Kunden getrennt von echten Kunden
- Demo Kunden zählen nicht in Admin-Umsatz/KPI
- Admin Menüpunkt Demo Kunden
- Demo CRM Detail mit Kundeninfos, Paketen, Rechnungen, Verträgen, Terminen, Notizen und Dateien
- Dokument Upload als Metadaten-Flow an Rechnungen/Verträge
- Kundenbereich verschlankt und mit Dummy-Daten
- Ticket UI entzerrt
- Booking Kunde ohne Kundensuchfeld im Kundenbereich
- react-is ergänzt

Deploy:
1. Supabase Patch 0009_v17_runtime_schema_demo_customers_patch.sql ausführen
2. Backend redeploy
3. Frontend redeploy
