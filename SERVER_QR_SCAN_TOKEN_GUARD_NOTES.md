# MMOS Server QR Scan Token Guard

## Ziel

Die Einstellung „Neues Punkte sammeln erfordert erneutes QR-Scannen“ ist jetzt serverseitig abgesichert.

## Neuer Ablauf

1. QR-Code zeigt auf `/q/[slug]`.
2. `/q/[slug]` ruft serverseitig `/api/v33-functional/public/loyalty/[slug]/scan-start` auf.
3. Backend erzeugt einen einmaligen Scan-Token in `v33_functional_records` mit `resource='qr_scan_tokens'`.
4. Nutzer wird auf `/l/[slug]?scan_token=...` weitergeleitet.
5. Punkte sammeln funktioniert nur mit gültigem, aktivem, nicht abgelaufenem und unbenutztem Scan-Token.
6. Nach erfolgreicher Punktevergabe wird der Token serverseitig als `used` markiert.
7. Reload, neuer Tab mit gleichem Link oder direkter `/l/[slug]`-Aufruf erzeugen keine neuen Punkte mehr.
8. Für weitere Punkte ist ein neuer QR-Scan über `/q/[slug]` erforderlich.

## Betroffene Dateien

- `backend/src/routes/v33FunctionalRoutes.js`
- `backend/src/server.js`
- `frontend/src/lib/v33FunctionalClient.ts`
- `frontend/src/app/q/[slug]/page.tsx`
- `frontend/src/app/l/[slug]/page.tsx`
- `frontend/src/app/globals.css`

## Keine Migration nötig

Die Tokens werden in der bestehenden Tabelle `v33_functional_records` gespeichert.
