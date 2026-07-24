import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseService } from "@/lib/supabase";
import { AppError, NotFoundError } from "@/lib/api-response";
import type {
  ClassPeriod,
  ClassWeekday,
  TimetableEntry,
  Weekday,
} from "@/types/school.types";

const DEFAULT_WEEKDAYS = [
  { name: "Monday", sort_order: 1, is_weekend: false },
  { name: "Tuesday", sort_order: 2, is_weekend: false },
  { name: "Wednesday", sort_order: 3, is_weekend: false },
  { name: "Thursday", sort_order: 4, is_weekend: false },
  { name: "Friday", sort_order: 5, is_weekend: false },
  { name: "Saturday", sort_order: 6, is_weekend: true },
  { name: "Sunday", sort_order: 7, is_weekend: true },
];

async function ensureDefaultWeekdays(supabase: SupabaseClient, schoolId: string) {
  const { count, error } = await supabase
    .from("weekdays")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (error) throw new Error(`Failed to check weekdays: ${error.message}`);
  if ((count ?? 0) > 0) return;
  const { error: insertError } = await supabase.from("weekdays").insert(
    DEFAULT_WEEKDAYS.map((day) => ({ ...day, school_id: schoolId, is_active: true })) as never
  );
  if (insertError) throw new Error(`Failed to seed weekdays: ${insertError.message}`);
}

export async function getWeekdays(schoolId: string): Promise<Weekday[]> {
  const supabase: SupabaseClient = createSupabaseService();
  await ensureDefaultWeekdays(supabase, schoolId);
  const { data, error } = await supabase
    .from("weekdays")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(`Failed to fetch weekdays: ${error.message}`);
  return (data ?? []) as unknown as Weekday[];
}

export async function createWeekday(
  schoolId: string,
  input: { name: string; sort_order?: number; is_weekend?: boolean }
): Promise<Weekday> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data, error } = await supabase
    .from("weekdays")
    .insert({
      school_id: schoolId,
      name: input.name.trim(),
      sort_order: input.sort_order ?? 0,
      is_weekend: input.is_weekend ?? false,
      is_active: true,
    } as never)
    .select()
    .single();
  if (error?.code === "23505") throw new AppError("This weekday already exists", "CONFLICT", 409);
  if (error) throw new Error(`Failed to create weekday: ${error.message}`);
  return data as unknown as Weekday;
}

export async function updateWeekday(
  schoolId: string,
  weekdayId: string,
  input: Partial<Pick<Weekday, "name" | "sort_order" | "is_weekend">>
): Promise<Weekday> {
  const supabase: SupabaseClient = createSupabaseService();
  const payload = { ...input, ...(input.name ? { name: input.name.trim() } : {}) };
  const { data, error } = await supabase
    .from("weekdays")
    .update(payload as never)
    .eq("id", weekdayId)
    .eq("school_id", schoolId)
    .select()
    .maybeSingle();
  if (error) throw new Error(`Failed to update weekday: ${error.message}`);
  if (!data) throw new NotFoundError("Weekday not found");
  return data as unknown as Weekday;
}

export async function deleteWeekday(schoolId: string, weekdayId: string): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();
  const { error: periodsError } = await supabase
    .from("class_periods").delete().eq("school_id", schoolId).eq("weekday_id", weekdayId);
  if (periodsError) throw new Error(`Failed to remove weekday periods: ${periodsError.message}`);
  const { error: assignmentsError } = await supabase
    .from("class_weekdays").delete().eq("school_id", schoolId).eq("weekday_id", weekdayId);
  if (assignmentsError) throw new Error(`Failed to remove weekday assignments: ${assignmentsError.message}`);
  const { error } = await supabase
    .from("weekdays")
    .update({ is_active: false } as never)
    .eq("id", weekdayId)
    .eq("school_id", schoolId);
  if (error) throw new Error(`Failed to delete weekday: ${error.message}`);
}

