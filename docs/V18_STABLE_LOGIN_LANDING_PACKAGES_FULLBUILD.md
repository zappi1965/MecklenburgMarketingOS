
# MMOS v18 Stable Login Landing Packages Fullbuild

Basis:
- v18 Persistent Avatar + Demo Exclusion / Global Notifications Branch

Behoben:
- Login-Fehler `undefined is not an object (evaluating 'r[e]')`
- Login-Buttons heißen wieder `Admin Login` und `Kunden Login`
- Landingpage Überschrift: `MecklenburgMarketingOS`
- Landingpage Beschreibung für den Kundennutzen ergänzt
- Paketlisten ohne doppelte Aufzählungen:
  - Growth zeigt `Alles aus Starter-Paket`
  - Premium zeigt `Alles aus Growth-Paket`
- Kundenbereich Pakete spiegelt dieselbe Paketlogik
- Info-i Tooltips funktionieren jetzt per CSS Hover/Fokus
- `adminAvatars` Build-/Scope-Fehler vollständig entfernt
- Paketanfrage `CRM öffnen` Button hat echte Action
- Demo-Kunden werden aus Umsatzberechnungen ausgeschlossen

Weiterhin enthalten:
- DominiqueMM / JanneMM Adminprofile
- D/J Admin-Schieberegler
- globale Notification-Glocke
- Profilbild Upload über Backend/Supabase Storage
- Media Center / Storage Upload
- Rechnungen, Tickets, Booking, Pipeline, Automationen, Workflows, Aktivitäten
- Demo Kunden und Kundenumgebung

Deploy:
1. Supabase Patch ausführen:
   `supabase/migrations/0016_v18_stable_login_landing_packages_patch.sql`
2. Railway Backend aus dieser ZIP redeployen
3. Vercel Frontend aus dieser ZIP redeployen
4. ENV prüfen:
   Backend:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   Frontend:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_BASE`
