-- ──────────────────────────────────────────────────────────────────────────────
-- 0018_annual_dues_tracking.sql — Track annual dues payments per student per year
--
-- Instead of re-charging the full annual_dues every month, we use
-- student.previous_annual_due as a running yearly balance that decreases
-- as payments are allocated to the "PENDING ANNUAL DUES" particular.
--
-- When a payment is made toward annual dues, collectFee reduces
-- student.previous_annual_due by the allocated amount.
-- When a payment is deleted, deletePayment increases it back.
--
-- resolveParticulars already reads student.previous_annual_due as the amount,
-- so subsequent invoices will show only the remaining balance.
--
-- No new table needed — we just need to ensure the existing column is used
-- as a running balance, not a static original amount.
--
-- We DO need to store the original annual dues amount somewhere so we know
-- when the full amount has been collected. We add a new column:
--   students.annual_dues_original — the original annual dues for the year
--
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS annual_dues_original NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Backfill: set annual_dues_original = previous_annual_due for existing students
-- (this assumes the current previous_annual_due is the original amount for
-- students who have not yet made any annual dues payments this year)
UPDATE students
SET annual_dues_original = previous_annual_due
WHERE annual_dues_original = 0 AND previous_annual_due > 0;
