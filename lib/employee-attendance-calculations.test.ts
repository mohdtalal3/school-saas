import assert from "node:assert/strict";
import test from "node:test";
import { calculateEmployeeAttendance } from "./employee-attendance-calculations";

const schedule = {
  check_in_start: "07:45",
  check_in_end: "08:30",
  duty_start: "08:00",
  check_out_start: "13:45",
  check_out_end: "14:30",
  duty_end: "14:00",
  short_leave_threshold_minutes: 30,
  half_day_threshold_minutes: 180,
  late_grace_minutes: 5,
  early_checkout_grace_minutes: 5,
};

test("on-time employee is present", () => {
  assert.equal(calculateEmployeeAttendance({ ...schedule, actual_check_in: "08:04", actual_check_out: "14:00" }).status, "present");
});

test("grace controls classification but full lateness is reported", () => {
  const result = calculateEmployeeAttendance({ ...schedule, actual_check_in: "08:17", actual_check_out: "14:00" });
  assert.equal(result.status, "late");
  assert.equal(result.late_minutes, 17);
});

test("early checkout applies short leave and prevents negative minutes", () => {
  const result = calculateEmployeeAttendance({ ...schedule, actual_check_in: "07:55", actual_check_out: "13:20" });
  assert.equal(result.status, "short_leave");
  assert.equal(result.early_leave_minutes, 40);
  assert.equal(result.late_minutes, 0);
});

test("large early checkout applies half day", () => {
  assert.equal(calculateEmployeeAttendance({ ...schedule, actual_check_in: "08:00", actual_check_out: "10:30" }).status, "half_day");
});

test("missing checkout is retained and flagged", () => {
  const result = calculateEmployeeAttendance({ ...schedule, actual_check_in: "08:00" });
  assert.equal(result.status, "present");
  assert.equal(result.requires_review, true);
  assert.match(result.review_reason ?? "", /Missing check-out/);
});

test("missing checkin is flagged", () => {
  const result = calculateEmployeeAttendance({ ...schedule, actual_check_out: "14:00" });
  assert.equal(result.requires_review, true);
  assert.match(result.review_reason ?? "", /Missing check-in/);
});

test("missing punches remain not marked until finalized", () => {
  assert.equal(calculateEmployeeAttendance(schedule).status, "not_marked");
  assert.equal(calculateEmployeeAttendance({ ...schedule, finalize_missing: true }).status, "absent");
});

test("manual leave overrides automatic absence", () => {
  assert.equal(calculateEmployeeAttendance({ ...schedule, finalize_missing: true, manual_status: "leave" }).status, "leave");
});

test("overnight shifts calculate safely", () => {
  const result = calculateEmployeeAttendance({ ...schedule, duty_start: "22:00", duty_end: "06:00", check_in_start: "21:30", check_in_end: "22:30", check_out_start: "05:30", check_out_end: "06:30", actual_check_in: "22:05", actual_check_out: "06:10" });
  assert.equal(result.worked_minutes, 485);
  assert.equal(result.overtime_minutes, 10);
});
