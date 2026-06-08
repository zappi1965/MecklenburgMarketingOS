
# MMOS v18 Persistent Avatar + Demo Exclusion Fullbuild

Basis:
- MMOS v18 Global Notifications Profile Hotfix

Geändert:
- Profilbild-Upload ist jetzt backendseitig vorbereitet und speichert über `/api/avatars/upload` in Supabase Storage Bucket `avatars`.
- Adminprofil bekommt `avatar_url`.
- Notification-Objekte unterstützen `actor_avatar`.
- Demo-Dateien mit `url: '# '` wurden durch echte lokale Demo-PDFs unter `/demo-files/...` ersetzt.
- Umsatzberechnung im Dashboard schließt Demo-Kunden aus.
- SQL ergänzt `is_demo` für Kunden/Rechnungen.
- SQL erzeugt View `revenue_invoices_real` für echte Umsätze ohne Demo-Daten.
- Rechnungsvorlagen haben weiterhin Upload + Platzhalter; Backend-Route `/api/invoice-templates/render` rendert Platzhaltertext.
- Word→PDF ist noch nicht voll konvertierend, da dafür serverseitig LibreOffice/Conversion Engine nötig ist.

Nicht vollständig möglich ohne zusätzliche Server-Abhängigkeiten:
- Echte DOCX/Keynote→PDF-Konvertierung. Dafür braucht Railway z. B. LibreOffice/headless oder einen externen Konvertierungsdienst.
- Demo-/Seed-Aktionen werden nur persistent, wenn Supabase und Railway Backend korrekt verbunden sind.

Deploy:
1. Supabase Patch ausführen:
   `supabase/migrations/0015_v18_persistent_avatar_demo_exclusion_patch.sql`
2. Railway Backend aus dieser ZIP redeployen.
3. Vercel Frontend aus dieser ZIP redeployen.
4. ENV:
   Backend:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   Frontend:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_BASE`
