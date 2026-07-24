-- School-wide non-working dates used by student attendance.

CREATE TABLE IF NOT EXISTS attendance_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  title TEXT NOT NULL,
  holiday_type TEXT NOT NULL DEFAULT 'school'
    CHECK (holiday_type IN ('government', 'public', 'school', 'emergency', 'other')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_attendance_holiday_date UNIQUE (school_id, holiday_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_holidays_school_date
  ON attendance_holidays(school_id, holiday_date);

ALTER TABLE attendance_holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_holidays_tenant_access ON attendance_holidays;
CREATE POLICY attendance_holidays_tenant_access ON attendance_holidays
  FOR ALL
  USING (school_id::text = (auth.jwt() ->> 'school_id'))
  WITH CHECK (school_id::text = (auth.jwt() ->> 'school_id'));

DROP TRIGGER IF EXISTS attendance_holidays_updated_at ON attendance_holidays;
CREATE TRIGGER attendance_holidays_updated_at
  BEFORE UPDATE ON attendance_holidays
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
