"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import { apiRequest, fetchClasses, jsonRequest } from "@/features/scheduling/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { ClassPeriod, ClassWeekday } from "@/types/school.types";

export function TimePeriodsTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [classId, setClassId] = React.useState("");
  const [weekdayIds, setWeekdayIds] = React.useState<string[]>([]);
  const [label, setLabel] = React.useState("Period 1");
  const [position, setPosition] = React.useState("1");
  const [start, setStart] = React.useState("08:00");
  const [end, setEnd] = React.useState("08:40");
  const [targetIds, setTargetIds] = React.useState<string[]>([]);
  const [editingPeriod, setEditingPeriod] = React.useState<ClassPeriod | null>(null);

  const classes = useQuery({ queryKey: ["classes", schoolId, "period-options"], queryFn: () => fetchClasses(schoolId) });
  const assignedDays = useQuery({ queryKey: ["class-weekdays", schoolId, classId], queryFn: () => apiRequest<ClassWeekday[]>(`/api/timetable/${schoolId}/class-weekdays?classId=${classId}`), enabled: !!classId });
  const periods = useQuery({ queryKey: ["class-periods", schoolId, classId], queryFn: () => apiRequest<ClassPeriod[]>(`/api/timetable/${schoolId}/periods?classId=${classId}`), enabled: !!classId });
  const mutation = useMutation({
    mutationFn: ({ url, init }: { url: string; init: RequestInit }) => apiRequest(url, init),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["class-periods", schoolId] }); setEditingPeriod(null); toast({ title: "Time periods updated", variant: "success" }); },
    onError: (e) => toast({ title: "Could not update periods", description: e instanceof Error ? e.message : "Try again", variant: "destructive" }),
  });

  const toggle = (id: string) => setWeekdayIds((values) => values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);
  const beginEdit = (period: ClassPeriod) => { setEditingPeriod(period); setWeekdayIds([period.weekday_id]); setLabel(period.label); setPosition(String(period.position)); setStart(period.start_time.slice(0, 5)); setEnd(period.end_time.slice(0, 5)); };
  const cancelEdit = () => { setEditingPeriod(null); setWeekdayIds([]); };
  const save = () => mutation.mutate({
    url: `/api/timetable/${schoolId}/periods`,
    init: editingPeriod
      ? jsonRequest("PATCH", { id: editingPeriod.id, label, position: Number(position), start_time: start, end_time: end })
      : jsonRequest("POST", { class_id: classId, weekday_ids: weekdayIds, label, position: Number(position), start_time: start, end_time: end }),
  });

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold tracking-tight">Time Periods</h1><p className="text-sm text-muted-foreground">Configure period times per class and per day. Select several days when they share the same time.</p></div>
    <Card><CardHeader><CardTitle className="text-base">Select class</CardTitle></CardHeader><CardContent className="space-y-4"><SearchableSelect className="max-w-md" options={(classes.data ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.name }))} value={classId} onChange={(value) => { setClassId(value); setWeekdayIds([]); setEditingPeriod(null); setTargetIds([]); }} placeholder="Select a class" searchPlaceholder="Search classes..." />{classId && <div className="border-t pt-4"><p className="mb-2 text-xs font-medium text-muted-foreground">Duplicate time periods to other classes</p><div className="flex flex-col items-start gap-3 sm:flex-row"><SearchableMultiSelect className="w-full max-w-md" options={(classes.data ?? []).filter((schoolClass) => schoolClass.id !== classId).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.name }))} value={targetIds} onChange={setTargetIds} placeholder="Select target classes" searchPlaceholder="Search classes..." /><Button variant="outline" disabled={!targetIds.length} onClick={() => mutation.mutate({ url: `/api/timetable/${schoolId}/periods`, init: jsonRequest("POST", { action: "duplicate", source_class_id: classId, target_class_ids: targetIds }) })}><Copy className="mr-2 h-4 w-4" />Duplicate Periods</Button></div></div>}</CardContent></Card>
    {classId && <>
      <Card><CardHeader><CardTitle className="text-base">{editingPeriod ? "Edit time period" : "Add time period"}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-1.5"><Label>Period name</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div><div className="space-y-1.5"><Label>Position</Label><Input type="number" min="1" value={position} onChange={(e) => setPosition(e.target.value)} /></div><div className="space-y-1.5"><Label>Start time</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div><div className="space-y-1.5"><Label>End time</Label><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div></div>
        <div><Label>{editingPeriod ? "Assigned day" : "Apply these times to"}</Label><div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">{assignedDays.data?.map((row) => <label key={row.id} className="flex items-center gap-2 rounded-md border p-2 text-sm"><input type="checkbox" disabled={!!editingPeriod} checked={weekdayIds.includes(row.weekday_id)} onChange={() => toggle(row.weekday_id)} />{row.weekday?.name}</label>)}</div></div>
        <div className="flex gap-2"><Button disabled={!weekdayIds.length || !label.trim()} onClick={save}>{editingPeriod ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{editingPeriod ? "Save Changes" : "Add Period"}</Button>{editingPeriod && <Button variant="outline" onClick={cancelEdit}><X className="mr-2 h-4 w-4" />Cancel</Button>}</div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Configured periods</CardTitle></CardHeader><CardContent>{periods.data?.length ? <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[600px] text-sm"><thead className="bg-muted/60"><tr><th className="px-4 py-3 text-left">Day</th><th className="px-4 py-3 text-left">Period</th><th className="px-4 py-3 text-left">Position</th><th className="px-4 py-3 text-left">Time</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{periods.data.sort((a, b) => (a.weekday?.sort_order ?? 0) - (b.weekday?.sort_order ?? 0) || a.position - b.position).map((period) => <tr key={period.id} className="border-t"><td className="px-4 py-3">{period.weekday?.name}</td><td className="px-4 py-3 font-medium">{period.label}</td><td className="px-4 py-3">{period.position}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{period.start_time.slice(0, 5)} – {period.end_time.slice(0, 5)}</span></td><td className="px-4 py-3 text-right"><Button size="icon" variant="ghost" onClick={() => beginEdit(period)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => mutation.mutate({ url: `/api/timetable/${schoolId}/periods`, init: jsonRequest("DELETE", { id: period.id }) })}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-muted-foreground">No periods configured for this class.</p>}</CardContent></Card>
    </>}
  </div>;
}
