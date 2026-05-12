
# MMOS v10 Core Fullbuild

Stabile Core-Version mit:

- Landingpage
- Admin Dashboard
- Kundenportal-Modus
- CRM
- Rechnungen
- Tickets
- SEO Dashboard
- Booking
- KPI & Charts
- Datei/PDF-Basis
- Einstellungen
- Supabase Schema
- Backend API
- Demo-Fallback ohne Supabase

## Deploy

### Supabase
SQL ausführen:

```txt
supabase/migrations/0001_core_schema.sql
```

### Backend
Root: `backend`

```bash
npm install
npm start
```

ENV:
```txt
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=4000
```

### Frontend
Root: `frontend`

```bash
npm install
npm run build
npm start
```

ENV:
```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE=
```

## Hinweis

Ohne Supabase läuft die App im Demo-Modus.
Mit Supabase nutzt sie echte Tabellen und CRUD.
