# MMOS v0.53 Core Stabilization

Dieser Fullbuild stabilisiert den Stand nach dem Railway/Supabase-WebSocket-Fix und den ersten UI-Testfehlern.

## Enthaltene Code-Fixes

- Zentrale API-Requests hängen vorhandene Supabase-Bearer-Token automatisch an, wenn kein Authorization-Header gesetzt wurde.
- Neuer sicherer Backend-Endpunkt `/api/system/status` für System Center / Security & Health ohne Auth-Crash.
- Railway whitelistet nur `/api/system/health` und `/api/system/status` öffentlich; Detailrouten bleiben geschützt.
- Security & Health Center nutzen zuerst den neuen konsolidierten Systemstatus und fallen erst danach auf lokale Diagnose zurück.
- Demo-/Fallback-Schreibvorgänge im Store speichern lokal weiter, wenn Backend/Supabase im Testmodus nicht erreichbar oder nicht authentifiziert ist.
- Kundennamen werden normalisiert (`name`, `company_name`, `business_name`, `display_name`, `email`, `id`) gegen `undefined is not an object` Fehler.
- Globale Kundensuche und Kundenselektoren sind gegen leere/undefinierte Datensätze abgesichert.
- Booking erkennt Terminüberschneidungen anhand normalisierter Datum-/Zeitbereiche, nicht nur exakt gleiche Start-/Endzeit.
- Booking Create/Edit/Delete zeigen Fehler und Erfolg klar an.
- Onboarding Erledigt/Offen und Setup-Vorbereitung sind gegen fehlenden Kunden und fehlende Live-Session abgesichert.
- SEO Heatmap bleibt aus der Sidebar entfernt und ist im SEO Dashboard enthalten.
- Security Center und Health Center bleiben als ein einziger Sidebar-Punkt `Security & Health Center` zusammengeführt.
- `backend/package-lock.json` bleibt entfernt, damit Railway nicht mit altem Lockfile `npm ci` gegen `ws` fehlschlägt.

## Wichtige Testreihenfolge

1. Railway Backend deployen und `/api/system/status` prüfen.
2. Railway Worker deployen und prüfen, dass kein Node-20-WebSocket-Crash erscheint.
3. Vercel deployen.
4. Demo-Admin öffnen und prüfen: Kundensuche, System Center, Landingpage speichern, Onboarding, Booking.
5. Danach Live-Admin mit echter Supabase-Session prüfen.

