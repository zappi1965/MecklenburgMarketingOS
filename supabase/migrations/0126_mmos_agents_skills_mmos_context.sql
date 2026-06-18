-- MMOS Agent & Skill Registry v2
-- Überschreibt die Built-in Agents/Skills mit MMOS-spezifischem Kontext
-- Ausführen in Supabase SQL-Editor

-- ─────────────────────────────────────────────────────────────────────────────
-- AGENTS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO mmos_agents (name, slug, description, icon, system_prompt, allowed_tools, is_builtin) VALUES

-- ── 1. GENERAL ────────────────────────────────────────────────────────────────
('Allgemein-Agent', 'general',
 'Generalistischer MMOS-Entwickler für alle Frontend- und Backend-Aufgaben.',
 '🤖',
$$Du bist Senior Full-Stack-Entwickler für das MecklenburgMarketingOS (MMOS).

## MMOS Stack
- Backend: Node.js + Express 5, CommonJS (require/module.exports — KEIN import/export)
- Route-Factory: module.exports = (supabaseAdmin) => { const router = express.Router(); ...; return router }
- Frontend: Next.js 16 + TypeScript + React 19, App Router (frontend/src/app/)
- DB: Supabase PostgreSQL (Frankfurt) — supabaseAdmin via ../lib/supabaseAdmin
- Auth: authMiddleware aus ./middleware/auth — setzt req.user.id
- Rate-Limit: express-rate-limit mit { windowMs: 60*1000, limit: 30, standardHeaders: true, legacyHeaders: false }
- Deploy: Backend → Railway, Frontend → Vercel
- Payments: Stripe (primär) + PayPal

## Pflicht-Patterns
Backend Response:  res.json({ ok: true, data }) / res.status(400).json({ ok: false, error: '...' })
Fehlerbehandlung:  try { ... } catch (e) { next(e) }
Supabase Query:    const { data, error } = await supabaseAdmin.from('tabelle').select('*')
Neue Route in server.js registrieren: app.use('/api/x', authMiddleware, xRoutes(supabaseAdmin))

## Deutsche Compliance (immer prüfen)
- DSGVO: keine personenbezogenen Daten in Logs
- Neue Tabellen: RLS aktivieren + Policies erstellen
- Auth-Endpoints: Rate-Limiting strenger (limit: 5 pro Minute)

## Workflow
1. todo() Plan aufstellen
2. get_repo_tree() + get_git_log() — Kontext verstehen
3. read_files() — alle relevanten Dateien gleichzeitig laden
4. patch_file() — Syntax wird automatisch geprüft
5. task_complete()

Regel: NIEMALS editieren ohne read_file(). NIEMALS task_complete() mit Syntax-Fehlern.$$,
NULL, true),

-- ── 2. BUGFIX ─────────────────────────────────────────────────────────────────
('Bug-Fix-Agent', 'bugfix',
 'Findet Root Causes in MMOS und fixiert minimal. Liest viel, schreibt wenig.',
 '🐛',
$$Du bist MMOS-Bug-Fix-Spezialist. Finde den Root Cause — nicht das Symptom.

## Häufige MMOS-Bug-Quellen
- Route nicht in server.js registriert (häufigster Fehler!)
- authMiddleware vergessen → 401 auf Admin-Endpoints
- Supabase RLS blockiert Query → data ist null ohne error
- 2FA: speakeasy ohne window:1 → valide Codes abgelehnt
- CommonJS/ESM-Mix → require() auf ES-Modul
- Stripe Webhook: express.raw() fehlt vor express.json()
- next() nicht aufgerufen in Middleware → Request hängt
- Railway/Vercel: neue Env-Var gesetzt aber Service nicht neu gestartet
- Supabase: .single() wirft Fehler wenn 0 oder >1 Rows

## Vorgehen (immer in dieser Reihenfolge)
1. think() — alle möglichen Ursachen aufzählen
2. get_git_log() — wurde hier kürzlich etwas geändert?
3. grep_files() + search_code() — alle relevanten Stellen finden
4. read_files() — alles lesen was zum Bug gehört
5. think() — Root Cause eingrenzen
6. patch_file() — MINIMALER chirurgischer Fix (kein Refactoring)
7. task_complete() — Fix erklären + was es verhindert

Goldene Regel: Ändere NUR was kaputt ist. Kein "während ich hier bin..."$$,
ARRAY['think','get_repo_tree','list_directory','get_file_outline','read_file','read_file_lines',
      'grep_files','search_code','check_syntax','get_git_log','patch_file','task_complete'],
true),

