# MMOS V079 · Demo-Kunde Starter + Loyalty

Erstellt einen perfekten Demo-Kunden für Verkaufsgespräche:

- **Demo Café Schwerin**
- Paket: **Starter**
- Zusatzbereich: **Loyalty/Punkteprogramm einzeln freigeschaltet**
- QR-Kampagne mit `/q/...` Sicherheitslink
- sichtbare QR-KPIs: Scans, Punkte, Prämieneinlösungen
- Beispiel-Rechnung, Report und Dokumente
- Demo SEO-KPI-Verlauf

Wichtig: Der Kunde bleibt Starter. Loyalty wird über `customer_tool_access` freigeschaltet, damit die vereinfachte Paketlogik erhalten bleibt.

Migration:

```txt
supabase/migrations/0106_v079_demo_customer_starter_loyalty.sql
```

Zusätzlich wurde die QR-KPI-Anzeige angepasst: Starter-Kunden mit einzeln freigeschaltetem Loyalty-Zusatzbereich sehen Punkte- und Prämien-KPIs, ohne selbst QR-Kampagnen erstellen zu können.
