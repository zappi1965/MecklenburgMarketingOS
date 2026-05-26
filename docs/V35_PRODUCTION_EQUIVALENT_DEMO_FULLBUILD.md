# MMOS V35 Production-Equivalent Demo Fullbuild

## Ziel

Die Demo-Umgebung soll sich wie eine 1:1 Live-Umgebung verhalten. Deshalb wurden eigene Business-Engines ergänzt.

## Neu

### Backend
- `backend/src/services/v35BusinessEngine.js`
- Erweiterte Endpunkte in `backend/src/routes/v33FunctionalRoutes.js`

### Neue Engine-Endpunkte
```text
POST /api/v33-functional/engine/:customer_id/recalculate
POST /api/v33-functional/engine/:customer_id/review
POST /api/v33-functional/engine/:customer_id/automation/run
POST /api/v33-functional/engine/:customer_id/marketing/run
POST /api/v33-functional/engine/:customer_id/billing/calculate
POST /api/v33-functional/engine/:customer_id/rewards/:reward_id/redeem
```

## Business Engines

### QR/Loyalty Engine
- QR-Scan erzeugt Lead
- Loyalty Member wird erstellt oder wiedererkannt
- Punkte werden gebucht
- QR-Kampagne wird hochgezählt
- Pipeline Lead wird erzeugt
- Timeline Event wird erzeugt
- Customer Health/Intelligence wird neu berechnet

### Review Intelligence Engine
- Review wird gespeichert
- Sentiment wird aus Rating berechnet
- Negative Reviews erzeugen Ticket
- Timeline Event wird erzeugt
- Health/Risk/Upsell wird neu berechnet

### Smart Automation Engine
- Erkennt negative Reviews
- Erzeugt Timeline Events
- Erzeugt bei hoher QR/Loyalty Aktivität Upsell Pipeline Leads
- Berechnet Scores neu

### Marketing Automation Engine
- Kampagne wird als Run gespeichert
- Zielkontakte werden aus Loyalty Members/Segmenten berechnet
- Timeline Event wird erzeugt
- Scores werden neu berechnet

### Dynamic Billing Engine
- QR Scans, Leads, Automation Runs und Usage werden berechnet
- Usage-Record wird geschrieben

### Revenue Forecasting / Revenue Share / Package Recommendations
- Forecast aus MRR, Pipeline und Usage
- Revenue Share automatisch 15%
- Package Recommendation abhängig von Upsell/Risk
- AI Assistant Hinweis wird erzeugt

## Frontend
- Dashboard enthält jetzt `V35 Business Engine`
- Modulaktionen rufen echte Engine-Endpunkte auf
- Demo bleibt kundenspezifisch gespeichert und wird produktionsnah berechnet

## SQL
Bitte zusätzlich ausführen:

```text
supabase/migrations/0042_v35_production_equivalent_demo_engines.sql
```

Wenn V34/0041 noch nicht lief, vorher 0041 ausführen.
