-- Date-range attendance calendar events scoped to the school, classes, or students.

ALTER TABLE attendance_holidays
  ADD COLUMN IF NOT EXISTS end_date DATE;
UPDATE attendance_holidays SET end_date = holiday_date WHERE end_date IS NULL;
ALTER TABLE attendance_holidays ALTER COLUMN end_date SET NOT NULL;

ALTER TABLE attendance_holidays
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'school';
ALTER TABLE attendance_holidays DROP CONSTRAINT IF EXISTS attendance_holidays_scope_check;
ALTER TABLE attendance_holidays
  ADD CONSTRAINT attendance_holidays_scope_check CHECK (scope IN ('school', 'classes', 'students'));
ALTER TABLE attendance_holidays DROP CONSTRAINT IF EXISTS attendance_holidays_valid_range;
ALTER TABLE attendance_holidays
  ADD CONSTRAINT attendance_holidays_valid_range CHECK (end_date >= holiday_date);

ALTER TABLE attendance_holidays DROP CONSTRAINT IF EXISTS uniq_attendance_holiday_date;

CREATE TABLE IF NOT EXISTS attendance_holiday_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  holiday_id UUID NOT NULL REFERENCES attendance_holidays(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_attendance_holiday_class UNIQUE (holiday_id, class_id)
);

CREATE TABLE IF NOT EXISTS attendance_holiday_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  holiday_id UUID NOT NULL REFERENCES attendance_holidays(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_attendance_holiday_student UNIQUE (holiday_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_holiday_classes_school_class
  ON attendance_holiday_classes(school_id, class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_holiday_students_school_student
  ON attendance_holiday_students(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_holidays_school_range
  ON attendance_holidays(school_id, holiday_date, end_date);

ALTER TABLE attendance_holiday_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_holiday_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_holiday_classes_tenant_access ON attendance_holiday_classes;
CREATE POLICY attendance_holiday_classes_tenant_access ON attendance_holiday_classes
  FOR ALL USING (school_id::text = (auth.jwt() ->> 'school_id'))
  WITH CHECK (school_id::text = (auth.jwt() ->> 'school_id'));

DROP POLICY IF EXISTS attendance_holiday_students_tenant_access ON attendance_holiday_students;
CREATE POLICY attendance_holiday_students_tenant_access ON attendance_holiday_students
  FOR ALL USING (school_id::text = (auth.jwt() ->> 'school_id'))
  WITH CHECK (school_id::text = (auth.jwt() ->> 'school_id'));
