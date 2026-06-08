MMOS v0.59

- Paketkarten auf der öffentlichen Landingpage heißen jetzt „Paket anfragen“.
- „Paket anfragen“ und „Individuelles Setup anfragen“ öffnen ein Kontaktformular.
- Formular sendet an /api/public/package-inquiry.
- Backend speichert die Anfrage in package_requests, erzeugt eine Notification und sendet eine Mail an zapf@mecklenburgmarketing.de.
- Admin-Dashboard zeigt Website-Paketanfragen mit Kontaktinformationen.
- UI-Kontrast-Bug im Paketbereich, in Ansprechpartner-/Inline-Formularen und in Bearbeiten-Karten wurde per CSS-Override behoben.
- Neue Migration: supabase/migrations/0080_v059_public_package_inquiries.sql
