"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Clipboard, FileSpreadsheet, Loader2, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useAdminShell } from "@/components/layout/admin-shell";
import { employeeAttendanceRequest } from "./api";
import { copyEmployeeReport, EmployeeReportColumn, exportEmployeeReportExcel, printEmployeeReport } from "./report-actions";

type Row = {
  employee_id: string; employee_code: string | null; employee_name: string; designation: string; is_active: boolean;
  working_days: number; present: number; late: number; absent: number; leave: number; short_leave: number; half_day: number;
  holidays: number; weekly_offs: number; total_late_minutes: number; total_early_leave_minutes: number; total_worked_minutes: number; incomplete_records: number;
};
type Report = { month: string; startDate: string; endDate: string; rows: Row[]; totals: Omit<Row, "employee_id" | "employee_code" | "employee_name" | "designation" | "is_active"> };
const columns: EmployeeReportColumn<Row>[] = [
  { key: "code", label: "Employee ID", value: (row) => row.employee_code ?? "—" }, { key: "name", label: "Employee Name", value: (row) => row.employee_name },
  { key: "designation", label: "Designation", value: (row) => row.designation },
  { key: "working", label: "Working Days", value: (row) => row.working_days }, { key: "present", label: "Present", value: (row) => row.present },
  { key: "late", label: "Late", value: (row) => row.late }, { key: "absent", label: "Absent", value: (row) => row.absent },
  { key: "leave", label: "Leave", value: (row) => row.leave }, { key: "short", label: "Short Leave", value: (row) => row.short_leave },
  { key: "half", label: "Half Day", value: (row) => row.half_day }, { key: "holidays", label: "Holidays", value: (row) => row.holidays },
  { key: "offs", label: "Weekly Offs", value: (row) => row.weekly_offs }, { key: "late_minutes", label: "Late Minutes", value: (row) => row.total_late_minutes },
  { key: "early", label: "Early Minutes", value: (row) => row.total_early_leave_minutes }, { key: "hours", label: "Worked Hours", value: (row) => (row.total_worked_minutes / 60).toFixed(1) },
  { key: "incomplete", label: "Incomplete", value: (row) => row.incomplete_records },
];
function monthValue() { return new Date().toISOString().slice(0, 7); }

