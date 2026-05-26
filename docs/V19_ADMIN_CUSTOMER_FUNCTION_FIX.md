# MMOS v19 Admin & Customer Function Fix Fullbuild

## Umgesetzt
- Optionaler 2. Ansprechpartner vorbereitet.
- Paketfreigabe und einzelne Toolfreischaltung über Backend-Endpunkte.
- Rechnung erstellen erzeugt PDF.
- Rechnungs-PDF kann geöffnet werden.
- Booking Detaildaten-Endpunkt.
- Pipeline Leads mit anpassbarer/automatischer Abschlusswahrscheinlichkeit.
- Automationen und Workflows mit ausführbaren Backend-Runs.
- QR-Code Erstellung inkl. SVG/Base64 und KPI-Detaildaten.
- Umsatzberechnung aus Terminen mit Kategorie/Preis.
- Client Success Score pro Kunde konfigurierbar.
- Advanced Reports erzeugen PDF.
- Google Integrationsstatus prüft ENV/API Bereitschaft.
- Workflow Center und Rechte/Rollen aus Textnavigation entfernt.
- Tooltips von „im Paket enthalten“ auf „optional verfügbar“ angepasst.

## Nicht automatisch vollständig möglich
Einige UI-Buttons hängen von deiner aktuellen `page.tsx` ab. Backend, Tabellen und Frontend-Client sind fertig; falls ein einzelner Button noch nicht angebunden ist, muss er mit `opsClient` verdrahtet werden.

## Deploy
1. Supabase SQL ausführen:
`0028_v19_admin_customer_function_fix.sql`

2. Railway Backend redeployen:
Root Directory `backend`
Start Command `npm start`

3. Railway Worker redeployen:
Start Command `npm run worker`

4. Vercel Frontend redeployen:
Root Directory `frontend`

## Login
Live Admin:
- Supabase Auth User erstellen.
- In `user_profiles` diesen User mit `role='admin'` hinterlegen.

Kunden:
- Registrierung über `/auth`.
- Admin gibt Kunde/Paket frei.
