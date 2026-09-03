-- Employee attendance schedules, daily records, biometric imports, and audit history.

CREATE TABLE IF NOT EXISTS employee_attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  check_in_start TIME NOT NULL DEFAULT '07:45',
  check_in_end TIME NOT NULL DEFAULT '08:30',
  duty_start TIME NOT NULL DEFAULT '08:00',
  check_out_start TIME NOT NULL DEFAULT '13:45',
  check_out_end TIME NOT NULL DEFAULT '14:30',
  duty_end TIME NOT NULL DEFAULT '14:00',
  short_leave_threshold_minutes INTEGER NOT NULL DEFAULT 60 CHECK (short_leave_threshold_minutes >= 0),
  half_day_threshold_minutes INTEGER NOT NULL DEFAULT 180 CHECK (half_day_threshold_minutes >= 0),
  late_grace_minutes INTEGER NOT NULL DEFAULT 5 CHECK (late_grace_minutes >= 0),
  early_checkout_grace_minutes INTEGER NOT NULL DEFAULT 5 CHECK (early_checkout_grace_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_attendance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('weekday', 'seasonal', 'date_range', 'date_override')),
  weekday INTEGER CHECK (weekday BETWEEN 1 AND 7),
  start_date DATE,
  end_date DATE,
  is_working_day BOOLEAN NOT NULL DEFAULT true,
  attendance_closed BOOLEAN NOT NULL DEFAULT false,
  closure_type TEXT CHECK (closure_type IS NULL OR closure_type IN ('weekly_off', 'public_holiday', 'school_holiday', 'summer_holiday', 'winter_holiday', 'special_closure', 'event')),
  check_in_start TIME,
  check_in_end TIME,
  duty_start TIME,
  check_out_start TIME,
  check_out_end TIME,
  duty_end TIME,
  short_leave_threshold_minutes INTEGER CHECK (short_leave_threshold_minutes IS NULL OR short_leave_threshold_minutes >= 0),
  half_day_threshold_minutes INTEGER CHECK (half_day_threshold_minutes IS NULL OR half_day_threshold_minutes >= 0),
  late_grace_minutes INTEGER CHECK (late_grace_minutes IS NULL OR late_grace_minutes >= 0),
  early_checkout_grace_minutes INTEGER CHECK (early_checkout_grace_minutes IS NULL OR early_checkout_grace_minutes >= 0),
  priority INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employee_schedule_shape CHECK (
    (schedule_type = 'weekday' AND weekday IS NOT NULL AND start_date IS NULL AND end_date IS NULL)
    OR
    (schedule_type IN ('seasonal', 'date_range') AND weekday IS NULL AND start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
    OR
    (schedule_type = 'date_override' AND weekday IS NULL AND start_date IS NOT NULL AND end_date = start_date)
  )
);

