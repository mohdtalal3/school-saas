-- ──────────────────────────────────────────────────────────────────────────────
-- 0010_fee_particulars.sql — Fee particulars table (fee line items per school)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fee_particulars (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_fixed      BOOLEAN NOT NULL DEFAULT false,
  source_type   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE fee_particulars ENABLE ROW LEVEL SECURITY;

-- Policies (drop + recreate for idempotency)
DROP POLICY IF EXISTS fee_particulars_select ON fee_particulars;
CREATE POLICY fee_particulars_select ON fee_particulars
  FOR SELECT USING (true);

DROP POLICY IF EXISTS fee_particulars_insert ON fee_particulars;
CREATE POLICY fee_particulars_insert ON fee_particulars
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS fee_particulars_update ON fee_particulars;
CREATE POLICY fee_particulars_update ON fee_particulars
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS fee_particulars_delete ON fee_particulars;
CREATE POLICY fee_particulars_delete ON fee_particulars
  FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fee_particulars_school_id ON fee_particulars(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_particulars_sort_order ON fee_particulars(school_id, sort_order);

-- Unique constraint: one label per school (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_fee_particulars_school_label
  ON fee_particulars(school_id, lower(label));
