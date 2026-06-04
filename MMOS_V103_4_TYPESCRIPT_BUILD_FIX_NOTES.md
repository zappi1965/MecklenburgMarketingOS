# MMOS V103.4 — TypeScript Build Fix

Basis: V103.3 Fullbuild Scroll + MFA + Client-Error Rescue.

## Fix

Vercel build failed with:

```text
Property 'webkitOverflowScrolling' does not exist on type 'CSSStyleDeclaration'.
```

The scroll rescue component now uses the standards-safe DOM API:

```ts
main.style.setProperty('-webkit-overflow-scrolling', 'touch')
side.style.setProperty('-webkit-overflow-scrolling', 'touch')
```

This keeps the Safari/iOS scroll hint while passing TypeScript.

## Files changed

- `frontend/src/components/MmosScrollRescue.tsx`

No DB changes, no MFA logic changes, no unrelated frontend changes.
