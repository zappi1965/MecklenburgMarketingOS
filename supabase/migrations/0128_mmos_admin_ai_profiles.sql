-- MMOS Admin-AI-Profil
-- Pro Admin-User hinterlegtes Dauergedaechtnis (CLAUDE.md-artig), bevorzugter Agent,
-- Provider und aktivierte Skills — wird beim Agent-Run automatisch in den System-Prompt
-- geladen, ohne dass der Bot sie per Tool abrufen muss.

CREATE TABLE IF NOT EXISTS mmos_admin_profiles (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL UNIQUE,
  display_name        TEXT,
  memory_md           TEXT        NOT NULL DEFAULT '',     -- editierbares CLAUDE.md-artiges Gedaechtnis (im Panel gepflegt)
  default_agent_slug  TEXT        REFERENCES mmos_agents(slug) ON DELETE SET NULL,
  default_provider    TEXT        NOT NULL DEFAULT 'default', -- default | anthropic | groq | ollama
  enabled_skill_slugs TEXT[]      NOT NULL DEFAULT '{}',   -- Skills die automatisch als Referenz injiziert werden
  preferences         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mmos_admin_profiles_user ON mmos_admin_profiles(user_id);

-- Agent-Memory pro Admin scopen (Spalte rueckwaertskompatibel nachruesten).
-- Bestehende Eintraege bleiben mit user_id = NULL (global sichtbar).
ALTER TABLE mmos_agent_memory ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_mmos_agent_memory_user ON mmos_agent_memory(user_id, created_at DESC);
