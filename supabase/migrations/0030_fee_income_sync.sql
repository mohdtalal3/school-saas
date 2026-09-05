-- ============================================================
-- Migration: 0030_fee_income_sync.sql
-- Purpose:   Fee income auto-sync — every day's fee collections
--            are aggregated into a single system-managed income
--            transaction (source = 'fee_collection') so the
--            Accounts Statement reflects fee income without
--            manual entry. One row per school per day.
-- ============================================================

ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual', 'fee_collection'));

-- Fast day-total lookups for the sync
CREATE INDEX IF NOT EXISTS idx_fee_payments_school_payment_date
  ON fee_payments (school_id, payment_date);
