"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import { apiRequest, fetchClasses, jsonRequest } from "@/features/scheduling/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { ClassWeekday, Weekday } from "@/types/school.types";

export function WeekdaysTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [name, setName] = React.useState(""); const [weekend, setWeekend] = React.useState(false);
  const [classId, setClassId] = React.useState(""); const [selectedIds, setSelectedIds] = React.useState<string[]>([]); const [targetIds, setTargetIds] = React.useState<string[]>([]);
  const [editing, setEditing] = React.useState<Weekday | null>(null); const [editName, setEditName] = React.useState("");
  const days = useQuery({ queryKey: ["weekdays", schoolId], queryFn: () => apiRequest<Weekday[]>(`/api/timetable/${schoolId}/weekdays`) });
  const classes = useQuery({ queryKey: ["classes", schoolId, "weekday-options"], queryFn: () => fetchClasses(schoolId) });
  const assigned = useQuery({ queryKey: ["class-weekdays", schoolId, classId], queryFn: () => apiRequest<ClassWeekday[]>(`/api/timetable/${schoolId}/class-weekdays?classId=${classId}`), enabled: !!classId });
  React.useEffect(() => { setSelectedIds(assigned.data?.map((row) => row.weekday_id) ?? []); }, [assigned.data]);
  const mutation = useMutation({ mutationFn: ({ url, init }: { url: string; init: RequestInit }) => apiRequest(url, init), onSuccess: () => { qc.invalidateQueries({ queryKey: ["weekdays", schoolId] }); qc.invalidateQueries({ queryKey: ["class-weekdays", schoolId] }); setName(""); setEditing(null); toast({ title: "Weekday settings updated", variant: "success" }); }, onError: (e) => toast({ title: "Could not update weekdays", description: e instanceof Error ? e.message : "Try again", variant: "destructive" }) });
  const toggle = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold tracking-tight">Weekdays</h1><p className="text-sm text-muted-foreground">Create working days, mark weekends, and choose which days each class attends.</p></div>
    <Card><CardHeader><CardTitle className="text-base">Weekday catalog</CardTitle></CardHeader><CardContent className="space-y-4">
      <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); if (name.trim()) mutation.mutate({ url: `/api/timetable/${schoolId}/weekdays`, init: jsonRequest("POST", { name, is_weekend: weekend, sort_order: (days.data?.length ?? 0) + 1 }) }); }}><div className="space-y-1.5"><Label htmlFor="weekday-name">Day name</Label><Input id="weekday-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monday" /></div><label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm"><input type="checkbox" checked={weekend} onChange={(e) => setWeekend(e.target.checked)} /> Weekend</label><Button disabled={!name.trim()}><Plus className="mr-2 h-4 w-4" />Add Day</Button></form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{days.data?.map((day) => <div key={day.id} className="flex items-center gap-3 rounded-lg border p-3"><CalendarDays className="h-5 w-5 text-primary" /><div className="min-w-0 flex-1">{editing?.id === day.id ? <Input value={editName} onChange={(e) => setEditName(e.target.value)} /> : <><p className="font-medium">{day.name}</p><button type="button" className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => mutation.mutate({ url: `/api/timetable/${schoolId}/weekdays`, init: jsonRequest("PATCH", { id: day.id, is_weekend: !day.is_weekend }) })}>{day.is_weekend ? "Weekend · mark working" : "Working day · mark weekend"}</button></>}</div>{editing?.id === day.id ? <><Button size="icon" variant="ghost" onClick={() => mutation.mutate({ url: `/api/timetable/${schoolId}/weekdays`, init: jsonRequest("PATCH", { id: day.id, name: editName }) })}><Check className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button></> : <><Button size="icon" variant="ghost" onClick={() => { setEditing(day); setEditName(day.name); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => mutation.mutate({ url: `/api/timetable/${schoolId}/weekdays`, init: jsonRequest("DELETE", { id: day.id }) })}><Trash2 className="h-4 w-4" /></Button></>}</div>)}</div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Assign days to class</CardTitle></CardHeader><CardContent className="space-y-4"><SearchableSelect className="max-w-md" options={(classes.data ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.name }))} value={classId} onChange={(value) => { setClassId(value); setTargetIds([]); }} placeholder="Select a class" searchPlaceholder="Search classes..." />{classId && <><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{days.data?.map((day) => <label key={day.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={selectedIds.includes(day.id)} onChange={() => toggle(day.id)} /><span className="flex-1">{day.name}</span>{day.is_weekend && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Weekend</span>}</label>)}</div><Button onClick={() => mutation.mutate({ url: `/api/timetable/${schoolId}/class-weekdays`, init: jsonRequest("PUT", { class_id: classId, weekday_ids: selectedIds }) })}>Save Class Weekdays</Button><div className="border-t pt-4"><p className="mb-2 text-xs font-medium text-muted-foreground">Duplicate weekdays to other classes</p><div className="flex flex-col items-start gap-3 sm:flex-row"><SearchableMultiSelect className="w-full max-w-md" options={(classes.data ?? []).filter((c) => c.id !== classId).map((c) => ({ value: c.id, label: c.name }))} value={targetIds} onChange={setTargetIds} placeholder="Select target classes" searchPlaceholder="Search classes..." /><Button variant="outline" disabled={!targetIds.length} onClick={() => mutation.mutate({ url: `/api/timetable/${schoolId}/class-weekdays`, init: jsonRequest("POST", { source_class_id: classId, target_class_ids: targetIds }) })}><Copy className="mr-2 h-4 w-4" />Duplicate</Button></div></div></>}</CardContent></Card>
  </div>;
}
