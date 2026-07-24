"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchPicker } from "@/components/ui/search-picker";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { AttendanceHoliday, AttendanceHolidayScope, AttendanceHolidayType } from "@/types/school.types";
import { apiRequest, fetchAttendanceCalendar, fetchClasses } from "./api";
import { localDate } from "./attendance-utils";

const TYPE_LABELS: Record<AttendanceHolidayType, string> = { government: "Government holiday", public: "Public holiday", school: "School holiday", emergency: "Emergency closure", other: "Other closure" };
const SCOPE_LABELS: Record<AttendanceHolidayScope, string> = { school: "Entire school", classes: "Selected classes", students: "Selected students" };
const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type SelectedStudent = { id: string; name: string; subtitle?: string };

function monthValue(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function monthRange(month: string) { const [year, monthNumber] = month.split("-").map(Number); const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate(); return { startDate: `${month}-01`, endDate: `${month}-${String(days).padStart(2, "0")}`, days }; }
function shiftMonth(month: string, amount: number) { const [year, monthNumber] = month.split("-").map(Number); return monthValue(new Date(year, monthNumber - 1 + amount, 1)); }
function eachDate(startDate: string, endDate: string) { const dates: string[] = []; const cursor = new Date(`${startDate}T00:00:00Z`); const end = new Date(`${endDate}T00:00:00Z`); while (cursor <= end) { dates.push(cursor.toISOString().slice(0, 10)); cursor.setUTCDate(cursor.getUTCDate() + 1); } return dates; }

async function searchStudents(schoolId: string, query: string) {
  const params = new URLSearchParams({ page: "1", limit: "20", active: "true", search: query, searchFields: "name,registration_no" });
  const response = await fetch(`/api/students/${schoolId}?${params}`);
  const json = await response.json();
  if (!response.ok || !json.success) throw new Error(json.error || "Failed to search students");
  return (json.data.data as Array<{ id: string; name: string; registration_no: string | null; class_name: string | null }>).map((student) => ({ id: student.id, name: student.name, subtitle: `${student.registration_no ?? "No registration no"}${student.class_name ? ` · ${student.class_name}` : ""}` }));
}

export function AttendanceCalendarTab({ schoolId }: { schoolId: string }) {
  const today = React.useMemo(() => localDate(), []);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [month, setMonth] = React.useState(monthValue);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AttendanceHoliday | null>(null);
  const [startDate, setStartDate] = React.useState(today);
  const [endDate, setEndDate] = React.useState(today);
  const [title, setTitle] = React.useState("");
  const [holidayType, setHolidayType] = React.useState<AttendanceHolidayType>("school");
  const [scope, setScope] = React.useState<AttendanceHolidayScope>("school");
  const [classIds, setClassIds] = React.useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = React.useState<SelectedStudent[]>([]);
  const [note, setNote] = React.useState("");
  const range = monthRange(month);
  const calendar = useQuery({ queryKey: ["attendance-calendar", schoolId, month], queryFn: () => fetchAttendanceCalendar(schoolId, range.startDate, range.endDate) });
  const classes = useQuery({ queryKey: ["attendance-classes", schoolId], queryFn: () => fetchClasses(schoolId) });

  const mutation = useMutation({
    mutationFn: (input: { method: "POST" | "PATCH" | "DELETE"; body: unknown }) => apiRequest<unknown>(`/api/attendance/${schoolId}/calendar`, { method: input.method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.body) }),
    onSuccess: () => { setDialogOpen(false); queryClient.invalidateQueries({ queryKey: ["attendance-calendar", schoolId] }); queryClient.invalidateQueries({ queryKey: ["daily-student-attendance", schoolId] }); queryClient.invalidateQueries({ queryKey: ["attendance-report"] }); toast({ title: "School calendar updated", variant: "success" }); },
    onError: (error) => toast({ title: "Calendar was not updated", description: error instanceof Error ? error.message : "Try again", variant: "destructive" }),
  });

  const holidaysByDate = new Map<string, AttendanceHoliday[]>();
  (calendar.data?.holidays ?? []).forEach((holiday) => eachDate(holiday.holiday_date, holiday.end_date).forEach((date) => { if (date < range.startDate || date > range.endDate) return; holidaysByDate.set(date, [...(holidaysByDate.get(date) ?? []), holiday]); }));
  const weekendPositions = new Set((calendar.data?.weekdays ?? []).filter((weekday) => weekday.is_weekend).map((weekday) => weekday.sort_order));
  const firstDay = new Date(`${range.startDate}T00:00:00Z`).getUTCDay();
  const cells: Array<string | null> = [...Array((firstDay + 6) % 7).fill(null), ...Array.from({ length: range.days }, (_value, index) => `${month}-${String(index + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);

  function openHoliday(date: string, holiday?: AttendanceHoliday) {
    setEditing(holiday ?? null);
    setStartDate(holiday?.holiday_date ?? date);
    setEndDate(holiday?.end_date ?? date);
    setTitle(holiday?.title ?? "");
    setHolidayType(holiday?.holiday_type ?? "school");
    setScope(holiday?.scope ?? "school");
    setClassIds(holiday?.class_ids ?? []);
    setSelectedStudents((holiday?.students ?? []).map((student) => ({ id: student.id, name: student.name, subtitle: student.registration_no ?? undefined })));
    setNote(holiday?.note ?? "");
    setDialogOpen(true);
  }

  function saveHoliday() {
    if (!title.trim()) return toast({ title: "Holiday title is required", variant: "destructive" });
    if (endDate < startDate) return toast({ title: "End date must be after the start date", variant: "destructive" });
    if (scope === "classes" && !classIds.length) return toast({ title: "Select at least one class", variant: "destructive" });
    if (scope === "students" && !selectedStudents.length) return toast({ title: "Select at least one student", variant: "destructive" });
    mutation.mutate({ method: editing ? "PATCH" : "POST", body: { ...(editing ? { id: editing.id } : {}), holiday_date: startDate, end_date: endDate, title: title.trim(), holiday_type: holidayType, scope, class_ids: scope === "classes" ? classIds : [], student_ids: scope === "students" ? selectedStudents.map((student) => student.id) : [], note } });
  }

  function removeHoliday() { if (editing && window.confirm(`Remove “${editing.title}” from the school calendar?`)) mutation.mutate({ method: "DELETE", body: { id: editing.id } }); }

  return <div className="space-y-6">
    <div><h2 className="text-xl font-semibold tracking-tight">Calendar Settings</h2><p className="text-sm text-muted-foreground">Set vacations and closures for the whole school, selected classes, or individual students.</p></div>
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">Each class’s regular working days come from its assignments in <Link className="font-semibold underline" href="/school/timetable?tab=weekdays">Timetable → Weekdays</Link>. Calendar events temporarily override those working days for their selected scope.</div>

    <Card><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base">School calendar</CardTitle><p className="mt-1 text-xs text-muted-foreground">Click a date to add an event, or click an existing event to edit it.</p></div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="icon" onClick={() => setMonth((value) => shiftMonth(value, -1))}><ChevronLeft className="h-4 w-4" /></Button><Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-40" /><Button variant="outline" size="icon" onClick={() => setMonth((value) => shiftMonth(value, 1))}><ChevronRight className="h-4 w-4" /></Button><Button variant="outline" onClick={() => setMonth(monthValue())}>Today</Button><Button onClick={() => openHoliday(today)}><Plus className="mr-2 h-4 w-4" />Add vacation / holiday</Button></div></div></CardHeader><CardContent>
      {calendar.isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div> : <div className="overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-7 border-l border-t">{DAY_HEADERS.map((day) => <div key={day} className="border-b border-r bg-muted/40 px-2 py-2 text-center text-xs font-semibold text-muted-foreground">{day}</div>)}{cells.map((date, index) => {
        if (!date) return <div key={`blank-${index}`} className="min-h-28 border-b border-r bg-muted/10" />;
        const events = holidaysByDate.get(date) ?? [];
        const jsDay = new Date(`${date}T00:00:00Z`).getUTCDay();
        const globalWeekend = weekendPositions.has(jsDay === 0 ? 7 : jsDay);
        return <button type="button" key={date} onClick={() => openHoliday(date, events[0])} className={cn("min-h-28 border-b border-r p-2 text-left transition-colors hover:bg-muted/40", globalWeekend && "bg-slate-100", events.length && "bg-amber-50 hover:bg-amber-100", date === today && "ring-2 ring-inset ring-primary")}><span className="text-xs font-semibold">{Number(date.slice(-2))}</span>{events[0] ? <div className="mt-2 rounded-md border border-amber-200 bg-amber-100 p-2"><p className="truncate text-xs font-semibold text-amber-900">{events[0].title}</p><p className="mt-0.5 text-[10px] text-amber-700">{SCOPE_LABELS[events[0].scope]}{events.length > 1 ? ` · +${events.length - 1} more` : ""}</p></div> : globalWeekend ? <p className="mt-2 text-xs text-slate-500">Default weekend</p> : <p className="mt-2 text-[10px] text-muted-foreground"><Plus className="mr-1 inline h-3 w-3" />Add event</p>}</button>;
      })}</div></div></div>}
      <p className="mt-4 text-xs text-muted-foreground">“Default weekend” is the school setup default. Each class can override it from Timetable → Weekdays.</p>
    </CardContent></Card>

    <Card><CardHeader><CardTitle className="text-base">Events overlapping this month</CardTitle></CardHeader><CardContent>{calendar.data?.holidays.length ? <div className="divide-y rounded-md border">{calendar.data.holidays.map((holiday) => <button type="button" key={holiday.id} onClick={() => openHoliday(holiday.holiday_date, holiday)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40"><CalendarDays className="h-4 w-4 text-amber-600" /><div className="flex-1"><p className="text-sm font-medium">{holiday.title}</p><p className="text-xs text-muted-foreground">{holiday.holiday_date}{holiday.end_date !== holiday.holiday_date ? ` to ${holiday.end_date}` : ""} · {TYPE_LABELS[holiday.holiday_type]} · {SCOPE_LABELS[holiday.scope]}</p></div></button>)}</div> : <p className="py-6 text-center text-sm text-muted-foreground">No vacations or holidays overlap this month.</p>}</CardContent></Card>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{editing ? "Edit calendar event" : "Add vacation or holiday"}</DialogTitle><DialogDescription>The selected students/classes will not require attendance during this date range.</DialogDescription></DialogHeader><div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Start date</Label><Input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); if (endDate < event.target.value) setEndDate(event.target.value); }} /></div><div className="space-y-1.5"><Label>End date</Label><Input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></div></div><div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Summer vacation" /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Type</Label><Select value={holidayType} onValueChange={(value) => setHolidayType(value as AttendanceHolidayType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Applies to</Label><Select value={scope} onValueChange={(value) => setScope(value as AttendanceHolidayScope)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(SCOPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></div>
      {scope === "classes" && <div className="space-y-1.5"><Label>Classes</Label><SearchableMultiSelect options={(classes.data ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.name }))} value={classIds} onChange={setClassIds} placeholder="Select classes" searchPlaceholder="Search classes..." /></div>}
      {scope === "students" && <div className="space-y-2"><Label>Students</Label><SearchPicker minChars={2} placeholder="Search students to add..." searchFn={(query) => searchStudents(schoolId, query)} queryKey={(query) => ["attendance-vacation-student-search", schoolId, query]} onSelect={(student) => { if (!selectedStudents.some((item) => item.id === student.id)) setSelectedStudents((current) => [...current, student]); }} emptyHint={{ icon: <Search className="h-5 w-5" />, title: "Search students", description: "Add every student covered by this vacation." }} />{selectedStudents.length > 0 && <div className="flex flex-wrap gap-2">{selectedStudents.map((student) => <span key={student.id} className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{student.name}<button type="button" onClick={() => setSelectedStudents((current) => current.filter((item) => item.id !== student.id))}><X className="h-3 w-3" /></button></span>)}</div>}</div>}
      <div className="space-y-1.5"><Label>Note (optional)</Label><Textarea value={note} onChange={(event) => setNote(event.target.value)} /></div></div><DialogFooter className="sm:justify-between">{editing ? <Button variant="outline" className="text-destructive" onClick={removeHoliday} disabled={mutation.isPending}><Trash2 className="mr-2 h-4 w-4" />Remove</Button> : <span />}<div className="flex gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={saveHoliday} disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Save changes" : "Add event"}</Button></div></DialogFooter></DialogContent></Dialog>
  </div>;
}
