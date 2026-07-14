-- ──────────────────────────────────────────────────────────────────────────────
-- 0011_fee_invoices.sql — Fee invoices table (generated invoices per student)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fee_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_no      TEXT NOT NULL,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name    TEXT NOT NULL,
  class_id        UUID REFERENCES classes(id) ON DELETE SET NULL,
  class_name      TEXT,
  registration_no TEXT,
  fee_month       TEXT NOT NULL,
  due_date        DATE NOT NULL,
  fine_after_due  NUMERIC(12,2) NOT NULL DEFAULT 0,
  particulars     JSONB NOT NULL DEFAULT '[]',
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'unpaid',
  father_name     TEXT,
  mobile          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE fee_invoices ENABLE ROW LEVEL SECURITY;

-- Policies (drop + recreate for idempotency)
DROP POLICY IF EXISTS fee_invoices_select ON fee_invoices;
CREATE POLICY fee_invoices_select ON fee_invoices
  FOR SELECT USING (true);

DROP POLICY IF EXISTS fee_invoices_insert ON fee_invoices;
CREATE POLICY fee_invoices_insert ON fee_invoices
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS fee_invoices_update ON fee_invoices;
CREATE POLICY fee_invoices_update ON fee_invoices
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS fee_invoices_delete ON fee_invoices;
CREATE POLICY fee_invoices_delete ON fee_invoices
  FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fee_invoices_school_id ON fee_invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_student_id ON fee_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_class_id ON fee_invoices(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_invoice_no ON fee_invoices(invoice_no);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_fee_month ON fee_invoices(school_id, fee_month);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_status ON fee_invoices(school_id, status);

-- Unique constraint: invoice_no per school
CREATE UNIQUE INDEX IF NOT EXISTS uniq_fee_invoices_school_invoice_no
  ON fee_invoices(school_id, invoice_no);
