"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCheck, Loader2, Save, Search, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/components/ui/toast";
import { cn, getInitials } from "@/lib/utils";
import type { AttendanceDraftStatus, DailyAttendanceStudent } from "@/types/school.types";
import { apiRequest, fetchClasses, fetchDailyAttendance } from "./api";
import { ATTENDANCE_STATUS_OPTIONS, localDate } from "./attendance-utils";

export function DailyStudentAttendanceTab({ schoolId }: { schoolId: string }) {
  const today = React.useMemo(() => localDate(), []);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [classId, setClassId] = React.useState("");
  const [date, setDate] = React.useState(today);
  const [rows, setRows] = React.useState<DailyAttendanceStudent[]>([]);
  const [search, setSearch] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const classes = useQuery({ queryKey: ["attendance-classes", schoolId], queryFn: () => fetchClasses(schoolId) });
  const attendance = useQuery({
    queryKey: ["daily-student-attendance", schoolId, classId, date],
    queryFn: () => fetchDailyAttendance(schoolId, classId, date),
    enabled: Boolean(classId && date),
  });

  React.useEffect(() => { setRows(attendance.data?.students ?? []); }, [attendance.data]);

  const saveMutation = useMutation({
    mutationFn: (confirmPartial: boolean) => apiRequest<{ saved: number; unmarked: number }>(`/api/attendance/${schoolId}/daily`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_id: classId,
        date,
        confirm_partial: confirmPartial,
        records: rows.filter((row) => row.status !== "not_marked").map((row) => ({ student_id: row.student_id, status: row.status, note: row.note })),
      }),
    }),
    onSuccess: (result) => {
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["daily-student-attendance", schoolId, classId, date] });
      queryClient.invalidateQueries({ queryKey: ["attendance-report"] });
      toast({ title: "Attendance saved", description: `${result.saved} marked${result.unmarked ? ` · ${result.unmarked} still Not Marked` : ""}`, variant: "success" });
    },
    onError: (error) => toast({ title: "Attendance was not saved", description: error instanceof Error ? error.message : "Try again", variant: "destructive" }),
  });

  const unmarkedCount = rows.filter((row) => !row.is_exempt && row.status === "not_marked").length;
  const exemptCount = rows.filter((row) => row.is_exempt).length;
  const dayStatus = attendance.data?.dayStatus;
  const isWorkingDay = dayStatus?.isWorkingDay ?? true;
  const filteredRows = rows.filter((row) => `${row.name} ${row.registration_no ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));

  function setStatus(studentId: string, status: AttendanceDraftStatus) {
    setRows((current) => current.map((row) => row.student_id === studentId ? { ...row, status } : row));
  }

  function requestSave() {
    if (unmarkedCount) setConfirmOpen(true);
    else saveMutation.mutate(false);
  }

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold tracking-tight">Student Attendance</h1><p className="text-sm text-muted-foreground">Choose a class and date, then finalize every student’s attendance.</p></div>

    <Card><CardHeader><CardTitle className="text-base">Attendance setup</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label>Class</Label><SearchableSelect options={(classes.data ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.name }))} value={classId} onChange={(value) => { setClassId(value); setSearch(""); }} placeholder="Select a class" searchPlaceholder="Search classes..." /></div>
      <div className="space-y-1.5"><Label htmlFor="attendance-date">Date</Label><Input id="attendance-date" type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} /></div>
    </CardContent></Card>

    {classId && <Card><CardHeader className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base">{attendance.data?.class.name ?? "Class students"}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{dayStatus ? `${dayStatus.weekdayName} · ` : ""}{isWorkingDay ? `${rows.length - exemptCount} attending · ${unmarkedCount} Not Marked${exemptCount ? ` · ${exemptCount} on vacation/holiday` : ""}` : "Attendance disabled"}</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setRows((current) => current.map((row) => row.is_exempt ? row : { ...row, status: "present" }))} disabled={!isWorkingDay || rows.length === exemptCount}><CheckCheck className="mr-2 h-4 w-4" />Mark All Present</Button><Button type="button" onClick={requestSave} disabled={!isWorkingDay || rows.length === exemptCount || saveMutation.isPending}>{saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Attendance</Button></div></div>
      {!isWorkingDay && dayStatus ? <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"><CalendarDays className="mt-0.5 h-5 w-5" /><div><p className="font-semibold">{dayStatus.reason === "holiday" ? dayStatus.holiday?.title ?? "This is a holiday." : dayStatus.reason === "class_off" ? `This class is off on ${dayStatus.weekdayName}.` : "This is a weekend."}</p><p className="mt-1 text-xs text-amber-700">Attendance cannot be marked or saved on this date. It is excluded from attendance totals and percentages.</p></div></div> : <div className="relative max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students..." className="pl-9" /></div>}
    </CardHeader><CardContent className="p-0">
      {attendance.isLoading ? <div className="flex justify-center py-14"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : !isWorkingDay ? <div className="py-10 text-center text-sm text-muted-foreground">No attendance register is created for non-working days.</div> : rows.length === 0 ? <div className="flex flex-col items-center py-14 text-center"><Users className="mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">No active students in this class</p></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/30"><th className="px-4 py-3 text-left font-medium text-muted-foreground">Student</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Registration No</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th></tr></thead><tbody>{filteredRows.map((row) => <tr key={row.student_id} className={cn("border-b", row.is_exempt && "bg-blue-50/60")}><td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar className="h-8 w-8">{row.photo_url && <AvatarImage src={row.photo_url} alt={row.name} />}<AvatarFallback className="text-xs">{getInitials(row.name)}</AvatarFallback></Avatar><span className="font-medium">{row.name}</span></div></td><td className="px-4 py-3 text-muted-foreground">{row.registration_no ?? "—"}</td><td className="min-w-[520px] px-4 py-3">{row.is_exempt ? <span className="rounded-md border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">{row.exemption_title ?? "Vacation / holiday"} · No attendance required</span> : <div className="flex flex-wrap gap-1.5">{ATTENDANCE_STATUS_OPTIONS.map((option) => <button type="button" key={option.value} onClick={() => setStatus(row.student_id, option.value)} className={cn("rounded-md border px-2.5 py-1 text-xs font-medium transition-opacity", row.status === option.value ? option.className : "border-border bg-background text-muted-foreground hover:bg-muted", row.status !== option.value && "opacity-75")}>{option.label}</button>)}</div>}</td></tr>)}</tbody></table>{filteredRows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No students match your search.</p>}</div>}
    </CardContent></Card>}

    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Save partial attendance?</DialogTitle><DialogDescription>{unmarkedCount} student{unmarkedCount === 1 ? " is" : "s are"} still Not Marked. Only marked students will be saved; the others will remain Not Marked when you reopen this date.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirmOpen(false)}>Continue marking</Button><Button onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm partial save</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