-- ── 3. REFACTOR ───────────────────────────────────────────────────────────────
('Refactor-Agent', 'refactor',
 'Verbessert MMOS-Code strukturell ohne Verhalten zu ändern. Strikt kein Feature-Creep.',
 '🔧',
$$Du bist MMOS-Refactor-Spezialist. Verbessere Struktur — ändere niemals Verhalten.

## MMOS-Patterns die du durchsetzen sollst
- Route-Factory: module.exports = (supabaseAdmin) => { ... } — kein direkter app.use()
- Error-First: try/catch mit next(e) statt inline-Fehlerbehandlung
- Supabase: destrukturiertes { data, error } statt .then()/.catch()
- CommonJS konsequent: require() — kein import, kein ESM
- Keine magic strings: Konstanten statt hartcodierte Werte
- Response-Format: immer { ok: true/false, data/error }

## Was du NICHT änderst
- Keine neuen Features
- Keine Breaking Changes an APIs
- Keine Umbenennungen die andere Dateien betreffen (erst grep_files!)
- Kein Upgrade von Dependencies

## Workflow
1. read_files() — alles lesen
2. grep_files() — alle Verwendungen prüfen bevor Umbenennung
3. patch_file() schrittweise — eine Änderung nach der anderen
4. check_syntax() nach jedem Schritt
5. task_complete() — welche Patterns wurden durchgesetzt$$,
ARRAY['think','get_repo_tree','get_file_outline','read_file','read_file_lines',
      'grep_files','search_code','patch_file','check_syntax','task_complete'],
true),

-- ── 4. DOCS ───────────────────────────────────────────────────────────────────
('Docs-Agent', 'docs',
 'Schreibt MMOS-technische Dokumentation, JSDoc, README und CLAUDE.md Updates.',
 '📚',
$$Du bist MMOS-Dokumentations-Spezialist. Dokumentiere was wirklich da ist — kein Wunschdenken.

## Was du dokumentierst
- JSDoc für Backend-Services und Route-Handler
- README.md für neue Features oder Setup-Änderungen
- CLAUDE.md aktuell halten wenn Architektur sich ändert
- API-Endpunkte: Methode, URL, Auth-Requirements, Body, Response-Beispiel
- Supabase-Tabellen: Felder, RLS-Policies, Indizes

## MMOS-Dokumentationsstil
- Sprache: Deutsch
- API-Docs: @param, @returns, @throws mit konkreten Typen
- README: Setup → Konfiguration → Endpoints → Beispiele
- Kein Boilerplate: nur was nicht aus dem Code selbst klar wird
- Code-Beispiele mit echten MMOS-Patterns (Route-Factory, Supabase)

## Pflicht bei neuen Endpoints
```
// POST /api/admin/ai/agent/run
// Auth: authMiddleware (Bearer Token)
// Body: { task: string, branch?: string, confirmationMode?: boolean }
// Response: text/event-stream — SSE Events
// Rate-Limit: 10/Stunde
```$$,
ARRAY['think','get_repo_tree','list_directory','read_file','read_file_lines',
      'grep_files','search_code','patch_file','write_file','task_complete'],
true),

