# MMOS Security Core Fullbuild

Dieses Paket setzt die naechste technische Stabilisierungsstufe um:

1. Tenant-Isolation-Test-Suite
2. Zentrale Permission Engine
3. Document Engine v2
4. Job Queue fuer PDFs/Audits/Reports
5. ENV-/Migration-Healthcheck im Adminbereich

## Einbau

```bash
unzip -o MMOS_SecurityCore_Fullbuild_Package.zip -d .
node scripts/apply-security-core-fullbuild.js
```

Danach Supabase-Migration ausfuehren:

```txt
supabase/migrations/0091_security_core_jobs_permissions.sql
```

Dann testen:

```bash
yarn --cwd backend test:security-core
yarn --cwd frontend typecheck
yarn --cwd frontend build
```

Optional Worker starten:

```bash
yarn --cwd backend worker:jobs
```

## Neue Routen

```txt
POST /api/document-engine-v2/documents/render-sync
POST /api/document-engine-v2/jobs/document
GET  /api/document-engine-v2/jobs/:id
GET  /api/document-engine-v2/documents/:id/signed-url
GET  /api/security-core/health
GET  /api/security-core/permissions/self-test
```

## Sicherheitsmodell

- Admin darf interne Generatoren, Jobs und Dokumenterzeugung nutzen.
- Kunde darf nur eigene freigegebene Dokumente lesen/downloaden.
- Kunde darf keine `customer_id` fremder Kunden verwenden.
- Unbekannte Ressourcen sind fuer Kunden standardmaessig verboten.

## ENV

```env
MMOS_DOCUMENT_BUCKET=generated-pdfs
MMOS_DOCUMENT_SIGNED_URL_TTL_SECONDS=3600
JOB_WORKER_INTERVAL_MS=5000
JOB_MAX_ATTEMPTS=3
```

## Hinweis

Die Document Engine v2 nutzt Gotenberg und Supabase Storage. `GOTENBERG_URL`, `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` muessen korrekt gesetzt sein.
