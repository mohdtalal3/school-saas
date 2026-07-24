-- Daily student attendance. Missing rows intentionally mean "Not Marked".

CREATE TABLE IF NOT EXISTS student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'leave')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_student_attendance_day UNIQUE (school_id, student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_student_attendance_school_class_date
  ON student_attendance(school_id, class_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_school_student_date
  ON student_attendance(school_id, student_id, attendance_date);

ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_attendance_tenant_access ON student_attendance;
CREATE POLICY student_attendance_tenant_access ON student_attendance
  FOR ALL
  USING (school_id::text = (auth.jwt() ->> 'school_id'))
  WITH CHECK (school_id::text = (auth.jwt() ->> 'school_id'));

DROP TRIGGER IF EXISTS student_attendance_updated_at ON student_attendance;
CREATE TRIGGER student_attendance_updated_at
  BEFORE UPDATE ON student_attendance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