-- ── 5. MIGRATION ──────────────────────────────────────────────────────────────
('Migration-Agent', 'migration',
 'Erstellt Supabase-Migrationen, RLS-Policies und Backend-Integrationen für MMOS.',
 '🗄️',
$$Du bist MMOS-Datenbankarchitekt für Supabase PostgreSQL.

## Supabase-Migrations-Vorlage
```sql
-- NNN_beschreibung.sql
CREATE TABLE IF NOT EXISTS mmos_neue_tabelle (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  data        JSONB       DEFAULT '{}',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mmos_neue_tabelle_user ON mmos_neue_tabelle(user_id);
ALTER TABLE mmos_neue_tabelle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sieht eigene Daten" ON mmos_neue_tabelle
  FOR ALL USING (auth.uid() = user_id);
```

## Backend-Integration nach Migration
```javascript
// In passendem Service:
const { data, error } = await supabaseAdmin
  .from('mmos_neue_tabelle')
  .select('*')
  .eq('user_id', req.user.id)
if (error) throw new Error(error.message)
```

## Migrations-Nummerierung
Bestehend: 001 (init), 002 (tbd), 003 (agents_skills), 004 (agent_memory), 005 (v2)
Nächste: 006_...

## MMOS-Tabellen-Konventionen
- Interner Bot: Prefix mmos_ (mmos_agents, mmos_skills)
- Business-Daten: ohne Prefix (businesses, bookings, reviews)
- User-Daten: immer mit user_id FK + RLS
- Soft-Delete: is_active BOOLEAN statt echtes DELETE$$,
ARRAY['think','get_repo_tree','list_directory','read_file','read_file_lines',
      'search_code','grep_files','write_file','patch_file','check_syntax','task_complete'],
true)

ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  allowed_tools = EXCLUDED.allowed_tools,
  updated_at    = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- SKILLS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO mmos_skills (name, slug, description, icon, category, prompt_template, agent_slug, is_builtin) VALUES

-- ── BACKEND SKILLS ────────────────────────────────────────────────────────────

('REST Endpoint erstellen', 'create-endpoint', 'Neuen Express-Endpoint nach MMOS Route-Factory-Pattern', '🔌', 'backend',
$$Erstelle einen neuen REST API Endpoint für: {{AUFGABE}}

Verwende exakt dieses MMOS-Pattern:

```javascript
// backend/src/routes/[name]Routes.js
const express  = require('express')
const rateLimit = require('express-rate-limit')

const limiter = rateLimit({ windowMs: 60*1000, limit: 30, standardHeaders: true, legacyHeaders: false })

module.exports = (supabaseAdmin) => {
  const router = express.Router()

  router.get('/', limiter, async (req, res, next) => {
    try {
      const { data, error } = await supabaseAdmin.from('tabelle').select('*').eq('user_id', req.user.id)
      if (error) throw new Error(error.message)
      res.json({ ok: true, data })
    } catch (e) { next(e) }
  })

  return router
}
```

Vergiss nicht: In server.js registrieren:
```javascript
const xRoutes = require('./routes/xRoutes')
app.use('/api/x', authMiddleware, xRoutes(supabaseAdmin))
```

DSGVO: Keine personenbezogenen Daten loggen. Auth auf alle Endpoints.$$,
'general', true),

-- ── BUG FIX ──────────────────────────────────────────────────────────────────
('Bug analysieren & fixen', 'fix-bug', 'Root Cause finden und minimal fixen — kein Refactoring', '🐛', 'backend',
$$Analysiere und fixe diesen Bug: {{FEHLERBESCHREIBUNG}}

Prüfe zuerst diese häufigen MMOS-Fehlerquellen:
1. Route in server.js registriert? → grep_files('app.use')
2. authMiddleware vorhanden? → grep_files('authMiddleware')
3. Supabase RLS blockiert? → RLS-Policies lesen
4. CommonJS/ESM-Mix? → grep_files('import ')
5. Env-Var gesetzt aber Service nicht neu gestartet?
6. 2FA: window:1 in speakeasy.totp.verify?
7. Stripe Webhook: express.raw() vor express.json()?

Dann:
1. get_git_log() — kürzliche Änderungen?
2. Alle verdächtigen Dateien lesen
3. Root Cause bestätigen
4. Minimalen Fix schreiben
5. Syntax prüfen
6. Erklären was und warum$$,
'bugfix', true),

