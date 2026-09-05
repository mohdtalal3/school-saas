-- ============================================================
-- Migration: 0028_accounts.sql
-- Purpose:   Accounts / Finance module — unified financial
--            transactions, chart of accounts categories,
--            attachments, audit history, and a server-side
--            statement summary aggregate function.
-- ============================================================

-- ── 1. Account categories (Chart of Accounts) ────────────────
CREATE TABLE IF NOT EXISTS account_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Category names are unique within their type per school
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_categories_unique_name
  ON account_categories (school_id, type, lower(name));
CREATE INDEX IF NOT EXISTS idx_account_categories_school_id
  ON account_categories (school_id, type, is_active);

-- ── 2. Financial transactions (unified income + expense) ─────
CREATE TABLE IF NOT EXISTS financial_transactions (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID          NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  transaction_number  TEXT          NOT NULL,           -- INC-YYYY-NNNN / EXP-YYYY-NNNN
  type                TEXT          NOT NULL CHECK (type IN ('income', 'expense')),
  category_id         UUID          NOT NULL REFERENCES account_categories(id),
  transaction_date    DATE          NOT NULL,
  amount              NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method      TEXT          NOT NULL,
  reference_number    TEXT,
  party_name          TEXT,                              -- payer (income) / vendor (expense)
  description         TEXT,
  status              TEXT          NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'void')),
  created_by          UUID          REFERENCES school_admins(id),
  created_by_name     TEXT,
  updated_by          UUID          REFERENCES school_admins(id),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT unique_financial_transaction_number UNIQUE (school_id, transaction_number)
);

CREATE INDEX IF NOT EXISTS idx_financial_tx_school_date
  ON financial_transactions (school_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_tx_school_type
  ON financial_transactions (school_id, type);
CREATE INDEX IF NOT EXISTS idx_financial_tx_school_category
  ON financial_transactions (school_id, category_id);
CREATE INDEX IF NOT EXISTS idx_financial_tx_school_status
  ON financial_transactions (school_id, status);
CREATE INDEX IF NOT EXISTS idx_financial_tx_school_method
  ON financial_transactions (school_id, payment_method);
CREATE INDEX IF NOT EXISTS idx_financial_tx_school_created_by
  ON financial_transactions (school_id, created_by);
CREATE INDEX IF NOT EXISTS idx_financial_tx_number
  ON financial_transactions (school_id, transaction_number);

-- ── 3. Transaction attachments ───────────────────────────────
CREATE TABLE IF NOT EXISTS financial_transaction_attachments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  transaction_id  UUID        NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
  file_name       TEXT        NOT NULL,
  storage_key     TEXT        NOT NULL UNIQUE,
  mime_type       TEXT        NOT NULL,
  size_bytes      BIGINT      NOT NULL,
  uploaded_by     UUID        REFERENCES school_admins(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_tx_attachments_transaction
  ON financial_transaction_attachments (transaction_id);

-- ── 4. Financial audit log ───────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_audit_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  transaction_id  UUID        REFERENCES financial_transactions(id) ON DELETE CASCADE,
  action          TEXT        NOT NULL,  -- created | updated | voided | attachment_added | attachment_removed
  field_name      TEXT,                  -- for field-level updates: amount, category, date, ...
  previous_value  TEXT,
  new_value       TEXT,
  changed_by      UUID        REFERENCES school_admins(id),
  changed_by_name TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_tx
  ON financial_audit_log (school_id, transaction_id, created_at DESC);

-- ── 5. updated_at triggers ───────────────────────────────────
DROP TRIGGER IF EXISTS set_account_categories_updated_at ON account_categories;
CREATE TRIGGER set_account_categories_updated_at
  BEFORE UPDATE ON account_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_financial_transactions_updated_at ON financial_transactions;
CREATE TRIGGER set_financial_transactions_updated_at
  BEFORE UPDATE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. Row Level Security (tenant isolation) ─────────────────
ALTER TABLE account_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transaction_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_account_categories" ON account_categories;
CREATE POLICY "tenant_account_categories" ON account_categories
  FOR ALL USING (school_id::text = current_setting('app.current_school_id', true));

DROP POLICY IF EXISTS "tenant_financial_transactions" ON financial_transactions;
CREATE POLICY "tenant_financial_transactions" ON financial_transactions
  FOR ALL USING (school_id::text = current_setting('app.current_school_id', true));

DROP POLICY IF EXISTS "tenant_financial_tx_attachments" ON financial_transaction_attachments;
CREATE POLICY "tenant_financial_tx_attachments" ON financial_transaction_attachments
  FOR ALL USING (school_id::text = current_setting('app.current_school_id', true));

DROP POLICY IF EXISTS "tenant_financial_audit_log" ON financial_audit_log;
CREATE POLICY "tenant_financial_audit_log" ON financial_audit_log
  FOR ALL USING (school_id::text = current_setting('app.current_school_id', true));

-- ── 7. Private storage bucket for financial documents ────────
-- Private bucket: downloads go through signed URLs issued by the
-- API (service role), so financial documents are never public.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'financial-attachments',
  'financial-attachments',
  false,
  10485760,  -- 10 MB per file
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- ── 8. Server-side statement summary aggregate ───────────────
-- Totals are always computed by the database from actual
-- transactions using the exact same filters as the statement
-- query — never trusted from the frontend.
CREATE OR REPLACE FUNCTION financial_statement_summary(
  p_school_id      UUID,
  p_type           TEXT    DEFAULT NULL,
  p_category_id    UUID    DEFAULT NULL,
  p_payment_method TEXT    DEFAULT NULL,
  p_date_from      DATE    DEFAULT NULL,
  p_date_to        DATE    DEFAULT NULL,
  p_amount_min     NUMERIC DEFAULT NULL,
  p_amount_max     NUMERIC DEFAULT NULL,
  p_created_by     UUID    DEFAULT NULL,
  p_search         TEXT    DEFAULT NULL
)
RETURNS TABLE (total_income NUMERIC, total_expenses NUMERIC, transaction_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0),
    COUNT(*)
  FROM financial_transactions t
  WHERE t.school_id = p_school_id
    AND t.status = 'active'
    AND (p_type IS NULL OR t.type = p_type)
    AND (p_category_id IS NULL OR t.category_id = p_category_id)
    AND (p_payment_method IS NULL OR t.payment_method = p_payment_method)
    AND (p_date_from IS NULL OR t.transaction_date >= p_date_from)
    AND (p_date_to IS NULL OR t.transaction_date <= p_date_to)
    AND (p_amount_min IS NULL OR t.amount >= p_amount_min)
    AND (p_amount_max IS NULL OR t.amount <= p_amount_max)
    AND (p_created_by IS NULL OR t.created_by = p_created_by)
    AND (
      p_search IS NULL
      OR t.transaction_number ILIKE '%' || p_search || '%'
      OR t.description ILIKE '%' || p_search || '%'
      OR t.party_name ILIKE '%' || p_search || '%'
      OR t.reference_number ILIKE '%' || p_search || '%'
      OR EXISTS (
        SELECT 1 FROM account_categories c
        WHERE c.id = t.category_id AND c.name ILIKE '%' || p_search || '%'
      )
    );
$$;
