-- ============================================================
-- Migration: 0008_student_free_balance.sql
-- Purpose:   Add is_free (free education) and previous_balance
--            columns to the students table.
-- ============================================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_balance NUMERIC(12,2) NOT NULL DEFAULT 0;
