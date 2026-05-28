# Monolith-Audit: tote Buttons, doppelte Settings, Tool-Konsolidierung

Stand nach User-Test-Feedback. Bezieht sich auf den 2.500-Zeilen-
`frontend/src/app/page.tsx`, der die Haupt-App fuer eingeloggte User
rendert.

---

## 1a · Health Center scheinbar ohne Funktion

**Symptom:** `/admin` View `health_center` zeigt leere Code-Bloecke und
"Pruefe System...".

**Code-Pfad:** `HealthCenterV42` (page.tsx:1630) ruft 4 Backend-Endpunkte:
- `systemReady()` → `/api/system/ready`
- `systemSchema()` → `/api/system/schema`
- `businessToolsClient.health()` → `/api/business-tools/health`
- `integrationStatus()` → `/api/system/integration-status`

**Moegliche Ursachen:**

| Symptom | Ursache | Fix |
|---|---|---|
| Alle 4 Antworten leer / `{ok:false,error:...}` | Auth-Token nicht mitgesendet oder Endpoints existieren nicht | DevTools-Network-Tab pruefen; bei 401 INVALID_SESSION neu einloggen |
| "Backend: Pruefen" + alle Bloecke leer | `NEXT_PUBLIC_API_BASE` in Vercel nicht gesetzt | docs/DEPLOY.md Schritt 3 |
| Schema-Status zeigt "X fehlt" | Migrationen nicht eingespielt | docs/DEPLOY.md Schritt 1 |
| Integrationen alle "pruefen" | ENV-Variablen fehlen (Google Places, Mail-Provider) | docs/DEPLOY.md Schritt 2 |

**Diagnose-Empfehlung:** Browser-DevTools → Network → Reload → den
ersten der 4 `/api/system/*`-Aufrufe inspizieren. Was zurueckkommt,
verraet das eigentliche Problem.

---

## 1b · Tote Buttons / nicht-funktionale Speichern-Aktionen

### Root Cause: RLS-Policy-Luecke

`page.tsx` ruft den **Browser-Anon-Supabase-Client direkt** auf
(`supabase.from(table).update(...)` in `useStore`-Funktion, Zeile ~354).
Damit das Write durchgeht, braucht die Tabelle eine
RLS-Policy, die dem authentifizierten User Schreiben erlaubt.

Fuer viele Settings-Tabellen existieren nur Lese-Policies → Writes
schlagen mit `ERROR: new row violates row-level security policy` still
fehl. Das Frontend faengt den Fehler, zeigt einen kleinen Toast
("Live-Aktualisierung fehlgeschlagen") und schreibt eine Warnung in die
Browser-Console — beides wird in der Praxis oft uebersehen.

### Was du in der Browser-DevTools-Console siehst (Beweis)

```
[MMOS] landing_page_settings remote update failed
  PostgrestError: new row violates row-level security policy
```

### Quick-Fix in dieser Session

**Migration `0081_admin_write_policies.sql`** ergaenzt fuer 30 haeufige
Settings-Tabellen die Policy `mmos_admin_write` (alle Operationen fuer
Admins). Nutzt die existierende `mmos_is_admin()`-Funktion aus
`SQL_V42_24_SECURITY_PRIVACY_CENTER.sql`.

Nach Einspielen sollten die folgenden Speichern-Buttons funktionieren:
- Haupt-Landing-Page-Editor (`landing_page_settings`)
- Loyalty-Branding-Editor (`loyalty_programs`, `loyalty_rewards`,
  `loyalty_reward_rules`, `loyalty_security_settings`)
- QR-Kampagnen-Editor (`qr_campaigns`)
- Workflow-Rule-Editor (`workflow_rules`)
- Customer-Notizen (`customer_notes`)
- Integrationen (`integrations`)
- Knowledge-Base (`knowledge_articles`)
- Acquisition-Campaigns
- ... insgesamt 30 Tabellen

### Mittelfristiger Fix (eigene Session)