export function EmployeeMonthlyReportTab({ schoolId, onEmployee }: { schoolId: string; onEmployee: (id: string) => void }) {
  const { school } = useAdminShell();
  const { toast } = useToast();
  const [month, setMonth] = React.useState(monthValue);
  const [active, setActive] = React.useState("true");
  const [status, setStatus] = React.useState("all");
  const [designation, setDesignation] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("name");
  const [visibleKeys, setVisibleKeys] = React.useState(() => columns.map((column) => column.key));
  const report = useQuery({ queryKey: ["employee-monthly-report", schoolId, month, active, status, designation], queryFn: () => employeeAttendanceRequest<Report>(`/api/attendance/${schoolId}/employees/reports/monthly?month=${month}&active=${active}${status !== "all" ? `&status=${status}` : ""}${designation !== "all" ? `&designation=${encodeURIComponent(designation)}` : ""}`) });
  const designationOptions = React.useMemo(() => Array.from(new Set((report.data?.rows ?? []).map((row) => row.designation))).sort(), [report.data]);
  const rows = React.useMemo(() => [...(report.data?.rows ?? [])].filter((row) => `${row.employee_name} ${row.employee_code ?? ""} ${row.designation}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "absent" ? b.absent - a.absent : sort === "late" ? b.late - a.late : a.employee_name.localeCompare(b.employee_name)), [report.data, search, sort]);
  const visibleColumns = columns.filter((column) => visibleKeys.includes(column.key));
  const actionInput = { schoolName: school?.name ?? "School", logoUrl: school?.logo_url, title: "Monthly Employee Attendance Report", meta: `${report.data?.startDate ?? ""} to ${report.data?.endDate ?? ""}`, summary: `${rows.length} employees · ${report.data?.totals.working_days ?? 0} total scheduled employee-days`, columns: visibleColumns, rows };
  return <div className="space-y-6">
    <div><h2 className="text-xl font-semibold tracking-tight">Monthly Compact Report</h2><p className="text-sm text-muted-foreground">Aggregated attendance for all employees without counting future dates.</p></div>
    <Card><CardContent className="pt-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><Field label="Month"><Input type="month" max={monthValue()} value={month} onChange={(event) => setMonth(event.target.value)} /></Field><Field label="Designation"><Select value={designation} onValueChange={setDesignation}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All designations</SelectItem>{designationOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field label="Employee status"><Select value={active} onValueChange={setActive}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Active employees</SelectItem><SelectItem value="false">Inactive employees</SelectItem><SelectItem value="all">All employees</SelectItem></SelectContent></Select></Field><Field label="Attendance status"><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{["present","late","absent","leave","short_leave","half_day"].map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></Field><Field label="Sort by"><Select value={sort} onValueChange={setSort}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="name">Employee name</SelectItem><SelectItem value="absent">Most absent</SelectItem><SelectItem value="late">Most late</SelectItem></SelectContent></Select></Field><Field label="Search"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} /></div></Field></div></CardContent></Card>
    <div className="flex flex-wrap justify-end gap-2"><details className="relative"><summary className="cursor-pointer list-none rounded-md border bg-background px-3 py-2 text-sm">Columns</summary><div className="absolute right-0 z-20 mt-2 grid w-56 gap-2 rounded-lg border bg-card p-3 shadow-lg">{columns.map((column) => <label key={column.key} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={visibleKeys.includes(column.key)} onChange={() => setVisibleKeys((current) => current.includes(column.key) ? current.filter((key) => key !== column.key) : [...current, column.key])} />{column.label}</label>)}</div></details><Button variant="outline" onClick={async () => { await copyEmployeeReport(visibleColumns, rows); toast({ title: "Table copied", variant: "success" }); }}><Clipboard className="mr-2 h-4 w-4" />Copy</Button><Button variant="outline" onClick={() => exportEmployeeReportExcel({ ...actionInput, filename: `employee-attendance-${month}.xlsx`, sheetName: "Monthly Attendance", totals: visibleColumns.map((column, index) => index === 0 ? "Totals" : totalForColumn(column.key, report.data?.totals)) })}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button><Button variant="outline" onClick={() => printEmployeeReport(actionInput)}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button></div>
    <Card><CardHeader><CardTitle className="text-base">Employee summary</CardTitle></CardHeader><CardContent className="p-0">{report.isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div> : rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-xs"><thead><tr className="border-y bg-muted/40">{visibleColumns.map((column) => <th key={column.key} className="px-3 py-3 text-left font-medium text-muted-foreground">{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.employee_id} className="cursor-pointer border-b hover:bg-muted/30" onClick={() => onEmployee(row.employee_id)}>{visibleColumns.map((column) => <td key={column.key} className="px-3 py-3">{column.value(row)}</td>)}</tr>)}</tbody><tfoot><tr className="bg-primary/5 font-semibold">{visibleColumns.map((column, index) => <td key={column.key} className="px-3 py-3">{index === 0 ? "Totals" : totalForColumn(column.key, report.data?.totals)}</td>)}</tr></tfoot></table></div> : <p className="py-16 text-center text-sm text-muted-foreground">No employee attendance data found.</p>}</CardContent></Card>
  </div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function totalForColumn(key: string, totals?: Report["totals"]) {
  if (!totals || ["code", "name", "designation"].includes(key)) return "";
  const mapped = ({ working: "working_days", short: "short_leave", half: "half_day", offs: "weekly_offs", late_minutes: "total_late_minutes", early: "total_early_leave_minutes", incomplete: "incomplete_records" } as Record<string, keyof Report["totals"]>)[key] ?? key as keyof Report["totals"];
  return key === "hours" ? (totals.total_worked_minutes / 60).toFixed(1) : totals[mapped] ?? "";
}
