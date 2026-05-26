
# MMOS v18 Flow Login Package Fix

Umgesetzt:
- Landingpage zeigt Pakete.
- Buttons Login & Registrieren öffnen Modals.
- Admin Zugang: admin@mmos.local / Admin123!
- Demo Kundenzugänge: barber@demo.local, dach@demo.local, restaurant@demo.local, fitness@demo.local / Demo123!
- Admintool ist unabhängig vom Kunden im Header.
- CRM enthält Kundensuche.
- Kunden anlegen enthält Telefonnummer.
- CRM Detail erlaubt Kundeninfos zu bearbeiten.
- CRM Detail erlaubt Paket anzupassen/freizuschalten.
- Rechnungen erkennen Paketgebühr automatisch.
- Ticket öffnen + Adminantwort im Kundenbereich sichtbar.
- Booking hat Kalender und Uhrzeiten zurück.
- Paketanfragen erscheinen im Admin Dashboard.
- Pakete & Billing speichert Paket und Toolfreigaben.
- Demo Kunden öffnen Kundenumgebung in neuem Tab.

Deploy:
1. Supabase Patch `0010_v18_flow_login_package_fix_patch.sql` ausführen.
2. Vercel Frontend neu deployen.
3. Railway Backend redeployen.
