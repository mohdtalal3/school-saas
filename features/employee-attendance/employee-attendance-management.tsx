"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DailyEmployeeAttendanceTab } from "./daily-employee-attendance-tab";
import { EmployeeAttendanceCalendarTab } from "./employee-attendance-calendar-tab";
import { EmployeeAttendanceSettingsTab } from "./employee-attendance-settings-tab";
import { EmployeeMonthlyReportTab } from "./employee-monthly-report-tab";
import { EmployeeDetailReportTab } from "./employee-detail-report-tab";
import { AttendanceImportHistoryTab } from "./attendance-import-history-tab";

export function EmployeeAttendanceManagement({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "daily";
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const navigate = (nextView: string, nextEmployeeId?: string) => router.push(`/school/attendance?tab=employees&view=${nextView}${nextEmployeeId ? `&employeeId=${nextEmployeeId}` : ""}`);
  return <div className="space-y-6">
    {view === "daily" && <DailyEmployeeAttendanceTab schoolId={schoolId} />}
    {view === "calendar" && <EmployeeAttendanceCalendarTab schoolId={schoolId} />}
    {view === "settings" && <EmployeeAttendanceSettingsTab schoolId={schoolId} />}
    {view === "monthly" && <EmployeeMonthlyReportTab schoolId={schoolId} onEmployee={(id) => navigate("detail", id)} />}
    {view === "detail" && <EmployeeDetailReportTab schoolId={schoolId} initialEmployeeId={employeeId} onEmployee={(id) => navigate("detail", id)} />}
    {view === "imports" && <AttendanceImportHistoryTab schoolId={schoolId} />}
  </div>;
}
