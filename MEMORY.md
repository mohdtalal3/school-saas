# Project Memory

## Current milestone

Phase 2 is in progress. Employee management, classes, students, fees, subject management, timetable management, student attendance, scoped calendars, and employee attendance are implemented. Sections, dedicated Teacher/Parent CRUD, and exams remain pending.

## Established student attendance decisions

- `student_attendance` stores only finalized `present`, `absent`, `late`, or `leave` rows. A missing student/date row is the canonical Not Marked state.
- A normal save is rejected in both UI and API while any active class student remains Not Marked. Explicit partial confirmation saves marked rows and leaves the remaining students without rows.
- Daily attendance uses the current active class roster, while each saved attendance row snapshots `class_id` for historical student reporting after promotion.
- Student reports are day-by-day; class reports aggregate each current active student and link to the student report through URL state.
- Attendance rate is `(present + late) / all marked statuses`; leave remains separately visible and is included among marked days.
- Both reports default from the first day of the current month through today and share reusable date-range, statistics, Excel, and browser Print / Save as PDF helpers.
- The attendance feature is split into reusable feature components and a service layer so a future teacher portal can reuse the marking/reporting model after role authorization is added.
- The selected date is resolved by weekday `sort_order` (Monday 1 through Sunday 7). Every configured `class_weekdays` row has its own `is_weekend` value, which is authoritative for that class. The school-wide `weekdays.is_weekend` value is only a setup/compatibility default when the class has no configuration.
- Attendance calendar events support date ranges and `school`, `classes`, or `students` scope through `attendance_holidays`, `attendance_holiday_classes`, and `attendance_holiday_students`.
- School/class events block the whole applicable register. Student events keep attendance open for the class but exempt targeted students from Not Marked validation and report calculations.
- Daily loading and saving use the same server-side school-day resolver. Reports filter current class off-days and applicable calendar events, including older records created before a vacation was configured.
- Holiday changes do not destructively delete attendance rows; removing a holiday can reveal preserved historical records again.
- Calendar Settings lives under General Settings at `/school/settings/calendar`; the old attendance calendar tab redirects to this route.
- The admin sidebar uses a viewport-height flex shell with an independently scrollable navigation area so expanded groups never hide lower navigation or Logout.

## Established employee attendance decisions

- Student Attendance and Employee Attendance are separate top-level sidebar dropdowns with their own child pages. There is no shared Attendance parent, nested sub-submenu, or page-level attendance tab strip. Existing student daily/report URLs remain functional.
- Employee schedule resolution is exact date override → special date-range → seasonal → weekday → school default. Resolved duty start/end are snapshotted on each attendance row.
- `employee_attendance` stores only working-day statuses; missing rows mean Not Marked. Weekly offs, holidays, and closed days are resolved from schedules and create no rows.
- Automatic calculation is server-owned. Grace controls classification, while reports retain the full difference from scheduled duty start/end. Minute calculations never go negative and support overnight shifts.
- A filtered Finalize Day operation creates Absent for active joined employees who truly have no record, while preserving existing attendance outside the loaded filter.
- Manual status changes, punch edits, imports, and undo operations write previous/new audit snapshots with administrator ID, timestamp, and reason.
- Biometric CSV/Excel preview is server-validated, groups multiple punches by employee/date, and uses earliest/latest punches. Machine mappings persist for future ZKTeco-style files.
- Import conflict handling supports safe merge-missing (default), skip, and replace. Commit uses `commit_employee_attendance_import` as one Postgres transaction. Undo restores prior rows/removes new ones and preserves later manual edits.
- Monthly reports stop at today for the current month and at month-end for past months; employee working-day counts begin no earlier than `date_of_joining`.
- Employees use `role` as their designation; the project has no department model or employee attendance department filter.
- Employee Calendar is where admins create named single-day or long-range no-attendance rules. It now mirrors the student calendar style with compact closure cards/default weekly-off cells and does not show written per-cell status counts. Settings remains responsible for timing and working-schedule configuration.
- The current schema lacks an employment end-date/history table, so inactive-employee reports can be filtered but cannot reconstruct the exact historical deactivation date.

## Established subject and timetable decisions

- Subjects are a school-wide catalog; class assignments live in `class_subjects` and carry positive integer `total_marks` values such as 50, 75, or 100.
- Default subjects are seeded only when a school has never had subject rows, so deleting all subjects does not unexpectedly recreate them.
- Weekdays are a school-wide catalog. `class_weekdays` records an explicit Working/Weekend status for every configured class/day, so classes can follow different schedules.
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

Migrations `0019_subjects_and_timetable.sql` through `0026_remove_employee_department.sql` must be applied with `npm run db:migrate` before using scheduling and attendance. Migration `0024` backfills class-day statuses; migration `0025` adds employee attendance schedules/records, imports, mappings, audit history, RLS, and the transactional import RPC; migration `0026` removes the unused employee department field.
