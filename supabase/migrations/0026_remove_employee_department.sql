-- Employee records use role/designation only; the project has no department model.
ALTER TABLE employees
  DROP COLUMN IF EXISTS department;
