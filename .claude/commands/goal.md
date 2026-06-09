---
description: MMOS Rebuild — Enterprise Marketing SaaS MVP build mode (scan the V1 checklist, build the next open item end-to-end)
---

# /goal — MMOS Rebuild: Enterprise Marketing SaaS MVP

## Projektkontext

Du arbeitest an **MecklenburgMarketingOS (MMOS)** – einem modularen
**Enterprise Marketing SaaS** für lokale KMU (Stores, Filialen, Einzelhandel).

**Kernidee:** Tool-Plattform. Kunden (= Stores) abonnieren die Plattform und
kaufen einzelne Marketing-Tools dazu. Jedes Tool ist ein eigenständiges,
verkaufbares Produktmodul mit eigenem UI, eigener Logik und eigenem
Stripe-Feature-Flag.

**Entwicklungsansatz:** Kompletter Neubau (Greenfield). Die MMOS v103-Codebase
unter `legacy/` dient als **fachliche Referenz** – sie wird nicht migriert.

## Tech Stack

- Frontend + API: Next.js 15 (App Router, TypeScript, Server Actions)
- Datenbank: Supabase PostgreSQL (EU-Region Frankfurt)
- Auth: Supabase Auth (MFA-fähig ab Tag 1)
- ORM: Drizzle ORM (typsicher, migrationsbasiert)
- Multi-Tenant: Supabase Row-Level Security (RLS) pro Tenant-ID
- Deployment: Vercel (App) · Supabase (Daten + Auth + Storage)
- Styling: Tailwind CSS + shadcn/ui

Server Actions first. Jeder neue externe Dienst muss begründet werden.

## Datenbankschema

Schema-Dateien unter `src/db/schema/` (platform.ts, loyalty.ts, reviews.ts,
index.ts). RLS-Policies in `supabase/migrations/0001_platform_rls.sql`.
Nie ohne Drizzle-Migration direkt in der DB editieren.

### RLS-Helper (nie hardcoden)

- `public.current_tenant_id()`   → UUID der ersten aktiven Mitgliedschaft
- `public.is_superadmin()`        → user_profiles.is_superadmin
- `public.tenant_role(t_id)`      → owner | admin | staff | viewer | null
- `public.is_tenant_member(t_id)` → irgendeine Rolle vorhanden
- `public.is_tenant_admin(t_id)`  → owner/admin + superadmin
- `public.tool_active(t_id, key)` → tenant_tools.status IN ('active','trial')

### Neue Tabelle — Pflicht

- `tenant_id uuid NOT NULL references tenants(id)`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `deleted_at timestamptz` bei User-Daten (DSGVO Soft-Delete)
- RLS aktivieren + mindestens eine SELECT-Policy in 0001_platform_rls.sql
- Audit-Trigger falls schreibkritisch

## MVP-Scope V1 (Reihenfolge: Plattform-Kern → Tool 1 → Tool 2 → Tool 3)

### Plattform-Kern

- [x] Multi-Tenant: `tenant_id` auf allen Tabellen, RLS erzwingt Isolation
- [x] Auth: Supabase Auth, MFA (TOTP), Session-Management
- [x] RBAC: Rollen superadmin / admin / staff / customer (Policy-Matrix)
- [x] DSGVO-Grundlage: EU-Hosting, Double-Opt-In, Consent-Logging (Timestamp +
  IP-Hash), DSAR-Export (JSON), Löschroutine (Soft- + Hard-Delete)
- [x] Audit-Log: jede Mutation über zentralen Writer, unveränderlich
- [x] Tenant-Onboarding: Store anlegen → Admin einladen → Tool auswählen
- [x] Billing-Kern: Stripe Checkout, Subscription je Tool, Webhook-Handler

### Tool 1: Loyalty & QR-Kampagnen (Hero)

- [x] Kundenprofil mit Punktekonto (UUID-basiert)
- [x] QR-Code-Generierung pro Store (unique, idempotent)
- [x] QR-Scan → Punkte-Gutschrift (mobil, < 2 Sek.)
- [x] Reward-Katalog
- [x] Punkte einlösen (Reward-Claim-Flow mit Bestätigung)
- [x] Kampagnen (Bonus-Multiplikatoren, Zeitfenster, Limits)
- [x] Dashboard: Scan-Counter, aktive Kunden, Top-Rewards, Trend

### Tool 2: Reviews & Reputation

- [x] Review-Einladung via QR / personalisierten Link
- [x] Bewertungsformular (Sterne + Freitext, mobil)
- [x] Consent vor Speicherung (DSGVO)
- [x] Review-Dashboard pro Store
- [x] Google My Business: Weiterleitung (optional)

### Tool 3: Payments & Billing

- [x] Stripe-Subscription: Tool-Pakete → Checkout
- [x] Feature-Flags in DB
- [x] Rechnungsversand (PDF)
- [x] Billing-Dashboard für Store-Admin

## Neues Tool — Standard-Reihenfolge

1. Drizzle Schema → src/db/schema/{tool}.ts
2. RLS Policies → 0001_platform_rls.sql (member read, admin write, superadmin
   delete, tool_active gate)
3. Migration → npx drizzle-kit generate && npx supabase db push
4. Audit-Trigger falls schreibkritisch
5. Tool-Flag mit tool_active(tenant_id, '{tool_key}')
6. Server Actions → Zod-validiert, typed Result
7. Admin-UI → shadcn/ui
8. Customer-UI → mobile-first
9. Billing-Guard → Middleware prüft tenant_tools.status
10. DSGVO-Check → Consent? DSAR-Export?

## Aktiver Build-Modus

Beim Start jeder Session:

1. Scanne die MVP-Scope-Checkliste.
2. Finde das erste offene `[ ]` Item (Plattform-Kern zuerst).
3. Gib genau eine Zeile aus: `▶ Baue jetzt: [Item-Name]`
4. Implementiere sofort und vollständig nach dem 10-Schritte-Schema.
5. Item fertig → setze `[x]`, weiter mit dem nächsten `[ ]`.
6. Phasen-Ende → Abschluss-Meldung mit Dateiliste.

Vollständig = lauffähig (keine TODO/Stubs), tsc grün, Zod + typed Errors, RLS
für jede neue Tabelle, mobile-first ab 375px.

Unterbrich nur bei: fehlendem Credential (einmal nach Env-Var-Name fragen),
`*(Puffer)*`-Item (Ja/Nein), oder abgeschlossener Phase.

Verboten: Planungstext vor dem ersten Code, „Soll ich weitermachen?" zwischen
Items, Partial-Implementierungen, Dateien außerhalb der Projektstruktur.
