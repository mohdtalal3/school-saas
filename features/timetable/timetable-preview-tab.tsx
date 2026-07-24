"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarRange, Loader2, UserRound } from "lucide-react";
import { apiRequest, fetchClasses } from "@/features/scheduling/api";
import { TimetableGrid } from "./timetable-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchPicker } from "@/components/ui/search-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { ClassPeriod, ClassWeekday, Employee, TimetableEntry } from "@/types/school.types";

type PreviewMode = "class" | "teacher";
type SelectedItem = { id: string; name: string; subtitle?: string };
type ClassTimetable = { periods: ClassPeriod[]; entries: TimetableEntry[] };

export function TimetablePreviewTab({ schoolId }: { schoolId: string }) {
  const [mode, setMode] = React.useState<PreviewMode>("class");
  const [selectedClass, setSelectedClass] = React.useState<SelectedItem | null>(null);
  const [selectedTeacher, setSelectedTeacher] = React.useState<SelectedItem | null>(null);
  const classes = useQuery({ queryKey: ["classes", schoolId, "preview-options"], queryFn: () => fetchClasses(schoolId) });

  const classTimetable = useQuery({
    queryKey: ["timetable-preview-class", schoolId, selectedClass?.id],
    queryFn: () => apiRequest<ClassTimetable>(`/api/timetable/${schoolId}/schedule?classId=${selectedClass?.id}`),
    enabled: mode === "class" && !!selectedClass,
  });
  const classDays = useQuery({
    queryKey: ["class-weekdays", schoolId, selectedClass?.id],
    queryFn: () => apiRequest<ClassWeekday[]>(`/api/timetable/${schoolId}/class-weekdays?classId=${selectedClass?.id}`),
    enabled: mode === "class" && !!selectedClass,
  });
  const teacherTimetable = useQuery({
    queryKey: ["timetable-preview-teacher", schoolId, selectedTeacher?.id],
    queryFn: () => apiRequest<TimetableEntry[]>(`/api/timetable/${schoolId}/teacher-schedule?teacherId=${selectedTeacher?.id}`),
    enabled: mode === "teacher" && !!selectedTeacher,
  });

  const teacherPeriods = (teacherTimetable.data ?? []).flatMap((entry) => entry.class_period ? [entry.class_period] : []);
  const teacherDays = Array.from(new Map(teacherPeriods.filter((period) => period.weekday).map((period) => [period.weekday_id, {
    id: `teacher-preview-${period.weekday_id}`,
    school_id: schoolId,
    class_id: "",
    weekday_id: period.weekday_id,
    is_weekend: false,
    weekday: period.weekday,
    created_at: "",
  } as ClassWeekday])).values());

  const searchTeachers = async (search: string) => {
    const result = await apiRequest<{ data: Employee[] }>(`/api/employees/${schoolId}?limit=10&active=true&search=${encodeURIComponent(search)}`);
    return result.data.map((employee) => ({ id: employee.id, name: employee.name, photo_url: employee.photo_url, subtitle: `${employee.role} · ${employee.employee_code ?? "Employee"}` }));
  };

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold tracking-tight">Preview Timetable</h1><p className="text-sm text-muted-foreground">View a complete class timetable or every assigned period for a teacher.</p></div>
    <Card><CardHeader><CardTitle className="text-base">Preview by</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="inline-flex rounded-lg border bg-muted/30 p-1"><Button type="button" size="sm" variant={mode === "class" ? "default" : "ghost"} onClick={() => setMode("class")}><Building2 className="mr-2 h-4 w-4" />Class</Button><Button type="button" size="sm" variant={mode === "teacher" ? "default" : "ghost"} onClick={() => setMode("teacher")}><UserRound className="mr-2 h-4 w-4" />Teacher</Button></div>
      {mode === "class" ? <div className="max-w-xl"><SearchableSelect options={(classes.data ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.name }))} value={selectedClass?.id ?? ""} onChange={(classId) => { const schoolClass = classes.data?.find((item) => item.id === classId); if (schoolClass) setSelectedClass({ id: schoolClass.id, name: schoolClass.name, subtitle: "Class timetable" }); }} placeholder="Select a class" searchPlaceholder="Search classes..." />{selectedClass && <div className="mt-3 flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-sm"><Building2 className="h-4 w-4 text-primary" /><span className="font-medium">{selectedClass.name}</span></div>}</div> : <div className="max-w-xl"><SearchPicker placeholder="Search teacher by name, code, or role..." minChars={2} searchFn={searchTeachers} queryKey={(search) => ["timetable-teacher-search", schoolId, search]} onSelect={(item) => setSelectedTeacher(item)} />{selectedTeacher && <div className="mt-3 flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-sm"><UserRound className="h-4 w-4 text-primary" /><div><p className="font-medium">{selectedTeacher.name}</p><p className="text-xs text-muted-foreground">{selectedTeacher.subtitle}</p></div></div>}</div>}
    </CardContent></Card>

    {mode === "class" && selectedClass && (classTimetable.isLoading || classDays.isLoading ? <Loading /> : classTimetable.data?.periods.length ? <Card><CardHeader><CardTitle className="text-base">{selectedClass.name} timetable</CardTitle></CardHeader><CardContent><TimetableGrid days={classDays.data ?? []} periods={classTimetable.data.periods} entries={classTimetable.data.entries} /></CardContent></Card> : <Empty message="No timetable has been created for this class." />)}
    {mode === "teacher" && selectedTeacher && (teacherTimetable.isLoading ? <Loading /> : teacherPeriods.length ? <Card><CardHeader><CardTitle className="text-base">{selectedTeacher.name} timetable</CardTitle></CardHeader><CardContent><TimetableGrid days={teacherDays} periods={teacherPeriods} entries={teacherTimetable.data ?? []} rowKey={(period) => `${period.start_time}-${period.end_time}`} rowLabel={(period) => `${period.start_time.slice(0, 5)} – ${period.end_time.slice(0, 5)}`} rowMeta={() => "Time slot"} secondaryText={(entry) => entry.class?.name ?? "Class not available"} /></CardContent></Card> : <Empty message="No timetable periods are assigned to this teacher." />)}
  </div>;
}

function Loading() {
  return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
}

function Empty({ message }: { message: string }) {
  return <Card><CardContent className="flex flex-col items-center py-12 text-center"><CalendarRange className="mb-3 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{message}</p></CardContent></Card>;
}
