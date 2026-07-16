-- ──────────────────────────────────────────────────────────────────────────────
-- 0016_add_annual_due_paid.sql — Track annual due payments on invoice
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS annual_due_paid NUMERIC(12,2) NOT NULL DEFAULT 0;
