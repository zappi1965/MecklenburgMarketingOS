
# MMOS v18 Global Notifications + Profile Fullbuild

Umgesetzt:
- Globale Notification-Glocke oben rechts, seitenübergreifend sichtbar.
- Adminbereich sieht Kundenänderungen im Aufbau: `KundeXY hat XY`.
- Kundenbereich sieht Adminänderungen im Aufbau: `DominiqueMM/JanneMM hat XY`.
- Adminprofil-Wechsel als Schieberegler D/J direkt neben der Glocke.
- Der alte Adminprofil-Select in der Sidebar wurde entfernt.
- Dashboard zeigt: `Herzlich Willkommen DominiqueMM/JanneMM`.
- Klickbares Profilbild oben rechts.
- Profilbild-Upload als lokale Preview.
- Profilbild wird in neuen Notifications angezeigt.
- SQL-Patch ergänzt Notification-Felder, Avatar-Bucket und Adminprofile.

Deploy:
1. Supabase Patch ausführen:
   `supabase/migrations/0014_v18_global_notifications_profile_patch.sql`
2. Railway Backend aus dieser ZIP redeployen.
3. Vercel Frontend aus dieser ZIP redeployen.
4. ENV unverändert:
   Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   Frontend: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_BASE`

Hinweis:
- Der Profilbild-Upload ist im Frontend als Preview umgesetzt.
- Für dauerhaft gespeicherte Profilbilder liegt der Supabase Bucket `avatars` bereit; die finale persistente Avatar-Speicherung kann später direkt an `admin_profiles.avatar_url` angebunden werden.
