# MMOS V103.8.1 Build Fix

Fixes the Vercel/Turbopack build failure in `frontend/src/components/MmosScrollUnlock.tsx`.

## Changed

- Corrected the Next.js client directive from:
  - `use client'`
- to:
  - `'use client'`

No MFA, CORS, Login, Scroll, Loyalty, QR or database logic was changed in this buildfix.

## Why

Vercel failed with:

```text
./frontend/src/components/MmosScrollUnlock.tsx:1:5
Expected ';', '}' or <eof>
> 1 | use client'
```

This version only corrects that syntax issue.
