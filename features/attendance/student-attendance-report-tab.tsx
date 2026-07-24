"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Loader2, Printer, Search, UserRound, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchPicker } from "@/components/ui/search-picker";
import { useToast } from "@/components/ui/toast";
import { getInitials } from "@/lib/utils";
import type { StudentAttendance } from "@/types/school.types";
import { fetchStudentAttendanceReport } from "./api";
import { AttendanceDateRange, AttendanceStatsCards } from "./attendance-report-ui";
import { localDate, monthStart } from "./attendance-utils";
import { exportAttendanceExcel, printAttendanceReport, type AttendanceExportColumn } from "./report-export";

type StudentReportRow = StudentAttendance & { class_name: string | null };

async function searchStudents(schoolId: string, query: string) {
  const params = new URLSearchParams({ page: "1", limit: "20", active: "true", search: query, searchFields: "name,registration_no" });
  const response = await fetch(`/api/students/${schoolId}?${params}`);
  const json = await response.json();
  if (!response.ok || !json.success) throw new Error(json.error || "Failed to search students");
  return (json.data.data as Array<{ id: string; name: string; registration_no: string | null; class_name: string | null; photo_url: string | null }>).map((student) => ({ id: student.id, name: student.name, photo_url: student.photo_url, subtitle: `${student.registration_no ?? "No registration no"}${student.class_name ? ` · ${student.class_name}` : ""}` }));
}

export function StudentAttendanceReportTab({ schoolId }: { schoolId: string }) {
  const today = React.useMemo(() => localDate(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const studentId = searchParams.get("studentId") ?? "";
  const [startDate, setStartDate] = React.useState(monthStart);
  const [endDate, setEndDate] = React.useState(today);

  const report = useQuery({
    queryKey: ["attendance-report", "student", schoolId, studentId, startDate, endDate],
    queryFn: () => fetchStudentAttendanceReport(schoolId, studentId, startDate, endDate),
    enabled: Boolean(studentId && startDate && endDate && startDate <= endDate),
  });

  function selectStudent(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "student-report");
    params.set("studentId", id);
    router.replace(`/school/attendance?${params}`);
  }

  function clearStudent() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("studentId");
    router.replace(`/school/attendance?${params}`);
  }

  const columns: AttendanceExportColumn<StudentReportRow>[] = [
    { label: "#", value: (_row, index) => index + 1 },
    { label: "Date", value: (row) => row.attendance_date },
    { label: "Day", value: (row) => new Date(`${row.attendance_date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" }) },
    { label: "Present", value: (row) => row.status === "present" ? "Yes" : "" },
    { label: "Absent", value: (row) => row.status === "absent" ? "Yes" : "" },
    { label: "Late", value: (row) => row.status === "late" ? "Yes" : "" },
    { label: "Leave", value: (row) => row.status === "leave" ? "Yes" : "" },
    { label: "Class", value: (row) => row.class_name ?? "—" },
    { label: "Note", value: (row) => row.note ?? "" },
  ];

  function exportExcel() {
    if (!report.data?.records.length) return toast({ title: "Nothing to export", variant: "destructive" });
    exportAttendanceExcel({ filename: `student-attendance-${report.data.student.name}-${startDate}-to-${endDate}.xlsx`, sheetName: "Student Attendance", columns, rows: report.data.records, summaryRow: ["", "TOTAL", "", report.data.stats.present, report.data.stats.absent, report.data.stats.late, report.data.stats.leave, "", `Rate ${report.data.stats.attendanceRate}%`] });
    toast({ title: "Report exported", variant: "success" });
  }

  function printReport() {
    if (!report.data?.records.length) return toast({ title: "Nothing to print", variant: "destructive" });
    try { printAttendanceReport({ title: `Student Attendance — ${report.data.student.name}`, meta: `${report.data.student.registration_no ?? "No registration no"} · ${report.data.student.class_name ?? "No class"} · ${startDate} to ${endDate}`, columns, rows: report.data.records, summary: `Present: ${report.data.stats.present} · Absent: ${report.data.stats.absent} · Late: ${report.data.stats.late} · Leave: ${report.data.stats.leave} · Attendance: ${report.data.stats.attendanceRate}%` }); }
    catch (error) { toast({ title: error instanceof Error ? error.message : "Unable to print", variant: "destructive" }); }
  }

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold tracking-tight">Student Attendance Report</h1><p className="text-sm text-muted-foreground">Search a student to view day-by-day attendance and aggregated totals.</p></div>
    <Card><CardContent className="space-y-4 p-4 sm:p-6">
      {!studentId ? <SearchPicker minChars={2} placeholder="Search by student name or registration no..." searchFn={(query) => searchStudents(schoolId, query)} queryKey={(query) => ["attendance-student-search", schoolId, query]} onSelect={(student) => selectStudent(student.id)} emptyHint={{ icon: <Search className="h-6 w-6 text-muted-foreground" />, title: "Find a student", description: "Type at least 2 characters to see matching students." }} /> : report.data && <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3"><Avatar><AvatarImage src={report.data.student.photo_url ?? undefined} /><AvatarFallback>{getInitials(report.data.student.name)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="font-medium">{report.data.student.name}</p><p className="text-xs text-muted-foreground">{report.data.student.registration_no ?? "No registration no"} · {report.data.student.class_name ?? "No class"}</p></div><Button variant="ghost" size="icon" onClick={clearStudent} aria-label="Choose another student"><X className="h-4 w-4" /></Button></div>}
      <AttendanceDateRange startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} maxDate={today} />
    </CardContent></Card>

    {studentId && report.isLoading && <div className="flex justify-center py-14"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
    {report.data && <><AttendanceStatsCards stats={report.data.stats} /><Card><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-base">Day-by-day attendance</CardTitle><div className="flex gap-2"><Button variant="outline" size="sm" onClick={exportExcel}><Download className="mr-2 h-4 w-4" />Excel</Button><Button variant="outline" size="sm" onClick={printReport}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button></div></div></CardHeader><CardContent className="p-0">{report.data.records.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/30">{columns.map((column) => <th key={column.label} className="px-4 py-3 text-left font-medium text-muted-foreground">{column.label}</th>)}</tr></thead><tbody>{report.data.records.map((row, index) => <tr key={row.id} className="border-b"><td className="px-4 py-3">{index + 1}</td><td className="px-4 py-3 font-medium">{row.attendance_date}</td><td className="px-4 py-3">{new Date(`${row.attendance_date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" })}</td>{(["present", "absent", "late", "leave"] as const).map((status) => <td key={status} className="px-4 py-3 text-center">{row.status === status ? <span className="font-semibold text-primary">✓</span> : "—"}</td>)}<td className="px-4 py-3">{row.class_name ?? "—"}</td><td className="px-4 py-3 text-muted-foreground">{row.note ?? "—"}</td></tr>)}</tbody><tfoot><tr className="bg-muted/40 font-semibold"><td colSpan={3} className="px-4 py-3">Aggregation</td><td className="px-4 py-3 text-center">{report.data.stats.present}</td><td className="px-4 py-3 text-center">{report.data.stats.absent}</td><td className="px-4 py-3 text-center">{report.data.stats.late}</td><td className="px-4 py-3 text-center">{report.data.stats.leave}</td><td colSpan={2} className="px-4 py-3">Attendance {report.data.stats.attendanceRate}%</td></tr></tfoot></table></div> : <div className="flex flex-col items-center py-14 text-center"><UserRound className="mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">No marked attendance in this date range</p></div>}</CardContent></Card></>}
  </div>;
}
