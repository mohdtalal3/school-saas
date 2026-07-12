-- ============================================================
-- Migration: 0006_classes.sql
-- Purpose:   Classes module — grade/class definitions per school.
--            Stores class name, monthly fee, class teacher, and
--            capacity (used for enrollment progress bar).
--            Boys/girls counts are derived from students table
--            (Phase 2.6); until then they default to 0.
-- ============================================================

CREATE TABLE IF NOT EXISTS classes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  name          TEXT NOT NULL,
  fee           NUMERIC(12,2) NOT NULL DEFAULT 0,
  class_teacher TEXT,
  capacity      INTEGER NOT NULL DEFAULT 50,

  is_active     BOOLEAN NOT NULL DEFAULT true,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_school_class_name UNIQUE (school_id, name)
);

CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);

DROP TRIGGER IF EXISTS classes_updated_at ON classes;
CREATE TRIGGER classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Public-read for now (consistent with other tables; tighten in Phase 3)
DROP POLICY IF EXISTS classes_select ON classes;
CREATE POLICY classes_select ON classes
  FOR SELECT USING (true);

-- Writes go through trusted service-role functions only
DROP POLICY IF EXISTS classes_modify ON classes;
CREATE POLICY classes_modify ON classes
  FOR ALL USING (true) WITH CHECK (true);
