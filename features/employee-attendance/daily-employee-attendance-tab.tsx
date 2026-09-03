"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { CalendarOff, History, Loader2, Save, Search, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { formatWorkedMinutes } from "@/lib/employee-attendance-calculations";
import type { DailyEmployeeAttendanceRow, EmployeeAttendanceDraftStatus } from "@/types/school.types";
import { localDate } from "@/features/attendance/attendance-utils";
import { AttendanceImportModal } from "./attendance-import-modal";
import { DailyEmployeeAttendanceData, employeeAttendanceRequest, jsonRequest } from "./api";
import { EMPLOYEE_ATTENDANCE_STATUS_OPTIONS, EmployeeAttendanceStatusBadge } from "./employee-attendance-status-badge";

export function DailyEmployeeAttendanceTab({ schoolId }: { schoolId: string }) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [date, setDate] = React.useState(() => searchParams.get("date") ?? localDate());
  const [designation, setDesignation] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [loaded, setLoaded] = React.useState(true);
  const [rows, setRows] = React.useState<DailyEmployeeAttendanceRow[]>([]);
  const [importOpen, setImportOpen] = React.useState(false);
  const [auditEmployee, setAuditEmployee] = React.useState<DailyEmployeeAttendanceRow | null>(null);
  const queryString = new URLSearchParams({ date, ...(designation !== "all" ? { designation } : {}), ...(status !== "all" ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) }).toString();
  const attendance = useQuery({
    queryKey: ["daily-employee-attendance", schoolId, queryString, loaded],
    queryFn: () => employeeAttendanceRequest<DailyEmployeeAttendanceData>(`/api/attendance/${schoolId}/employees/daily?${queryString}`),
    enabled: loaded,
  });
  const audit = useQuery({
    queryKey: ["employee-attendance-audit", schoolId, auditEmployee?.employee_id, date],
    queryFn: () => employeeAttendanceRequest<Array<{ id: string; action: string; previous_value: Record<string, unknown> | null; new_value: Record<string, unknown> | null; reason: string | null; changed_at: string }>>(`/api/attendance/${schoolId}/employees/audit?employeeId=${auditEmployee?.employee_id}&date=${date}`),
    enabled: Boolean(auditEmployee),
  });
  React.useEffect(() => { if (attendance.data) setRows(attendance.data.rows); }, [attendance.data]);
  React.useEffect(() => { setLoaded(false); }, [date, designation, status]);

  const save = useMutation({
    mutationFn: (finalize: boolean) => employeeAttendanceRequest(`/api/attendance/${schoolId}/employees/daily`, jsonRequest("PUT", {
      date,
      finalize_missing: finalize,
      records: rows.map((row) => ({ employee_id: row.employee_id, actual_check_in: row.actual_check_in, actual_check_out: row.actual_check_out, status: row.status, is_manual_override: row.is_manual_override, notes: row.notes })),
    })),
    onSuccess: (_data, finalize) => { toast({ title: finalize ? "Attendance day finalized" : "Employee attendance saved", variant: "success" }); queryClient.invalidateQueries({ queryKey: ["daily-employee-attendance", schoolId] }); queryClient.invalidateQueries({ queryKey: ["employee-attendance-calendar", schoolId] }); },
    onError: (error) => toast({ title: "Could not save attendance", description: error instanceof Error ? error.message : "Try again", variant: "destructive" }),
  });
  const changeRow = (employeeId: string, patch: Partial<DailyEmployeeAttendanceRow>) => setRows((current) => current.map((row) => row.employee_id === employeeId ? { ...row, ...patch } : row));
  const schedule = attendance.data?.schedule;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold tracking-tight">Daily Employee Attendance</h2><p className="text-sm text-muted-foreground">Record punches, override statuses, and finalize missing employees.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Import Attendance</Button><Button onClick={() => save.mutate(false)} disabled={!attendance.data?.isWorkingDay || save.isPending}><Save className="mr-2 h-4 w-4" />Save Attendance</Button></div></div>
    <Card><CardHeader><CardTitle className="text-base">Attendance filters</CardTitle></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} max={localDate()} onChange={(event) => setDate(event.target.value)} /></div>
      <Filter label="Designation" value={designation} onChange={setDesignation} options={attendance.data?.filters.designations ?? []} />
      <div className="space-y-1.5"><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{EMPLOYEE_ATTENDANCE_STATUS_OPTIONS.filter((option) => !["weekly_off", "holiday"].includes(option.value)).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5 lg:col-span-2"><Label>Employee search</Label><div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or employee ID" onKeyDown={(event) => { if (event.key === "Enter") setLoaded(true); }} /></div><Button onClick={() => setLoaded(true)}>Load Employees</Button></div></div>
    </div></CardContent></Card>
    {attendance.isLoading ? <Card><CardContent className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-primary" /></CardContent></Card> : attendance.data && !attendance.data.isWorkingDay ? <Card><CardContent className="flex flex-col items-center py-16 text-center"><CalendarOff className="mb-3 h-10 w-10 text-amber-500" /><h3 className="font-semibold">No employee attendance required</h3><p className="mt-1 text-sm text-muted-foreground">{schedule?.schedule_name} · {schedule?.closure_type?.replaceAll("_", " ") ?? "Attendance closed"}</p></CardContent></Card> : attendance.data ? <>
      <div className="grid gap-3 sm:grid-cols-3"><Info label="Applicable schedule" value={schedule?.schedule_name ?? "Default"} /><Info label="Duty timing" value={`${schedule?.duty_start} – ${schedule?.duty_end}`} /><Info label="Check-in window" value={`${schedule?.check_in_start} – ${schedule?.check_in_end}`} /></div>
      <Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="text-base">Active employees</CardTitle><p className="mt-1 text-xs text-muted-foreground">{rows.length} employee(s) loaded</p></div><Button variant="outline" onClick={() => { if (window.confirm("Finalize this day? Employees with no punches will be marked Absent.")) save.mutate(true); }} disabled={!rows.length || save.isPending}>Finalize Day</Button></div></CardHeader><CardContent className="p-0">{rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1580px] text-sm"><thead><tr className="border-y bg-muted/30">{["Employee ID","Employee","Designation","Scheduled In","Actual In","Scheduled Out","Actual Out","Late","Early Leave","Worked","Status","Notes","Review","Actions"].map((label) => <th key={label} className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.employee_id} className="border-b align-top"><td className="px-3 py-3">{row.employee_code ?? "—"}</td><td className="px-3 py-3 font-medium">{row.employee_name}</td><td className="px-3 py-3">{row.designation}</td><td className="px-3 py-3">{row.scheduled_check_in ?? "—"}</td><td className="px-3 py-2"><Input type="time" className="w-32" value={row.actual_check_in ?? ""} onChange={(event) => changeRow(row.employee_id, { actual_check_in: event.target.value || null })} /></td><td className="px-3 py-3">{row.scheduled_check_out ?? "—"}</td><td className="px-3 py-2"><Input type="time" className="w-32" value={row.actual_check_out ?? ""} onChange={(event) => changeRow(row.employee_id, { actual_check_out: event.target.value || null })} /></td><td className="px-3 py-3">{row.late_minutes}m</td><td className="px-3 py-3">{row.early_leave_minutes}m</td><td className="px-3 py-3">{formatWorkedMinutes(row.worked_minutes)}</td><td className="px-3 py-2"><Select value={row.status} onValueChange={(value) => changeRow(row.employee_id, { status: value as EmployeeAttendanceDraftStatus, is_manual_override: true })}><SelectTrigger className="w-36"><EmployeeAttendanceStatusBadge status={row.status} /></SelectTrigger><SelectContent>{EMPLOYEE_ATTENDANCE_STATUS_OPTIONS.filter((option) => !["weekly_off", "holiday"].includes(option.value)).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></td><td className="px-3 py-2"><Input className="w-44" value={row.notes} onChange={(event) => changeRow(row.employee_id, { notes: event.target.value })} placeholder="Optional note" /></td><td className="px-3 py-3 text-xs text-amber-700">{row.requires_review ? row.review_reason : row.source?.replaceAll("_", " ") ?? "—"}</td><td className="px-3 py-2"><Button size="sm" variant="ghost" onClick={() => setAuditEmployee(row)}><History className="mr-1 h-4 w-4" />History</Button></td></tr>)}</tbody></table></div> : <div className="flex flex-col items-center py-16"><Users className="mb-3 h-9 w-9 text-muted-foreground" /><p className="font-medium">No employees found</p><p className="text-sm text-muted-foreground">Change the filters and load employees again.</p></div>}</CardContent></Card>
    </> : <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">Choose filters and select Load Employees.</CardContent></Card>}
    <AttendanceImportModal schoolId={schoolId} date={date} open={importOpen} onOpenChange={setImportOpen} onImported={() => { setLoaded(true); queryClient.invalidateQueries({ queryKey: ["daily-employee-attendance", schoolId] }); }} />
    <Dialog open={Boolean(auditEmployee)} onOpenChange={(open) => { if (!open) setAuditEmployee(null); }}><DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Attendance audit history</DialogTitle><DialogDescription>{auditEmployee?.employee_name} · {date}</DialogDescription></DialogHeader>{audit.isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : audit.data?.length ? <div className="divide-y rounded-lg border">{audit.data.map((item) => <div key={item.id} className="p-3"><div className="flex items-center justify-between"><span className="text-sm font-semibold capitalize">{item.action}</span><span className="text-[10px] text-muted-foreground">{new Date(item.changed_at).toLocaleString()}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.reason ?? "No reason supplied"}</p><p className="mt-2 text-xs">Status: <b>{String(item.previous_value?.status ?? "none")}</b> → <b>{String(item.new_value?.status ?? "removed")}</b></p></div>)}</div> : <p className="py-12 text-center text-sm text-muted-foreground">No changes have been recorded for this employee and date.</p>}</DialogContent></Dialog>
  </div>;
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All {label.toLowerCase()}s</SelectItem>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
