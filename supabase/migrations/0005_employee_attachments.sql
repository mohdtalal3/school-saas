-- ============================================================
-- Migration: 0005_employee_attachments.sql
-- Purpose:   Store multiple file attachments per employee
--            (CV, certificates, experience letters, etc.)
-- ============================================================

-- Storage bucket for employee attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-attachments',
  'employee-attachments',
  true,
  10485760,  -- 10 MB per file
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS employee_attachments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,          -- original filename
  storage_key TEXT        NOT NULL UNIQUE,   -- path inside employee-attachments bucket
  mime_type   TEXT        NOT NULL,
  size_bytes  BIGINT      NOT NULL,
  label       TEXT        NOT NULL,          -- short label: "CV", "Certificate", "Experience Letter", etc.
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by employee
CREATE INDEX IF NOT EXISTS idx_employee_attachments_employee_id
  ON employee_attachments (employee_id);

-- RLS
ALTER TABLE employee_attachments ENABLE ROW LEVEL SECURITY;

-- Schools can manage their own employees' attachments
CREATE POLICY "Schools manage own employee attachments"
  ON employee_attachments
  FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE school_id = (
        SELECT school_id FROM employees WHERE id = employee_id
      )
    )
  );

-- Storage policies
CREATE POLICY "Anyone can view employee attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'employee-attachments');

CREATE POLICY "Schools can upload employee attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'employee-attachments');

CREATE POLICY "Schools can delete employee attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'employee-attachments');

COMMENT ON TABLE employee_attachments IS
  'File attachments for employees such as CV, education certificates, experience letters, etc.';
