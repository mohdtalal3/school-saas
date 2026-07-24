"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { apiRequest, fetchClasses, jsonRequest } from "@/features/scheduling/api";
import { TimetableGrid } from "./timetable-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { ClassPeriod, ClassSubject, ClassWeekday, Employee, TimetableEntry } from "@/types/school.types";

type TimetableData = { periods: ClassPeriod[]; entries: TimetableEntry[] };

export function TimetableBuilderTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [classId, setClassId] = React.useState("");
  const [activePeriod, setActivePeriod] = React.useState<ClassPeriod | null>(null);
  const [activeEntry, setActiveEntry] = React.useState<TimetableEntry | null>(null);
  const [isBreak, setIsBreak] = React.useState(false);
  const [subjectId, setSubjectId] = React.useState("");
  const [teacherId, setTeacherId] = React.useState("");
  const [applyDays, setApplyDays] = React.useState<string[]>([]);

  const classes = useQuery({ queryKey: ["classes", schoolId, "timetable-options"], queryFn: () => fetchClasses(schoolId) });
  const days = useQuery({ queryKey: ["class-weekdays", schoolId, classId], queryFn: () => apiRequest<ClassWeekday[]>(`/api/timetable/${schoolId}/class-weekdays?classId=${classId}`), enabled: !!classId });
  const subjects = useQuery({ queryKey: ["class-subjects", schoolId, classId], queryFn: () => apiRequest<ClassSubject[]>(`/api/subjects/${schoolId}/assignments?classId=${classId}`), enabled: !!classId });
  const teachers = useQuery({ queryKey: ["employees", schoolId, "timetable-options"], queryFn: async () => (await apiRequest<{ data: Employee[] }>(`/api/employees/${schoolId}?limit=200&active=true`)).data, enabled: !!classId });
  const timetableKey = ["timetable", schoolId, classId];
  const timetable = useQuery({ queryKey: timetableKey, queryFn: () => apiRequest<TimetableData>(`/api/timetable/${schoolId}/schedule?classId=${classId}`), enabled: !!classId });
  const mutation = useMutation({
    mutationFn: ({ init }: { init: RequestInit }) => apiRequest(`/api/timetable/${schoolId}/schedule`, init),
    onSuccess: () => { qc.invalidateQueries({ queryKey: timetableKey }); setActivePeriod(null); toast({ title: "Timetable updated", variant: "success" }); },
    onError: (e) => toast({ title: "Could not update timetable", description: e instanceof Error ? e.message : "Try again", variant: "destructive" }),
  });

  const workingDays = (days.data ?? []).filter((row) => !row.is_weekend);
  const openEditor = (period: ClassPeriod, entry?: TimetableEntry) => {
    setActivePeriod(period);
    setActiveEntry(entry ?? null);
    setIsBreak(entry?.is_break ?? false);
    setSubjectId(entry?.class_subject_id ?? "");
    setTeacherId(entry?.teacher_id ?? "");
    setApplyDays([period.weekday_id]);
  };
  const toggleApply = (id: string) => setApplyDays((values) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold tracking-tight">Create Timetable</h1><p className="text-sm text-muted-foreground">Choose a class, then click any configured cell to assign a subject, teacher, or break.</p></div>
    <Card><CardHeader><CardTitle className="text-base">Select class</CardTitle></CardHeader><CardContent><SearchableSelect className="max-w-md" options={(classes.data ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.name }))} value={classId} onChange={setClassId} placeholder="Select a class" searchPlaceholder="Search classes..." /></CardContent></Card>
    {classId && (timetable.isLoading
      ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      : !workingDays.length
        ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Assign weekdays to this class before creating its timetable.</CardContent></Card>
        : !timetable.data?.periods.length
          ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Create time periods for this class before building its timetable.</CardContent></Card>
          : <Card><CardHeader><CardTitle className="text-base">Weekly timetable</CardTitle></CardHeader><CardContent><TimetableGrid days={workingDays} periods={timetable.data.periods} entries={timetable.data.entries} editable onCellClick={openEditor} emptyCellText="Assign" /></CardContent></Card>)}

    <Dialog open={!!activePeriod} onOpenChange={(open) => { if (!open) setActivePeriod(null); }}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{activeEntry ? "Edit timetable entry" : "Assign timetable entry"}</DialogTitle><DialogDescription>{activePeriod?.weekday?.name} · {activePeriod?.label} · {activePeriod?.start_time.slice(0, 5)}–{activePeriod?.end_time.slice(0, 5)}</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-3 rounded-lg border p-3 text-sm font-medium"><input type="checkbox" checked={isBreak} onChange={(event) => setIsBreak(event.target.checked)} />Mark this period as a break</label>
          {!isBreak && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Subject</Label><Select value={subjectId} onValueChange={setSubjectId}><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{subjects.data?.map((row) => <SelectItem key={row.id} value={row.id}>{row.subject?.name} ({row.total_marks} marks)</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Teacher</Label><Select value={teacherId} onValueChange={setTeacherId}><SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger><SelectContent>{teachers.data?.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.role}</SelectItem>)}</SelectContent></Select></div></div>}
          <div><Label>Apply to weekdays</Label><p className="mb-2 text-xs text-muted-foreground">Only matching period positions are updated. Weekends are excluded.</p><div className="grid gap-2 sm:grid-cols-2">{workingDays.map((row) => <label key={row.id} className="flex items-center gap-2 rounded-md border p-2 text-sm"><input type="checkbox" checked={applyDays.includes(row.weekday_id)} onChange={() => toggleApply(row.weekday_id)} />{row.weekday?.name}</label>)}</div></div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">{activeEntry && <Button variant="destructive" className="sm:mr-auto" onClick={() => mutation.mutate({ init: jsonRequest("DELETE", { id: activeEntry.id }) })}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}<Button variant="outline" onClick={() => setActivePeriod(null)}>Cancel</Button><Button disabled={!activePeriod || (!isBreak && !subjectId) || mutation.isPending} onClick={() => activePeriod && mutation.mutate({ init: jsonRequest("PUT", { class_id: classId, class_period_id: activePeriod.id, class_subject_id: isBreak ? null : subjectId, teacher_id: isBreak || !teacherId ? null : teacherId, is_break: isBreak, apply_weekday_ids: applyDays }) })}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
