import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseService } from "@/lib/supabase";
import { AppError, NotFoundError } from "@/lib/api-response";
import type { ClassSubject, Subject } from "@/types/school.types";

const DEFAULT_SUBJECTS = [
  "English",
  "Urdu",
  "Mathematics",
  "Science",
  "Islamiat",
  "Social Studies",
  "Computer Science",
  "General Knowledge",
];

function asSubject(row: Record<string, unknown>): Subject {
  return row as unknown as Subject;
}

async function ensureDefaults(supabase: SupabaseClient, schoolId: string) {
  const { count, error } = await supabase
    .from("subjects")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);

  if (error) throw new Error(`Failed to check subjects: ${error.message}`);
  if ((count ?? 0) > 0) return;

  const rows = DEFAULT_SUBJECTS.map((name) => ({
    school_id: schoolId,
    name,
    is_active: true,
  }));
  const { error: insertError } = await supabase.from("subjects").insert(rows as never);
  if (insertError) throw new Error(`Failed to seed subjects: ${insertError.message}`);
}

export async function getSubjects(schoolId: string): Promise<Subject[]> {
  const supabase: SupabaseClient = createSupabaseService();
  await ensureDefaults(supabase, schoolId);
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`Failed to fetch subjects: ${error.message}`);
  return (data ?? []) as unknown as Subject[];
}

export async function createSubject(schoolId: string, name: string): Promise<Subject> {
  const supabase: SupabaseClient = createSupabaseService();
  const normalizedName = name.trim();

  const { data: existing } = await supabase
    .from("subjects")
    .select("*")
    .eq("school_id", schoolId)
    .ilike("name", normalizedName)
    .maybeSingle();

  if (existing) {
    if ((existing as Record<string, unknown>).is_active) {
      throw new AppError("A subject with this name already exists", "CONFLICT", 409);
    }
    const { data, error } = await supabase
      .from("subjects")
      .update({ is_active: true, name: normalizedName } as never)
      .eq("id", (existing as Record<string, unknown>).id)
      .eq("school_id", schoolId)
      .select()
      .single();
    if (error) throw new Error(`Failed to restore subject: ${error.message}`);
    return asSubject(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("subjects")
    .insert({ school_id: schoolId, name: normalizedName, is_active: true } as never)
    .select()
    .single();
  if (error) throw new Error(`Failed to create subject: ${error.message}`);
  return asSubject(data as Record<string, unknown>);
}

export async function updateSubject(
  schoolId: string,
  subjectId: string,
  name: string
): Promise<Subject> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data, error } = await supabase
    .from("subjects")
    .update({ name: name.trim() } as never)
    .eq("id", subjectId)
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .select()
    .maybeSingle();
  if (error) throw new Error(`Failed to update subject: ${error.message}`);
  if (!data) throw new NotFoundError("Subject not found");
  return asSubject(data as Record<string, unknown>);
}

export async function deleteSubject(schoolId: string, subjectId: string): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data: assignments, error: assignmentError } = await supabase
    .from("class_subjects")
    .select("id")
    .eq("school_id", schoolId)
    .eq("subject_id", subjectId);
  if (assignmentError) throw new Error(`Failed to check subject usage: ${assignmentError.message}`);
  const assignmentIds = ((assignments ?? []) as Array<{ id: string }>).map((row) => row.id);
  if (assignmentIds.length) {
    const { count, error: timetableError } = await supabase
      .from("timetable_entries")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .in("class_subject_id", assignmentIds);
    if (timetableError) throw new Error(`Failed to check timetable usage: ${timetableError.message}`);
    if ((count ?? 0) > 0) {
      throw new AppError("Remove this subject from class timetables before deleting it", "SUBJECT_IN_USE", 409);
    }
    const { error: deleteAssignmentsError } = await supabase
      .from("class_subjects")
      .delete()
      .eq("school_id", schoolId)
      .eq("subject_id", subjectId);
    if (deleteAssignmentsError) throw new Error(`Failed to remove subject assignments: ${deleteAssignmentsError.message}`);
  }
  const { error } = await supabase
    .from("subjects")
    .update({ is_active: false } as never)
    .eq("id", subjectId)
    .eq("school_id", schoolId);
  if (error) throw new Error(`Failed to delete subject: ${error.message}`);
}

