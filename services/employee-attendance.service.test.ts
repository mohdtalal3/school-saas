import assert from "node:assert/strict";
import test from "node:test";
import { employeeAttendanceCalendarMonthBounds, employeeAttendanceMonthBounds, resolveEmployeeScheduleFromConfiguration } from "./employee-attendance.service";
import type { EmployeeAttendanceSchedule, EmployeeAttendanceSettings } from "@/types/school.types";

const settings = {
  id: "settings", school_id: "school", check_in_start: "07:45", check_in_end: "08:30", duty_start: "08:00",
  check_out_start: "13:45", check_out_end: "14:30", duty_end: "14:00", short_leave_threshold_minutes: 60,
  half_day_threshold_minutes: 180, late_grace_minutes: 5, early_checkout_grace_minutes: 5, created_at: "", updated_at: "",
} satisfies EmployeeAttendanceSettings;
function schedule(partial: Partial<EmployeeAttendanceSchedule> & Pick<EmployeeAttendanceSchedule, "name" | "schedule_type">): EmployeeAttendanceSchedule {
  return {
    id: partial.name, school_id: "school", weekday: null, start_date: null, end_date: null, is_working_day: true,
    attendance_closed: false, closure_type: null, check_in_start: null, check_in_end: null, duty_start: null,
    check_out_start: null, check_out_end: null, duty_end: null, short_leave_threshold_minutes: null,
    half_day_threshold_minutes: null, late_grace_minutes: null, early_checkout_grace_minutes: null,
    priority: 0, note: null, is_active: true, created_at: "", updated_at: "", ...partial,
  };
}
const configuration = {
  settings,
  schedules: [
    schedule({ name: "Friday", schedule_type: "weekday", weekday: 5, duty_end: "12:30" }),
    schedule({ name: "Summer", schedule_type: "seasonal", start_date: "2026-06-01", end_date: "2026-08-31", duty_start: "07:30", duty_end: "13:00" }),
    schedule({ name: "Exam week", schedule_type: "date_range", start_date: "2026-07-20", end_date: "2026-07-25", duty_start: "09:00", duty_end: "13:00" }),
    schedule({ name: "Closed date", schedule_type: "date_override", start_date: "2026-07-24", end_date: "2026-07-24", is_working_day: false, attendance_closed: true, closure_type: "special_closure" }),
  ],
};

test("specific date overrides date range, seasonal, weekday, and default", () => {
  const result = resolveEmployeeScheduleFromConfiguration(configuration, "2026-07-24");
  assert.equal(result.schedule_name, "Closed date");
  assert.equal(result.attendance_closed, true);
});
test("special date range overrides seasonal and weekday", () => {
  assert.equal(resolveEmployeeScheduleFromConfiguration(configuration, "2026-07-23").schedule_name, "Exam week");
});
test("long-range calendar closure disables attendance for every covered date", () => {
  const closedRange = schedule({
    name: "Summer holidays",
    schedule_type: "date_range",
    start_date: "2026-06-15",
    end_date: "2026-07-15",
    is_working_day: false,
    attendance_closed: true,
    closure_type: "summer_holiday",
  });
  const result = resolveEmployeeScheduleFromConfiguration({ settings, schedules: [closedRange] }, "2026-07-01");
  assert.equal(result.schedule_name, "Summer holidays");
  assert.equal(result.is_working_day, false);
  assert.equal(result.attendance_closed, true);
  assert.equal(result.closure_type, "summer_holiday");
});
test("seasonal schedule overrides weekday", () => {
  assert.equal(resolveEmployeeScheduleFromConfiguration(configuration, "2026-07-31").schedule_name, "Summer");
});
test("weekday schedule overrides default outside ranges", () => {
  assert.equal(resolveEmployeeScheduleFromConfiguration(configuration, "2026-09-04").schedule_name, "Friday");
});
test("default schedule is final fallback", () => {
  assert.equal(resolveEmployeeScheduleFromConfiguration(configuration, "2026-09-03").schedule_type, "default");
});
test("current month ends at today and a past month ends on its final day", () => {
  assert.deepEqual(employeeAttendanceMonthBounds("2026-07", "2026-07-24"), { startDate: "2026-07-01", endDate: "2026-07-24" });
  assert.deepEqual(employeeAttendanceMonthBounds("2026-06", "2026-07-24"), { startDate: "2026-06-01", endDate: "2026-06-30" });
});
test("calendar displays the full selected month so future closures can be planned", () => {
  assert.deepEqual(employeeAttendanceCalendarMonthBounds("2026-07"), { startDate: "2026-07-01", endDate: "2026-07-31" });
});