Statt direkt-Supabase-Writes vom Browser sollte der Monolith **alle
Schreib-Operationen ueber das Backend** schicken (Bearer-Token +
Service-Role im Backend, was wir in Phase 1 schon aufgebaut haben).
Vorschlag:

```js
// useStore.update Variante 2
async function update(table, id, row) {
  const session = await supabaseAuth.auth.getSession()
  const res = await fetch(`${API_BASE}/api/store/${table}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.data.session?.access_token}` },
    body: JSON.stringify(row)
  })
  if (!res.ok) throw new Error('Update failed')
  return res.json()
}
```

+ Backend-Catch-All `app.use('/api/store/:table', genericCrudRouter())`
mit Allowlist der erlaubten Tables und Customer-Access-Check.

Vorteil: **alle** Settings-Tabellen funktionieren auf einen Schlag,
Service-Role umgeht RLS-Lottery, Audit-Log moeglich.

Aufwand: ~3h.

---

## 2 · Doppelte Settings (Mehrfach-Eingabe an verschiedenen Stellen)

Aus dem grep ueber `page.tsx` identifiziert. **Konsolidierungs-
Vorschlaege:**

### A · Branding (3 Stellen)

| Wo | Was | Tabelle |
|---|---|---|
| Loyalty Branding-Editor (View `smart_loyalty`/`landingpage_texts`) | brand_name, brand_primary, brand_secondary, brand_font | `qr_campaigns.metadata` + `loyalty_programs` |
| Haupt-Landing-Page-Editor (View `main_landing`) | nav_title, logo_url, hero_title | `landing_page_settings` |
| Customer-Profile (View `crm`) | Customer-Name, Logo-URL | `customers` |

**Vorschlag:** Ein zentrales `/admin/branding` (neue Page) mit Sektionen:
- Stammdaten (Name, Logo, Adresse) → schreibt in `customers`
- Brand-Identitaet (Farben, Schrift, Tonalitaet) → schreibt in
  `customers.metadata` (single source of truth)
- Slug-Seiten-Texte (Hero, CTA, FAQ) → schreibt in `landing_page_settings`
- Loyalty-spezifische Branding-Felder werden aus `customers.metadata`
  gelesen, nicht mehr separat editiert

### B · Notification-Templates (2 Stellen)

| Wo | Was |
|---|---|
| Dunning-Center (View `dunning_center`) | Mahnstufe-Templates |
| Workflow-Center | Trigger-Templates |
| Newsletter-Composer | Kampagnen-Templates |

**Vorschlag:** Eine zentrale Template-Bibliothek `/admin/templates` mit
Tag-Filter (mahnung, workflow, newsletter), wiederverwendbar via
`template_id`-Referenz.

### C · Customer-Limits (3 Stellen)

| Wo | Was |
|---|---|
| QR-Kampagnen-Editor | daily_scan_limit, points_per_scan, cooldown |
| Loyalty-Security-Settings (View `security`) | daily_point_limit, suspicion_threshold |
| Smart-Loyalty-Editor | scan_cooldown, weekly_scan_limit |

**Vorschlag:** Pro Customer **eine** "Anti-Abuse-Konfiguration" in
`/admin/loyalty-limits` mit allen Schwellen. QR-Kampagnen erben
Defaults, koennen aber pro Kampagne ueberschreiben (clear inheritance
documented).

### D · Customer-Status (Mehrfach gepflegt)

| Wo | Was |
|---|---|
| Customer-Profile | `customers.status` |
| Customer-Subscriptions | `customer_subscriptions.status` |
| Approval-Workflow | `approval_requests.status` |

**Vorschlag:** Klare Trennung: `customers.status` = lifecycle (active /
suspended / churned). `customer_subscriptions.status` = abrechnungs-
relevant (active / overdue / cancelled). Nicht ueber denselben
UI-Schalter editieren.

---

## 3 · Tool-Konsolidierung (Mehrfach-Tools zusammenfassen)

