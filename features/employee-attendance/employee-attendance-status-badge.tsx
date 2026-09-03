import { cn } from "@/lib/utils";
import type { EmployeeAttendanceDraftStatus } from "@/types/school.types";

export const EMPLOYEE_ATTENDANCE_STATUS_OPTIONS: Array<{ value: EmployeeAttendanceDraftStatus; label: string }> = [
  { value: "not_marked", label: "Not Marked" },
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "leave", label: "Leave" },
  { value: "short_leave", label: "Short Leave" },
  { value: "half_day", label: "Half Day" },
  { value: "weekly_off", label: "Weekly Off" },
  { value: "holiday", label: "Holiday" },
];

const colors: Record<EmployeeAttendanceDraftStatus, string> = {
  not_marked: "border-slate-300 bg-slate-50 text-slate-700",
  present: "border-emerald-300 bg-emerald-50 text-emerald-700",
  late: "border-amber-300 bg-amber-50 text-amber-700",
  absent: "border-red-300 bg-red-50 text-red-700",
  leave: "border-blue-300 bg-blue-50 text-blue-700",
  short_leave: "border-cyan-300 bg-cyan-50 text-cyan-700",
  half_day: "border-orange-300 bg-orange-50 text-orange-700",
  weekly_off: "border-violet-300 bg-violet-50 text-violet-700",
  holiday: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700",
};

export function EmployeeAttendanceStatusBadge({ status, className }: { status: EmployeeAttendanceDraftStatus; className?: string }) {
  const label = EMPLOYEE_ATTENDANCE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
  return <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold", colors[status], className)}>{label}</span>;
}
