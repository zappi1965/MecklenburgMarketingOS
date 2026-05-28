# MMOS V33 Lead-Ready Fullbuild

## Ziel
Morgen kann ein erster Lead über QR Code / Loyalty erzeugt werden.

## Neue echte Backend/Supabase-Verbindung
- `backend/src/routes/v33FunctionalRoutes.js`
- gemountet unter `/api/v33-functional`
- Frontend-Client: `frontend/src/lib/v33FunctionalClient.ts`

## Öffentliche Lead-Strecke
Die Seite `/l/demo-cafe-morgenlicht` nutzt jetzt:

`POST /api/v33-functional/public/loyalty/demo-cafe-morgenlicht/join-or-scan`

Beim Punkte sammeln passiert:
1. Loyalty-Programm wird per Slug gesucht.
2. Loyalty Member wird angelegt oder wiedererkannt.
3. Punkte werden gutgeschrieben.
4. QR-Kampagne wird hochgezählt.
5. Lead wird in `v33_public_leads` gespeichert.
6. Zusätzlich wird ein Pipeline Lead in `pipeline_leads` erzeugt, wenn die Tabelle passt.
7. Timeline Event wird versucht.

## Demo-Aktionen
Die Modul-Aktionen speichern weiterhin sofort im UI und senden zusätzlich an Supabase/Backend:
- Landingpages
- Loyalty Programme
- Rewards
- Reward Regeln
- Mitarbeitercodes
- Segmente
- Reviews
- Review Intelligence
- Antwortvorlagen
- Automationen
- Kampagnen
- AI Hinweise
- Billing/Forecast/Revenue Share/Recommendations/Timeline

## Deployment
1. Fullbuild übernehmen.
2. Supabase SQL ausführen:
   `supabase/migrations/0040_v33_lead_ready_functional_endpoints.sql`
3. Railway deployen.
4. Vercel deployen.
5. In Vercel setzen:
   `NEXT_PUBLIC_BACKEND_URL=https://DEIN-RAILWAY-BACKEND`
6. Test:
   `/l/demo-cafe-morgenlicht` öffnen, Name/E-Mail eingeben, Punkte sammeln, dann im Dashboard `QR/Loyalty Leads` laden.
