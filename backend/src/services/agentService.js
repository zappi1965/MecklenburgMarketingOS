// MMOS Dev-Agent — Claude-Code-level agentic loop
//
// Provider (Priorität):
//   groq      → AI_PROVIDER=groq  + GROQ_API_KEY   (empfohlen: Vercel/Railway)
//   ollama    → AI_PROVIDER=ollama                  (Standard: lokal, kein Key)
//   anthropic → AI_PROVIDER=anthropic + ANTHROPIC_API_KEY
//
// Neue Tools in dieser Version:
//   grep_files    — in-memory Suche über alle gelesenen Dateien (wie ripgrep)
//   check_syntax  — Syntaxprüfung nach jedem Edit (node --check / JSON.parse)
//   get_git_log   — letzte Commits mit Änderungskontext
//
// Auto-Features:
//   • Nach jedem patch_file / write_file: automatische Syntaxprüfung (.js/.ts/.json)
//   • Nach patch_file-Fehler: gezielter Hinweis mit Zeilennummer-Strategie
//   • Kontext-Kompression wenn Gespräch > 100 KB

const path      = require('path')
const os        = require('os')
const fs        = require('fs')
const { exec }  = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

const githubService    = require('./githubService')
const mcpClientService = require('./mcpClientService')

// tsc-Verfuegbarkeit einmalig beim Start pruefen (cached)
let TSC_CMD = null
;(async () => {
  try { await execAsync('tsc --version', { timeout: 4000 }); TSC_CMD = 'tsc' }
  catch { try { await execAsync('npx --no-install tsc --version', { timeout: 4000 }); TSC_CMD = 'npx --no-install tsc' }
  catch { TSC_CMD = false } }
})()

// ── Konfiguration ──────────────────────────────────────────────────────────────

const GROQ_MODEL   = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile'
const OLLAMA_HOST  = process.env.OLLAMA_HOST  || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b'
const MAX_STEPS    = parseInt(process.env.AGENT_MAX_STEPS || '40', 10)

const MAX_FILE_CHARS     = 60000
const MAX_OUTLINE_LINES  = 80
const COMPRESS_THRESHOLD = 100000   // Bytes bevor Kontext komprimiert wird
const SYNTAX_CHECK_EXTS  = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json'])
const COMMAND_TIMEOUT_MS = 8000

// ── Provider ───────────────────────────────────────────────────────────────────

function resolveProvider() {
  const p = (process.env.AGENT_PROVIDER || process.env.AI_PROVIDER || 'ollama').toLowerCase()
  if (p === 'groq'      && process.env.GROQ_API_KEY)      return 'groq'
  if (p === 'anthropic' && process.env.ANTHROPIC_API_KEY) return 'anthropic'
  return 'ollama'
}

