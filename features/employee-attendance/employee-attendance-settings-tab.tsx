"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { EmployeeAttendanceSchedule, EmployeeAttendanceSettings, EmployeeClosureType, EmployeeScheduleType } from "@/types/school.types";
import { EmployeeAttendanceConfiguration, employeeAttendanceRequest, jsonRequest } from "./api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CLOSURES: Array<{ value: EmployeeClosureType; label: string }> = [
  { value: "weekly_off", label: "Weekly Off" }, { value: "public_holiday", label: "Public Holiday" },
  { value: "school_holiday", label: "School Holiday" }, { value: "summer_holiday", label: "Summer Holiday" },
  { value: "winter_holiday", label: "Winter Holiday" }, { value: "special_closure", label: "Special Closure" },
  { value: "event", label: "Event — No Attendance" },
];

export function EmployeeAttendanceSettingsTab({ schoolId }: { schoolId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const configuration = useQuery({ queryKey: ["employee-attendance-configuration", schoolId], queryFn: () => employeeAttendanceRequest<EmployeeAttendanceConfiguration>(`/api/attendance/${schoolId}/employees/configuration`) });
  const [settings, setSettings] = React.useState<EmployeeAttendanceSettings | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EmployeeAttendanceSchedule | null>(null);
  React.useEffect(() => { if (configuration.data) setSettings(configuration.data.settings); }, [configuration.data]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["employee-attendance-configuration", schoolId] });
  const settingsMutation = useMutation({
    mutationFn: () => employeeAttendanceRequest(`/api/attendance/${schoolId}/employees/configuration`, jsonRequest("PUT", settings)),
    onSuccess: () => { toast({ title: "Default attendance timing saved", variant: "success" }); refresh(); },
    onError: showError(toast, "Could not save attendance timing"),
  });
  const scheduleMutation = useMutation({
    mutationFn: (input: { method: "POST" | "DELETE"; body: unknown }) => employeeAttendanceRequest(`/api/attendance/${schoolId}/employees/schedules`, jsonRequest(input.method, input.body)),
    onSuccess: () => { toast({ title: "Employee schedule updated", variant: "success" }); setDialogOpen(false); refresh(); },
    onError: showError(toast, "Could not update schedule"),
  });

  if (configuration.isLoading || !settings) return <Card><CardContent className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-primary" /></CardContent></Card>;
  const setSetting = (key: keyof EmployeeAttendanceSettings, value: string | number) => setSettings((current) => current ? { ...current, [key]: value } : current);
  const timingSchedules = (configuration.data?.schedules ?? []).filter((schedule) =>
    schedule.schedule_type === "weekday" || (schedule.is_working_day && !schedule.attendance_closed)
  );

  return <div className="space-y-6">
    <div><h2 className="text-xl font-semibold tracking-tight">Employee Attendance Settings</h2><p className="text-sm text-muted-foreground">Configure attendance timings and working schedules. Holidays and long-range off days are managed from Employee Calendar.</p></div>
    <Card><CardHeader><CardTitle className="text-base">Default employee attendance schedule</CardTitle></CardHeader><CardContent className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{([
        ["check_in_start", "Check-in start"], ["duty_start", "Standard duty start"], ["check_in_end", "Check-in end"],
        ["check_out_start", "Check-out start"], ["duty_end", "Standard duty end"], ["check_out_end", "Check-out end"],
      ] as Array<[keyof EmployeeAttendanceSettings, string]>).map(([key, label]) => <div key={key} className="space-y-1.5"><Label>{label}</Label><Input type="time" value={String(settings[key]).slice(0, 5)} onChange={(event) => setSetting(key, event.target.value)} /></div>)}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{([
        ["late_grace_minutes", "Late grace (minutes)"], ["early_checkout_grace_minutes", "Early checkout grace"],
        ["short_leave_threshold_minutes", "Short-leave threshold"], ["half_day_threshold_minutes", "Half-day threshold"],
      ] as Array<[keyof EmployeeAttendanceSettings, string]>).map(([key, label]) => <div key={key} className="space-y-1.5"><Label>{label}</Label><Input type="number" min={0} value={Number(settings[key])} onChange={(event) => setSetting(key, Number(event.target.value))} /></div>)}</div>
      <div className="flex justify-end"><Button onClick={() => settingsMutation.mutate()} disabled={settingsMutation.isPending}>{settingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Default Timing</Button></div>
    </CardContent></Card>
    <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-base">Working schedules</CardTitle><p className="mt-1 text-xs text-muted-foreground">Exact dates override special ranges, seasonal schedules, weekday schedules, and finally the default timing.</p></div><Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Timing Schedule</Button></div></CardHeader><CardContent>
      <div className="divide-y rounded-lg border">{timingSchedules.map((schedule) => <div key={schedule.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><CalendarClock className="h-5 w-5 text-primary" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{schedule.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${schedule.is_working_day && !schedule.attendance_closed ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>{schedule.is_working_day && !schedule.attendance_closed ? "Working" : schedule.closure_type?.replaceAll("_", " ") ?? "Closed"}</span></div><p className="mt-1 text-xs text-muted-foreground">{schedule.schedule_type === "weekday" ? DAYS[(schedule.weekday ?? 1) - 1] : `${schedule.start_date} ${schedule.end_date !== schedule.start_date ? `to ${schedule.end_date}` : ""}`} · {schedule.duty_start && schedule.duty_end ? `${schedule.duty_start.slice(0, 5)} – ${schedule.duty_end.slice(0, 5)}` : "Uses default timing"}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setEditing(schedule); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (window.confirm(`Delete “${schedule.name}”?`)) scheduleMutation.mutate({ method: "DELETE", body: { id: schedule.id } }); }}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>
    </CardContent></Card>
    <ScheduleDialog open={dialogOpen} onOpenChange={setDialogOpen} schedule={editing} defaultSettings={settings} onSave={(body) => scheduleMutation.mutate({ method: "POST", body })} loading={scheduleMutation.isPending} />
  </div>;
}

function ScheduleDialog({ open, onOpenChange, schedule, defaultSettings, onSave, loading }: { open: boolean; onOpenChange: (open: boolean) => void; schedule: EmployeeAttendanceSchedule | null; defaultSettings: EmployeeAttendanceSettings; onSave: (body: unknown) => void; loading: boolean }) {
  const blank = React.useMemo(() => ({
    name: "", schedule_type: "date_range" as EmployeeScheduleType, weekday: null as number | null, start_date: "", end_date: "",
    is_working_day: true, attendance_closed: false, closure_type: null as EmployeeClosureType | null,
    check_in_start: "", check_in_end: "", duty_start: "", check_out_start: "", check_out_end: "", duty_end: "",
    short_leave_threshold_minutes: null as number | null, half_day_threshold_minutes: null as number | null,
    late_grace_minutes: null as number | null, early_checkout_grace_minutes: null as number | null,
    priority: 0, note: "", is_active: true,
  }), []);
  const [form, setForm] = React.useState(blank);
  React.useEffect(() => {
    if (!open) return;
    setForm(schedule ? {
      ...blank, ...schedule,
      start_date: schedule.start_date ?? "", end_date: schedule.end_date ?? "",
      check_in_start: schedule.check_in_start?.slice(0, 5) ?? "", check_in_end: schedule.check_in_end?.slice(0, 5) ?? "",
      duty_start: schedule.duty_start?.slice(0, 5) ?? "", check_out_start: schedule.check_out_start?.slice(0, 5) ?? "",
      check_out_end: schedule.check_out_end?.slice(0, 5) ?? "", duty_end: schedule.duty_end?.slice(0, 5) ?? "", note: schedule.note ?? "",
    } : blank);
  }, [open, schedule, blank]);
  const set = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  const closed = !form.is_working_day || form.attendance_closed;
  function submit() {
    const exactDate = form.schedule_type === "date_override";
    onSave({
      ...(schedule ? { id: schedule.id } : {}),
      ...form,
      weekday: form.schedule_type === "weekday" ? form.weekday : null,
      start_date: form.schedule_type === "weekday" ? null : form.start_date,
      end_date: form.schedule_type === "weekday" ? null : exactDate ? form.start_date : form.end_date,
      closure_type: closed ? form.closure_type ?? "special_closure" : null,
      check_in_start: form.check_in_start || null, check_in_end: form.check_in_end || null, duty_start: form.duty_start || null,
      check_out_start: form.check_out_start || null, check_out_end: form.check_out_end || null, duty_end: form.duty_end || null,
      note: form.note || null,
    });
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{schedule ? "Edit employee schedule" : "Add employee schedule"}</DialogTitle><DialogDescription>Leave timing fields empty to inherit the default employee timing.</DialogDescription></DialogHeader><div className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Schedule name"><Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. Ramadan timings" /></Field><Field label="Schedule type"><Select value={form.schedule_type} onValueChange={(value) => setForm((current) => ({ ...current, schedule_type: value as EmployeeScheduleType, weekday: value === "weekday" ? 1 : null }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekday">Weekday schedule</SelectItem><SelectItem value="seasonal">Seasonal schedule</SelectItem><SelectItem value="date_range">Special date range</SelectItem><SelectItem value="date_override">Specific date override</SelectItem></SelectContent></Select></Field></div>
    {form.schedule_type === "weekday" ? <Field label="Weekday"><Select value={String(form.weekday ?? 1)} onValueChange={(value) => set("weekday", Number(value))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DAYS.map((day, index) => <SelectItem key={day} value={String(index + 1)}>{day}</SelectItem>)}</SelectContent></Select></Field> : <div className="grid gap-4 sm:grid-cols-2"><Field label={form.schedule_type === "date_override" ? "Date" : "Start date"}><Input type="date" value={form.start_date} onChange={(event) => set("start_date", event.target.value)} /></Field>{form.schedule_type !== "date_override" && <Field label="End date"><Input type="date" min={form.start_date} value={form.end_date} onChange={(event) => set("end_date", event.target.value)} /></Field>}</div>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={form.is_working_day} onChange={(event) => set("is_working_day", event.target.checked)} />Working day</label><label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={form.attendance_closed} onChange={(event) => set("attendance_closed", event.target.checked)} />Attendance closed</label></div>
    {closed && <Field label="Closure type"><Select value={form.closure_type ?? "special_closure"} onValueChange={(value) => set("closure_type", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CLOSURES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field>}
    {!closed && <div className="grid gap-4 sm:grid-cols-3">{(["check_in_start","duty_start","check_in_end","check_out_start","duty_end","check_out_end"] as const).map((key) => <Field key={key} label={key.replaceAll("_", " ")}><Input type="time" placeholder={String(defaultSettings[key]).slice(0, 5)} value={form[key]} onChange={(event) => set(key, event.target.value)} /></Field>)}</div>}
    <Field label="Priority within the same rule type"><Input type="number" min={0} value={form.priority} onChange={(event) => set("priority", Number(event.target.value))} /></Field>
    <Field label="Note"><Textarea value={form.note} onChange={(event) => set("note", event.target.value)} /></Field>
  </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!form.name.trim() || loading} onClick={submit}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Schedule</Button></DialogFooter></DialogContent></Dialog>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label className="capitalize">{label}</Label>{children}</div>; }
function showError(toast: ReturnType<typeof useToast>["toast"], title: string) { return (error: Error) => toast({ title, description: error.message, variant: "destructive" }); }
