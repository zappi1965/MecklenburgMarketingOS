
# MMOS v18 Admin Profiles + Package Info Fullbuild

Basis:
- MMOS v18 Storage CRM Flow Fix Build

Umgesetzt:
- Adminprofil `Admin` in `DominiqueMM` umbenannt.
- Zweites Adminprofil `JanneMM` mit gleichen Rechten angelegt.
- Adminprofil-Auswahl im Adminbereich ergänzt.
- Uploads, Notizen, Ticketantworten und Änderungen verwenden den aktiven Adminnamen.
- Bestehende `Admin`/`admin`-Einträge werden per SQL auf `DominiqueMM` normalisiert.
- Landingpage zeigt Pakete mit exakt den Paketfeatures.
- Kundenbereich Pakete spiegelt dieselben Paketfeatures.
- Neben jedem Feature gibt es ein Info-„i“ mit Tooltip-Beschreibung.
- Info-„i“-System global vereinheitlicht.

Deploy:
1. Supabase Patch ausführen:
   `supabase/migrations/0013_v18_admin_profiles_packages_info_patch.sql`
2. Railway Backend aus dieser ZIP redeployen.
3. Vercel Frontend aus dieser ZIP redeployen.
4. ENV unverändert:
   Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   Frontend: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_BASE`
