-- ============================================================
-- Migration: 0007_students.sql
-- Purpose:   Students module — student records belonging to a school.
--            Holds profile fields, class assignment, family info,
--            fee discount, and photo/attachments.
-- ============================================================

-- ── Storage bucket: student photos ───────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS student_photos_read ON storage.objects;
CREATE POLICY student_photos_read ON storage.objects
  FOR SELECT USING (bucket_id = 'student-photos');

DROP POLICY IF EXISTS student_photos_write ON storage.objects;
CREATE POLICY student_photos_write ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'student-photos');

DROP POLICY IF EXISTS student_photos_delete ON storage.objects;
CREATE POLICY student_photos_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'student-photos');

-- ── Storage bucket: student attachments ──────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-attachments',
  'student-attachments',
  true,
  10485760,  -- 10 MB per file
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS student_attachments_storage_read ON storage.objects;
CREATE POLICY student_attachments_storage_read ON storage.objects
  FOR SELECT USING (bucket_id = 'student-attachments');

DROP POLICY IF EXISTS student_attachments_storage_write ON storage.objects;
CREATE POLICY student_attachments_storage_write ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'student-attachments');

DROP POLICY IF EXISTS student_attachments_storage_delete ON storage.objects;
CREATE POLICY student_attachments_storage_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'student-attachments');

-- ── Students ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id        UUID REFERENCES classes(id) ON DELETE SET NULL,

  -- Identity
  registration_no TEXT,                              -- auto-generated (STU-0001)
  name            TEXT NOT NULL,
  photo_url       TEXT,

  -- Admission
  date_of_admission DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Fee
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0,   -- discount amount

  -- Contact
  mobile          TEXT,                               -- for SMS/WhatsApp

  -- Personal
  date_of_birth   DATE,
  gender          TEXT CHECK (gender IS NULL OR gender IN ('male','female','other')),
  identification_mark TEXT,                           -- physical identification mark
  blood_group     TEXT,                               -- e.g. A+, B-, O+
  disease         TEXT,                               -- any medical condition
  birth_form_id   TEXT,                               -- Student Birth Form ID / NIC

  -- Additional
  additional_note TEXT,
  is_orphan       BOOLEAN NOT NULL DEFAULT false,
  is_osc          BOOLEAN NOT NULL DEFAULT false,     -- Out of School Children
  religion        TEXT,

  -- Family
  family          TEXT,                               -- family name / description
  total_siblings  INTEGER NOT NULL DEFAULT 0,
  address         TEXT,

  -- Father
  father_name     TEXT,
  father_nic      TEXT,
  father_profession TEXT,

  -- Status
  is_active       BOOLEAN NOT NULL DEFAULT true,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(school_id, name);
CREATE INDEX IF NOT EXISTS idx_students_reg_no ON students(school_id, registration_no);

DROP TRIGGER IF EXISTS students_updated_at ON students;
CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS students_select ON students;
CREATE POLICY students_select ON students
  FOR SELECT USING (true);

DROP POLICY IF EXISTS students_modify ON students;
CREATE POLICY students_modify ON students
  FOR ALL USING (true) WITH CHECK (true);

-- ── Student Attachments ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_attachments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  storage_key TEXT        NOT NULL UNIQUE,
  mime_type   TEXT        NOT NULL,
  size_bytes  BIGINT      NOT NULL,
  label       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_attachments_student_id
  ON student_attachments (student_id);

ALTER TABLE student_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student attachments select" ON student_attachments;
CREATE POLICY "Student attachments select"
  ON student_attachments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Student attachments modify" ON student_attachments;
CREATE POLICY "Student attachments modify"
  ON student_attachments FOR ALL USING (true) WITH CHECK (true);
