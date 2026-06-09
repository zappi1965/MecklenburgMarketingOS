# MMOS V42.4 Backend URL + External QR Hotfix Fullbuild

## Problem

Frontend meldet:
```text
Backend nicht erreichbar: mecklenburgmarketingos-production.up.railway.app
Originalfehler: <!DOCTYPE html>...
```

## Ursache

`NEXT_PUBLIC_BACKEND_URL` wurde wahrscheinlich ohne Protokoll eingetragen:
```text
mecklenburgmarketingos-production.up.railway.app
```

Dann interpretiert der Browser die URL als relativen Pfad in der Vercel/Next-App und bekommt eine HTML-404-Seite.

## Richtiger Wert in Vercel

```text
NEXT_PUBLIC_BACKEND_URL=https://mecklenburgmarketingos-production.up.railway.app
```

## Fix in V42.4

Der Frontend-Client ergänzt automatisch `https://`, falls das Protokoll fehlt.

Außerdem erkennt der Client HTML-Antworten und gibt einen klareren Hinweis aus:
```text
API lieferte HTML statt JSON. Prüfe NEXT_PUBLIC_BACKEND_URL.
```

## QR-Code-Fix

QR-Codes werden im Adminbereich extern erzeugt:

1. `api.qrserver.com`
2. Fallback: `quickchart.io`

Zusätzlich:
- Link kopieren
- Slug öffnen
- QR extern öffnen
- optionaler Slug-Fallback zum manuellen Eingeben

## Neuer Debug-Endpunkt

```text
GET /api/v33-functional/v42/url-debug
```

## Deployment

1. Backend V42.4 auf Railway deployen.
2. Frontend V42.4 auf Vercel deployen.
3. In Vercel Env setzen:
   `NEXT_PUBLIC_BACKEND_URL=https://mecklenburgmarketingos-production.up.railway.app`
4. Vercel nach Env-Änderung neu deployen.
