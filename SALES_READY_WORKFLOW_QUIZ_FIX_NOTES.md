# Sales-Ready Workflow + Quiz Fix

## Verkaufsworkflow

Neu im Frontoffice:

- `Verkaufsworkflow`

Der Workflow führt durch:

1. Lead finden
2. Mini Audit erstellen
3. Kunde im CRM anlegen
4. Angebot/Paket auswählen
5. QR/Review/Google-Tool freischalten
6. Report erzeugen
7. Rechnung schreiben

Der Workflow nutzt bestehende MMOS-Tools und öffnet sie direkt aus der aktuellen Frontoffice-Oberfläche.

Zusätzlich gibt es einen Button `Pilot-Workflow vorbereiten`, der einen vollständigen Demo-Deal vorbereitet:
Lead, Kunde, Growth-Paket, Google Audit, Mini Audit, QR-Kampagne, Toolfreigaben, Report und Rechnung.

## Quiz-Fix

- Im Training werden richtige Antworten nicht mehr während des Quiz angezeigt.
- Antworten und Erklärungen erscheinen erst nach `Auswerten`.
- Antworten werden pro Frage gemischt.
- Korrekte Antwort ist nicht immer Option 1.
- Korrekt-Indizes werden nach dem Mischen neu berechnet.
- Ablenker werden aus thematisch passenden Kategorie-Distraktoren ergänzt.

## Betroffene Dateien

- `frontend/src/app/page.tsx`
- `frontend/src/lib/adminKnowledgeQuiz.ts`
- `frontend/src/components/admin/AdminKnowledgeQuizPanel.tsx`
- `frontend/src/app/globals.css`
