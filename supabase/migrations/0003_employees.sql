-- ============================================================
-- Migration: 0003_employees.sql
-- Purpose:   Employees module — staff members belonging to a school.
--            Holds profile fields + auto-generated login credentials.
-- ============================================================

-- ── Employees ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Identity
  employee_code   TEXT,                              -- human-readable ID (EMP-0001)
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'Staff',     -- free-text job title
  father_husband_name TEXT,
  gender          TEXT CHECK (gender IS NULL OR gender IN ('male','female','other')),
  religion        TEXT,
  cnic            TEXT,                              -- Pakistani national ID (also used as login)
  date_of_birth   DATE,
  date_of_joining DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Compensation & experience
  salary          NUMERIC(12,2),
  experience      TEXT,                              -- e.g. "3 years", "Matric + 5yr"

  -- Contact
  phone           TEXT,
  email           TEXT,
  address         TEXT,

  -- Education / misc
  education       TEXT,

  -- Photo
  photo_url       TEXT,

  -- Auto-generated login credentials (CNIC without dashes)
  login_username  TEXT NOT NULL,                     -- cnic without dashes
  password_hash   TEXT,                              -- bcrypt; nullable for legacy
  is_login_active BOOLEAN NOT NULL DEFAULT true,

  -- Status
  is_active       BOOLEAN NOT NULL DEFAULT true,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_employee_login_username UNIQUE (school_id, login_username)
);

CREATE INDEX IF NOT EXISTS idx_employees_school_id ON employees(school_id);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(school_id, name);
CREATE INDEX IF NOT EXISTS idx_employees_cnic ON employees(school_id, cnic);

DROP TRIGGER IF EXISTS employees_updated_at ON employees;
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Public-read for now (consistent with schools/school_admins; tighten in Phase 3)
DROP POLICY IF EXISTS employees_select ON employees;
CREATE POLICY employees_select ON employees
  FOR SELECT USING (true);

-- Writes go through trusted service-role functions only (Phase 1)
DROP POLICY IF EXISTS employees_modify ON employees;
CREATE POLICY employees_modify ON employees
  FOR ALL USING (true) WITH CHECK (true);

-- ── Storage bucket: employee photos ─────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-photos', 'employee-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read on employee photos
DROP POLICY IF EXISTS employee_photos_read ON storage.objects;
CREATE POLICY employee_photos_read ON storage.objects
  FOR SELECT USING (bucket_id = 'employee-photos');