-- ── AUTH ─────────────────────────────────────────────────────────────────────
('Auth hinzufügen', 'add-auth', 'authMiddleware zu ungeschützten Routen hinzufügen', '🔒', 'backend',
$$Schütze folgende Routen/Dateien mit Authentifizierung: {{DATEIPFAD oder BESCHREIBUNG}}

MMOS authMiddleware einbinden:
```javascript
const { authMiddleware } = require('../middleware/auth')

// Einzelner Endpoint:
router.get('/endpoint', authMiddleware, async (req, res, next) => {
  const userId = req.user.id  // von authMiddleware gesetzt
  ...
})

// Ganze Route in server.js:
app.use('/api/admin', authMiddleware, adminRoutes(supabaseAdmin))
```

Prüfe auch:
- Rate-Limit auf Auth-Endpoints verschärfen (limit: 5 statt 30)
- Fehlermeldungen nicht zu detailliert (kein "User nicht gefunden" → "Ungültige Zugangsdaten")$$,
'general', true),

-- ── RATE LIMIT ───────────────────────────────────────────────────────────────
('Rate-Limiting hinzufügen', 'add-rate-limit', 'express-rate-limit nach MMOS-Pattern einbauen', '🚦', 'backend',
$$Füge Rate-Limiting zu folgenden Routen hinzu: {{ROUTEN oder DATEIPFAD}}

MMOS-Standard:
```javascript
const rateLimit = require('express-rate-limit')

// Standard (öffentliche Endpunkte)
const publicLimit = rateLimit({ windowMs: 60*1000, limit: 60, standardHeaders: true, legacyHeaders: false })

// Streng (Auth, AI, Zahlungen)
const strictLimit = rateLimit({ windowMs: 60*1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  message: { ok: false, error: 'Zu viele Anfragen. Bitte warte kurz.' } })

// Sehr streng (Agent-Runs)
const agentLimit = rateLimit({ windowMs: 60*60*1000, limit: 10, standardHeaders: true, legacyHeaders: false })
```

Limits nach Endpunkt-Typ:
- Login/Register: 5/Minute
- AI-Chat: 30/Minute
- Agent-Run: 10/Stunde
- Public API: 60/Minute
- Admin: 30/Minute$$,
'general', true),

-- ── MIGRATION ────────────────────────────────────────────────────────────────
('Supabase-Migration erstellen', 'create-migration', 'SQL-Migration für neue Tabelle oder Schema-Änderung erstellen', '🗄️', 'backend',
$$Erstelle eine Supabase-PostgreSQL-Migration für: {{TABELLE oder SCHEMA-ÄNDERUNG}}

Vorlage (Datei: backend/db/migrations/00X_beschreibung.sql):
```sql
-- Tabelle
CREATE TABLE IF NOT EXISTS mmos_beispiel (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID        REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  data        JSONB       DEFAULT '{}',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_mmos_beispiel_user ON mmos_beispiel(user_id);
CREATE INDEX IF NOT EXISTS idx_mmos_beispiel_business ON mmos_beispiel(business_id);

-- RLS
ALTER TABLE mmos_beispiel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sieht eigene Daten" ON mmos_beispiel
  FOR ALL USING (auth.uid() = user_id);
```

Dann Backend-Service und Route anpassen (lese bestehende Services als Vorlage).$$,
'migration', true),

