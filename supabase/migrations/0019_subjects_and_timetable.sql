-- Subjects, class subject assignments, and class-specific timetable configuration.

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_subjects_school_name
  ON subjects (school_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);

CREATE TABLE IF NOT EXISTS class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  total_marks INTEGER NOT NULL CHECK (total_marks > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_class_subject UNIQUE (class_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_class_subjects_school_class
  ON class_subjects(school_id, class_id);

CREATE TABLE IF NOT EXISTS weekdays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_weekend BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_weekdays_school_name
  ON weekdays (school_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_weekdays_school_order
  ON weekdays(school_id, sort_order);

CREATE TABLE IF NOT EXISTS class_weekdays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  weekday_id UUID NOT NULL REFERENCES weekdays(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_class_weekday UNIQUE (class_id, weekday_id)
);

CREATE INDEX IF NOT EXISTS idx_class_weekdays_school_class
  ON class_weekdays(school_id, class_id);

CREATE TABLE IF NOT EXISTS class_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  weekday_id UUID NOT NULL REFERENCES weekdays(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT class_period_valid_time CHECK (end_time > start_time),
  CONSTRAINT uniq_class_day_period_position UNIQUE (class_id, weekday_id, position)
);

CREATE INDEX IF NOT EXISTS idx_class_periods_school_class_day
  ON class_periods(school_id, class_id, weekday_id, position);

CREATE TABLE IF NOT EXISTS timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  class_period_id UUID NOT NULL REFERENCES class_periods(id) ON DELETE CASCADE,
  class_subject_id UUID REFERENCES class_subjects(id) ON DELETE RESTRICT,
  teacher_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  is_break BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_timetable_class_period UNIQUE (class_period_id),
  CONSTRAINT timetable_break_or_subject CHECK (
    (is_break = true AND class_subject_id IS NULL AND teacher_id IS NULL)
    OR (is_break = false AND class_subject_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_timetable_entries_school_class
  ON timetable_entries(school_id, class_id);

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'subjects', 'class_subjects', 'weekdays', 'class_weekdays',
    'class_periods', 'timetable_entries'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_all', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (true) WITH CHECK (true)',
      table_name || '_all', table_name
    );
  END LOOP;
END $$;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'subjects', 'class_subjects', 'weekdays', 'class_periods', 'timetable_entries'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', table_name || '_updated_at', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      table_name || '_updated_at', table_name
    );
  END LOOP;
END $$;
