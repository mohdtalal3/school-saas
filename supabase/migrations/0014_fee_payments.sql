-- ──────────────────────────────────────────────────────────────────────────────
-- 0014_fee_payments.sql — Fee payment collection (collect fees)
-- ──────────────────────────────────────────────────────────────────────────────

-- Add paid_amount to fee_invoices to track cumulative payments
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS payment_note TEXT;

-- Fee payments table — records each individual payment transaction
CREATE TABLE IF NOT EXISTS fee_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  payment_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  note            TEXT,
  -- Track which particulars were paid and how much (for partial particular payments)
  particular_breakdown JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fee_payments_select ON fee_payments;
CREATE POLICY fee_payments_select ON fee_payments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS fee_payments_insert ON fee_payments;
CREATE POLICY fee_payments_insert ON fee_payments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS fee_payments_update ON fee_payments;
CREATE POLICY fee_payments_update ON fee_payments
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS fee_payments_delete ON fee_payments;
CREATE POLICY fee_payments_delete ON fee_payments
  FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fee_payments_school_id ON fee_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice_id ON fee_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_payment_date ON fee_payments(school_id, payment_date);
