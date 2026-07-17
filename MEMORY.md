# Project Memory

## Current milestone

Phase 2 is in progress. Employee management, classes, students, fees, subject management, and timetable management are implemented. Sections, dedicated Teacher/Parent CRUD, attendance, and exams remain pending.

## Established subject and timetable decisions

- Subjects are a school-wide catalog; class assignments live in `class_subjects` and carry positive integer `total_marks` values such as 50, 75, or 100.
- Default subjects are seeded only when a school has never had subject rows, so deleting all subjects does not unexpectedly recreate them.
- Weekdays are school-wide configuration. `class_weekdays` records the days attended by each class, including optional weekend days.
- Period times live in `class_periods` per class and weekday. Matching `position` values form timetable rows even when times differ by day.
- `timetable_entries` is one-to-one with a configured class period and stores either a break or a class subject plus optional employee teacher.
- “Apply to weekdays” copies an entry only to matching period positions and always excludes days marked as weekends.
- Subject, weekday, and period deletion protects or cascades dependent timetable data intentionally; cross-school identifiers are validated in services.
- Until Teacher CRUD is built, active `employees` are the source for the timetable teacher selector.
- All class duplication controls use the shared searchable multi-select and accept multiple target classes.
- `components/ui/searchable-select.tsx` is the reusable single-value selector; it and `SearchableMultiSelect` show 10 filtered options initially with 10-at-a-time “Show more” pagination.
- Class selection now uses these shared controls across Subjects, Timetable, Students, Fees, imports, promotion, ID cards, and directory/export filters. Keep single selection by default, preserve screen-specific `All Classes`/`No class` values, and use multi-select only where the workflow intentionally targets several classes.
- `features/timetable/timetable-grid.tsx` is the reusable timetable renderer for the admin builder, class preview, teacher preview, and future role portals.
- Preview Timetable supports server-searched class and teacher modes; teacher preview aggregates assigned entries across classes.

## Operational note

Migrations `0019_subjects_and_timetable.sql` and `0020_class_subject_total_marks.sql` must be applied with `npm run db:migrate` before using the new modules against Supabase.
