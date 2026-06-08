# MMOS v0.66 – Stability & Speed Foundation

## Ziel
Dieser Fullbuild stabilisiert das Live-System, verbessert die Fehlerdiagnose und beschleunigt alltägliche Aktionen, ohne bestehende Funktionen zu entfernen.

## Umgesetzt

### Frontend / UX
- Zentrale Live-Speicherstatus-Leiste direkt im App-Shell.
- Sichtbare Zustände: `Lädt`, `Speichert`, `Live gespeichert`, `Fehler`.
- API-Diagnose-Panel für die letzten fehlgeschlagenen Requests.
- Einheitlichere Input-/Textarea-/Select-Fokuszustände.
- Mobile Tabellen werden automatisch als Karten dargestellt, soweit Tabellen-Header vorhanden sind.
- Empty-State-Komponente für Diagnosebereiche ergänzt.
- Landingpage-Editor zeigt einen Debounce-/Draft-Hinweis, damit Änderungen kontrollierter wirken.
- Karten und schwere UI-Bereiche nutzen `content-visibility`, damit lange Adminseiten schneller reagieren.

### Speichern / Aktionen
- Store-Ladevorgang lädt Tabellen nicht mehr streng sequenziell, sondern in kleinen parallelen Chunks.
- Create/Update/Delete nutzen eine optimistische UI: Änderungen erscheinen sofort und werden bei Fehler zurückgerollt.
- Fehler werden nicht mehr still verschluckt, sondern mit konkreter Ursache angezeigt.
- Lokaler Fallback bleibt nur Demo-/Fallback-abhängig.

### API-Client
- Zentraler API-Client mit Timeout, Retry und Fehlerklassifizierung.
- Fehlerklassen: `timeout`, `network`, `auth`, `permission`, `proxy`, `rate_limit`, `schema`, `api`.
- Fehlgeschlagene Requests erzeugen ein sichtbares Diagnose-Event im Frontend.

### Systemstatus / Health
- Gotenberg-/Mail-/ENV-Diagnose wird detaillierter im Health Center angezeigt.
- Mailstatus zeigt Provider, Absender-Konfiguration und Paketanfrage-Empfänger an.
- Integrationsstatus zeigt Hinweise, Fehler, URL-Maskierung und HTTP-Status detaillierter an.

## Geänderte Dateien
- `frontend/src/app/page.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/lib/apiRequest.ts`
- `frontend/.env.example`
- `backend/src/routes/systemRoutes.js`
- `backend/.env.example`

## Deployment
Für v0.66 empfohlen:
1. Railway Backend deployen
2. Vercel Frontend deployen

Supabase-Migration ist nicht erforderlich.

## Wichtige ENV
Im Live-System:

```env
NEXT_PUBLIC_ENABLE_LOCAL_WRITE_FALLBACK=false
```

Gotenberg im Backend, falls genutzt:

```env
GOTENBERG_URL=http://gotenberg.railway.internal:3000
GOTENBERG_HEALTH_TIMEOUT_MS=8000
GOTENBERG_TIMEOUT_MS=30000
```

Mail im Backend:

```env
RESEND_API_KEY=...
MAIL_FROM=Mecklenburg Marketing <noreply@mecklenburgmarketing.de>
PACKAGE_INQUIRY_FROM=Mecklenburg Marketing <noreply@mecklenburgmarketing.de>
PACKAGE_INQUIRY_TO=zapf@mecklenburgmarketing.de
```
