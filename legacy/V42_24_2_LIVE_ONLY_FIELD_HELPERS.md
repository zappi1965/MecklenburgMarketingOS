# MMOS V42.24.2 – Live Only + verständliche Felder

## Ziel
Dieser Build bereinigt das Live-System von Demo-/Fallback-Daten und verbessert die Verständlichkeit von Textfeldern systemweit.

## Änderungen Frontend
- Fest verdrahtete Seed-/Demo-Kunden, Beispiel-Rechnungen, Beispiel-Leads und lokale Ersatzdatensätze aus dem Live-Datenfluss entfernt.
- Rechnungs-PDFs öffnen nur noch echte `pdf_url`-/`pdf_base64`-Daten; es wird keine Demo-PDF mehr nachgeladen.
- Store-Operationen erzeugen bei Supabase-Fehlern keine lokalen Ersatzdatensätze mehr.
- Öffentliche Demo-/Testansichten sind standardmäßig deaktiviert und nur noch mit `NEXT_PUBLIC_ENABLE_DEMO_MODE=true` erreichbar.
- V33/V42 Tool-Konfigurationen enthalten keine vordefinierten Beispiel-Datensätze mehr.
- Globale Feldhilfe ergänzt: Platzhalter werden verständlicher, `title`-Tooltips und `aria-labels` werden für Eingabefelder automatisch gesetzt.
- Login-, Kundenportal-, Slug- und Dashboard-Felder wurden zusätzlich mit klareren Hinweisen versehen.

## Änderungen Backend
- Demo-/Test-Routen werden standardmäßig nicht mehr gemountet. Aktivierung nur über `ENABLE_DEMO_MODE=true`.
- Google-Business-Lead-Suche liefert ohne `GOOGLE_PLACES_API_KEY` keine Ersatz-Leads mehr, sondern einen klaren Live-Daten-Fehler.
- Business-Tools erzeugen keine Demo-Audits oder Demo-PDFs als Fallback mehr.
- Reset-Endpunkt wurde von `reset-demo-data` auf `reset-test-data` umgestellt.

## Datenbank
- Neue Supabase-Migration enthalten:
  - `supabase/migrations/0040_v42_24_2_live_only_purge_demo_fallback.sql`
  - Root-Kopie: `SQL_V42_24_2_LIVE_ONLY_PURGE_DEMO_FALLBACK.sql`
- Hinweis V42.24.3: Die ursprüngliche Purge-Logik wurde entschärft. Demo-/Testkunden werden nicht mehr entfernt, sondern über `is_demo` markiert und im Live-Modus ausgeblendet. Öffentliche Demo-Buttons bleiben im Live-Kontext deaktiviert.

## Environment
- `frontend/.env.example`: `NEXT_PUBLIC_ENABLE_DEMO_MODE=false`
- `backend/.env.example`: `ENABLE_DEMO_MODE=false`, Google-Places-Live-Konfiguration ergänzt.

## Validierung
- Backend-Dateien mit `node --check` geprüft.
- Frontend-Hauptdatei auf Klammerstruktur geprüft.
- Vollständiger Next.js-Build wurde in dieser Umgebung nicht ausgeführt, da im ZIP keine installierten `node_modules` vorhanden sind.

## Wichtiger Deployment-Hinweis
Für neue Deployments bitte die nicht-destruktive V42.24.3-Migration ausführen. Demo-Flags in Produktion deaktiviert lassen; für interne Demo/Testumgebung separat aktivieren.
