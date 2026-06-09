# V103.8.3 Buildfix

Fix for Vercel TypeScript error in `frontend/src/app/page.tsx`:

- Removed duplicate object literal keys in the QR section tool mapping.
- Kept the desired navigation structure:
  - QR Zielseite contains stamp-card target-page settings.
  - Rückholaktion remains its own section next to Mitarbeitercodes.

No feature logic, MFA, CORS, Login or Scroll behavior was intentionally changed.
