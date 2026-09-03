"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clipboard, FileSpreadsheet, Loader2, Printer, UserRoundSearch } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchPicker } from "@/components/ui/search-picker";
import { useToast } from "@/components/ui/toast";
import { useAdminShell } from "@/components/layout/admin-shell";
import { formatWorkedMinutes } from "@/lib/employee-attendance-calculations";
import { getInitials } from "@/lib/utils";
import type { EmployeeAttendanceDraftStatus, EmployeeAttendanceRecord, ResolvedEmployeeSchedule } from "@/types/school.types";
import { employeeAttendanceRequest } from "./api";
import { EmployeeAttendanceStatusBadge } from "./employee-attendance-status-badge";
import { copyEmployeeReport, EmployeeReportColumn, exportEmployeeReportExcel, printEmployeeReport } from "./report-actions";

type Day = { date: string; day: string; schedule: ResolvedEmployeeSchedule; record: EmployeeAttendanceRecord | null; status: EmployeeAttendanceDraftStatus };
type SearchPickerItem = { id: string; name: string; photo_url?: string | null; subtitle?: string };
type Detail = {
  employee: { id: string; employee_code: string | null; name: string; role: string; photo_url: string | null };
  month: string; startDate: string; endDate: string;
  stats: { working_days: number; present: number; late: number; absent: number; leave: number; short_leave: number; half_day: number; total_late_minutes: number; total_early_leave_minutes: number; total_worked_minutes: number };
  days: Day[];
  navigation: { previous: { id: string; name: string } | null; next: { id: string; name: string } | null };
};
const columns: EmployeeReportColumn<Day>[] = [
  { key: "date", label: "Date", value: (row) => row.date }, { key: "day", label: "Day", value: (row) => row.day },
  { key: "scheduled_in", label: "Scheduled In", value: (row) => row.schedule.duty_start }, { key: "actual_in", label: "Actual In", value: (row) => row.record?.actual_check_in?.slice(0, 5) ?? "—" },
  { key: "scheduled_out", label: "Scheduled Out", value: (row) => row.schedule.duty_end }, { key: "actual_out", label: "Actual Out", value: (row) => row.record?.actual_check_out?.slice(0, 5) ?? "—" },
  { key: "late", label: "Late Minutes", value: (row) => row.record?.late_minutes ?? 0 }, { key: "early", label: "Early Minutes", value: (row) => row.record?.early_leave_minutes ?? 0 },
  { key: "worked", label: "Worked", value: (row) => formatWorkedMinutes(row.record?.worked_minutes ?? null) }, { key: "status", label: "Status", value: (row) => row.status.replaceAll("_", " ") },
  { key: "source", label: "Source", value: (row) => row.record?.source.replaceAll("_", " ") ?? "—" }, { key: "notes", label: "Notes", value: (row) => row.record?.notes ?? row.schedule.note ?? "—" },
];
function monthValue() { return new Date().toISOString().slice(0, 7); }
function shiftMonth(month: string, amount: number) { const [year, number] = month.split("-").map(Number); const value = new Date(year, number - 1 + amount, 1); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`; }

export function EmployeeDetailReportTab({ schoolId, initialEmployeeId, onEmployee }: { schoolId: string; initialEmployeeId?: string; onEmployee: (id: string) => void }) {
  const { school } = useAdminShell();
  const { toast } = useToast();
  const [employeeId, setEmployeeId] = React.useState(initialEmployeeId ?? "");
  const [month, setMonth] = React.useState(monthValue);
  const [search, setSearch] = React.useState("");
  const [sortDescending, setSortDescending] = React.useState(false);
  const [visibleKeys, setVisibleKeys] = React.useState(() => columns.map((column) => column.key));
  React.useEffect(() => { if (initialEmployeeId) setEmployeeId(initialEmployeeId); }, [initialEmployeeId]);
  const report = useQuery({ queryKey: ["employee-detail-attendance", schoolId, employeeId, month], queryFn: () => employeeAttendanceRequest<Detail>(`/api/attendance/${schoolId}/employees/reports/employee?employeeId=${employeeId}&month=${month}`), enabled: Boolean(employeeId) });
  async function searchEmployees(search: string): Promise<SearchPickerItem[]> {
    const response = await employeeAttendanceRequest<{ data: Array<{ id: string; name: string; employee_code: string | null; role: string }> }>(`/api/employees/${schoolId}?limit=10&active=all&search=${encodeURIComponent(search)}`);
    return response.data.map((employee) => ({ id: employee.id, name: employee.name, subtitle: `${employee.employee_code ?? "No ID"} · ${employee.role}` }));
  }
  const detail = report.data;
  const visibleColumns = columns.filter((column) => visibleKeys.includes(column.key));
  const visibleDays = [...(detail?.days ?? [])].filter((day) => `${day.date} ${day.day} ${day.status} ${day.record?.notes ?? ""}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sortDescending ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  const actionInput = { schoolName: school?.name ?? "School", logoUrl: school?.logo_url, title: "Detailed Employee Attendance Report", meta: detail ? `${detail.employee.name} · ${detail.employee.employee_code ?? "No ID"} · ${detail.startDate} to ${detail.endDate}` : "", summary: detail ? `Working ${detail.stats.working_days} · Present ${detail.stats.present} · Late ${detail.stats.late} · Absent ${detail.stats.absent} · Worked ${(detail.stats.total_worked_minutes / 60).toFixed(1)} hours` : "", columns: visibleColumns, rows: visibleDays };
  return <div className="space-y-6">
    <div><h2 className="text-xl font-semibold tracking-tight">Employee Detail Report</h2><p className="text-sm text-muted-foreground">Daily attendance, scheduled timing, source, notes, and monthly totals for one employee.</p></div>
    <Card><CardContent className="pt-6"><div className="grid gap-4 lg:grid-cols-[1fr_220px_auto]"><SearchPicker minChars={2} placeholder="Search employee by name, ID, or designation..." searchFn={searchEmployees} queryKey={(search) => ["employee-attendance-detail-search", schoolId, search]} onSelect={(employee) => { setEmployeeId(employee.id); onEmployee(employee.id); }} emptyHint={{ icon: <UserRoundSearch className="h-5 w-5" />, title: "Search employee", description: "Choose an employee to load their detailed report." }} /><Input type="month" max={monthValue()} value={month} onChange={(event) => setMonth(event.target.value)} /><div className="flex gap-2"><Button size="icon" variant="outline" onClick={() => setMonth((value) => shiftMonth(value, -1))}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="outline" disabled={month >= monthValue()} onClick={() => setMonth((value) => shiftMonth(value, 1))}><ChevronRight className="h-4 w-4" /></Button></div></div></CardContent></Card>
    {!employeeId ? <Card><CardContent className="py-20 text-center text-sm text-muted-foreground">Search and select an employee to view attendance.</CardContent></Card> : report.isLoading ? <Card><CardContent className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></CardContent></Card> : detail ? <>
      <Card><CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center"><Avatar className="h-16 w-16">{detail.employee.photo_url && <AvatarImage src={detail.employee.photo_url} />}<AvatarFallback>{getInitials(detail.employee.name)}</AvatarFallback></Avatar><div className="flex-1"><h3 className="text-lg font-bold">{detail.employee.name}</h3><p className="text-sm text-muted-foreground">{detail.employee.employee_code ?? "No employee ID"} · {detail.employee.role}</p></div><div className="flex gap-2"><Button variant="outline" disabled={!detail.navigation.previous} onClick={() => { const id = detail.navigation.previous?.id; if (id) { setEmployeeId(id); onEmployee(id); } }}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><Button variant="outline" disabled={!detail.navigation.next} onClick={() => { const id = detail.navigation.next?.id; if (id) { setEmployeeId(id); onEmployee(id); } }}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div></CardContent></Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Working Days",detail.stats.working_days],["Present",detail.stats.present],["Late",detail.stats.late],["Absent",detail.stats.absent],["Leave",detail.stats.leave],["Short Leave",detail.stats.short_leave],["Half Day",detail.stats.half_day],["Late Minutes",detail.stats.total_late_minutes],["Early Minutes",detail.stats.total_early_leave_minutes],["Worked Hours",(detail.stats.total_worked_minutes / 60).toFixed(1)]].map(([label,value]) => <Card key={String(label)}><CardContent className="pt-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>)}</div>
      <div className="flex flex-wrap items-center justify-end gap-2"><Input className="mr-auto max-w-xs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search date, day, status, or notes" /><Button variant="outline" onClick={() => setSortDescending((value) => !value)}>Sort {sortDescending ? "Oldest first" : "Newest first"}</Button><details className="relative"><summary className="cursor-pointer list-none rounded-md border bg-background px-3 py-2 text-sm">Columns</summary><div className="absolute right-0 z-20 mt-2 grid w-52 gap-2 rounded-lg border bg-card p-3 shadow-lg">{columns.map((column) => <label key={column.key} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={visibleKeys.includes(column.key)} onChange={() => setVisibleKeys((current) => current.includes(column.key) ? current.filter((key) => key !== column.key) : [...current, column.key])} />{column.label}</label>)}</div></details><Button variant="outline" onClick={async () => { await copyEmployeeReport(visibleColumns, visibleDays); toast({ title: "Table copied", variant: "success" }); }}><Clipboard className="mr-2 h-4 w-4" />Copy</Button><Button variant="outline" onClick={() => exportEmployeeReportExcel({ ...actionInput, filename: `${detail.employee.employee_code ?? "employee"}-${month}-attendance.xlsx`, sheetName: "Employee Attendance" })}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button><Button variant="outline" onClick={() => printEmployeeReport(actionInput)}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button></div>
      <Card><CardHeader><CardTitle className="text-base">Daily breakdown</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-xs"><thead><tr className="border-y bg-muted/40">{visibleColumns.map((column) => <th key={column.key} className="px-3 py-3 text-left font-medium text-muted-foreground">{column.label}</th>)}</tr></thead><tbody>{visibleDays.map((day) => <tr key={day.date} className="border-b">{visibleColumns.map((column) => <td key={column.key} className="px-3 py-3">{column.key === "status" ? <EmployeeAttendanceStatusBadge status={day.status} /> : column.value(day)}</td>)}</tr>)}</tbody></table></div></CardContent></Card>
    </> : null}
  </div>;
}
