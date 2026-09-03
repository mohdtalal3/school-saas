import type {
  EmployeeAttendanceStatus,
  EmployeeAttendanceSettings,
} from "@/types/school.types";

export type AttendanceCalculationInput = Pick<
  EmployeeAttendanceSettings,
  | "check_in_start"
  | "check_in_end"
  | "duty_start"
  | "check_out_start"
  | "check_out_end"
  | "duty_end"
  | "short_leave_threshold_minutes"
  | "half_day_threshold_minutes"
  | "late_grace_minutes"
  | "early_checkout_grace_minutes"
> & {
  actual_check_in?: string | null;
  actual_check_out?: string | null;
  manual_status?: EmployeeAttendanceStatus | null;
  finalize_missing?: boolean;
};

export interface AttendanceCalculationResult {
  status: EmployeeAttendanceStatus | "not_marked";
  late_minutes: number;
  early_leave_minutes: number;
  worked_minutes: number | null;
  overtime_minutes: number;
  requires_review: boolean;
  review_reason: string | null;
}

export function timeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function elapsedMinutes(start: number, end: number) {
  return end >= start ? end - start : end + 24 * 60 - start;
}

export function calculateEmployeeAttendance(input: AttendanceCalculationInput): AttendanceCalculationResult {
  const actualIn = timeToMinutes(input.actual_check_in);
  const actualOut = timeToMinutes(input.actual_check_out);
  const dutyStart = timeToMinutes(input.duty_start) ?? 0;
  let dutyEnd = timeToMinutes(input.duty_end) ?? dutyStart;
  if (dutyEnd <= dutyStart) dutyEnd += 24 * 60;

  if (actualIn == null && actualOut == null) {
    return {
      status: input.manual_status ?? (input.finalize_missing ? "absent" : "not_marked"),
      late_minutes: 0,
      early_leave_minutes: 0,
      worked_minutes: null,
      overtime_minutes: 0,
      requires_review: false,
      review_reason: null,
    };
  }

  const normalizedIn = actualIn;
  const normalizedOut = actualOut == null ? null : actualIn != null && actualOut < actualIn ? actualOut + 24 * 60 : actualOut;
  const lateMinutes = normalizedIn == null ? 0 : Math.max(0, normalizedIn - dutyStart);
  const earlyLeaveMinutes = normalizedOut == null ? 0 : Math.max(0, dutyEnd - normalizedOut);
  const workedMinutes = normalizedIn != null && normalizedOut != null ? Math.max(0, normalizedOut - normalizedIn) : null;
  const overtimeMinutes = normalizedOut == null ? 0 : Math.max(0, normalizedOut - dutyEnd);

  let status: EmployeeAttendanceStatus =
    lateMinutes > input.late_grace_minutes ? "late" : "present";
  const classifiableEarlyMinutes = earlyLeaveMinutes > input.early_checkout_grace_minutes ? earlyLeaveMinutes : 0;
  if (classifiableEarlyMinutes > input.half_day_threshold_minutes) status = "half_day";
  else if (classifiableEarlyMinutes > input.short_leave_threshold_minutes) status = "short_leave";
  if (input.manual_status) status = input.manual_status;

  const reasons: string[] = [];
  if (actualIn == null) reasons.push("Missing check-in");
  if (actualOut == null) reasons.push("Missing check-out");
  const checkInStart = timeToMinutes(input.check_in_start);
  const checkInEnd = timeToMinutes(input.check_in_end);
  const checkOutStart = timeToMinutes(input.check_out_start);
  const checkOutEnd = timeToMinutes(input.check_out_end);
  if (normalizedIn != null && checkInStart != null && checkInEnd != null && (normalizedIn < checkInStart || normalizedIn > checkInEnd)) {
    reasons.push("Check-in outside allowed window");
  }
  if (normalizedOut != null && checkOutStart != null && checkOutEnd != null) {
    const adjustedStart = checkOutStart <= dutyStart ? checkOutStart + 24 * 60 : checkOutStart;
    const adjustedEnd = checkOutEnd <= dutyStart ? checkOutEnd + 24 * 60 : checkOutEnd;
    if (normalizedOut < adjustedStart || normalizedOut > adjustedEnd) reasons.push("Check-out outside allowed window");
  }

  return {
    status,
    late_minutes: lateMinutes,
    early_leave_minutes: earlyLeaveMinutes,
    worked_minutes: workedMinutes,
    overtime_minutes: overtimeMinutes,
    requires_review: reasons.length > 0,
    review_reason: reasons.join("; ") || null,
  };
}

export function formatWorkedMinutes(minutes: number | null) {
  if (minutes == null) return "—";
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
