
# MMOS v18 Storage Upload E2E Extension

Built on:
- `MMOS_V18_FLOW_LOGIN_PACKAGE_FIX_FULLBUILD`

Deliberately not included:
- v19 Google Business / Review Report Media extensions
- v20 Workflow QoL extensions

Included:
- Supabase Storage setup
- Buckets:
  - `media`
  - `invoices`
  - `contracts`
  - `reports`
  - `documents`
- Upload service in Railway backend
- Routes:
  - `POST /api/storage/upload`
  - `GET /api/storage/customer/:customer_id`
  - `GET /api/storage/versions/:file_id`
  - `POST /api/storage/signed-url`
- Drag & Drop upload component
- PDF preview
- image preview
- invoice/contract folder structure
- signed download URLs
- file versioning
- customer file metadata
- file version metadata

Storage path pattern:
- `customer_id/rechnungen/YYYY-MM-DD/...`
- `customer_id/vertraege/YYYY-MM-DD/...`
- `customer_id/media/YYYY-MM-DD/...`
- `customer_id/reports/YYYY-MM-DD/...`
- `customer_id/dokumente/YYYY-MM-DD/...`

Deploy:
1. Run Supabase SQL patch:
   `supabase/migrations/0011_v18_storage_upload_e2e_patch.sql`

2. Redeploy Railway backend from this ZIP.

3. Redeploy Vercel frontend from this ZIP.

4. Set ENV:

Backend / Railway:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT=4000`

Frontend / Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_BASE=https://YOUR-RAILWAY-BACKEND`

Test:
1. Open backend health endpoint.
2. Open customer Media Center / Files.
3. Drag & drop a PDF.
4. Confirm:
   - file appears in Supabase Storage bucket
   - metadata appears in `customer_files`
   - version appears in `file_versions`
   - signed URL opens the file

Security:
- Service role key only belongs in Railway backend.
- Never expose service role key in Vercel/frontend.
