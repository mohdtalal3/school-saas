import { createSupabaseService } from "@/lib/supabase";
import type {
  SchoolClass,
  NewClass,
  UpdateClass,
  ClassWithStats,
} from "@/types/school.types";
import { NotFoundError } from "@/lib/api-response";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaginatedResult, PaginationParams } from "@/services/student.service";

function buildClass(data: Record<string, unknown>): SchoolClass {
  return data as unknown as SchoolClass;
}

// ── Read all ────────────────────────────────────────────────────────────────────

export async function getClasses(
  schoolId: string,
  params: PaginationParams = {}
): Promise<PaginatedResult<ClassWithStats>> {
  const supabase: SupabaseClient = createSupabaseService();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 25);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("classes")
    .select("*", { count: "exact" })
    .eq("school_id", schoolId)
    .eq("is_active", true);

  if (params.search?.trim()) {
    const q = params.search.trim();
    query = query.or(
      `name.ilike.%${q}%,class_teacher.ilike.%${q}%`
    );
  }

  query = query
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch classes: ${error.message}`);

  const classes = (data ?? []) as unknown as SchoolClass[];

  return {
    data: classes.map((c) => ({
      ...c,
      boys: 0,
      girls: 0,
      total_students: 0,
    })),
    total: count ?? 0,
  };
}

// ── Read one ────────────────────────────────────────────────────────────────────

export async function getClassById(
  classId: string,
  schoolId: string
): Promise<ClassWithStats> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch class: ${error.message}`);
  if (!data) throw new NotFoundError("Class not found");

  const cls = buildClass(data as Record<string, unknown>);
  return {
    ...cls,
    boys: 0,
    girls: 0,
    total_students: 0,
  };
}

// ── Create ─────────────────────────────────────────────────────────────────────

export async function createClass(
  schoolId: string,
  input: NewClass
): Promise<SchoolClass> {
  const supabase: SupabaseClient = createSupabaseService();

  const insertData: Record<string, unknown> = {
    school_id: schoolId,
    name: input.name,
    fee: input.fee,
    annual_dues: input.annual_dues ?? 0,
    class_teacher: input.class_teacher ?? null,
    capacity: input.capacity ?? 50,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("classes")
    .insert(insertData as never)
    .select()
    .single();

  if (error) throw new Error(`Failed to create class: ${error.message}`);
  return buildClass(data as Record<string, unknown>);
}

// ── Update ─────────────────────────────────────────────────────────────────────

export async function updateClass(
  classId: string,
  schoolId: string,
  payload: UpdateClass
): Promise<SchoolClass> {
  const supabase: SupabaseClient = createSupabaseService();

  const updates: Record<string, unknown> = { ...payload } as Record<string, unknown>;

  const { data, error } = await supabase
    .from("classes")
    .update(updates as never)
    .eq("id", classId)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update class: ${error.message}`);
  if (!data) throw new NotFoundError("Class not found");
  return buildClass(data as Record<string, unknown>);
}

// ── Delete (soft) ───────────────────────────────────────────────────────────────

export async function deleteClass(
  classId: string,
  schoolId: string
): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();

  const { error } = await supabase
    .from("classes")
    .update({ is_active: false } as never)
    .eq("id", classId)
    .eq("school_id", schoolId);

  if (error) throw new Error(`Failed to delete class: ${error.message}`);
}
