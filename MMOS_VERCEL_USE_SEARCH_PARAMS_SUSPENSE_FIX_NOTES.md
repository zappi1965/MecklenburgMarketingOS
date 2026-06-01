# MMOS Vercel Build Fix: useSearchParams Suspense

## Fehler

Vercel/Next.js brach beim Static-Page-Generation Schritt ab:

`useSearchParams() should be wrapped in a suspense boundary at page "/marketing/confirm"`

## Ursache

Next.js 16/Turbopack verlangt bei Client Components mit `useSearchParams()` eine Suspense-Boundary, sonst schlägt das Prerendering fehl.

## Fix

Folgende Seiten wurden gepatcht:

- `/marketing/confirm`
- `/marketing/unsubscribe`
- `/l/[slug]`

Das bereits gepatchte `/wallet/me` war schon korrekt.

## Umsetzung

Die Seiten exportieren jetzt einen Wrapper mit `<Suspense fallback={...}>`.
Die eigentliche Hook-Nutzung liegt in einer inneren Content-Komponente.
