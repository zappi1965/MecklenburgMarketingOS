# MMOS Test-Fix Paket

Dieses Fullbuild-Paket behebt die gemeldeten Testpunkte aus dem Admin-/Demo-Check:

- Cookie-Consent-Version erhöht, damit der Cookie-Banner erneut sauber erscheint.
- Haupt-Landingpage-Editor speichert mit sichtbarer Rückmeldung und lokalem Fallback; Änderungen werden im Sandbox-/Fallback-Cache wieder geladen.
- Security Center und Health Center in der Navigation zusammengeführt zu „Security & Health Center“.
- Health-/Security-Prüfung zeigt bei fehlender Live-Admin-Session keine rohe „Nicht authentifiziert“-Fehlerfläche mehr, sondern eine lokale Fallback-Prüfung.
- System-/API-Ready-Requests senden, wenn vorhanden, den Supabase-Bearer-Token mit.
- Onboarding-Schritte lassen sich zuverlässig als erledigt/offen markieren und geben Rückmeldung.
- Booking erkennt gleiche Datum-/Zeitfenster als vorhandenen Termin, öffnet bestehende Termine und gibt Rückmeldung beim Erstellen/Bearbeiten/Löschen.
- Kundensuche ist gegen fehlende name/branch/email-Werte abgesichert und wirft nicht mehr `undefined is not an object (evaluating 's.name')`.
- SEO Heatmap bleibt technisch erreichbar, ist aber nicht mehr als eigener Sidebar-Punkt sichtbar.
- `backend/package-lock.json` ist weiterhin entfernt, damit Railway nicht mehr mit veraltetem `npm ci` abbricht.

Hinweis: Live-Lead-Suche benötigt weiterhin `GOOGLE_PLACES_API_KEY` in Railway. Ohne Key wird keine echte Google-Places-Live-Suche möglich sein.
