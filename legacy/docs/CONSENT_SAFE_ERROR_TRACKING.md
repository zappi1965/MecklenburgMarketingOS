# Consent-safe Error Tracking Patch

Dieser Patch stellt sicher, dass das clientseitige Fehlertracking erst aktiv wird, wenn die passende Consent-Kategorie erlaubt ist.

## Verhalten

Standard:

```env
NEXT_PUBLIC_ERROR_REPORTING_CONSENT_CATEGORY=analytics
NEXT_PUBLIC_ERROR_REPORTING_ESSENTIAL=false
```

Damit gilt:

- Keine Zustimmung zu Analyse = kein ClientErrorReporter-Tracking.
- Zustimmung zu Analyse = Browser-Fehler werden an `/api/production/client-error` gesendet.
- Die vollständige URL inkl. Query-Parametern wird nicht mehr übertragen.
- Es werden nur `pathname`, `origin`, `user_agent`, Fehlermeldung und Stack-Auszug gesendet.

## Backend-Sentry

Backend-Sentry ist nicht cookie- oder browserbasiert. Es dient Server-Fehlerdiagnose, verarbeitet aber technische Daten. Deshalb:

- SENTRY_DSN nur setzen, wenn die Datenschutzerklärung Sentry nennt.
- Backend-Events bleiben über `sentryService.beforeSend` redacted.
- Server-Fehlertracking ist getrennt vom Browser-/Cookie-Consent.

## Einbau

```bash
unzip -o MMOS_ConsentSafe_ErrorTracking_Fullbuild_Package.zip -d .
node scripts/apply-consent-safe-error-tracking.js
yarn --cwd frontend typecheck
yarn --cwd frontend build
```
