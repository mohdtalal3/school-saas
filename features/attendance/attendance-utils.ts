import type { AttendanceDraftStatus } from "@/types/school.types";

export const ATTENDANCE_STATUS_OPTIONS: Array<{ value: AttendanceDraftStatus; label: string; className: string }> = [
  { value: "not_marked", label: "Not Marked", className: "border-slate-300 bg-slate-50 text-slate-700" },
  { value: "present", label: "Present", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  { value: "absent", label: "Absent", className: "border-red-300 bg-red-50 text-red-700" },
  { value: "late", label: "Late", className: "border-amber-300 bg-amber-50 text-amber-700" },
  { value: "leave", label: "Leave", className: "border-blue-300 bg-blue-50 text-blue-700" },
];

export function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthStart() {
  const date = new Date();
  return localDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
