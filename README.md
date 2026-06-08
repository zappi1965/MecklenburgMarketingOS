# MecklenburgMarketingOS (MMOS)

Modulares **Enterprise Marketing SaaS** für lokale Stores. Eine
Tool-Plattform: Stores abonnieren die Plattform und aktivieren einzelne,
verkaufbare Marketing-Tools (Loyalty & QR, Reviews, Billing …).

> Greenfield-Neubau. Die alte v103-Codebase liegt unter `legacy/` und dient
> ausschließlich als fachliche Referenz — sie wird nicht gebaut oder migriert.

## Tech Stack

| Layer        | Technologie                                        |
| ------------ | -------------------------------------------------- |
| Frontend+API | Next.js 15 (App Router, TS, Server Actions)        |
| Datenbank    | Supabase PostgreSQL (EU/Frankfurt)                 |
| Auth         | Supabase Auth (MFA ab Tag 1)                       |
| ORM          | Drizzle ORM (typsicher, migrationsbasiert)         |
| Multi-Tenant | Supabase Row-Level Security pro `tenant_id`        |
| Styling      | Tailwind CSS + shadcn/ui                           |
| Deployment   | Vercel (App) · Supabase (Daten/Auth/Storage)       |

## Setup

```bash
npm install
cp .env.example .env   # Werte aus Supabase + Stripe eintragen
```

## Datenbank

```bash
# Schema ändern → Migration generieren
npm run db:generate

# RLS in supabase/migrations/0001_platform_rls.sql prüfen/ergänzen

# Migrationen auf Supabase anwenden (Tabellen, dann RLS)
npx supabase db push

# Demo-Tenant seeden (einmalig)
npm run db:seed
```

`0000_*.sql` enthält die von Drizzle generierte Tabellen-DDL.
`0001_platform_rls.sql` ist handgepflegt: RLS-Helper, Policies und
Audit-Trigger. Jede neue Tabelle wird dort registriert.

## Entwicklung

```bash
npm run dev        # http://localhost:3000
npm run typecheck
npm run build
```

## Projektstruktur

```
src/
  app/            Next.js App Router (Dashboard, Customer-Flows, Webhooks)
  db/
    schema/       Drizzle: platform.ts · loyalty.ts · reviews.ts · index.ts
    index.ts      Drizzle-Client (Service-Level, bypasst RLS)
    seed/init.ts  Demo-Tenant Bootstrap
  lib/
    supabase/     Browser- + Server-Clients (RLS via JWT)
    nanoid.ts     Token-Generatoren (QR, Invitations, Redeem-Codes)
  actions/        Server Actions (Zod-validiert, typed Result)
  components/     UI (shadcn/ui), tool-spezifische Komponenten
supabase/migrations/
  0000_*.sql      Tabellen-DDL (drizzle-kit)
  0001_platform_rls.sql  RLS-Helper + Policies + Audit-Trigger
.claude/commands/goal.md  Build-Modus für `/goal`
legacy/           v103-Referenz (read-only, nicht gebaut)
```

## Build-Modus

`/goal` startet den agilen Build-Modus: nächstes offenes Checklisten-Item aus
dem V1-Scope vollständig umsetzen (Schema → RLS → Migration → Server Actions →
UI), ein Feature pro Commit.