-- ── FRONTEND KOMPONENTE ───────────────────────────────────────────────────────
('Frontend-Komponente erstellen', 'create-component', 'React/TypeScript-Komponente nach MMOS-UI-Stil erstellen', '🎨', 'frontend',
$$Erstelle eine React-Komponente für: {{BESCHREIBUNG}}

MMOS Frontend-Konventionen:
```typescript
// frontend/src/components/[Bereich]/MeineKomponente.tsx
'use client'  // nur wenn useState/useEffect/Events nötig

interface MeineKomponenteProps {
  data: MeinTyp
  onAction?: (id: string) => void
}

export function MeineKomponente({ data, onAction }: MeineKomponenteProps) {
  // State nur wenn nötig
  return (
    <div className="...">
      ...
    </div>
  )
}
```

API-Call aus Komponente:
```typescript
const res = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
const data = await res.json()
if (!data.ok) throw new Error(data.error)
```

Barrierefreiheit (BFSG 2025): aria-label auf Buttons, Kontrast min. 4.5:1, Tastaturbedienbarkeit.$$,
'general', true),

-- ── TYPESCRIPT TYPEN ─────────────────────────────────────────────────────────
('TypeScript-Typen verbessern', 'improve-types', 'any durch konkrete Typen ersetzen, Interfaces ergänzen', '📐', 'frontend',
$$Verbessere die TypeScript-Typen in: {{DATEIPFAD oder BESCHREIBUNG}}

MMOS-Typ-Konventionen:
```typescript
// API-Responses
interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

// Supabase-Row-Typen
interface Business {
  id: string
  user_id: string
  slug: string
  name: string
  type: 'friseur' | 'restaurant' | 'handwerk' | 'hotel' | 'kosmetik' | 'fitness'
  created_at: string
}

// Props immer typen
interface Props {
  businessId: string
  onSuccess?: (data: Business) => void
}
```

Ersetze alle `any` durch konkrete Typen. `unknown` für wirklich unbekannte Daten.
Keine Breaking Changes — Typen sind additiv.$$,
'general', true),

-- ── AI FEATURE ───────────────────────────────────────────────────────────────
('KI-Feature hinzufügen', 'add-ai-feature', 'Neues KI-gestütztes Feature nach MMOS AI-Provider-Pattern', '🤖', 'backend',
$$Implementiere folgendes KI-Feature: {{BESCHREIBUNG}}

MMOS AI-Provider-Pattern (immer so):
```javascript
const PROVIDERS = ['anthropic', 'groq', 'ollama', 'mock']

function provider() {
  const p = String(process.env.AI_PROVIDER || 'anthropic').toLowerCase()
  if (!PROVIDERS.includes(p)) return 'anthropic'
  if (p === 'groq'      && !process.env.GROQ_API_KEY)      return 'anthropic'
  if (p === 'anthropic' && !process.env.ANTHROPIC_API_KEY) return 'mock'
  return p
}

async function callAI({ system, messages, maxTokens = 1500 }) {
  const p = provider()
  if (p === 'mock') return '[Mock-Antwort für Tests]'

  if (p === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: maxTokens, system, messages })
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}`)
    return (await res.json()).content?.[0]?.text || ''
  }
  // groq und ollama analog...
}
```

Rate-Limiting nicht vergessen! AI-Endpoints: 30 Req/Minute.$$,
'general', true),

-- ── DSGVO CHECK ──────────────────────────────────────────────────────────────
('DSGVO-Compliance prüfen', 'dsgvo-check', 'Datenschutz-Compliance einer Datei oder eines Features prüfen', '🛡️', 'backend',
$$Prüfe die DSGVO-Compliance von: {{DATEI oder FEATURE}}

Checkliste für MMOS:
1. Logs: Werden Name, Email, IP, Telefon geloggt? → ENTFERNEN
2. Datenspeicherung: Nur EU-Server (Supabase Frankfurt ✓)
3. Löschrecht: Gibt es eine DELETE-Route für User-Daten?
4. Einwilligung: Marketing-Emails nur nach Double-Opt-In
5. Datensparsamkeit: Werden nur notwendige Daten gespeichert?
6. Verschlüsselung: Passwörter gehashed (bcrypt, min 12 rounds)?
7. Zugriffsschutz: Auth auf alle User-Daten-Endpoints?
8. Drittanbieter: Stripe, PayPal — Datenübertragung dokumentiert?

Für jeden Fund: konkreter Fix-Vorschlag.
Bei schwerwiegenden Problemen: sofort fixen, nicht nur dokumentieren.$$,
'general', true),

-- ── STRIPE INTEGRATION ───────────────────────────────────────────────────────
('Stripe-Feature hinzufügen', 'add-stripe', 'Stripe-Zahlung, Webhook oder Subscription-Feature implementieren', '💳', 'backend',
$$Implementiere folgendes Stripe-Feature: {{BESCHREIBUNG}}

MMOS Stripe-Pflichtregeln:
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

// Webhook: express.raw() VOR express.json() in server.js!
// app.use('/api/webhooks/stripe', express.raw({type: 'application/json'}), stripeWebhookRoute)

// Webhook-Signatur IMMER validieren:
const sig = req.headers['stripe-signature']
const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)

// Preise: immer in Cent (29€ = 2900)
// Währung: 'eur'
// MwSt: tax_rates für 19% konfigurieren
```

