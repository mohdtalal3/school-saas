-- ──────────────────────────────────────────────────────────────────────────────
-- 0013_update_annual_due_source_type.sql — Change ANNUAL DUE source_type
-- from class.annual_dues to student.previous_annual_due
-- ──────────────────────────────────────────────────────────────────────────────

UPDATE fee_particulars
SET source_type = 'student.previous_annual_due',
    updated_at = now()
WHERE UPPER(label) = 'ANNUAL DUE'
  AND source_type = 'class.annual_dues';
