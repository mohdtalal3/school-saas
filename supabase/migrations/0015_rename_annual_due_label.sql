-- ──────────────────────────────────────────────────────────────────────────────
-- 0015_rename_annual_due_label.sql — Rename "ANNUAL DUE" to "PENDING ANNUAL DUES"
-- ──────────────────────────────────────────────────────────────────────────────

UPDATE fee_particulars
SET label = 'PENDING ANNUAL DUES',
    updated_at = now()
WHERE UPPER(label) = 'ANNUAL DUE';
