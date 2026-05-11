# Mecklenburg Marketing OS - PDF Engine

Diese Version enthält jetzt eine echte serverseitige PDF-Engine.

## Was funktioniert

- Rechnungs-PDF generieren
- Mahnungs-PDF generieren
- Report-PDF generieren
- PDF direkt im Browser öffnen
- PDF optional in Supabase Storage Bucket `pdfs` speichern
- PDF Backend-Routes für Railway
- Frontend Helper für Vercel

## Neue Backend Routes

```txt
GET  /api/pdf/invoice/:id
GET  /api/pdf/reminder/:invoiceNumber?level=1.%20Mahnung&fee=15
POST /api/pdf/report
```

## Supabase SQL ausführen

Nach deiner Hauptmigration zusätzlich ausführen:

```txt
supabase/migrations/0002_pdf_engine_storage.sql
```

Dadurch wird der Storage Bucket `pdfs` und die Tabellen/Policies für Reports und Mahnungen ergänzt.

## Railway ENV

Im Railway Backend müssen vorhanden sein:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_URL=
```

## Vercel ENV

Im Frontend:

```env
NEXT_PUBLIC_API_BASE=https://dein-backend.up.railway.app
```

## Lokaler Test

Backend:

```bash
cd backend
npm install
npm start
```

Frontend:

```bash
cd frontend
yarn install
yarn dev
```

## PDF testen

Wenn du eine Rechnung in Supabase hast:

```txt
https://dein-backend.up.railway.app/api/pdf/invoice/RECHNUNGS_UUID
```

Mahnungen:

```txt
https://dein-backend.up.railway.app/api/pdf/reminder/RE-2024-101?level=1.%20Mahnung&fee=15
```

## Hinweis

Die PDF Engine nutzt `pdfkit`. Sie erzeugt echte PDFs serverseitig und ist damit besser geeignet als Frontend-Dummy-Exports.