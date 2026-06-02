# MMOS V071 – Stable Cleanup, Paketlogik und Mobile-Optimierung

Umgesetzt:

- Kundenportal bleibt strikt auf 5 Bereiche reduziert:
  - Start
  - Google & Sichtbarkeit
  - QR Kampagnen
  - Reports
  - Dokumente & Rechnungen
- Technische Toolnamen kundenfreundlich umbenannt:
  - Retention/Retention Center → Kundenbindung
  - Churn Prevention → Rückhol-Chancen
  - Segment-Kampagnen → Kundenaktionen
  - Consent Center → Einwilligungen
  - Customer Health → Projektstatus
  - Customer Intelligence → Empfehlungen
  - Smart Automation → Automatische Regeln
  - Marketing Automation → Automatische Aktionen
  - AI Business Assistant → KI-Empfehlungen
  - Dynamic Billing → Nutzung & Abrechnung
  - Revenue Forecasting → Umsatzprognose
  - Revenue Share → Umsatzbeteiligung
  - Package Recommendations → Paket-Empfehlung
- Starter-Paket technisch und optisch ohne Loyalty/Prämien/Bonusstufen/Automation abgesichert.
- QR-Seite zeigt KPIs und blendet paketabhängig Tabs ein.
- Einzelne Zusatzbereiche bleiben pro Kunde freischaltbar, erscheinen aber innerhalb der vereinfachten Bereiche statt als neue Kunden-Seitenleistenpunkte.
- Growth bleibt ohne SumUp.
- Backoffice bleibt eigener Admin-Sammelbereich für alte interne Funktionen.
- Root `yarn.lock` ergänzt, damit Vercel nicht ohne Lockfile installiert.
- Mobile-Optimierung für QR-Tabs, KPI-Karten, Bottom Navigation, Sticky Topbar, Safe Area und Formularfelder ergänzt.

Nach Deploy ausführen:

```sql
supabase/migrations/0101_v071_stable_cleanup_mobile_package_lock.sql
```
