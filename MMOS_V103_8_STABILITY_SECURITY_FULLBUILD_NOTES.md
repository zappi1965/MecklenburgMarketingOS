# MMOS V103.8 Fullbuild Notes

Basis: V103.7 Loyalty Stamp Card Fullbuild.

Enthaltene Verbesserungen:
1. Stempelkarte nutzt `total_scans` bzw. `points / points_per_stamp` statt rohe Punkte.
2. Runtime-/Version-Endpunkte für Frontend und Backend.
3. Same-origin Proxy als Standard; private direkte Backend-Fallbacks sind deaktiviert.
4. localStorage-Rollenfallback nur noch im Demo-Modus.
5. Review-Gating auf der Slugseite neutralisiert.
6. Globaler JS-Scroll-Rescue standardmäßig deaktiviert; Public-Slug-Scroll-Regeln ergänzt.
7. Tenant-Isolation-Smoke-Test als Script.
8. Vercel-Public-Review-Route nutzt keine Service-Role mehr.
9. Public Shield persistent mit Supabase-Tabelle + Memory-Fallback.

Nach Deploy:
1. SQL-Migration ausführen: `supabase/migrations/0103_8_stability_security_cleanup.sql`
2. Railway ENV setzen:
   - `MMOS_VERSION=v103.8-stability-security-cleanup`
   - `PUBLIC_SHIELD_PERSISTENT=true`
   - `PUBLIC_SHIELD_SALT=<langer zufälliger Salt>`
3. Vercel ENV setzen:
   - `NEXT_PUBLIC_MMOS_VERSION=v103.8-stability-security-cleanup`
   - `NEXT_PUBLIC_ENABLE_PRIVATE_BACKEND_FALLBACK=false` oder leer lassen
   - `NEXT_PUBLIC_ENABLE_PUBLIC_BACKEND_FALLBACK=false` oder leer lassen
   - `NEXT_PUBLIC_SCROLL_RESCUE=false` oder leer lassen
4. Testen:
   - `/api/runtime` auf Frontend
   - `/api/version` und `/api/system/runtime` auf Backend
   - `/l/[slug]` in Chrome/Safari/Firefox mobil + desktop
   - Login + 2FA
   - Review-Flow mit 1, 3 und 5 Sternen
   - Stempelkarte mit `points_per_stamp`
