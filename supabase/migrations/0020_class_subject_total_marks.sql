-- Rename the original class subject number field to its intended meaning.
-- Non-numeric development values are safely converted to the common default of 100.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'class_subjects' AND column_name = 'subject_number'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'class_subjects' AND column_name = 'total_marks'
  ) THEN
    ALTER TABLE class_subjects RENAME COLUMN subject_number TO total_marks;
  END IF;
END $$;

ALTER TABLE class_subjects DROP CONSTRAINT IF EXISTS uniq_class_subject_number;

ALTER TABLE class_subjects
  ALTER COLUMN total_marks TYPE INTEGER
  USING CASE
    WHEN total_marks::text ~ '^[1-9][0-9]*$' THEN total_marks::text::integer
    ELSE 100
  END;

ALTER TABLE class_subjects ALTER COLUMN total_marks SET NOT NULL;
ALTER TABLE class_subjects DROP CONSTRAINT IF EXISTS class_subjects_total_marks_check;
ALTER TABLE class_subjects ADD CONSTRAINT class_subjects_total_marks_check CHECK (total_marks > 0);
