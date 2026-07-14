-- ──────────────────────────────────────────────────────────────────────────────
-- 0012_fee_invoices_father_nic.sql — Add father_nic column to fee_invoices
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS father_nic TEXT;

-- Index for searching by father_nic
CREATE INDEX IF NOT EXISTS idx_fee_invoices_father_nic ON fee_invoices(school_id, father_nic);
