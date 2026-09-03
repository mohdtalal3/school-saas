-- Module visibility settings: JSONB array of disabled module/subtab keys
-- (e.g. ["attendance.students", "fees.defaulters"]). Missing key = enabled.
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS disabled_modules JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Guard against malformed values: must be a JSON array.
-- (Key-level validation against lib/modules.ts is enforced in the API route.)
ALTER TABLE schools
  ADD CONSTRAINT schools_disabled_modules_is_text_array
  CHECK (jsonb_typeof(disabled_modules) = 'array');