CREATE TABLE IF NOT EXISTS employee_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  scheduled_check_in TIME,
  scheduled_check_out TIME,
  actual_check_in TIME,
  actual_check_out TIME,
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent', 'leave', 'short_leave', 'half_day')),
  late_minutes INTEGER NOT NULL DEFAULT 0 CHECK (late_minutes >= 0),
  early_leave_minutes INTEGER NOT NULL DEFAULT 0 CHECK (early_leave_minutes >= 0),
  worked_minutes INTEGER CHECK (worked_minutes IS NULL OR worked_minutes >= 0),
  overtime_minutes INTEGER NOT NULL DEFAULT 0 CHECK (overtime_minutes >= 0),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('automatic', 'manual', 'imported', 'import_edited')),
  is_manual_override BOOLEAN NOT NULL DEFAULT false,
  requires_review BOOLEAN NOT NULL DEFAULT false,
  review_reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES school_admins(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES school_admins(id) ON DELETE SET NULL,
  import_job_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_employee_attendance_day UNIQUE (school_id, employee_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS employee_attendance_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  attendance_date DATE,
  conflict_strategy TEXT NOT NULL DEFAULT 'merge_missing' CHECK (conflict_strategy IN ('skip', 'replace', 'merge_missing')),
  status TEXT NOT NULL DEFAULT 'previewed' CHECK (status IN ('previewed', 'completed', 'partial', 'undone', 'failed')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  invalid_rows INTEGER NOT NULL DEFAULT 0,
  unmatched_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES school_admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  undone_at TIMESTAMPTZ
);

ALTER TABLE employee_attendance
  DROP CONSTRAINT IF EXISTS employee_attendance_import_job_id_fkey;
ALTER TABLE employee_attendance
  ADD CONSTRAINT employee_attendance_import_job_id_fkey
  FOREIGN KEY (import_job_id) REFERENCES employee_attendance_import_jobs(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS employee_attendance_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  import_job_id UUID NOT NULL REFERENCES employee_attendance_import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  biometric_id TEXT,
  employee_code TEXT,
  employee_name TEXT,
  attendance_date DATE,
  check_in_time TIME,
  check_out_time TIME,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('valid', 'invalid', 'unmatched', 'skipped', 'imported')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biometric_employee_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  biometric_id TEXT NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  machine_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_biometric_mapping UNIQUE (school_id, biometric_id)
);

CREATE TABLE IF NOT EXISTS employee_attendance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES employee_attendance(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'imported', 'overridden', 'undo')),
  previous_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES school_admins(id) ON DELETE SET NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_attendance_school_date ON employee_attendance(school_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_employee_date ON employee_attendance(school_id, employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_resolution ON employee_attendance_schedules(school_id, schedule_type, start_date, end_date, weekday, is_active);
CREATE INDEX IF NOT EXISTS idx_employee_import_jobs_school_created ON employee_attendance_import_jobs(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_import_rows_job ON employee_attendance_import_rows(import_job_id, row_number);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_audit_record ON employee_attendance_audit(school_id, employee_id, attendance_date, changed_at DESC);

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'employee_attendance_settings', 'employee_attendance_schedules', 'employee_attendance',
    'employee_attendance_import_jobs', 'employee_attendance_import_rows',
    'biometric_employee_mappings', 'employee_attendance_audit'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_tenant_access', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (school_id::text = (auth.jwt() ->> ''school_id'')) WITH CHECK (school_id::text = (auth.jwt() ->> ''school_id''))',
      table_name || '_tenant_access', table_name
    );
  END LOOP;
END $$;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'employee_attendance_settings', 'employee_attendance_schedules', 'employee_attendance',
    'biometric_employee_mappings'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', table_name || '_updated_at', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      table_name || '_updated_at', table_name
    );
  END LOOP;
END $$;

-- Atomic import commit. Rows are fully revalidated and calculated by the server
-- before this function receives them; this function owns conflict handling,
-- import-row persistence, attendance upserts, and audit writes in one transaction.
CREATE OR REPLACE FUNCTION commit_employee_attendance_import(
  p_school_id UUID,
  p_admin_id UUID,
  p_file_name TEXT,
  p_attendance_date DATE,
  p_conflict_strategy TEXT,
  p_rows JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
  v_row JSONB;
  v_existing employee_attendance%ROWTYPE;
  v_attendance employee_attendance%ROWTYPE;
  v_row_number INTEGER := 0;
  v_imported INTEGER := 0;
BEGIN
  IF p_conflict_strategy NOT IN ('skip', 'replace', 'merge_missing') THEN
    RAISE EXCEPTION 'Invalid conflict strategy';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM school_admins WHERE id = p_admin_id AND school_id = p_school_id AND is_active = true) THEN
    RAISE EXCEPTION 'Unauthorized administrator';
  END IF;

  INSERT INTO employee_attendance_import_jobs (
    school_id, file_name, attendance_date, conflict_strategy, status,
    total_rows, valid_rows, created_by
  ) VALUES (
    p_school_id, p_file_name, p_attendance_date, p_conflict_strategy, 'completed',
    jsonb_array_length(p_rows), jsonb_array_length(p_rows), p_admin_id
  ) RETURNING id INTO v_job_id;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    v_row_number := v_row_number + 1;
    SELECT * INTO v_existing
    FROM employee_attendance
    WHERE school_id = p_school_id
      AND employee_id = (v_row->>'employee_id')::uuid
      AND attendance_date = (v_row->>'attendance_date')::date;

    IF FOUND AND p_conflict_strategy = 'skip' THEN
      INSERT INTO employee_attendance_import_rows (
        school_id, import_job_id, row_number, employee_id, employee_code,
        employee_name, attendance_date, check_in_time, check_out_time,
        raw_data, validation_status, error_message
      ) VALUES (
        p_school_id, v_job_id, v_row_number, (v_row->>'employee_id')::uuid,
        v_row->>'employee_code', v_row->>'employee_name', (v_row->>'attendance_date')::date,
        nullif(v_row->>'actual_check_in', '')::time, nullif(v_row->>'actual_check_out', '')::time,
        v_row, 'skipped', 'Existing attendance was kept'
      );
      CONTINUE;
    END IF;

    INSERT INTO employee_attendance (
      school_id, employee_id, attendance_date, scheduled_check_in, scheduled_check_out,
      actual_check_in, actual_check_out, status, late_minutes, early_leave_minutes,
      worked_minutes, overtime_minutes, source, is_manual_override, requires_review,
      review_reason, notes, created_by, updated_by, import_job_id
    ) VALUES (
      p_school_id, (v_row->>'employee_id')::uuid, (v_row->>'attendance_date')::date,
      nullif(v_row->>'scheduled_check_in', '')::time, nullif(v_row->>'scheduled_check_out', '')::time,
      CASE WHEN FOUND AND p_conflict_strategy = 'merge_missing' THEN COALESCE(v_existing.actual_check_in, nullif(v_row->>'actual_check_in', '')::time) ELSE nullif(v_row->>'actual_check_in', '')::time END,
      CASE WHEN FOUND AND p_conflict_strategy = 'merge_missing' THEN COALESCE(v_existing.actual_check_out, nullif(v_row->>'actual_check_out', '')::time) ELSE nullif(v_row->>'actual_check_out', '')::time END,
      (v_row->>'status'), (v_row->>'late_minutes')::integer, (v_row->>'early_leave_minutes')::integer,
      nullif(v_row->>'worked_minutes', '')::integer, (v_row->>'overtime_minutes')::integer,
      CASE WHEN FOUND THEN 'import_edited' ELSE 'imported' END,
      false, (v_row->>'requires_review')::boolean, nullif(v_row->>'review_reason', ''),
      nullif(v_row->>'notes', ''), p_admin_id, p_admin_id, v_job_id
    )
    ON CONFLICT (school_id, employee_id, attendance_date) DO UPDATE SET
      scheduled_check_in = EXCLUDED.scheduled_check_in,
      scheduled_check_out = EXCLUDED.scheduled_check_out,
      actual_check_in = CASE WHEN p_conflict_strategy = 'merge_missing' THEN COALESCE(employee_attendance.actual_check_in, EXCLUDED.actual_check_in) ELSE EXCLUDED.actual_check_in END,
      actual_check_out = CASE WHEN p_conflict_strategy = 'merge_missing' THEN COALESCE(employee_attendance.actual_check_out, EXCLUDED.actual_check_out) ELSE EXCLUDED.actual_check_out END,
      status = EXCLUDED.status,
      late_minutes = EXCLUDED.late_minutes,
      early_leave_minutes = EXCLUDED.early_leave_minutes,
      worked_minutes = EXCLUDED.worked_minutes,
      overtime_minutes = EXCLUDED.overtime_minutes,
      source = 'import_edited',
      requires_review = EXCLUDED.requires_review,
      review_reason = EXCLUDED.review_reason,
      notes = COALESCE(employee_attendance.notes, EXCLUDED.notes),
      updated_by = p_admin_id,
      import_job_id = v_job_id
    RETURNING * INTO v_attendance;

    INSERT INTO employee_attendance_import_rows (
      school_id, import_job_id, row_number, employee_id, employee_code,
      employee_name, attendance_date, check_in_time, check_out_time,
      raw_data, validation_status
    ) VALUES (
      p_school_id, v_job_id, v_row_number, v_attendance.employee_id,
      v_row->>'employee_code', v_row->>'employee_name', v_attendance.attendance_date,
      v_attendance.actual_check_in, v_attendance.actual_check_out, v_row, 'imported'
    );

    INSERT INTO employee_attendance_audit (
      school_id, attendance_id, employee_id, attendance_date, action,
      previous_value, new_value, changed_by, reason
    ) VALUES (
      p_school_id, v_attendance.id, v_attendance.employee_id, v_attendance.attendance_date,
      CASE WHEN v_existing.id IS NULL THEN 'imported' ELSE 'updated' END,
      CASE WHEN v_existing.id IS NULL THEN NULL ELSE to_jsonb(v_existing) END,
      to_jsonb(v_attendance), p_admin_id, 'Biometric attendance import'
    );
    v_imported := v_imported + 1;
  END LOOP;

  UPDATE employee_attendance_import_jobs
  SET imported_rows = v_imported, completed_at = now()
  WHERE id = v_job_id;
  RETURN v_job_id;
END $$;

REVOKE ALL ON FUNCTION commit_employee_attendance_import(UUID, UUID, TEXT, DATE, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION commit_employee_attendance_import(UUID, UUID, TEXT, DATE, TEXT, JSONB) TO service_role;
