# V088 QR public points schema + slug hotfix

Fixes the live Railway errors:

- `duplicate key value violates unique constraint "loyalty_programs_slug_key"` when creating QR campaigns.
- `Could not find the 'require_rescan_for_points' column of 'v37_loyalty_settings' in the schema cache` when collecting points on `/l/[slug]`.

Changes:

- `uniqueSlug()` now checks `qr_campaigns`, `loyalty_programs`, and `public_landing_pages`.
- `v37_loyalty_settings` insert/update is schema-safe and strips missing optional columns instead of blocking the public points flow.
- Migration `0114` adds the missing v37 settings columns and dedupes old loyalty program slugs.
