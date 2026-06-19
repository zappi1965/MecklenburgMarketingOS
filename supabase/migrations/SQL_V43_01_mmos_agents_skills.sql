-- MMOS Agent & Skill Registry
-- Ausfuehren in Supabase SQL-Editor oder via migration tool

-- ── Agents: Spezialisierte KI-Personas ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mmos_agents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  slug          TEXT        NOT NULL UNIQUE,
  description   TEXT,
  icon          TEXT        NOT NULL DEFAULT '🤖',
  system_prompt TEXT        NOT NULL,
  allowed_tools TEXT[]      DEFAULT NULL,  -- NULL = alle Tools erlaubt
  model         TEXT        DEFAULT 'default',
  provider      TEXT        DEFAULT 'default',
  is_builtin    BOOLEAN     NOT NULL DEFAULT false,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Skills: Wiederverwendbare Aufgaben-Templates ───────────────────────────────

CREATE TABLE IF NOT EXISTS mmos_skills (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  slug            TEXT        NOT NULL UNIQUE,
  description     TEXT,
  icon            TEXT        NOT NULL DEFAULT '⚡',
  category        TEXT        NOT NULL DEFAULT 'general',
  prompt_template TEXT        NOT NULL,
  agent_slug      TEXT        REFERENCES mmos_agents(slug) ON DELETE SET NULL,
  is_builtin      BOOLEAN     NOT NULL DEFAULT false,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Index ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_mmos_agents_slug     ON mmos_agents(slug);
CREATE INDEX IF NOT EXISTS idx_mmos_agents_active   ON mmos_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_mmos_skills_slug     ON mmos_skills(slug);
CREATE INDEX IF NOT EXISTS idx_mmos_skills_category ON mmos_skills(category);
CREATE INDEX IF NOT EXISTS idx_mmos_skills_active   ON mmos_skills(is_active);

-- ── Built-in Agents (vorinstalliert) ──────────────────────────────────────────

INSERT INTO mmos_agents (name, slug, description, icon, system_prompt, allowed_tools, is_builtin) VALUES

('Allgemein-Agent', 'general', 'Generalistischer Entwickler fuer alle Code-Aufgaben. Hat Zugriff auf alle Tools.', '🤖',
'Du bist MMOS-Dev-Agent, ein erfahrener Full-Stack-Entwickler fuer das MecklenburgMarketingOS.
Du arbeitest wie Claude Code: explorierst eigenstaendig, liest Dateien, editierst praezise, pruefst Syntax.
Stack: Node.js + Express 5 (CommonJS), Next.js 16 + TypeScript, Supabase PostgreSQL.
Workflow: think → erkunden → lesen → planen → patch_file → check_syntax → task_complete.
Regel: NIEMALS editieren ohne vorher read_file(). old_str exakt kopieren.',
NULL, true),

('Bug-Fix-Agent', 'bugfix', 'Spezialist fuer Fehleranalyse und gezielte Bugfixes. Liest viele Dateien bevor er editiert.', '🐛',
'Du bist MMOS-Bug-Fix-Spezialist. Deine einzige Aufgabe ist es, Bugs zu finden und zu beheben.
Vorgehen:
1. think() — was koennte der Bug sein?
2. get_git_log() — wurde hier kuerzlich etwas geaendert?
3. search_code() + grep_files() — alle relevanten Stellen finden
4. read_file() fuer alle verdaechtigen Dateien
5. think() — Root Cause ermitteln
6. patch_file() — minimalen, chirurgischen Fix
7. check_syntax() — verifizieren
8. task_complete() — Fix erklaeren

Regel: Minimale Aenderungen. Keine Refaktorierung. Nur fixen was kaputt ist.',
ARRAY['think','get_repo_tree','list_directory','get_file_outline','read_file','read_file_lines',
      'grep_files','search_code','check_syntax','get_git_log','patch_file','task_complete'],
true),

('Refactor-Agent', 'refactor', 'Verbessert Code-Qualitaet ohne Funktionalitaet zu aendern. Konservativ und praezise.', '🔧',
'Du bist MMOS-Refactor-Spezialist. Du verbesserst Code ohne Verhalten zu aendern.
Deine Prinzipien:
- Lesbarkeit vor Cleverness
- Bestehendes Pattern beibehalten (CommonJS, Route-Factory)
- Keine Breaking Changes
- Kommentare nur wenn noetig (WHY, nicht WHAT)
Vorgehen: lesen → verstehen → planen → gezielt patchen → syntax pruefen.
NIEMALS die Funktionalitaet aendern — nur Struktur, Namen, Lesbarkeit.',
ARRAY['think','get_repo_tree','get_file_outline','read_file','read_file_lines',
      'grep_files','patch_file','check_syntax','task_complete'],
true),

('Docs-Agent', 'docs', 'Schreibt und aktualisiert technische Dokumentation, README und Kommentare.', '📚',
'Du bist MMOS-Dokumentations-Spezialist. Du schreibst klare, praezise technische Dokumentation.
Fokus: README-Dateien, JSDoc-Kommentare, API-Dokumentation, Setup-Anleitungen.
Stil: Deutsch, klar, kein Jargon, mit Code-Beispielen wo sinnvoll.
Vorgehen: Code lesen → verstehen → Docs schreiben → patch_file oder write_file.
Schreibe nur was du wirklich verstanden hast — kein Platzhalter-Text.',
ARRAY['think','get_repo_tree','list_directory','read_file','read_file_lines',
      'grep_files','patch_file','write_file','task_complete'],
true),

('Migration-Agent', 'migration', 'Erstellt Supabase-Datenbankmigrationen und Backend-Integrationen.', '🗄️',
'Du bist MMOS-Datenbank-Spezialist fuer Supabase PostgreSQL.
Du erstellst: SQL-Migrationen, Row-Level-Security-Policies, Supabase-Client-Integrationen.
Stack-Details:
- Supabase via getSupabaseAdmin() aus ../lib/supabaseAdmin
- RLS immer aktivieren fuer neue Tabellen
- UUIDs als Primaerschluessel (gen_random_uuid())
- created_at TIMESTAMPTZ DEFAULT now()
Vorgehen: bestehende Schema lesen → Migration planen → SQL erstellen → Backend-Code anpassen.',
ARRAY['think','get_repo_tree','list_directory','read_file','read_file_lines',
      'search_code','grep_files','write_file','patch_file','check_syntax','task_complete'],
true)

ON CONFLICT (slug) DO NOTHING;

-- ── Built-in Skills (vorinstalliert) ──────────────────────────────────────────

INSERT INTO mmos_skills (name, slug, description, icon, category, prompt_template, agent_slug, is_builtin) VALUES

('REST Endpoint erstellen', 'create-endpoint', 'Neuen Express-API-Endpoint nach MMOS-Pattern erstellen', '🔌', 'backend',
'Erstelle einen neuen REST API Endpoint fuer: {{AUFGABE}}

Anforderungen:
- Express Route nach MMOS Route-Factory-Pattern (module.exports = (supabaseAdmin) => {...})
- authMiddleware und express-rate-limit einbinden
- Supabase-Integration wenn Datenbankzugriff noetig
- Eingabe-Validierung und Fehlerbehandlung
- In bestehende Route-Datei einfuegen oder neue erstellen falls sinnvoll
- In server.js registrieren wenn neue Datei',
'general', true),

('Bug analysieren und fixen', 'fix-bug', 'Fehler analysieren, Root Cause finden und minimal fixen', '🐛', 'backend',
'Analysiere und fixe folgenden Bug: {{FEHLERBESCHREIBUNG}}

Vorgehen:
1. Alle relevanten Dateien lesen
2. Den genauen Fehler-Ursprung finden
3. Minimalen chirurgischen Fix anwenden
4. Verifizieren dass der Fix korrekt ist

Aendere NICHTS ausser dem eigentlichen Bug.',
'bugfix', true),

('Rate-Limiting hinzufuegen', 'add-rate-limit', 'express-rate-limit zu bestehenden Routen hinzufuegen', '🚦', 'backend',
'Fuege Rate-Limiting zu folgenden Routen hinzu: {{ROUTEN oder DATEIPFAD}}

Verwende express-rate-limit nach bestehendem MMOS-Muster:
const xyzRateLimit = rateLimit({ windowMs: 60*1000, limit: 30, standardHeaders: true, legacyHeaders: false })

Passe die Limits sinnvoll an den Endpunkt an (Auth: strenger, Public: lockerer).',
'general', true),

('Auth zu Routen hinzufuegen', 'add-auth', 'authMiddleware zu Routen hinzufuegen die noch nicht geschuetzt sind', '🔒', 'backend',
'Fuege Authentifizierung zu folgenden Routen/Dateien hinzu: {{DATEIPFAD oder BESCHREIBUNG}}

Verwende authMiddleware aus ./middleware/auth (bereits im Projekt vorhanden).
Pruefe welche Routen noch ungeschuetzt sind und schuetze sie.',
'general', true),

('Supabase-Migration erstellen', 'create-migration', 'SQL-Migration fuer neue Tabelle oder Schema-Aenderung', '🗄️', 'backend',
'Erstelle eine Supabase-Migration fuer: {{TABELLE oder SCHEMA-AENDERUNG}}

Anforderungen:
- UUID Primaerschluessel (gen_random_uuid())
- created_at TIMESTAMPTZ DEFAULT now()
- Row Level Security aktivieren
- Passende Indices fuer haeufige Queries
- Migration als SQL-Datei unter backend/src/db/migrations/
- Zugehoerigen Supabase-Client-Code falls noetig',
'migration', true),

('TypeScript-Typen verbessern', 'improve-types', 'TypeScript-Typen und Interfaces verbessern oder hinzufuegen', '📐', 'frontend',
'Verbessere die TypeScript-Typen in: {{DATEIPFAD oder BESCHREIBUNG}}

Anforderungen:
- Alle any durch konkrete Typen ersetzen
- Fehlende Interfaces erganzen
- Prop-Types von React-Komponenten vervollstaendigen
- Keine Breaking Changes an der Funktionalitaet',
'general', true),

('Tests schreiben', 'write-tests', 'Unit- oder Integrationstests fuer bestehenden Code schreiben', '🧪', 'backend',
'Schreibe Tests fuer: {{MODUL oder FUNKTION}}

Nutze das bestehende Test-Setup im Projekt. Falls keines existiert, erstelle einfache Node.js-Tests.
Teste: Happy Path, Fehlerfaelle, Randbedingungen.',
'general', true),

('API-Dokumentation', 'api-docs', 'JSDoc-Kommentare und API-Dokumentation fuer Endpunkte schreiben', '📝', 'backend',
'Schreibe API-Dokumentation fuer: {{DATEI oder ENDPUNKT}}

Erstelle: JSDoc-Kommentare, Parameter-Beschreibungen, Response-Beispiele.
Stil: Deutsch, praezise, mit Beispielen.',
'docs', true),

('Performance-Optimierung', 'optimize-perf', 'Performance-Probleme identifizieren und optimieren', '⚡', 'backend',
'Analysiere und optimiere die Performance von: {{DATEI oder FUNKTION}}

Suche nach: N+1-Queries, fehlenden Indices, unnoetige Datenbankabfragen, fehlende Caches.
Keine vorzeitige Optimierung — nur messbare Verbesserungen.',
'general', true),

('Logging hinzufuegen', 'add-logging', 'Strukturiertes Logging zu Routen oder Services hinzufuegen', '📋', 'backend',
'Fuege strukturiertes Logging zu: {{DATEI oder BEREICH}} hinzu

Nutze console.error fuer Fehler, console.log fuer wichtige Events.
Logge: Request-Details, Fehler-Stacks, wichtige Geschaeftslogik-Events.
Kein Debug-Spam.',
'general', true)

ON CONFLICT (slug) DO NOTHING;
