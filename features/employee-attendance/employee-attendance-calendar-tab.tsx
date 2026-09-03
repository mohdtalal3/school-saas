"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CalendarOff, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { localDate } from "@/features/attendance/attendance-utils";
import type { EmployeeAttendanceSchedule, EmployeeClosureType, ResolvedEmployeeSchedule } from "@/types/school.types";
import { EmployeeAttendanceConfiguration, employeeAttendanceRequest, jsonRequest } from "./api";

type CalendarDay = { date: string; schedule: ResolvedEmployeeSchedule };
type CalendarData = { month: string; startDate: string; endDate: string; days: CalendarDay[] };

const CLOSURES: Array<{ value: EmployeeClosureType; label: string }> = [
  { value: "public_holiday", label: "Public Holiday" },
  { value: "school_holiday", label: "School Holiday" },
  { value: "summer_holiday", label: "Summer Holidays" },
  { value: "winter_holiday", label: "Winter Holidays" },
  { value: "special_closure", label: "Special Closure" },
  { value: "event", label: "Event — No Attendance" },
];

function currentMonth() { return localDate().slice(0, 7); }
function shift(month: string, amount: number) { const [year, value] = month.split("-").map(Number); const date = new Date(year, value - 1 + amount, 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }

export function EmployeeAttendanceCalendarTab({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [month, setMonth] = React.useState(currentMonth);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EmployeeAttendanceSchedule | null>(null);
  const calendar = useQuery({ queryKey: ["employee-attendance-calendar", schoolId, month], queryFn: () => employeeAttendanceRequest<CalendarData>(`/api/attendance/${schoolId}/employees/calendar?month=${month}`) });
  const configuration = useQuery({ queryKey: ["employee-attendance-configuration", schoolId], queryFn: () => employeeAttendanceRequest<EmployeeAttendanceConfiguration>(`/api/attendance/${schoolId}/employees/configuration`) });
  const mutation = useMutation({
    mutationFn: (input: { method: "POST" | "DELETE"; body: unknown }) => employeeAttendanceRequest(`/api/attendance/${schoolId}/employees/schedules`, jsonRequest(input.method, input.body)),
    onSuccess: () => {
      toast({ title: "Employee attendance calendar updated", variant: "success" });
      setDialogOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["employee-attendance-calendar", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["employee-attendance-configuration", schoolId] });
    },
    onError: (error) => toast({ title: "Could not update calendar", description: error instanceof Error ? error.message : "Try again", variant: "destructive" }),
  });
  const first = new Date(`${month}-01T00:00:00Z`).getUTCDay();
  const blanks = (first + 6) % 7;
  const cells: Array<CalendarDay | null> = [...Array(blanks).fill(null), ...(calendar.data?.days ?? [])];
  while (cells.length % 7) cells.push(null);
  const closures = (configuration.data?.schedules ?? [])
    .filter((schedule) => schedule.schedule_type !== "weekday" && (!schedule.is_working_day || schedule.attendance_closed))
    .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));

  return <div className="space-y-6">
    <div><h2 className="text-xl font-semibold tracking-tight">Employee Attendance Calendar</h2><p className="text-sm text-muted-foreground">Define single-day or long-range holidays and closures. Attendance is automatically disabled for every covered date.</p></div>
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="text-base">Monthly calendar</CardTitle><p className="mt-1 text-xs text-muted-foreground">Click a date to open its daily attendance.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => setMonth((value) => shift(value, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-40" />
            <Button size="icon" variant="outline" onClick={() => setMonth((value) => shift(value, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => setMonth(currentMonth())}>Today</Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Off Days</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {calendar.isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div> : (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-7 border-l border-t">
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => <div key={day} className="border-b border-r bg-muted/40 px-2 py-2 text-center text-xs font-semibold text-muted-foreground">{day}</div>)}
                {cells.map((day, index) => day ? <EmployeeCalendarCell key={day.date} day={day} onClick={() => router.push(`/school/attendance?tab=employees&view=daily&date=${day.date}`)} /> : <div key={`blank-${index}`} className="min-h-28 border-b border-r bg-muted/10" />)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    <Card><CardHeader><CardTitle className="text-base">Configured holidays and off-day ranges</CardTitle></CardHeader><CardContent>{configuration.isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : closures.length ? <div className="divide-y rounded-lg border">{closures.map((closure) => <div key={closure.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"><CalendarOff className="h-5 w-5 text-amber-600" /><div className="min-w-0 flex-1"><p className="font-medium">{closure.name}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{closure.start_date}{closure.end_date && closure.end_date !== closure.start_date ? ` to ${closure.end_date}` : ""} · {closure.closure_type?.replaceAll("_", " ")}{closure.note ? ` · ${closure.note}` : ""}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setEditing(closure); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (window.confirm(`Remove “${closure.name}” from the employee calendar?`)) mutation.mutate({ method: "DELETE", body: { id: closure.id } }); }}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div> : <div className="py-12 text-center"><CalendarOff className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><p className="font-medium">No holidays or closure ranges</p><p className="text-sm text-muted-foreground">Add an off day or date range such as summer vacation.</p></div>}</CardContent></Card>
    <ClosureDialog open={dialogOpen} onOpenChange={setDialogOpen} schedule={editing} loading={mutation.isPending} onSave={(body) => mutation.mutate({ method: "POST", body })} />
  </div>;
}

function EmployeeCalendarCell({ day, onClick }: { day: CalendarDay; onClick: () => void }) {
  const closed = !day.schedule.is_working_day || day.schedule.attendance_closed;
  const weeklyOff = closed && day.schedule.closure_type === "weekly_off";
  const closureLabel = day.schedule.closure_type?.replaceAll("_", " ") ?? "Attendance closed";

  return <button
    type="button"
    onClick={onClick}
    className={cn(
      "min-h-28 border-b border-r p-2 text-left transition-colors hover:bg-muted/40",
      weeklyOff && "bg-slate-100 hover:bg-slate-200/70",
      closed && !weeklyOff && "bg-amber-50 hover:bg-amber-100",
      day.date === localDate() && "ring-2 ring-inset ring-primary"
    )}
  >
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs font-semibold">{Number(day.date.slice(-2))}</span>
      {!closed && <span className="max-w-28 truncate text-[9px] text-muted-foreground">{day.schedule.schedule_name}</span>}
    </div>
    {weeklyOff ? <p className="mt-2 text-xs text-slate-500">Weekly off</p> : closed ? (
      <div className="mt-2 rounded-md border border-amber-200 bg-amber-100 p-2">
        <p className="truncate text-xs font-semibold text-amber-900">{day.schedule.schedule_name}</p>
        <p className="mt-0.5 truncate text-[10px] capitalize text-amber-700">{closureLabel}{day.schedule.note ? ` · ${day.schedule.note}` : ""}</p>
      </div>
    ) : null}
  </button>;
}

function ClosureDialog({ open, onOpenChange, schedule, loading, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; schedule: EmployeeAttendanceSchedule | null; loading: boolean; onSave: (body: unknown) => void }) {
  const [singleDay, setSingleDay] = React.useState(false);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<EmployeeClosureType>("school_holiday");
  const [startDate, setStartDate] = React.useState(localDate());
  const [endDate, setEndDate] = React.useState(localDate());
  const [note, setNote] = React.useState("");
  React.useEffect(() => {
    if (!open) return;
    const isSingle = schedule?.schedule_type === "date_override" || Boolean(schedule?.start_date && schedule.start_date === schedule.end_date);
    setSingleDay(isSingle);
    setName(schedule?.name ?? "");
    setType(schedule?.closure_type && schedule.closure_type !== "weekly_off" ? schedule.closure_type : "school_holiday");
    setStartDate(schedule?.start_date ?? localDate());
    setEndDate(schedule?.end_date ?? schedule?.start_date ?? localDate());
    setNote(schedule?.note ?? "");
  }, [open, schedule]);
  function submit() {
    onSave({
      ...(schedule ? { id: schedule.id } : {}),
      name: name.trim(),
      schedule_type: singleDay ? "date_override" : "date_range",
      weekday: null,
      start_date: startDate,
      end_date: singleDay ? startDate : endDate,
      is_working_day: false,
      attendance_closed: true,
      closure_type: type,
      check_in_start: null,
      check_in_end: null,
      duty_start: null,
      check_out_start: null,
      check_out_end: null,
      duty_end: null,
      short_leave_threshold_minutes: null,
      half_day_threshold_minutes: null,
      late_grace_minutes: null,
      early_checkout_grace_minutes: null,
      priority: 100,
      note: note.trim() || null,
      is_active: true,
    });
  }
  const valid = name.trim() && startDate && (singleDay || (endDate && endDate >= startDate));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{schedule ? "Edit employee off days" : "Add employee off days"}</DialogTitle><DialogDescription>No employee attendance rows will be required for the selected date or range.</DialogDescription></DialogHeader><div className="space-y-4">
    <div className="space-y-1.5"><Label>Title</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Summer vacation or Public holiday" /></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Duration</Label><Select value={singleDay ? "single" : "range"} onValueChange={(value) => setSingleDay(value === "single")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single">Single day</SelectItem><SelectItem value="range">Date range</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label>Type</Label><Select value={type} onValueChange={(value) => setType(value as EmployeeClosureType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CLOSURES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>{singleDay ? "Date" : "Start date"}</Label><Input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); if (endDate < event.target.value) setEndDate(event.target.value); }} /></div>{!singleDay && <div className="space-y-1.5"><Label>End date</Label><Input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>}</div>
    <div className="space-y-1.5"><Label>Note (optional)</Label><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reason or additional information" /></div>
  </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={!valid || loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Off Days</Button></DialogFooter></DialogContent></Dialog>;
}
