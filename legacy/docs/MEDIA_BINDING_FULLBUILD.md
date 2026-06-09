# MMOS Media Binding Fullbuild

Ziel: Alle erzeugten Reports/PDFs sauber im Media Center und Kundenportal anzeigen.

## Neu

- `backend/src/services/documentMediaService.js`
  - speichert PDF-Buffer in Supabase Storage (`generated-pdfs` oder `MMOS_DOCUMENT_BUCKET`)
  - schreibt Metadaten nach `customer_files` und `output_documents`
  - erzeugt bei jedem Listen/Download neue Signed URLs
  - sammelt auch bestehende `monthly_reports`, `generated_offers`, `generated_contracts`, `google_business_audits`
- `backend/src/routes/documentMediaRoutes.js`
  - `POST /api/document-media/render-and-store-pdf` nur Admin
  - `POST /api/document-media/store-existing-pdf` nur Admin
  - `GET /api/document-media/customers/:customer_id/documents` Customer/Admin
  - `GET /api/document-media/customers/:customer_id/documents/:source/:id/download` Customer/Admin
- `frontend/src/lib/documentMediaClient.ts`
  - zentraler Client für Reports/PDFs
- `frontend/src/app/portal/reports/page.tsx`
  - Kundenportal zeigt Dokumente aus der Media Bridge statt einzelne Tabellen manuell zusammenzuklauben

## Einbau

Im Repo-Root:

```bash
unzip -o MMOS_MediaBinding_Fullbuild_Package.zip -d .
node scripts/apply-media-binding-fullbuild.js
yarn --cwd frontend typecheck
yarn --cwd frontend build
```

Backend neu deployen.

## ENV

```txt
GOTENBERG_URL=...
MMOS_DOCUMENT_BUCKET=generated-pdfs
MMOS_DOCUMENT_SIGNED_URL_TTL_SECONDS=3600
```

## Verwendung aus Engines

Statt nur PDF-Blob zurückzugeben:

```ts
await documentMediaClient.renderAndStorePdf({
  customer_id: customerId,
  title: 'Monatsreport Mai 2026',
  filename: 'monatsreport-mai-2026.pdf',
  document_type: 'monthly_report',
  html,
  source_table: 'monthly_reports',
  source_id: reportId,
  visibility: 'customer'
})
```

Damit erscheint das Dokument automatisch unter `/portal/reports`.
