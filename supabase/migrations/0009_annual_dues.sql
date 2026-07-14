-- Add annual_dues to classes table
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS annual_dues NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Add annual_dues_discount and previous_annual_due to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS annual_dues_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS previous_annual_due NUMERIC(12,2) NOT NULL DEFAULT 0;
