# V42.20.1 Gotenberg PDF Output

## Ziel

Die Output Engine erzeugt nicht mehr nur HTML/Print-Fallbacks, sondern ruft serverseitig Gotenberg auf.

## Backend

Neue Route:

```txt
POST /api/business-tools/render-pdf
```

Payload:

```json
{ "html": "<!doctype html>...", "filename": "angebot.pdf" }
```

Antwort:

```txt
application/pdf
```

Wenn `GOTENBERG_URL` fehlt oder Gotenberg nicht erreichbar ist, erhält das Frontend eine klare Fehlermeldung und fällt auf HTML/Print zurück.

## Railway ENV

```env
GOTENBERG_URL=https://dein-gotenberg-service...
GOTENBERG_TIMEOUT_MS=30000
```

## Frontend

Betroffene Bereiche:

- Output Engine
- Monatsreport Generator

Buttons heißen jetzt `PDF öffnen`. Der HTML-Export bleibt als Fallback bestehen.