export async function getClassSubjects(
  schoolId: string,
  classId?: string
): Promise<ClassSubject[]> {
  const supabase: SupabaseClient = createSupabaseService();
  let query = supabase
    .from("class_subjects")
    .select("*, subject:subjects(*), class:classes(id,name)")
    .eq("school_id", schoolId)
    .order("created_at");
  if (classId) query = query.eq("class_id", classId);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch class subjects: ${error.message}`);
  return (data ?? []) as unknown as ClassSubject[];
}

async function validateClassAndSubject(
  supabase: SupabaseClient,
  schoolId: string,
  classId: string,
  subjectId: string
) {
  const [{ data: schoolClass }, { data: subject }] = await Promise.all([
    supabase.from("classes").select("id").eq("id", classId).eq("school_id", schoolId).eq("is_active", true).maybeSingle(),
    supabase.from("subjects").select("id").eq("id", subjectId).eq("school_id", schoolId).eq("is_active", true).maybeSingle(),
  ]);
  if (!schoolClass) throw new NotFoundError("Class not found");
  if (!subject) throw new NotFoundError("Subject not found");
}

export async function assignSubject(
  schoolId: string,
  input: { class_id: string; subject_id: string; total_marks: number }
): Promise<ClassSubject> {
  const supabase: SupabaseClient = createSupabaseService();
  await validateClassAndSubject(supabase, schoolId, input.class_id, input.subject_id);
  const { data, error } = await supabase
    .from("class_subjects")
    .insert({ ...input, school_id: schoolId } as never)
    .select("*, subject:subjects(*), class:classes(id,name)")
    .single();
  if (error?.code === "23505") throw new AppError("This subject is already assigned to the class", "CONFLICT", 409);
  if (error) throw new Error(`Failed to assign subject: ${error.message}`);
  return data as unknown as ClassSubject;
}

export async function updateClassSubject(
  schoolId: string,
  assignmentId: string,
  totalMarks: number
): Promise<ClassSubject> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data, error } = await supabase
    .from("class_subjects")
    .update({ total_marks: totalMarks } as never)
    .eq("id", assignmentId)
    .eq("school_id", schoolId)
    .select("*, subject:subjects(*), class:classes(id,name)")
    .maybeSingle();
  if (error) throw new Error(`Failed to update assignment: ${error.message}`);
  if (!data) throw new NotFoundError("Subject assignment not found");
  return data as unknown as ClassSubject;
}

export async function deleteClassSubject(schoolId: string, assignmentId: string): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();
  const { error } = await supabase
    .from("class_subjects")
    .delete()
    .eq("id", assignmentId)
    .eq("school_id", schoolId);
  if (error?.code === "23503") throw new AppError("Remove this subject from the timetable before unassigning it", "CONFLICT", 409);
  if (error) throw new Error(`Failed to remove assignment: ${error.message}`);
}

export async function duplicateClassSubjects(
  schoolId: string,
  sourceClassId: string,
  targetClassIds: string[]
): Promise<{ copied: number; skipped: number; targets: number }> {
  const uniqueTargetIds = Array.from(new Set(targetClassIds)).filter((id) => id !== sourceClassId);
  if (!uniqueTargetIds.length) throw new AppError("Choose at least one different target class", "INVALID_TARGET", 400);
  const supabase: SupabaseClient = createSupabaseService();
  const [{ data: source }, { data: targetClasses }] = await Promise.all([
    supabase.from("class_subjects").select("subject_id,total_marks").eq("school_id", schoolId).eq("class_id", sourceClassId),
    supabase.from("classes").select("id").eq("school_id", schoolId).eq("is_active", true).in("id", uniqueTargetIds),
  ]);
  if ((targetClasses?.length ?? 0) !== uniqueTargetIds.length) throw new NotFoundError("One or more target classes were not found");

  let copied = 0;
  let skipped = 0;
  for (const targetClassId of uniqueTargetIds) {
    const { data: target, error: targetError } = await supabase
      .from("class_subjects").select("subject_id").eq("school_id", schoolId).eq("class_id", targetClassId);
    if (targetError) throw new Error(`Failed to check target subjects: ${targetError.message}`);
    const existingIds = new Set(((target ?? []) as Array<{ subject_id: string }>).map((row) => row.subject_id));
    const rows = ((source ?? []) as Array<{ subject_id: string; total_marks: number }>).filter((item) => !existingIds.has(item.subject_id));
    skipped += (source?.length ?? 0) - rows.length;
    if (rows.length) {
      const { error } = await supabase.from("class_subjects").insert(
        rows.map((row) => ({ ...row, school_id: schoolId, class_id: targetClassId })) as never
      );
      if (error) throw new Error(`Failed to duplicate subjects: ${error.message}`);
      copied += rows.length;
    }
  }
  return { copied, skipped, targets: uniqueTargetIds.length };
}
