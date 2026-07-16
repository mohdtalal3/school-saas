-- ──────────────────────────────────────────────────────────────────────────────
-- 0017_per_particular_payments.sql — Per-particular payment tracking
-- ──────────────────────────────────────────────────────────────────────────────
-- Each particular in the invoice's JSONB now tracks its own paid_amount and status.
-- This enables allocation-based fee collection (pay towards specific line items).
--
-- Particular JSONB shape changes from:
--   { label, amount, is_fixed, source_type }
-- to:
--   { label, amount, paid_amount, status, is_fixed, source_type }
-- where status is: 'unpaid' | 'partial' | 'paid' | 'waived'
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Remove annual_due_paid column (replaced by per-particular tracking)
ALTER TABLE fee_invoices DROP COLUMN IF EXISTS annual_due_paid;

-- 2. Add waived_amount column to track total waived at invoice level
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS waived_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 3. Update existing invoices: add paid_amount and status to each particular in JSONB
--    This is a no-op for invoices with no particulars, and idempotent for ones already updated.
DO $$
BEGIN
  UPDATE fee_invoices
  SET particulars = (
    SELECT jsonb_agg(
      jsonb_build_object(
        'label',       p->>'label',
        'amount',      COALESCE((p->>'amount')::numeric, 0),
        'paid_amount', COALESCE((p->>'paid_amount')::numeric, 0),
        'status',      COALESCE(p->>'status', 'unpaid'),
        'is_fixed',    COALESCE((p->>'is_fixed')::boolean, false),
        'source_type', p->'source_type'
      )
    )
    FROM jsonb_array_elements(particulars) AS p
  )
  WHERE jsonb_typeof(particulars) = 'array'
    AND jsonb_array_length(particulars) > 0;
END $$;

-- 4. Update fee_payments.particular_breakdown to use {label, amount} format
--    (was previously always '[]' — now will store allocations per payment)
--    No data migration needed since it was always empty.
