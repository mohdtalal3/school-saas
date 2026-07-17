"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { apiRequest, fetchClasses, jsonRequest } from "@/features/scheduling/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { ClassSubject, Subject } from "@/types/school.types";

export function AssignSubjectsTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [classId, setClassId] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const [totalMarks, setTotalMarks] = React.useState("100");
  const [targetClassIds, setTargetClassIds] = React.useState<string[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTotalMarks, setEditTotalMarks] = React.useState("100");

  const classes = useQuery({ queryKey: ["classes", schoolId, "subject-options"], queryFn: () => fetchClasses(schoolId) });
  const subjects = useQuery({ queryKey: ["subjects", schoolId], queryFn: () => apiRequest<Subject[]>(`/api/subjects/${schoolId}`) });
  const assignments = useQuery({
    queryKey: ["class-subjects", schoolId, classId],
    queryFn: () => apiRequest<ClassSubject[]>(`/api/subjects/${schoolId}/assignments?classId=${classId}`),
    enabled: !!classId,
  });
  const mutation = useMutation({
    mutationFn: ({ url, init }: { url: string; init: RequestInit }) => apiRequest(url, init),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-subjects", schoolId] });
      setSubjectId("");
      setTotalMarks("100");
      setEditingId(null);
      toast({ title: "Class subjects updated", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not update class subjects", description: e instanceof Error ? e.message : "Try again", variant: "destructive" }),
  });

  const availableSubjects = subjects.data?.filter((subject) => !assignments.data?.some((assignment) => assignment.subject_id === subject.id)) ?? [];
  const validTotalMarks = Number.isInteger(Number(totalMarks)) && Number(totalMarks) > 0;

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold tracking-tight">Assign Subjects</h1><p className="text-sm text-muted-foreground">Assign catalog subjects and enter the maximum marks for each class subject.</p></div>
    <Card><CardHeader><CardTitle className="text-base">Choose class</CardTitle></CardHeader><CardContent className="space-y-4"><SearchableSelect className="max-w-md" options={(classes.data ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.name }))} value={classId} onChange={(value) => { setClassId(value); setTargetClassIds([]); }} placeholder="Select a class" searchPlaceholder="Search classes..." />{classId && <div className="border-t pt-4"><p className="mb-2 text-xs font-medium text-muted-foreground">Duplicate subjects to other classes</p><div className="flex flex-col items-start gap-3 sm:flex-row"><SearchableMultiSelect className="w-full max-w-md" options={(classes.data ?? []).filter((schoolClass) => schoolClass.id !== classId).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.name }))} value={targetClassIds} onChange={setTargetClassIds} placeholder="Select target classes" searchPlaceholder="Search classes..." /><Button variant="outline" disabled={!targetClassIds.length || mutation.isPending} onClick={() => mutation.mutate({ url: `/api/subjects/${schoolId}/assignments`, init: jsonRequest("POST", { action: "duplicate", source_class_id: classId, target_class_ids: targetClassIds }) })}><Copy className="mr-2 h-4 w-4" />Duplicate</Button></div></div>}</CardContent></Card>
    {classId && <>
      <Card><CardHeader><CardTitle className="text-base">Add subject to class</CardTitle></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <div className="space-y-1.5"><Label>Subject</Label><Select value={subjectId} onValueChange={setSubjectId}><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{availableSubjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor="total-marks">Total Marks</Label><Input id="total-marks" type="number" min="1" step="1" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} placeholder="e.g. 50, 75, or 100" /><p className="text-xs text-muted-foreground">Enter the maximum marks for this subject, such as 50, 75, or 100.</p></div>
        <Button className="sm:mt-6" disabled={!subjectId || !validTotalMarks || mutation.isPending} onClick={() => mutation.mutate({ url: `/api/subjects/${schoolId}/assignments`, init: jsonRequest("POST", { class_id: classId, subject_id: subjectId, total_marks: Number(totalMarks) }) })}><Plus className="mr-2 h-4 w-4" />Assign</Button>
      </div></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Assigned subjects ({assignments.data?.length ?? 0})</CardTitle></CardHeader><CardContent>{assignments.isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : assignments.data?.length ? <div className="overflow-hidden rounded-lg border"><table className="w-full text-sm"><thead className="bg-muted/60"><tr><th className="px-4 py-3 text-left">Subject</th><th className="px-4 py-3 text-left">Total Marks</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{assignments.data.map((assignment) => <tr key={assignment.id} className="border-t"><td className="px-4 py-3 font-medium">{assignment.subject?.name}</td><td className="px-4 py-3">{editingId === assignment.id ? <Input type="number" min="1" step="1" className="max-w-40" value={editTotalMarks} onChange={(e) => setEditTotalMarks(e.target.value)} /> : assignment.total_marks}</td><td className="px-4 py-3"><div className="flex justify-end gap-1">{editingId === assignment.id ? <><Button size="icon" variant="ghost" disabled={Number(editTotalMarks) <= 0 || !Number.isInteger(Number(editTotalMarks))} onClick={() => mutation.mutate({ url: `/api/subjects/${schoolId}/assignments/${assignment.id}`, init: jsonRequest("PATCH", { total_marks: Number(editTotalMarks) }) })}><Check className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button></> : <><Button size="icon" variant="ghost" onClick={() => { setEditingId(assignment.id); setEditTotalMarks(String(assignment.total_marks)); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => mutation.mutate({ url: `/api/subjects/${schoolId}/assignments/${assignment.id}`, init: { method: "DELETE" } })}><Trash2 className="h-4 w-4" /></Button></>}</div></td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-muted-foreground">No subjects assigned to this class yet.</p>}</CardContent></Card>
    </>}
  </div>;
}
