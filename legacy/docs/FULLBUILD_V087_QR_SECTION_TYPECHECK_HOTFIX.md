# MMOS V087 – QR Section Typecheck Hotfix

## Fix

V086 caused a Vercel TypeScript error in `frontend/src/app/page.tsx` because `section` was narrowed to `campaigns` before the `public_landing` branch was checked.

## Changes

- `public_landing` and `staff_codes` branches are now handled before the fallback `section !== 'campaigns'` branch.
- Removed unreachable comparison that caused Vercel build failure.
- Non-campaign legacy QR sections now route to the centralized QR Zielseite settings flow.

## Migration

No Supabase migration required.
