
# MMOS v18 Booking Categories Package Tools Fix

Umgesetzt:
- Admin Booking zeigt Monat/Jahr.
- Monate lassen sich vor/zurück blättern.
- Termindetails öffnen mit Datum, Uhrzeit, Status und Text.
- Kundenbereich Booking nutzt die echte customer_id und behebt den FK-Fehler bei customer_clients.
- Kunden können eigene Kategorien/Dienstleistungen mit Preis anlegen.
- Aus Kategorien kann automatisch eine Rechnung erzeugt werden.
- Kundenbereich zeigt paketabhängige Tools:
  - Starter: Basis
  - Growth: SEO Dashboard, Review Funnel, Automationen, Workflow Center
  - Premium: Rechte & Rollen, KPI Analytics, SEO Heatmap, Client Success Score, Advanced Reports
- Dummy-Graphen/KPIs ergänzt.
- SQL Patch: 0021_v18_booking_categories_package_tools_fix.sql

Deploy:
1. Supabase Patch ausführen.
2. Vercel Frontend redeployen.
3. Railway Backend/Worker nur redeployen, wenn du alles synchron neu ausrollen willst.