// ── Tool-Definitionen (OpenAI-Format) ─────────────────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'think',
      description: 'Denke laut nach. Plane deinen naechsten Schritt bevor du ihn ausfuehrst. Nutze dies vor wichtigen Entscheidungen und nach Fehlern.',
      parameters: {
        type: 'object',
        properties: { reasoning: { type: 'string', description: 'Ueberlegung, Plan oder Fehleranalyse' } },
        required: ['reasoning']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_repo_tree',
      description: 'Alle Quellcode-Dateien des Repos als Liste. Nutze dies am Anfang fuer einen Ueberblick.',
      parameters: {
        type: 'object',
        properties: { filter: { type: 'string', description: 'Optionaler Pfad-Filter, z.B. "routes" oder "services"' } },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'Inhalt eines Verzeichnisses.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Verzeichnis-Pfad, z.B. "backend/src/routes"' } },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_file_outline',
      description: 'Strukturelle Uebersicht einer Datei: Funktionen, Klassen, Routen, Exports — mit Zeilennummern. Effizienter als read_file fuer grosse Dateien wenn du nur die Struktur sehen willst.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Pfad zur Datei' } },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Vollstaendiger Dateiinhalt. IMMER aufrufen bevor du eine Datei aenderst.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Pfad, z.B. backend/src/routes/adminAiRoutes.js' } },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file_lines',
      description: 'Bestimmten Zeilenbereich einer Datei lesen. Nutze dies zur Verifikation nach patch_file oder um grosse Dateien abschnittweise zu erkunden.',
      parameters: {
        type: 'object',
        properties: {
          path:      { type: 'string',  description: 'Pfad zur Datei' },
          from_line: { type: 'integer', description: 'Erste Zeile (1-basiert)' },
          to_line:   { type: 'integer', description: 'Letzte Zeile (1-basiert, inklusiv)' }
        },
        required: ['path', 'from_line', 'to_line']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'grep_files',
      description: 'Sucht ein Muster in allen bereits gelesenen Dateien dieser Session (in-memory, sehr schnell). Auch fuer staged Dateien. Besser als search_code fuer Dateien die du bereits gelesen hast.',
      parameters: {
        type: 'object',
        properties: {
          pattern:     { type: 'string', description: 'Suchbegriff oder Regex (z.B. "authMiddleware" oder "/router\\.post/")' },
          path_filter: { type: 'string', description: 'Optionaler Pfad-Filter, z.B. "routes" oder ".ts"' }
        },
        required: ['pattern']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_code',
      description: 'Sucht Code im gesamten GitHub-Repository (auch in Dateien die noch nicht gelesen wurden). Langsamer als grep_files aber deckt den ganzen Codebase ab.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Suchbegriff, z.B. "authMiddleware" oder "createBranch"' } },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_syntax',
      description: 'Prueft die Syntax einer .js/.ts/.json Datei. Wird nach patch_file und write_file automatisch ausgefuehrt — du kannst es auch manuell aufrufen.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Pfad zur Datei' } },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_git_log',
      description: 'Letzte Commits des Branches oder einer bestimmten Datei. Hilfreich um zu verstehen was zuletzt geaendert wurde.',
      parameters: {
        type: 'object',
        properties: {
          branch:   { type: 'string',  description: 'Branch-Name (Standard: main)' },
          file_path: { type: 'string', description: 'Optionaler Dateipfad fuer dateibezogenen Log' },
          limit:    { type: 'integer', description: 'Anzahl Commits (Standard: 10)' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'patch_file',
      description: 'Ersetzt exakten Text in einer Datei (bevorzugt gegenueber write_file). old_str muss EXAKT so vorkommen — Zeichen fuer Zeichen aus read_file kopieren. Nach Erfolg: automatische Syntaxpruefung.',
      parameters: {
        type: 'object',
        properties: {
          path:    { type: 'string', description: 'Pfad zur Datei' },
          old_str: { type: 'string', description: 'Exakter Text der ersetzt wird (aus read_file kopieren)' },
          new_str: { type: 'string', description: 'Neuer Text' }
        },
        required: ['path', 'old_str', 'new_str']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Schreibt Datei vollstaendig neu. NUR fuer neue Dateien — fuer bestehende patch_file verwenden. Nach Erfolg: automatische Syntaxpruefung.',
      parameters: {
        type: 'object',
        properties: {
          path:    { type: 'string', description: 'Pfad zur Datei' },
          content: { type: 'string', description: 'Vollstaendiger Dateiinhalt' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_node',
      description: 'Fuehrt ein Node.js Code-Snippet aus und gibt stdout/stderr zurueck. Ideal fuer: Logik testen, Regexes pruefen, kleine Berechnungen, require()-Kompatibilitaet pruefen. Kein Netzwerk, kein Filesystem-Schreibzugriff. Max 5 Sekunden.',
      parameters: {
        type: 'object',
        properties: {
          code:        { type: 'string', description: 'Node.js Code-Snippet (max 5000 Zeichen)' },
          description: { type: 'string', description: 'Kurze Beschreibung was dieser Code tut/prueft' }
        },
        required: ['code']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_files',
      description: 'Liest mehrere Dateien GLEICHZEITIG (parallel). Effizienter als mehrere read_file()-Aufrufe hintereinander. Maximal 6 Dateien pro Aufruf.',
      parameters: {
        type: 'object',
        properties: {
          paths: { type: 'array', items: { type: 'string' }, description: 'Array von Dateipfaden, z.B. ["backend/src/routes/x.js", "backend/src/services/y.js"]' }
        },
        required: ['paths']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'todo',
      description: 'Verwaltet eine Aufgabenliste fuer diese Session. Nutze "add" am Anfang um deinen Plan festzuhalten, "done" wenn ein Schritt erledigt ist. Wird dem Nutzer als Fortschrittsanzeige angezeigt.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'done', 'list'], description: 'add=hinzufuegen, done=als erledigt markieren, list=auflisten' },
          item:   { type: 'string', description: 'Aufgabe (bei action=add)' },
          index:  { type: 'integer', description: '1-basierter Index (bei action=done)' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'task_complete',
      description: 'Beendet die Aufgabe. Nur aufrufen wenn alle Aenderungen vollstaendig, verifiziert und syntax-fehlerfrei sind.',
      parameters: {
        type: 'object',
        properties: {
          summary:  { type: 'string', description: 'Vollstaendige Zusammenfassung aller Aenderungen' },
          pr_title: { type: 'string', description: 'GitHub Draft-PR Titel (max 70 Zeichen)' },
          pr_body:  { type: 'string', description: 'PR-Beschreibung mit Aenderungsliste' }
        },
        required: ['summary', 'pr_title', 'pr_body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: 'Laedt eine oeffentliche URL und extrahiert SEO-relevante Daten: Title, Meta, Headings, Schema, Links, Performance-Hinweise. Ideal fuer SEO-Audits, Konkurrenzanalyse und Website-Checks.',
      parameters: {
        type: 'object',
        properties: {
          url:      { type: 'string', description: 'Vollstaendige URL (https://...)' },
          extract:  { type: 'string', enum: ['seo', 'text', 'links', 'schema', 'all'], description: 'Was extrahiert werden soll. seo=Meta+Headings, schema=JSON-LD, text=Seiteninhalt, links=alle Links, all=alles' }
        },
        required: ['url']
      }
    }
  }
]

// ── System-Prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Du bist MMOS-Dev-Agent — Senior Full-Stack-Entwickler fuer MecklenburgMarketingOS (MMOS).
Du arbeitest autonom wie Claude Code: explorieren, lesen, editieren, verifizieren, iterieren.

═══════════════════════════════════════════════════════════
MMOS — PROJEKTUEBERBLICK
═══════════════════════════════════════════════════════════

MecklenburgMarketingOS ist ein deutsches B2B SaaS Marketing-OS fuer lokale KMUs:
Friseursalons, Restaurants, Handwerksbetriebe, Hotels, Kosmetikstudios, Fitnessstudios.

GitHub: zappi1965/MecklenburgMarketingOS
Admin: dominiquezapf@gmail.com
Zielmarkt: Mecklenburg-Vorpommern, Deutschland

═══════════════════════════════════════════════════════════
TECH-STACK
═══════════════════════════════════════════════════════════

BACKEND
  Runtime:    Node.js, CommonJS (require/module.exports — NIEMALS import/export)
  Framework:  Express 5
  Port:       4000 (Railway)
  DB:         Supabase PostgreSQL (Frankfurt, eu-central-1)
  Auth:       JWT via authMiddleware
  Payments:   Stripe + PayPal
  AI:         Anthropic Claude (primaer), OpenAI (Fallback), Mock (Tests)
  Deploy:     Railway

FRONTEND
  Framework:  Next.js 16, App Router
  Sprache:    TypeScript + React 19
  Styling:    Tailwind CSS + CSS Modules
  Deploy:     Vercel
  Pfad:       frontend/src/app/ (App Router)

DATENBANK
  Provider:   Supabase PostgreSQL
  Region:     Frankfurt (eu-central-1)
  RLS:        Aktiv auf allen User-Tabellen
  Migrationen: backend/db/migrations/NNN_name.sql

EXTERNE SERVICES
  GitHub API: GITHUB_TOKEN, GITHUB_REPO_OWNER=zappi1965, GITHUB_REPO_NAME=MecklenburgMarketingOS
  Supabase:   SUPABASE_URL, SUPABASE_SERVICE_KEY
  Stripe:     STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
  PayPal:     PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET

═══════════════════════════════════════════════════════════
CODE-PATTERNS (IMMER EINHALTEN)
═══════════════════════════════════════════════════════════

BACKEND — ROUTE-FACTORY (Pflicht-Pattern)
  module.exports = (supabaseAdmin) => {
    const router = express.Router()
    // Routen hier
    return router
  }

BACKEND — SUPABASE
  const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
  // ODER: supabaseAdmin wird als Parameter uebergeben (bevorzugt in Routen)

BACKEND — AUTH
  const { authMiddleware } = require('../middleware/auth')
  router.get('/geschuetzt', authMiddleware, async (req, res) => {
    const userId = req.user.id  // gesetzt von authMiddleware
  })

BACKEND — RATE LIMITING
  const rateLimit = require('express-rate-limit')
  const limiter = rateLimit({ windowMs: 60*1000, limit: 30, standardHeaders: true, legacyHeaders: false })
  router.use(limiter)

BACKEND — FEHLERBEHANDLUNG
  try { ... } catch (e) { next(e) }  // Fehler an Express-Error-Handler weiterleiten
  // Erfolg:
  res.json({ ok: true, data: ... })
  // Fehler:
  res.status(400).json({ ok: false, error: 'Beschreibung' })

BACKEND — AI PROVIDER PATTERN
  function provider() {
    const p = String(process.env.AI_PROVIDER || 'anthropic').toLowerCase()
    if (p === 'groq' && !process.env.GROQ_API_KEY) return 'anthropic'
    if (p === 'anthropic' && !process.env.ANTHROPIC_API_KEY) return 'mock'
    return p
  }

BACKEND — ANTHROPIC API CALL
  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: 2048, system, messages })
  })

FRONTEND — KOMPONENTEN
  'use client'  // nur wenn noetig (useState, useEffect, Events)
  // Server Components sind Standard im App Router — kein 'use client' ohne Grund

FRONTEND — API CALLS
  const res = await fetch('/api/endpoint', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)

FRONTEND — TYPEN
  interface ApiResponse<T> { ok: boolean; data?: T; error?: string }

DATENBANK — NAMENSKONVENTIONEN
  Tabellen:     snake_case, Plural (users, businesses, posts, bookings)
  MMOS-Prefix:  mmos_agents, mmos_skills, mmos_agent_memory (interne Bot-Tabellen)
  IDs:          UUID (gen_random_uuid())
  Timestamps:   created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ

DATENBANK — SUPABASE QUERIES
  const { data, error } = await supabaseAdmin.from('tabelle').select('*').eq('user_id', id).single()
  if (error) throw new Error(error.message)

═══════════════════════════════════════════════════════════
DATEISTRUKTUR
═══════════════════════════════════════════════════════════

backend/
  src/
    routes/          Express-Routen (Route-Factory-Pattern)
    services/        Business-Logik, AI-Services, externe APIs
    middleware/      auth.js, errorHandler.js, rateLimiter.js
    lib/             supabaseAdmin.js, stripe.js, paypal.js
  db/migrations/     SQL-Migrationen (NNN_beschreibung.sql)
  server.js          Entry-Point, Route-Registrierung

frontend/
  src/
    app/             Next.js App Router (page.tsx, layout.tsx)
    components/      Wiederverwendbare UI-Komponenten
      admin/         Admin-Panel-Komponenten (AdminAiAssistant.tsx etc.)
      ui/            Basis-Komponenten (Button, Card, Input etc.)
    lib/             Utilities, API-Clients
    types/           TypeScript-Typen

═══════════════════════════════════════════════════════════
DEUTSCHE COMPLIANCE (KRITISCH — IMMER PRUEFEN)
═══════════════════════════════════════════════════════════

DSGVO (Datenschutz-Grundverordnung)
  - Personenbezogene Daten NIEMALS in Logs schreiben (Name, Email, Telefon, IP)
  - Loeschfunktion muss fuer User-Daten existieren (DSGVO Art. 17)
  - Einwilligung vor Marketing-Emails (Double-Opt-In)
  - Datenspeicherung nur in der EU (Supabase Frankfurt ist korrekt)
  - Privacy-by-Design: minimale Datenspeicherung

SICHERHEIT
  - Passwort-Hashing: bcrypt mit min. 12 Rounds
  - 2FA: TOTP via speakeasy (window: 1 fuer Zeittoleranz)
  - JWT: kurze Laufzeiten (Access: 15min, Refresh: 7d)
  - SQL-Injection: NIEMALS rohe String-Interpolation in Queries (Supabase-SDK sicher)
  - XSS: HTML NIEMALS mit innerHTML rendern
  - CORS: nur erlaubte Origins (kein *)
  - Helmet.js fuer Security-Headers

ZAHLUNGEN
  - Stripe: Webhook-Signatur IMMER validieren (stripe.webhooks.constructEvent)
  - PayPal: Rechnungen in Euro (EUR), deutsche MwSt (19% Standard, 7% ermaessigt)
  - Rechnungen: Rechnungsnummer, Leistungsdatum, Steuernummer, MWST-Ausweis
  - Umsatzsteuer: 19% auf B2B-Dienstleistungen

STEUER & BUCHFÜHRUNG
  - XRechnung: elektronisches Rechnungsformat fuer oeffentliche Auftraggeber
  - TSE (Kassensicherungsverordnung): Fiskalisierung bei Kassensystemen
  - GoBD: Revisionssicherheit, Unveraenderlichkeit von Buchungsbelegen

BARRIEREFREIHEIT (BFSG ab 2025)
  - ARIA-Labels auf interaktiven Elementen
  - Kontrastverhaeltnis min. 4.5:1 (WCAG AA)
  - Tastaturbedienbarkeit aller Funktionen

═══════════════════════════════════════════════════════════
DOMAIN-WISSEN — MMOS FEATURES
═══════════════════════════════════════════════════════════

BUSINESS-TYPEN (slug-basiert)
  friseur, restaurant, handwerk, hotel, kosmetik, fitness,
  zahnarzt, anwalt, steuerberater, apotheke, einzelhandel

KERN-FEATURES
  - Multi-Tenant: jede Business hat eigene Slug-URL (/[slug])
  - Booking-System: Terminbuchungen mit Kalender-Integration
  - Review-System: Bewertungen mit DSGVO-konformer Speicherung
  - Social-Media-Posts: KI-generiert, plattformspezifisch
  - Local SEO: Keyword-Analyse, Google My Business Integration
  - PDF-Reports: Monatliche Marketing-Reports (PDFKit)
  - Chat-Widget: Floating Chat fuer Business-Websites
  - Admin-Panel: AI-gestuetzte Verwaltung (AdminAiAssistant)

AI-FEATURES (gebaut)
  - Agent (Agentic Loop): 16 Tools, SSE-Streaming, bis 40 Steps
  - Agent-Registry: installierbare Agents + Skills via mmos-package.json
  - Agent-Memory: Supabase-gespeicherte Session-Erinnerung
  - MCP-Client: externe Tool-Server einbinden
  - Chat: multimodal (Text + Bilder), 4 Provider
  - GitHub-Integration: Issues, PRs, Code-Review via API
  - PDF-Generator: Keywords, Marketing-Reports
  - SEO-Keyword-Analyse: lokale Keywords fuer MV

SUBSCRIPTIONS
  - Tiers: Free, Starter (29€/Monat), Professional (79€/Monat), Enterprise (199€/Monat)
  - Abrechnung: Stripe monatlich/jaehrlich, PayPal als Alternative
  - Feature-Flags: basierend auf subscription_tier

═══════════════════════════════════════════════════════════
DEIN WORKFLOW
═══════════════════════════════════════════════════════════

1. PLANEN
   todo("add", "Aufgabe verstehen + Plan erstellen")
   get_repo_tree()   — Dateistruktur ueberblicken
   get_git_log()     — letzte Aenderungen verstehen

2. ERKUNDEN
   get_file_outline()   — Struktur grosser Dateien (mit Zeilennummern!)
   read_files()         — IMMER mehrere Dateien gleichzeitig laden
   grep_files()         — schnelle Suche in gelesenen Dateien
   search_code()        — GitHub-Suche fuer ungelesene Dateien

3. UMSETZEN
   read_file() ZUERST — niemals blind editieren
   patch_file()         — Syntax wird automatisch geprueft
   run_node()           — Logik testen, Regex validieren, require() pruefen
   Bei Fehler: sofort fixen, nie mit Syntaxfehlern abschliessen

4. VERIFIZIEREN
   read_file_lines()    — Aenderung bestaetigen
   todo("done", idx)    — Schritt abhaken

5. ABSCHLIESSEN
   think()              — vollstaendig? korrekt? keine TODOs?
   task_complete()

REGELN
  - NIEMALS editieren ohne vorherigen read_file()
  - NIEMALS task_complete() mit Syntax-Fehlern
  - NIEMALS .env, .key, .pem Dateien lesen
  - Bestehenden Stil und Pattern des Projekts beibehalten
  - Vollstaendiger produktionsreifer Code
  - Auf Deutsch kommentieren und kommunizieren
  - Bei Unsicherheit: think() nutzen und erklaeren was fehlt`

// ── Hilfsfunktionen ────────────────────────────────────────────────────────────

function checkPath(p) {
  const s = String(p)
  if (/\.(env|key|pem|p12|pfx)$/i.test(s)) throw new Error(`Dateityp blockiert: ${s}`)
  if (/\.\./.test(s))                       throw new Error(`Pfad-Traversal blockiert: ${s}`)
}

function extractOutline(content, filePath) {
  const lines = content.split('\n')
  const isTS  = /\.(ts|tsx)$/.test(filePath)
  const out   = []

  lines.forEach((line, i) => {
    const n = i + 1
    const t = line.trim()
    const add = () => out.push(`L${n}: ${t.slice(0, 90)}`)

    if (/^(export\s+)?(async\s+)?function\s+\w+/.test(t))              add()
    else if (/^(export\s+)?(const|let)\s+\w+\s*=\s*(async\s*)?\(/.test(t)) add()
    else if (/^(export\s+)?(default\s+)?class\s+\w+/.test(t))          add()
    else if (isTS && /^(export\s+)?(interface|type)\s+\w+/.test(t))    add()
    else if (/router\.(get|post|put|delete|patch)\s*\(/.test(t))        add()
    else if (/app\.(use|get|post|put|delete)\s*\(/.test(t))             add()
    else if (/^module\.exports/.test(t))                                 add()
    else if (/^export\s+(default|const|function|class|async)/.test(t))  add()
  })

  if (!out.length) return `(keine erkennbare Struktur — nutze read_file fuer vollen Inhalt)`
  const shown = out.slice(0, MAX_OUTLINE_LINES)
  return shown.join('\n') + (out.length > MAX_OUTLINE_LINES ? `\n... +${out.length - MAX_OUTLINE_LINES} weitere` : '')
}

// Syntaxpruefung: node --check fuer JS, JSON.parse fuer JSON, tsc-Simulation fuer TS
async function checkSyntaxContent(content, filePath) {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.json') {
    try { JSON.parse(content); return 'OK: Valides JSON' }
    catch (e) { return `SYNTAX-FEHLER: ${e.message}` }
  }

  if (['.js', '.mjs', '.cjs'].includes(ext)) {
    const tmp = path.join(os.tmpdir(), `mmos-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
    try {
      fs.writeFileSync(tmp, content, 'utf8')
      await execAsync(`node --check "${tmp}"`, { timeout: COMMAND_TIMEOUT_MS })
      return 'OK: Keine Syntax-Fehler'
    } catch (e) {
      const msg = (e.stderr || e.message || '').replace(tmp, filePath).trim()
      return `SYNTAX-FEHLER:\n${msg.slice(0, 600)}`
    } finally {
      try { fs.unlinkSync(tmp) } catch {}
    }
  }

  if (['.ts', '.tsx', '.jsx'].includes(ext)) {
    if (TSC_CMD) {
      const tmp = path.join(os.tmpdir(), `mmos-ts-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
      try {
        fs.writeFileSync(tmp, content, 'utf8')
        const flags = [
          '--noEmit', '--skipLibCheck', '--allowJs', '--allowSyntheticDefaultImports',
          '--esModuleInterop', '--target', 'ES2020', '--module', 'commonjs',
          '--moduleResolution', 'node', '--jsx', ext === '.tsx' ? 'react-jsx' : 'preserve',
          `"${tmp}"`
        ].join(' ')
        await execAsync(`${TSC_CMD} ${flags}`, { timeout: COMMAND_TIMEOUT_MS })
        return 'OK: TypeScript-Syntax gueltig (tsc --noEmit)'
      } catch (e) {
        const raw = (e.stdout || e.stderr || e.message || '')
        const msg = raw.replace(new RegExp(tmp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), filePath).trim()
        return `SYNTAX-FEHLER (tsc):\n${msg.slice(0, 800)}`
      } finally {
        try { fs.unlinkSync(tmp) } catch {}
      }
    }
    // Fallback wenn tsc nicht verfuegbar: Klammer-Heuristik
    const open  = (content.match(/\{/g) || []).length
    const close = (content.match(/\}/g) || []).length
    if (Math.abs(open - close) > 2) return `SYNTAX-WARNUNG: ${open} '{' aber ${close} '}' — moeglicherweise unbalanciert (tsc nicht verfuegbar)`
    return 'OK: Keine offensichtlichen Syntax-Fehler (tsc nicht gefunden — npm install -g typescript fuer echten Check)'
  }

  return null  // kein Check fuer diesen Dateityp
}

// Kontext-Kompression bei langen Sessions
function compressIfNeeded(messages) {
  const totalChars = messages.reduce((s, m) => s + (m.content?.length || 0), 0)
  if (totalChars < COMPRESS_THRESHOLD) return messages

  const system    = messages[0]
  const firstUser = messages[1]
  const recent    = messages.slice(-16)

  const changed = []
  for (const m of messages.slice(2, -16)) {
    if (m.role === 'tool' && String(m.content).startsWith('OK:')) {
      const match = String(m.content).match(/"([^"]+)"/)
      if (match && !changed.includes(match[1])) changed.push(match[1])
    }
  }

  return [
    system,
    firstUser,
    {
      role: 'user',
      content: `[KONTEXT KOMPRIMIERT — ${messages.length - 18} aeltere Nachrichten entfernt]\n` +
        (changed.length ? `Bisher geaendert: ${changed.join(', ')}\n` : '') +
        `Bitte setze die Aufgabe fort.`
    },
    ...recent
  ]
}

// ── KI-Aufrufe ─────────────────────────────────────────────────────────────────

async function callGroq(messages, tools = TOOLS) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: GROQ_MODEL, messages, tools, tool_choice: 'auto', temperature: 0.1, max_tokens: 8192 })
  })
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`Groq ${res.status}: ${t.slice(0, 300)}`) }
  return (await res.json()).choices?.[0]?.message || null
}

async function callOllama(messages, tools = TOOLS) {
  const res = await fetch(`${OLLAMA_HOST}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL, messages, tools, tool_choice: 'auto', stream: false,
      options: { num_ctx: 32768, temperature: 0.1, repeat_penalty: 1.1, top_p: 0.9 }
    })
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    if (res.status === 404) throw new Error(`Modell "${OLLAMA_MODEL}" nicht gefunden. Terminal: ollama pull ${OLLAMA_MODEL}`)
    throw new Error(`Ollama ${res.status}: ${t.slice(0, 300)}`)
  }
  return (await res.json()).choices?.[0]?.message || null
}

async function callAnthropic(messages, tools = TOOLS) {
  const sysMsg    = messages.find(m => m.role === 'system')
  const otherMsgs = messages.filter(m => m.role !== 'system')

  const anthropicMsgs = otherMsgs.map(m => {
    if (m.role === 'tool') return { role: 'user', content: [{ type: 'tool_result', tool_use_id: m.tool_call_id, content: m.content }] }
    if (m.tool_calls) return {
      role: 'assistant',
      content: [
        ...(m.content ? [{ type: 'text', text: m.content }] : []),
        ...m.tool_calls.map(tc => ({ type: 'tool_use', id: tc.id, name: tc.function.name, input: JSON.parse(tc.function.arguments || '{}') }))
      ]
    }
    return m
  })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: sysMsg?.content || SYSTEM_PROMPT,
      messages: anthropicMsgs,
      tools: tools.map(t => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters }))
    })
  })
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`) }

  const data  = await res.json()
  const toolB = data.content?.filter(b => b.type === 'tool_use') || []
  const textB = data.content?.filter(b => b.type === 'text')     || []
  const text  = textB.map(b => b.text).join('\n').trim() || null

  if (toolB.length) return {
    role: 'assistant', content: text,
    tool_calls: toolB.map(b => ({ id: b.id, type: 'function', function: { name: b.name, arguments: JSON.stringify(b.input || {}) } }))
  }
  return { role: 'assistant', content: text }
}

// Fallback: Tool-Call aus Text extrahieren (fuer Modelle ohne natives Tool-Calling)
function parseToolCallFromText(text) {
  if (!text) return null
  const p1 = text.match(/\{\s*"tool"\s*:\s*"(\w+)"\s*,\s*"input"\s*:\s*(\{[\s\S]*?\})\s*\}/)
  if (p1) { try { return { name: p1[1], input: JSON.parse(p1[2]) } } catch {} }
  const p2 = text.match(/\b(\w+)\s*\(\s*(\{[\s\S]*?\})\s*\)/)
  if (p2 && TOOLS.some(t => t.function.name === p2[1])) { try { return { name: p2[1], input: JSON.parse(p2[2]) } } catch {} }
  return null
}

// ── Tools ausfuehren ───────────────────────────────────────────────────────────

async function executeTool(name, input, ctx) {
  const { stagedFiles, fileCache, branch, patchFailCounts, todoList, onEvent, waitForConfirmation } = ctx

  // Bestaetigungs-Modus: vor patch_file / write_file nachfragen
  async function confirmWrite(opName, filePath, preview) {
    if (!waitForConfirmation) return true  // Modus deaktiviert
    const requestId = `confirm-${Date.now()}-${Math.random().toString(36).slice(2)}`
    onEvent({ type: 'confirmation_request', requestId, op: opName, path: filePath, preview })
    const approved = await waitForConfirmation(requestId)
    if (!approved) onEvent({ type: 'confirmation_denied', path: filePath })
    return approved
  }

  // Hilfsfunktion: Dateiinhalt aus Cache holen oder laden
  async function getContent(p) {
    if (stagedFiles.has(p)) return stagedFiles.get(p)
    if (fileCache.has(p))   return fileCache.get(p)
    const c = await githubService.getFile(p, branch)
    fileCache.set(p, c)
    return c
  }

  switch (name) {

    case 'think':
      return `[Reasoning]\n${input.reasoning || ''}`

    case 'get_repo_tree': {
      const tree = await githubService.getRepoTree(branch)
      const f    = input.filter ? tree.filter(x => x.path.includes(String(input.filter))) : tree
      return f.slice(0, 200).map(x => x.path).join('\n')
    }

    case 'list_directory': {
      const items = await githubService.getDirectory(input.path || '', branch)
      return items.length ? items.map(i => `${i.type === 'dir' ? '📁' : '📄'} ${i.name}`).join('\n') : '(leer)'
    }

    case 'get_file_outline': {
      checkPath(input.path)
      const content = await getContent(input.path)
      const lines   = content.split('\n').length
      return `${input.path} (${lines} Zeilen)\n\n${extractOutline(content, input.path)}`
    }

    case 'read_file': {
      checkPath(input.path)
      const content = await getContent(input.path)
      const trunc   = content.length > MAX_FILE_CHARS
      return content.slice(0, MAX_FILE_CHARS) +
        (trunc ? `\n\n[...gekuerzt bei ${MAX_FILE_CHARS} Zeichen — nutze read_file_lines fuer weitere Abschnitte]` : '')
    }

    case 'read_file_lines': {
      checkPath(input.path)
      const content  = await getContent(input.path)
      const allLines = content.split('\n')
      const from     = Math.max(0, (Number(input.from_line) || 1) - 1)
      const to       = Math.min(allLines.length, Number(input.to_line) || allLines.length)
      return allLines.slice(from, to).map((l, i) => `${from + i + 1}: ${l}`).join('\n')
    }

    case 'grep_files': {
      const pattern    = String(input.pattern || '')
      const pathFilter = String(input.path_filter || '')

      // Alle gelesenen + staged Dateien durchsuchen
      const merged = new Map([...fileCache, ...stagedFiles])
      let regex
      try {
        // /pattern/ → Regex, sonst Plain-String
        const rxMatch = pattern.match(/^\/(.+)\/([gimsuy]*)$/)
        regex = rxMatch ? new RegExp(rxMatch[1], rxMatch[2]) : null
      } catch { regex = null }

      const results = []
      for (const [filePath, content] of merged) {
        if (pathFilter && !filePath.includes(pathFilter)) continue
        const lines = content.split('\n')
        lines.forEach((line, i) => {
          const hit = regex ? regex.test(line) : line.includes(pattern)
          if (hit) results.push(`${filePath}:${i + 1}: ${line.trim().slice(0, 120)}`)
        })
      }

      if (!results.length) {
        return merged.size === 0
          ? `(Keine Dateien im Cache — erst read_file() aufrufen, dann grep_files())`
          : `Keine Treffer fuer "${pattern}"${pathFilter ? ` in "${pathFilter}"` : ''} (${merged.size} Dateien durchsucht)`
      }
      return results.slice(0, 60).join('\n') + (results.length > 60 ? `\n... +${results.length - 60} weitere` : '')
    }

    case 'search_code': {
      const results = await githubService.searchCode(String(input.query))
      if (!results.length) return `Keine Treffer fuer "${input.query}"`
      return results.slice(0, 8).map(r =>
        `${r.path}\n${(r.matches || []).map(m => `  > ${String(m).slice(0, 120)}`).join('\n')}`
      ).join('\n\n')
    }

    case 'check_syntax': {
      checkPath(input.path)
      const ext = path.extname(input.path).toLowerCase()
      if (!SYNTAX_CHECK_EXTS.has(ext)) return `Kein Syntax-Check fuer ${ext}`
      if (!stagedFiles.has(input.path) && !fileCache.has(input.path)) {
        return `Datei nicht im Cache — erst read_file("${input.path}") aufrufen`
      }
      const content = await getContent(input.path)
      return await checkSyntaxContent(content, input.path)
    }

    case 'get_git_log': {
      const commits = await githubService.getCommits({
        branch:   input.branch || branch,
        perPage:  Number(input.limit) || 10,
        path:     input.file_path || ''
      })
      if (!commits.length) return 'Keine Commits gefunden'
      return commits.map(c => `${c.sha} ${c.date} ${c.author}: ${c.message}`).join('\n')
    }

    case 'patch_file': {
      checkPath(input.path)
      const current = await getContent(input.path)
      const count   = current.split(input.old_str).length - 1

      if (count === 0) {
        const key = input.path
        patchFailCounts[key] = (patchFailCounts[key] || 0) + 1
        const hint = patchFailCounts[key] >= 2
          ? `\n→ Strategie: get_file_outline("${key}") fuer Zeilennummern, dann read_file_lines() fuer den genauen Bereich.`
          : `\n→ Lies die Datei neu: read_file("${key}") und kopiere old_str Zeichen-genau (Einrueckung beachten!).`
        return `FEHLER: old_str nicht gefunden in "${input.path}".${hint}`
      }
      if (count > 1) return `FEHLER: old_str ist ${count}x vorhanden. Verwende mehr Kontext-Zeilen um es eindeutig zu machen.`

      const preview = `- ${(input.old_str || '').slice(0, 200)}\n+ ${(input.new_str || '').slice(0, 200)}`
      const approved = await confirmWrite('patch_file', input.path, preview)
      if (!approved) return `ABGEBROCHEN: Nutzer hat Aenderung an "${input.path}" abgelehnt.`

      const oldContent = current
      const updated    = current.replace(input.old_str, input.new_str)
      stagedFiles.set(input.path, updated)
      fileCache.set(input.path, updated)
      delete patchFailCounts[input.path]

      const patchLine = current.slice(0, current.indexOf(input.old_str)).split('\n').length
      const lineDiff  = input.new_str.split('\n').length - input.old_str.split('\n').length

      // Diff-Event fuer Frontend-Diff-View
      onEvent({ type: 'file_diff', path: input.path, oldContent, newContent: updated })

      // Automatische Syntaxpruefung
      const ext = path.extname(input.path).toLowerCase()
      let syntaxNote = ''
      if (SYNTAX_CHECK_EXTS.has(ext)) {
        const check = await checkSyntaxContent(updated, input.path)
        syntaxNote = check ? `\nSyntax: ${check}` : ''
      }

      return `OK: patch_file "${input.path}" — Zeile ~${patchLine}, ${lineDiff >= 0 ? '+' : ''}${lineDiff} Zeilen${syntaxNote}\nVerifiziere: read_file_lines("${input.path}", ${Math.max(1, patchLine - 1)}, ${patchLine + input.new_str.split('\n').length + 1})`
    }

    case 'write_file': {
      checkPath(input.path)
      const isNew      = !fileCache.has(input.path) && !stagedFiles.has(input.path)
      const approvedW  = await confirmWrite('write_file', input.path, `${input.content?.slice(0, 300)}…`)
      if (!approvedW) return `ABGEBROCHEN: Nutzer hat write_file fuer "${input.path}" abgelehnt.`
      const oldContent = isNew ? '' : (fileCache.get(input.path) || stagedFiles.get(input.path) || '')
      stagedFiles.set(input.path, input.content)
      fileCache.set(input.path, input.content)

      // Diff-Event fuer Frontend-Diff-View
      onEvent({ type: 'file_diff', path: input.path, oldContent, newContent: input.content })

      // Automatische Syntaxpruefung
      const ext = path.extname(input.path).toLowerCase()
      let syntaxNote = ''
      if (SYNTAX_CHECK_EXTS.has(ext)) {
        const check = await checkSyntaxContent(input.content, input.path)
        syntaxNote = check ? `\nSyntax: ${check}` : ''
      }

      return `OK: write_file "${input.path}" ${isNew ? '(neue Datei)' : '(ueberschrieben)'} — ${input.content.split('\n').length} Zeilen${syntaxNote}`
    }

    case 'run_node': {
      const code = String(input.code || '').slice(0, 5000)
      const tmp  = path.join(os.tmpdir(), `mmos-run-${Date.now()}-${Math.random().toString(36).slice(2)}.js`)
      try {
        fs.writeFileSync(tmp, code, 'utf8')
        const { stdout, stderr } = await execAsync(`node "${tmp}"`, {
          timeout: 5000,
          env: { PATH: process.env.PATH, NODE_ENV: 'test', HOME: process.env.HOME }
        })
        const out = (stdout || '').slice(0, 2000)
        const err = (stderr || '').slice(0, 500)
        return `stdout:\n${out || '(leer)'}${err ? `\nstderr:\n${err}` : ''}`
      } catch (e) {
        const msg = (e.stderr || e.stdout || e.message || '').slice(0, 1000)
        return `FEHLER:\n${msg}`
      } finally {
        try { fs.unlinkSync(tmp) } catch {}
      }
    }

    case 'read_files': {
      const paths = (Array.isArray(input.paths) ? input.paths : []).slice(0, 6)
      if (!paths.length) return 'Kein Pfad angegeben'
      paths.forEach(p => checkPath(p))
      const results = await Promise.all(paths.map(async p => {
        try {
          const content = await getContent(p)
          const trunc   = content.length > MAX_FILE_CHARS
          return `${'='.repeat(60)}\n## ${p} (${content.split('\n').length} Zeilen)\n${'='.repeat(60)}\n` +
            content.slice(0, MAX_FILE_CHARS) +
            (trunc ? `\n[...gekuerzt — nutze read_file_lines fuer weitere Abschnitte]` : '')
        } catch (e) {
          return `${'='.repeat(60)}\n## ${p}\nFEHLER: ${e.message}`
        }
      }))
      return results.join('\n\n')
    }

    case 'todo': {
      const { action, item, index } = input
      if (action === 'add') {
        if (!item) return 'FEHLER: item Pflichtfeld bei action=add'
        todoList.push({ text: String(item).slice(0, 200), done: false })
        onEvent({ type: 'todo_update', todos: todoList.map((t, i) => ({ ...t, index: i + 1 })) })
        return `TODO #${todoList.length} hinzugefuegt: ${item}`
      }
      if (action === 'done') {
        const idx = Number(index) - 1
        if (idx < 0 || idx >= todoList.length) return `FEHLER: Index ${index} ungueltig (${todoList.length} TODOs vorhanden)`
        todoList[idx].done = true
        onEvent({ type: 'todo_update', todos: todoList.map((t, i) => ({ ...t, index: i + 1 })) })
        return `TODO #${index} erledigt: ${todoList[idx].text}`
      }
      if (action === 'list') {
        if (!todoList.length) return '(keine TODOs)'
        return todoList.map((t, i) => `${i + 1}. [${t.done ? '✓' : ' '}] ${t.text}`).join('\n')
      }
      return 'FEHLER: action muss add/done/list sein'
    }

    case 'task_complete':
      return `__TASK_COMPLETE__:${JSON.stringify({ summary: input.summary, prTitle: input.pr_title, prBody: input.pr_body })}`

    case 'fetch_url': {
      const rawUrl = String(input.url || '').trim()
      if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) return 'Fehler: Nur http/https URLs erlaubt.'
      // Sicherheit: keine internen/privaten Adressen
      const blocked = /localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\./i
      if (blocked.test(rawUrl)) return 'Fehler: Interne Adressen sind blockiert.'
      try {
        const res = await fetch(rawUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MMOS-SEO-Bot/1.0; +https://mecklenburgmarketingos.de)' },
          signal: AbortSignal.timeout(12000),
          redirect: 'follow'
        })
        if (!res.ok) return `HTTP ${res.status} — Seite nicht erreichbar.`
        const html = await res.text()
        const mode = input.extract || 'seo'

        // Hilfsfunktionen
        const tag  = (h, a) => { const m = html.match(new RegExp(`<${h}[^>]*${a ? `${a}="([^"]*)"` : ''}[^>]*(?:content="([^"]*)")?[^>]*>`, 'i')); return m?.[2] || m?.[1] || '' }
        const meta = (n)    => { const m = html.match(new RegExp(`<meta[^>]*name="${n}"[^>]*content="([^"]*)"`, 'i')) || html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*name="${n}"`, 'i')); return m?.[1] || '' }
        const metaProp = (p) => { const m = html.match(new RegExp(`<meta[^>]*property="${p}"[^>]*content="([^"]*)"`, 'i')); return m?.[1] || '' }

        const title    = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim()
        const desc     = meta('description')
        const robots   = meta('robots')
        const canonical = (html.match(/rel="canonical"[^>]*href="([^"]*)"/, 'i') || html.match(/href="([^"]*)"[^>]*rel="canonical"/i))?.[1] || ''
        const h1s      = [...html.matchAll(/<h1[^>]*>([^<]*)<\/h1>/gi)].map(m => m[1].trim()).slice(0, 5)
        const h2s      = [...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/gi)].map(m => m[1].trim()).slice(0, 8)
        const h3s      = [...html.matchAll(/<h3[^>]*>([^<]*)<\/h3>/gi)].map(m => m[1].trim()).slice(0, 8)
        const schemas  = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(m => { try { return JSON.parse(m[1]) } catch { return null } }).filter(Boolean)
        const images   = [...html.matchAll(/<img[^>]*src="([^"]*)"[^>]*>/gi)].map(m => ({ src: m[1], alt: (m[0].match(/alt="([^"]*)"/i)?.[1] || '') })).slice(0, 20)
        const imgNoAlt = images.filter(i => !i.alt).length
        const links    = [...html.matchAll(/href="(https?:\/\/[^"]+)"/gi)].map(m => m[1]).slice(0, 30)
        const ogTitle  = metaProp('og:title'); const ogDesc = metaProp('og:description'); const ogImg = metaProp('og:image')

        if (mode === 'text') {
          const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          return text.slice(0, 6000)
        }
        if (mode === 'links') return `Links (${links.length}):\n${links.join('\n')}`
        if (mode === 'schema') return schemas.length ? JSON.stringify(schemas, null, 2).slice(0, 5000) : 'Kein JSON-LD Schema gefunden.'

        // SEO oder ALL
        const lines = [
          `URL: ${rawUrl}`,
          `Status: ${res.status}`,
          `\n── On-Page SEO ──`,
          `Title (${title.length} Z.): ${title || '❌ FEHLT'}`,
          `Meta Description (${desc.length} Z.): ${desc || '❌ FEHLT'}`,
          `Canonical: ${canonical || '⚠️ nicht gesetzt'}`,
          `Robots: ${robots || 'nicht gesetzt (Standard: index,follow)'}`,
          `\n── Headings ──`,
          `H1 (${h1s.length}): ${h1s.join(' | ') || '❌ FEHLT'}`,
          `H2 (${h2s.length}): ${h2s.slice(0, 4).join(' | ')}`,
          `H3 (${h3s.length}): ${h3s.slice(0, 3).join(' | ')}`,
          `\n── Open Graph ──`,
          `og:title: ${ogTitle || '⚠️ fehlt'}`,
          `og:description: ${ogDesc || '⚠️ fehlt'}`,
          `og:image: ${ogImg || '⚠️ fehlt'}`,
          `\n── Bilder ──`,
          `${images.length} Bilder, ${imgNoAlt} ohne Alt-Text ${imgNoAlt > 0 ? '⚠️' : '✓'}`,
          `\n── Schema.org ──`,
          schemas.length ? schemas.map(s => `${s['@type'] || '?'}: ${JSON.stringify(s).slice(0, 200)}`).join('\n') : '❌ Kein JSON-LD Schema gefunden',
          mode === 'all' ? `\n── Links ──\n${links.slice(0, 15).join('\n')}` : ''
        ].filter(Boolean)

        return lines.join('\n').slice(0, 8000)
      } catch (e) {
        return `fetch_url Fehler: ${e.message}`
      }
    }

    default: {
      // MCP-Tool? (Format: mcp__servername__toolname)
      if (name.startsWith('mcp__') && ctx.mcpEndpointMap) {
        const endpoint = ctx.mcpEndpointMap.get(name)
        if (!endpoint) return `Fehler: MCP-Tool "${name}" nicht in der Endpoint-Map gefunden.`
        try {
          const result = await mcpClientService.callTool(endpoint.serverUrl, endpoint.mcpName, input)
          return result
        } catch (e) {
          return `MCP-Fehler (${endpoint.mcpName}): ${e.message}`
        }
      }
      return `Unbekanntes Tool: ${name}`
    }
  }
}

