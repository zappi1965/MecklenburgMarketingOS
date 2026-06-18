-- MMOS Agent Session Memory
-- Speichert Zusammenfassungen vergangener Agent-Runs fuer Kontext beim naechsten Start

CREATE TABLE IF NOT EXISTS mmos_agent_memory (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  task        TEXT        NOT NULL,
  summary     TEXT        NOT NULL,
  files       TEXT[]      DEFAULT '{}',
  branch      TEXT        NOT NULL DEFAULT 'main',
  pr_url      TEXT,
  pr_number   INTEGER,
  agent_slug  TEXT,
  provider    TEXT,
  steps_used  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mmos_agent_memory_created ON mmos_agent_memory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mmos_agent_memory_user ON mmos_agent_memory(user_id, created_at DESC);

-- Nur die letzten 200 Eintraege behalten (via Trigger)
CREATE OR REPLACE FUNCTION mmos_trim_agent_memory() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM mmos_agent_memory
  WHERE id IN (
    SELECT id FROM mmos_agent_memory
    ORDER BY created_at DESC
    OFFSET 200
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trim_agent_memory ON mmos_agent_memory;
CREATE TRIGGER trg_trim_agent_memory
  AFTER INSERT ON mmos_agent_memory
  FOR EACH ROW EXECUTE FUNCTION mmos_trim_agent_memory();
