"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Download, Loader2, Printer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/components/ui/toast";
import type { ClassAttendanceReport } from "@/types/school.types";
import { fetchClassAttendanceReport, fetchClasses } from "./api";
import { AttendanceDateRange, AttendanceStatsCards } from "./attendance-report-ui";
import { localDate, monthStart } from "./attendance-utils";
import { exportAttendanceExcel, printAttendanceReport, type AttendanceExportColumn } from "./report-export";

type ClassReportRow = ClassAttendanceReport["students"][number];

export function ClassAttendanceReportTab({ schoolId }: { schoolId: string }) {
  const today = React.useMemo(() => localDate(), []);
  const router = useRouter();
  const { toast } = useToast();
  const [classId, setClassId] = React.useState("");
  const [startDate, setStartDate] = React.useState(monthStart);
  const [endDate, setEndDate] = React.useState(today);
  const classes = useQuery({ queryKey: ["attendance-classes", schoolId], queryFn: () => fetchClasses(schoolId) });
  const report = useQuery({ queryKey: ["attendance-report", "class", schoolId, classId, startDate, endDate], queryFn: () => fetchClassAttendanceReport(schoolId, classId, startDate, endDate), enabled: Boolean(classId && startDate && endDate && startDate <= endDate) });

  const columns: AttendanceExportColumn<ClassReportRow>[] = [
    { label: "#", value: (_row, index) => index + 1 },
    { label: "Registration No", value: (row) => row.registration_no ?? "—" },
    { label: "Student", value: (row) => row.name },
    { label: "Present", value: (row) => row.present },
    { label: "Absent", value: (row) => row.absent },
    { label: "Late", value: (row) => row.late },
    { label: "Leave", value: (row) => row.leave },
    { label: "Marked Days", value: (row) => row.marked },
    { label: "Attendance", value: (row) => `${row.attendanceRate}%` },
  ];

  function openStudent(studentId: string) { router.push(`/school/attendance?tab=student-report&studentId=${studentId}`); }
  function exportExcel() {
    if (!report.data?.students.length) return toast({ title: "Nothing to export", variant: "destructive" });
    const stats = report.data.stats;
    exportAttendanceExcel({ filename: `class-attendance-${report.data.class.name}-${startDate}-to-${endDate}.xlsx`, sheetName: "Class Attendance", columns, rows: report.data.students, summaryRow: ["", "", "TOTAL", stats.present, stats.absent, stats.late, stats.leave, stats.marked, `${stats.attendanceRate}%`] });
    toast({ title: "Report exported", variant: "success" });
  }
  function printReport() {
    if (!report.data?.students.length) return toast({ title: "Nothing to print", variant: "destructive" });
    const stats = report.data.stats;
    try { printAttendanceReport({ title: `Class Attendance — ${report.data.class.name}`, meta: `${startDate} to ${endDate}`, columns, rows: report.data.students, summary: `Present: ${stats.present} · Absent: ${stats.absent} · Late: ${stats.late} · Leave: ${stats.leave} · Attendance: ${stats.attendanceRate}%` }); }
    catch (error) { toast({ title: error instanceof Error ? error.message : "Unable to print", variant: "destructive" }); }
  }

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold tracking-tight">Class Attendance Report</h1><p className="text-sm text-muted-foreground">Review aggregated attendance for every active student in a class.</p></div>
    <Card><CardContent className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_2fr]"><div className="space-y-1.5"><Label>Class</Label><SearchableSelect options={(classes.data ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.name }))} value={classId} onChange={setClassId} placeholder="Select a class" searchPlaceholder="Search classes..." /></div><AttendanceDateRange startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} maxDate={today} /></CardContent></Card>
    {classId && report.isLoading && <div className="flex justify-center py-14"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
    {report.data && <><AttendanceStatsCards stats={report.data.stats} /><Card><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-base">{report.data.class.name} students</CardTitle><div className="flex gap-2"><Button variant="outline" size="sm" onClick={exportExcel}><Download className="mr-2 h-4 w-4" />Excel</Button><Button variant="outline" size="sm" onClick={printReport}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button></div></div></CardHeader><CardContent className="p-0">{report.data.students.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/30">{columns.map((column) => <th key={column.label} className="px-4 py-3 text-left font-medium text-muted-foreground">{column.label}</th>)}</tr></thead><tbody>{report.data.students.map((student, index) => <tr key={student.id} className="cursor-pointer border-b transition-colors hover:bg-muted/40" onClick={() => openStudent(student.id)}><td className="px-4 py-3">{index + 1}</td><td className="px-4 py-3 text-muted-foreground">{student.registration_no ?? "—"}</td><td className="px-4 py-3 font-medium text-primary hover:underline">{student.name}</td><td className="px-4 py-3">{student.present}</td><td className="px-4 py-3">{student.absent}</td><td className="px-4 py-3">{student.late}</td><td className="px-4 py-3">{student.leave}</td><td className="px-4 py-3">{student.marked}</td><td className="px-4 py-3 font-medium">{student.attendanceRate}%</td></tr>)}</tbody><tfoot><tr className="bg-muted/40 font-semibold"><td colSpan={3} className="px-4 py-3">Class aggregation</td><td className="px-4 py-3">{report.data.stats.present}</td><td className="px-4 py-3">{report.data.stats.absent}</td><td className="px-4 py-3">{report.data.stats.late}</td><td className="px-4 py-3">{report.data.stats.leave}</td><td className="px-4 py-3">{report.data.stats.marked}</td><td className="px-4 py-3">{report.data.stats.attendanceRate}%</td></tr></tfoot></table></div> : <div className="flex flex-col items-center py-14 text-center"><Users className="mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">No active students in this class</p></div>}</CardContent></Card></>}
  </div>;
}
