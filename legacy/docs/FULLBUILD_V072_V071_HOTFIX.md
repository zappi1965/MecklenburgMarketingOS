# MMOS V072 – V071 Hotfix

Behebt zwei Deploy-Blocker aus V071:

- Vercel TypeScript Fehler durch doppelte Objekt-Keys in `frontend/src/app/page.tsx`
- Supabase Migration 0101 Fehler, wenn `landing_page_settings.settings` in bestehenden Projekten noch nicht existiert

Die V071-Funktionen bleiben unverändert:

- vereinfachtes Kundenportal
- mobile Optimierungen
- QR-KPIs im Kundenportal
- Backoffice als Sammelbereich
- vereinfachte Paketlogik
