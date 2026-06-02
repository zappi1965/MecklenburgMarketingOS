# V42.24.10 Reward View Slug Fix

## Ziel
Der Button **„Reward ansehen“** auf der öffentlichen Slug-Seite soll dauerhaft funktionieren und den Reward-Bereich öffnen, statt nur einen Hinweistext anzuzeigen.

## Änderungen
- `frontend/src/app/l/[slug]/page.tsx`
  - neuer State `rewardOverviewOpen`
  - neuer Ref/Scroll zur Reward-Übersicht
  - Button **„Reward ansehen“** öffnet jetzt dauerhaft die Reward-Übersicht
  - Rewards sind auch vor dem Scan sichtbar
  - nach Login/Scan wird der verfügbare Status anhand des Punktestands angezeigt
  - verfügbare Rewards können direkt aus der Übersicht eingelöst werden
- `frontend/src/app/globals.css`
  - Styling für die dauerhafte Reward-Übersicht ergänzt

## Verhalten
- Vor Anmeldung: Rewards werden angezeigt, Punktestand wird noch nicht bewertet.
- Nach Anmeldung/Scan: verfügbare und noch fehlende Punkte werden angezeigt.
- Wenn keine Rewards hinterlegt sind: klare Meldung statt funktionslosem Button.

## Deployment
Minimal neu deployen:

```txt
frontend/src/app/l/[slug]/page.tsx
frontend/src/app/globals.css
```

Keine neue Supabase-Migration erforderlich.