// ── Haupt-Loop ─────────────────────────────────────────────────────────────────

// agentConfig: optionaler Agent aus der Registry { system_prompt, allowed_tools, provider, model }
// waitForConfirmation: optionale Funktion (requestId) => Promise<boolean> fuer Bestaetigungs-Modus
// memoryBlock: optionaler Gedaechtnis-String aus agentMemoryService
async function runAgent({ task, branch = 'main', agentConfig = null, waitForConfirmation = null, memoryBlock = null, onEvent = () => {} }) {
  const provider = agentConfig?.provider && agentConfig.provider !== 'default'
    ? agentConfig.provider
    : resolveProvider()

  if (provider === 'ollama') {
    try { await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(4000) }) }
    catch { onEvent({ type: 'error', message: `Ollama nicht erreichbar (${OLLAMA_HOST}). Starte: ollama serve` }); return { stagedFiles: new Map(), prTitle: '', prBody: '', summary: '' } }
  }

  const stagedFiles     = new Map()
  const fileCache       = new Map()
  const patchFailCounts = {}
  const todoList        = []

  // MCP-Tools einmalig vor dem Loop entdecken
  let mcpTools       = []
  let mcpEndpointMap = new Map()
  try {
    const discovered   = await mcpClientService.discoverTools()
    mcpTools           = discovered.tools
    mcpEndpointMap     = discovered.endpointMap
    if (mcpTools.length) onEvent({ type: 'thinking', text: `[MCP: ${mcpTools.length} externe Tools aus ${[...new Set(mcpTools.map(t => t.name.split('__')[1]))].join(', ')} geladen]` })
  } catch (e) {
    console.warn('MCP discovery error:', e.message)
  }

  const ctx = { stagedFiles, fileCache, branch, patchFailCounts, todoList, onEvent, waitForConfirmation, mcpEndpointMap }

  // CLAUDE.md laden (Projekt-Gedaechtnis) — Fehler ignorieren
  let claudeMdContent = ''
  try {
    claudeMdContent = await githubService.getFile('CLAUDE.md', branch)
    fileCache.set('CLAUDE.md', claudeMdContent)
    onEvent({ type: 'thinking', text: `[CLAUDE.md geladen — ${claudeMdContent.split('\n').length} Zeilen Projekt-Kontext]` })
  } catch { /* Kein CLAUDE.md — OK */ }

  // Custom-Agent-Config aus Registry verwenden wenn vorhanden
  const basePrompt    = agentConfig?.system_prompt || SYSTEM_PROMPT
  const systemPrompt  = [
    basePrompt,
    claudeMdContent ? `## Projekt-Gedaechtnis (CLAUDE.md)\n\n${claudeMdContent.slice(0, 8000)}` : null,
    memoryBlock     || null
  ].filter(Boolean).join('\n\n')
  const allowedTools  = agentConfig?.allowed_tools || null  // null = alle Tools
  const allTools      = [...TOOLS, ...mcpTools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }))]
  const activeTools   = allowedTools ? allTools.filter(t => allowedTools.includes(t.function.name)) : allTools

  let messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: `## Aufgabe\n\n${task}\n\nBranch: ${branch}\n\nStarte mit todo("add") fuer deinen Plan, dann get_repo_tree() und get_git_log() fuer Kontext. Nutze read_files() statt mehrerer read_file()-Aufrufe.` }
  ]

  let prTitle = `ai: ${task.slice(0, 60)}`
  let prBody  = `## Aufgabe\n\n${task}\n\n---\n_Generiert von MMOS Dev-Agent_ 🤖`
  let summary = ''
  let steps   = 0

  while (steps < MAX_STEPS) {
    steps++
    messages = compressIfNeeded(messages)

    let message
    try {
      if      (provider === 'groq')      message = await callGroq(messages, activeTools)
      else if (provider === 'anthropic') message = await callAnthropic(messages, activeTools)
      else                               message = await callOllama(messages, activeTools)
    } catch (e) { onEvent({ type: 'error', message: e.message }); break }

    if (!message) { onEvent({ type: 'error', message: 'Leere Antwort vom Modell' }); break }
    if (message.content) onEvent({ type: 'thinking', text: message.content })

    let toolCalls = message.tool_calls || []
    if (!toolCalls.length && message.content) {
      const parsed = parseToolCallFromText(message.content)
      if (parsed) toolCalls = [{ id: `fb_${Date.now()}`, type: 'function', function: { name: parsed.name, arguments: JSON.stringify(parsed.input) } }]
    }
    if (!toolCalls.length) break

    messages.push({ role: 'assistant', content: message.content || null, tool_calls: toolCalls })

    for (const tc of toolCalls) {
      const toolName = tc.function?.name
      let toolInput  = {}
      try { toolInput = JSON.parse(tc.function?.arguments || '{}') } catch {}

      onEvent({ type: 'tool_call', tool: toolName, input: toolInput })

      let result
      try { result = await executeTool(toolName, toolInput, ctx) }
      catch (e) { result = `FEHLER: ${e.message}`; onEvent({ type: 'tool_error', tool: toolName, error: e.message }) }

      if (typeof result === 'string' && result.startsWith('__TASK_COMPLETE__:')) {
        const meta = JSON.parse(result.slice('__TASK_COMPLETE__:'.length))
        summary = meta.summary; prTitle = meta.prTitle || prTitle; prBody = meta.prBody || prBody
        onEvent({ type: 'complete', summary, prTitle, prBody, filesChanged: stagedFiles.size })
        return { stagedFiles, prTitle, prBody, summary, provider, stepsUsed: steps }
      }

      if ((toolName === 'patch_file' || toolName === 'write_file') && String(result).startsWith('OK:')) {
        onEvent({ type: 'file_changed', path: toolInput.path, isNew: String(result).includes('neue Datei') })
      }

      const shortResult = String(result).length > 4000 ? String(result).slice(0, 4000) + '\n[...gekuerzt]' : result
      onEvent({ type: 'tool_result', tool: toolName, result: String(shortResult).slice(0, 500) })
      messages.push({ role: 'tool', tool_call_id: tc.id, content: String(shortResult) })
    }
  }

  if (steps >= MAX_STEPS) onEvent({ type: 'max_steps', stepsUsed: steps, filesChanged: stagedFiles.size })
  return { stagedFiles, prTitle, prBody, summary, provider, stepsUsed: steps }
}

module.exports = { runAgent, MAX_STEPS }