export async function getClassWeekdays(schoolId: string, classId?: string): Promise<ClassWeekday[]> {
  const supabase: SupabaseClient = createSupabaseService();
  let query = supabase
    .from("class_weekdays")
    .select("*, weekday:weekdays(*), class:classes(id,name)")
    .eq("school_id", schoolId);
  if (classId) query = query.eq("class_id", classId);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch assigned weekdays: ${error.message}`);
  return (data ?? []) as unknown as ClassWeekday[];
}

export async function setClassWeekdays(
  schoolId: string,
  classId: string,
  days: Array<{ weekday_id: string; is_weekend: boolean }>
): Promise<ClassWeekday[]> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data: schoolClass } = await supabase
    .from("classes").select("id").eq("id", classId).eq("school_id", schoolId).eq("is_active", true).maybeSingle();
  if (!schoolClass) throw new NotFoundError("Class not found");

  const uniqueWeekdayIds = Array.from(new Set(days.map((day) => day.weekday_id)));
  if (uniqueWeekdayIds.length !== days.length) throw new AppError("Each weekday can only be configured once", "DUPLICATE_WEEKDAY");
  if (uniqueWeekdayIds.length) {
    const { count } = await supabase
      .from("weekdays").select("id", { count: "exact", head: true })
      .eq("school_id", schoolId).eq("is_active", true).in("id", uniqueWeekdayIds);
    if ((count ?? 0) !== uniqueWeekdayIds.length) throw new AppError("One or more weekdays are invalid", "INVALID_WEEKDAYS");
  }

  const { error: deleteError } = await supabase
    .from("class_weekdays").delete().eq("school_id", schoolId).eq("class_id", classId);
  if (deleteError) throw new Error(`Failed to update class weekdays: ${deleteError.message}`);
  if (days.length) {
    const { error } = await supabase.from("class_weekdays").insert(
      days.map((day) => ({ school_id: schoolId, class_id: classId, weekday_id: day.weekday_id, is_weekend: day.is_weekend })) as never
    );
    if (error) throw new Error(`Failed to assign weekdays: ${error.message}`);
  }
  return getClassWeekdays(schoolId, classId);
}

export async function duplicateClassWeekdays(
  schoolId: string,
  sourceClassId: string,
  targetClassIds: string[]
): Promise<{ targets: number }> {
  const uniqueTargetIds = Array.from(new Set(targetClassIds)).filter((id) => id !== sourceClassId);
  if (!uniqueTargetIds.length) throw new AppError("Choose at least one different target class", "INVALID_TARGET");
  const source = await getClassWeekdays(schoolId, sourceClassId);
  for (const targetClassId of uniqueTargetIds) {
    await setClassWeekdays(schoolId, targetClassId, source.map((row) => ({ weekday_id: row.weekday_id, is_weekend: row.is_weekend })));
  }
  return { targets: uniqueTargetIds.length };
}

export async function getClassPeriods(schoolId: string, classId: string): Promise<ClassPeriod[]> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data, error } = await supabase
    .from("class_periods")
    .select("*, weekday:weekdays(*)")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .order("position");
  if (error) throw new Error(`Failed to fetch periods: ${error.message}`);
  return (data ?? []) as unknown as ClassPeriod[];
}

export async function createClassPeriods(
  schoolId: string,
  input: {
    class_id: string;
    weekday_ids: string[];
    label: string;
    position: number;
    start_time: string;
    end_time: string;
  }
): Promise<ClassPeriod[]> {
  const supabase: SupabaseClient = createSupabaseService();
  const [{ data: schoolClass }, { count: assignedDayCount }] = await Promise.all([
    supabase.from("classes").select("id").eq("id", input.class_id).eq("school_id", schoolId).eq("is_active", true).maybeSingle(),
    supabase.from("class_weekdays").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("class_id", input.class_id).eq("is_weekend", false).in("weekday_id", input.weekday_ids),
  ]);
  if (!schoolClass) throw new NotFoundError("Class not found");
  if ((assignedDayCount ?? 0) !== input.weekday_ids.length) {
    throw new AppError("Periods can only be created for weekdays assigned to this class", "INVALID_WEEKDAYS");
  }
  const rows = input.weekday_ids.map((weekday_id) => ({
    school_id: schoolId,
    class_id: input.class_id,
    weekday_id,
    label: input.label.trim(),
    position: input.position,
    start_time: input.start_time,
    end_time: input.end_time,
  }));
  const { data, error } = await supabase.from("class_periods").insert(rows as never).select("*, weekday:weekdays(*)");
  if (error?.code === "23505") throw new AppError("That period position already exists for one of the selected days", "CONFLICT", 409);
  if (error) throw new Error(`Failed to create periods: ${error.message}`);
  return (data ?? []) as unknown as ClassPeriod[];
}

export async function updateClassPeriod(
  schoolId: string,
  periodId: string,
  input: Partial<Pick<ClassPeriod, "label" | "position" | "start_time" | "end_time">>
): Promise<ClassPeriod> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data, error } = await supabase
    .from("class_periods")
    .update(input as never)
    .eq("id", periodId).eq("school_id", schoolId)
    .select("*, weekday:weekdays(*)").maybeSingle();
  if (error?.code === "23505") throw new AppError("That period position already exists for this day", "CONFLICT", 409);
  if (error) throw new Error(`Failed to update period: ${error.message}`);
  if (!data) throw new NotFoundError("Period not found");
  return data as unknown as ClassPeriod;
}

export async function deleteClassPeriod(schoolId: string, periodId: string): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();
  const { error } = await supabase.from("class_periods").delete().eq("id", periodId).eq("school_id", schoolId);
  if (error) throw new Error(`Failed to delete period: ${error.message}`);
}

export async function duplicateClassPeriods(
  schoolId: string,
  sourceClassId: string,
  targetClassIds: string[]
): Promise<{ copied: number; targets: number }> {
  const uniqueTargetIds = Array.from(new Set(targetClassIds)).filter((id) => id !== sourceClassId);
  if (!uniqueTargetIds.length) throw new AppError("Choose at least one different target class", "INVALID_TARGET");
  const supabase: SupabaseClient = createSupabaseService();
  const source = await getClassPeriods(schoolId, sourceClassId);
  const sourceDays = (await getClassWeekdays(schoolId, sourceClassId)).filter((row) => !row.is_weekend);
  const sourceNameById = new Map(sourceDays.map((row) => [row.weekday_id, row.weekday?.name.toLowerCase()]));
  let copied = 0;
  for (const targetClassId of uniqueTargetIds) {
    const targetDays = (await getClassWeekdays(schoolId, targetClassId)).filter((row) => !row.is_weekend);
    const targetByName = new Map(targetDays.map((row) => [row.weekday?.name.toLowerCase(), row.weekday_id]));
    const rows = source.flatMap((period) => {
      const targetWeekdayId = targetByName.get(sourceNameById.get(period.weekday_id));
      return targetWeekdayId ? [{
        school_id: schoolId, class_id: targetClassId, weekday_id: targetWeekdayId,
        label: period.label, position: period.position, start_time: period.start_time, end_time: period.end_time,
      }] : [];
    });
    if (rows.length) {
      const { data, error } = await supabase.from("class_periods").upsert(rows as never, {
        onConflict: "class_id,weekday_id,position",
      }).select("id");
      if (error) throw new Error(`Failed to duplicate periods: ${error.message}`);
      copied += data?.length ?? 0;
    }
  }
  return { copied, targets: uniqueTargetIds.length };
}

export async function getTimetable(schoolId: string, classId: string): Promise<{
  periods: ClassPeriod[];
  entries: TimetableEntry[];
}> {
  const supabase: SupabaseClient = createSupabaseService();
  const [periods, entriesResult] = await Promise.all([
    getClassPeriods(schoolId, classId),
    supabase
      .from("timetable_entries")
      .select("*, class_subject:class_subjects(*,subject:subjects(*)), teacher:employees(id,name,employee_code,role)")
      .eq("school_id", schoolId).eq("class_id", classId),
  ]);
  if (entriesResult.error) throw new Error(`Failed to fetch timetable: ${entriesResult.error.message}`);
  return { periods, entries: (entriesResult.data ?? []) as unknown as TimetableEntry[] };
}

export async function getTeacherTimetable(
  schoolId: string,
  teacherId: string
): Promise<TimetableEntry[]> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data: teacher } = await supabase
    .from("employees")
    .select("id")
    .eq("id", teacherId)
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .maybeSingle();
  if (!teacher) throw new NotFoundError("Teacher not found");

  const { data, error } = await supabase
    .from("timetable_entries")
    .select("*, class_period:class_periods(*,weekday:weekdays(*)), class:classes(id,name), class_subject:class_subjects(*,subject:subjects(*)), teacher:employees(id,name,employee_code,role)")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId);
  if (error) throw new Error(`Failed to fetch teacher timetable: ${error.message}`);
  return (data ?? []) as unknown as TimetableEntry[];
}

export async function saveTimetableEntry(
  schoolId: string,
  input: {
    class_id: string;
    class_period_id: string;
    class_subject_id?: string | null;
    teacher_id?: string | null;
    is_break: boolean;
    apply_weekday_ids?: string[];
  }
): Promise<{ saved: number }> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data: sourcePeriod } = await supabase
    .from("class_periods").select("id,position,class_id").eq("id", input.class_period_id)
    .eq("school_id", schoolId).eq("class_id", input.class_id).maybeSingle();
  if (!sourcePeriod) throw new NotFoundError("Period not found");

  if (!input.is_break) {
    const { data: classSubject } = await supabase.from("class_subjects").select("id")
      .eq("id", input.class_subject_id).eq("school_id", schoolId).eq("class_id", input.class_id).maybeSingle();
    if (!classSubject) throw new AppError("Choose a subject assigned to this class", "INVALID_SUBJECT");
    if (input.teacher_id) {
      const { data: teacher } = await supabase.from("employees").select("id")
        .eq("id", input.teacher_id).eq("school_id", schoolId).eq("is_active", true).maybeSingle();
      if (!teacher) throw new AppError("Teacher not found", "INVALID_TEACHER");
    }
  }

  let periodIds = [input.class_period_id];
  if (input.apply_weekday_ids?.length) {
    const { data: workingAssignments, error: assignmentError } = await supabase
      .from("class_weekdays")
      .select("weekday_id")
      .eq("school_id", schoolId).eq("class_id", input.class_id)
      .eq("is_weekend", false)
      .in("weekday_id", input.apply_weekday_ids);
    if (assignmentError) throw new Error(`Failed to validate working days: ${assignmentError.message}`);
    const workingWeekdayIds = ((workingAssignments ?? []) as Array<{ weekday_id: string }>).map((row) => row.weekday_id);
    const { data, error } = workingWeekdayIds.length
      ? await supabase.from("class_periods").select("id")
        .eq("school_id", schoolId).eq("class_id", input.class_id)
        .eq("position", (sourcePeriod as Record<string, unknown>).position)
        .in("weekday_id", workingWeekdayIds)
      : { data: [], error: null };
    if (error) throw new Error(`Failed to find matching periods: ${error.message}`);
    periodIds = Array.from(new Set([input.class_period_id, ...((data ?? []) as Array<{ id: string }>).map((row) => row.id)]));
  }

  const rows = periodIds.map((class_period_id) => ({
    school_id: schoolId,
    class_id: input.class_id,
    class_period_id,
    class_subject_id: input.is_break ? null : input.class_subject_id,
    teacher_id: input.is_break ? null : input.teacher_id ?? null,
    is_break: input.is_break,
  }));
  const { error } = await supabase.from("timetable_entries").upsert(rows as never, {
    onConflict: "class_period_id",
  });
  if (error) throw new Error(`Failed to save timetable entry: ${error.message}`);
  return { saved: rows.length };
}

export async function deleteTimetableEntry(schoolId: string, entryId: string): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();
  const { error } = await supabase.from("timetable_entries").delete().eq("id", entryId).eq("school_id", schoolId);
  if (error) throw new Error(`Failed to delete timetable entry: ${error.message}`);
}
