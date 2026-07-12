-- ============================================================
-- Migration: 0002_rls_and_storage.sql
-- Purpose:   Enable RLS and create the public school-logos bucket.
-- ============================================================

-- ── Enable RLS on current tables ─────────────────────────────────
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_admins ENABLE ROW LEVEL SECURITY;

-- ── Schools policies ────────────────────────────────────────────
-- Phase 1: master admin uses the service role key (bypasses RLS).
-- Phase 2: school admins will only read their own school row.

DROP POLICY IF EXISTS schools_read ON schools;
CREATE POLICY schools_read ON schools
  FOR SELECT
  USING (true);  -- public profile (logo/name/address) for branded portals

-- ── School admins policies ──────────────────────────────────────
DROP POLICY IF EXISTS school_admins_read ON school_admins;
CREATE POLICY school_admins_read ON school_admins
  FOR SELECT
  USING (true);  -- tightened in Phase 2

-- ── Storage bucket: school-logos ────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-logos', 'school-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read policy for school-logos
DROP POLICY IF EXISTS "Public read school-logos" ON storage.objects;
CREATE POLICY "Public read school-logos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'school-logos');

-- Service role will write; explicit policy for completeness
DROP POLICY IF EXISTS "Service upload school-logos" ON storage.objects;
CREATE POLICY "Service upload school-logos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'school-logos');