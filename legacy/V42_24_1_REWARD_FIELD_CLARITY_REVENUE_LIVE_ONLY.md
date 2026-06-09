# V42.24.1 Reward Field Clarity & Revenue Live Only

## Inhalt

- Reward-System: Platzhalter in den Reward-Eingabefeldern durch echte Feldbeschriftungen ersetzt.
- Pro Reward-Feld wurde ein Info-i-Tooltip ergänzt.
- Unter jedem Reward-Feld steht ein kurzer Praxis-Hinweis bzw. Beispielwert.
- Bestehende Reward-Listen zeigen nicht mehr technische Feldnamen wie `max_redemptions_per_member`, sondern verständliche Bezeichnungen.
- Revenue Forecasting nutzt keine Frontend-Demo-Werte mehr. Ohne echte Live-Daten bleibt der Forecast leer/0 € und zeigt einen Empty State.
- Billing & Revenue Fallbackwerte wurden auf 0 gesetzt, damit in Live keine Demo-Umsätze erscheinen.

## Deployment

Nur Frontend/Vercel redeployen. Keine SQL-Migration nötig.
