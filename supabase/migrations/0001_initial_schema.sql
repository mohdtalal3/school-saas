-- ============================================================
-- Migration: 0001_initial_schema.sql
-- Purpose:   Create base multi-tenant schema (schools + admins)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Schools ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  tagline         TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  address         TEXT,
  country         TEXT,
  logo_url        TEXT,
  currency_symbol TEXT NOT NULL DEFAULT '$',
  currency_name   TEXT NOT NULL DEFAULT 'USD',
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);

-- ── School Admins ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_school_admin_email UNIQUE (school_id, email)
);

CREATE INDEX IF NOT EXISTS idx_school_admins_school_id ON school_admins(school_id);
CREATE INDEX IF NOT EXISTS idx_school_admins_email ON school_admins(email);

-- ── updated_at trigger ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schools_updated_at ON schools;
CREATE TRIGGER schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS school_admins_updated_at ON school_admins;
CREATE TRIGGER school_admins_updated_at
  BEFORE UPDATE ON school_admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
