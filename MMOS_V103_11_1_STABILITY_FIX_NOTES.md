# MMOS V103.11.1 Stability Fix

Basis: `MMOS_v10311_fullbuild_4tools.zip`

Umgesetzt:

1. Public Deal-/Mini-Website-Routen freigegeben
   - `/api/v33-functional/public/deal/:slug`
   - `/api/v33-functional/public/deal/:slug/track`
   - `/api/v33-functional/public/site/:slug`

2. QR-Scan-Token-Reihenfolge gehärtet
   - Punkte/Stempel werden erst nach erfolgreichem Token-Verbrauch gutgeschrieben.
   - Neue Mitglieder werden zunächst ohne Punkte angelegt und erst danach aktualisiert.
   - Dadurch kein Zustand mehr: Punkte gespeichert, aber Token-Verbrauch fehlgeschlagen.

3. Referral Public-Flow korrigiert
   - Wenn ein Freund über `/r/[code]` beitritt und noch keine pending Referral-Zeile existiert, wird sie anhand des Codes automatisch angelegt.
   - Danach wird im selben Join+Scan der Referral-Bonus gutgeschrieben.
   - Duplicate-Lookup liefert jetzt vollständige Referral-Zeilen.

4. URL-Validierung für Deal der Woche und Mini-Website
   - Bild-/Logo-URLs: nur HTTPS oder relative URLs.
   - CTA-URLs: nur HTTPS, mailto:, tel: oder relative URLs.
   - Unsichere Werte wie `javascript:` werden serverseitig verworfen.

5. Admin-Kundenauswahl für neue Tools
   - Deal der Woche
   - Mini-Website & Google-Booster
   - Empfehlungsprogramm
   - Branchen-Benchmark Report-Erzeugung

6. Benchmark-HTML escaped
   - Branch, Zeitraum, Metriklabels, Vergleichstexte und Einordnung werden HTML-escaped.

Checks:
- Backend JS Syntax: OK
- Quality Guard: bestanden
- Fullbuild Check: bestanden
- 4 relevante Backend-Testdateien: 24/24 bestanden

Hinweis:
- Vollständiger Frontend-Build konnte lokal nicht final simuliert werden, weil im Sandbox-Zip keine node_modules vorhanden sind.
- Der globale Typecheck scheitert dadurch an fehlenden React/Next/Playwright/@types Dependencies, nicht an den geänderten Dateien.
