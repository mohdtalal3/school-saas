"use client";

import type {
  DailyEmployeeAttendanceRow,
  EmployeeAttendanceSchedule,
  EmployeeAttendanceSettings,
  ResolvedEmployeeSchedule,
} from "@/types/school.types";

export async function employeeAttendanceRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.error || "Request failed");
  return payload.data as T;
}

export type DailyEmployeeAttendanceData = {
  date: string;
  schedule: ResolvedEmployeeSchedule;
  isWorkingDay: boolean;
  dayStatus: string;
  rows: DailyEmployeeAttendanceRow[];
  filters: { designations: string[] };
};

export type EmployeeAttendanceConfiguration = {
  settings: EmployeeAttendanceSettings;
  schedules: EmployeeAttendanceSchedule[];
};

export function jsonRequest(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
