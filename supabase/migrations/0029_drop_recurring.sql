-- ============================================================
-- Migration: 0029_drop_recurring.sql
-- Purpose:   Removes the Daily Addition (recurring income)
--            feature — drops the recurring_income_rules table
--            and the recurring_rule_id column on financial
--            transactions.
-- ============================================================

ALTER TABLE financial_transactions
  DROP COLUMN IF EXISTS recurring_rule_id;

DROP TABLE IF EXISTS recurring_income_rules CASCADE;
