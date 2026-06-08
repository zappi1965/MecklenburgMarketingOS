
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


## Erweiterung in dieser Version

Zusätzlich zum Core enthalten:
- Pipeline / Angebote
- Automationen
- Integrationen
- Paketanfragen
- Toolfreigaben
- Verträge
- Reports
- alle Hauptnavigationen mit echten Aktionen
- CRUD/Status-Aktionen für Hauptmodule
- erweiterte Supabase-Tabellen


## Production-Pass Backend + UI Ergänzungen

Soweit möglich integriert:

Backend:
- API-Service-Layer (`CrudService`, `ActivityService`, `NotificationService`, `WorkflowService`, `FileService`, `PdfService`)
- zentrale Error Middleware
- zentrale Validation Layer
- Request Schemas
- echte CRUD-Endpunkte für alle Core-Module
- Notification Queue
- Worker Queue Basis
- Activity Logging
- File Metadata System
- PDF Template Engine für Rechnungen und Reports
- Worker Script für Queue + überfällige Rechnungen

Frontend:
- Realtime Reload für Core Tabellen
- Validation Helper
- Toast Feedback
- Confirm Buttons
- Empty States
- Skeleton Loader
- Activity Timeline
- Workflow UI
- Permission Matrix UI
- File Versionierung UI
- mehr Backend-kompatible Aktionen

Weiterhin nicht vollständig Enterprise-final:
- echte Mailprovider-Flows
- echtes Redis/Multi-Node Queue-System
- vollständige E2E-Testausführung
- finale PDF Corporate Templates
- vollständig getestete CI/CD Pipeline