Aus der hardcoded view-Liste in `page.tsx:451` ergeben sich 32+ Views.
Viele sind logisch zusammengehoerig. Vorschlag fuer Konsolidierung:

### Heutige Trennung → Konsolidiert

| Heute | Vorschlag | Begruendung |
|---|---|---|
| `seo` + `heatmap` + `kpi` + `competitors` | **`/admin/seo`** (Tabs: Dashboard, Heatmap, KPI, Wettbewerber) | Alle 4 sind SEO-Daten desselben Customers; ein Tab-Wechsel reicht. |
| `loyalty` + `loyalty_rewards` + `loyalty_rules` + `staff_codes` + `loyalty_segments` + `smart_loyalty` | **`/admin/loyalty`** (Tabs: Programm, Rewards, Regeln, Mitarbeitercodes, Segmente, Smart-Features) | 6 Views fuer Loyalty ist zuviel. Ein zentrales Modul mit Tabs. |
| `business_audit` + `mini_audit` + `lead_scraper` + `acquisition_campaigns` + `offer_generator` + `contract_generator` + `output_engine` | **`/admin/sales`** (Tabs: Audits, Leads, Campaigns, Angebote, Vertraege, Output) | Sales-Funnel — gehoert zusammen. |
| `dynamic_billing` + `package_recommendations` + `package_matrix` + `packages` | **`/admin/billing`** (Tabs: Paket-Matrix, Dynamic Billing, Empfehlungen) | Pricing/Billing in einer Surface. |
| `customer_health` + `customer_intelligence` | **`/admin/insights`** existiert schon — Tabs ergaenzen | Beides aus customer_intelligence_scores. |
| `reports` + `monthly_reports` + `approvals` | **`/admin/reports`** | Berichtswesen. |
| `media` + `customer_files` | **`/admin/media`** | Datei-Bibliothek. |

### Was bleibt eigenstaendig

- `/admin/insights` (Insights)
- `/admin/automations` (Workflows)
- `/admin/loyalty-scan` (Cashier-UI)
- `/admin/onboarding` (Wizard)
- `/admin/api-keys`, `/admin/security`, `/admin/compliance`
- `/admin/newsletter`, `/admin/widget`, `/admin/mail-assistant`
- `/admin/pricing`, `/admin/dunning`, `/admin/no-show`
- `/admin/gmb`

### Effekt

- **32 monolithische Views** → **~14 konsolidierte Admin-Pages** mit Tabs
- Jeder Tab nutzt das vorhandene `AdminShell` mit persistenter Sidebar
- Mobile-Bottom-Nav wird vom Phase-4 `getMobileBottomNav()` automatisch
  korrekt befuellt

---

## Empfohlene Reihenfolge der naechsten Schritte

1. **Migration 0081 einspielen** (Quick Fix fuer Buttons) — 5 Min.
2. **Pilot-Konsolidierung: SEO-Modul** als Tab-basierte
   `/admin/seo`-Page bauen, schrittweise die Monolith-Views ablosen.
   Beweist das Pattern. ~4h.
3. **Backend-Catch-All `/api/store/:table`** + useStore-Refactor.
   Sobald drin, schreibt der Monolith ueber Backend statt Anon-Supabase
   → alle weiteren Speichern-Buttons funktionieren automatisch. ~3h.
4. **Weitere Konsolidierungen** (Loyalty, Sales, Billing) im selben
   Pattern wie `/admin/seo`. ~3h pro Modul.

---

## Was ich in dieser Session NICHT geaendert habe

- `page.tsx` ist unberuehrt — sonst riskiere ich Regressionen ohne
  Live-Testing-Moeglichkeit
- Konkrete Settings-Migrationen pro Tool — erst nach Konsolidierungs-
  Entscheidung sinnvoll
- Backend-Catch-All-Endpoint — folgt im naechsten Sprint

**Nur Migration 0081 + diese Dokumentation.** Damit ist der akute
Landing-Page-Bug behebbar (Migration einspielen), ohne dass ich blind im
Monolithen herumbastle.