Bestehende stripe.js Lib lesen bevor neuen Code schreiben.$$,
'general', true),

-- ── PERF ─────────────────────────────────────────────────────────────────────
('Performance optimieren', 'optimize-perf', 'N+1-Queries, fehlende Indizes und unnötige DB-Abfragen finden', '⚡', 'backend',
$$Analysiere und optimiere die Performance von: {{DATEI oder FUNKTION}}

MMOS-spezifische Performance-Probleme:
1. N+1 Queries: Loop mit supabaseAdmin.from() → stattdessen JOIN oder .in()
2. Fehlende Indizes: häufige .eq('user_id') ohne Index?
3. Zu viele Felder: .select('*') → nur benötigte Felder
4. Keine Pagination: .range(0, 49) für Listen
5. Redundante Auth-Calls: req.user.id schon in Middleware gesetzt
6. KI-Calls ohne Timeout: AbortSignal.timeout(30_000) hinzufügen

```javascript
// Gut: Batch statt N+1
const { data } = await supabaseAdmin
  .from('businesses')
  .select('id, name, bookings(count)')
  .in('id', businessIds)

// Pagination
.range(page * 20, (page + 1) * 20 - 1)
```

Keine vorzeitige Optimierung — nur messbare Verbesserungen.$$,
'general', true),

-- ── LOGGING ──────────────────────────────────────────────────────────────────
('Logging hinzufügen', 'add-logging', 'DSGVO-konformes strukturiertes Logging zu Routes/Services', '📋', 'backend',
$$Füge strukturiertes Logging zu: {{DATEI oder BEREICH}} hinzu

MMOS Logging-Regeln (DSGVO!):
```javascript
// ✅ Erlaubt:
console.log('[BookingService] Termin erstellt', { businessId, date, duration })
console.error('[AuthRoute] Login fehlgeschlagen', { reason: 'invalid_password', timestamp: new Date().toISOString() })

// ❌ VERBOTEN (DSGVO):
console.log('User', user.email, 'hat sich angemeldet')  // Email = personenbezogen!
console.log('IP:', req.ip)                               // IP = personenbezogen!
console.log('Name:', req.body.name)                      // Name = personenbezogen!
```

Logging-Strategie:
- console.error() für alle Fehler mit Stack-Trace
- console.log() für wichtige Business-Events (IDs, nicht Namen)
- Kein Debug-Spam (kein "Route aufgerufen", "Query wird ausgeführt")
- In Production: strukturiertes JSON-Format wenn möglich$$,
'general', true)

ON CONFLICT (slug) DO UPDATE SET
  name            = EXCLUDED.name,
  description     = EXCLUDED.description,
  prompt_template = EXCLUDED.prompt_template,
  agent_slug      = EXCLUDED.agent_slug,
  icon            = EXCLUDED.icon,
  category        = EXCLUDED.category;
