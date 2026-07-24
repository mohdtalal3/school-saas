-- Store Working/Weekend status per class instead of inferring it from assignment membership.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'class_weekdays'
      AND column_name = 'is_weekend'
  ) THEN
    ALTER TABLE class_weekdays
      ADD COLUMN is_weekend BOOLEAN NOT NULL DEFAULT false;

    -- Preserve the status users were shown before this migration. This must
    -- only run once so later migration runs do not overwrite class overrides.
    UPDATE class_weekdays AS class_day
    SET is_weekend = weekday.is_weekend
    FROM weekdays AS weekday
    WHERE weekday.id = class_day.weekday_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_class_weekdays_school_class_status
  ON class_weekdays(school_id, class_id, is_weekend);
