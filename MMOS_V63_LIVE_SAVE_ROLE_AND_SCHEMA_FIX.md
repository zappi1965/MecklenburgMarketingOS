# MMOS v0.63 – Live Save Role & Schema Fix

## Problem
Im Live-System erschien beim Bearbeiten:

> Live-Aktualisierung fehlgeschlagen – lokale Änderung wurde nicht gespeichert.

Der lokale Fallback wurde in v0.62 bewusst abgeschaltet, dadurch wurden echte Live-Fehler sichtbar.

## Fix
- Backend Auth-Middleware erkennt Admins jetzt wie `/api/auth/me` auch per E-Mail-Fallback.
- Dadurch werden Admins nicht mehr fälschlich als `customer` behandelt, wenn `user_profiles.id` nicht exakt der Supabase Auth User ID entspricht.
- `/api/store` kann Admin-Tabellen wie `landing_page_settings`, `public_landing_pages`, `customers`, `customer_tool_access` usw. wieder live speichern.
- Store-Service macht Insert/Update robuster, wenn einzelne Tabellen kein `created_at` oder `updated_at` Feld haben.
- Frontend zeigt bei Live-Speicherfehlern nun die echte Kurzursache an, statt nur die generische Meldung.

## Deployment
1. Railway Backend deployen.
2. Vercel Frontend deployen.
3. In Vercel sicherstellen:
   - `BACKEND_URL=https://<dein-railway-backend>.up.railway.app`
   - `NEXT_PUBLIC_ENABLE_LOCAL_WRITE_FALLBACK=false` oder Variable nicht setzen.

## Keine Supabase Migration nötig
Dieser Fix ändert Logik, nicht das Datenbankschema.
