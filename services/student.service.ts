import { createSupabaseService } from "@/lib/supabase";
import type {
  Student,
  NewStudent,
  UpdateStudent,
  StudentWithClass,
  StudentAttachment,
  NewStudentAttachment,
} from "@/types/school.types";
import { NotFoundError } from "@/lib/api-response";
import type { SupabaseClient } from "@supabase/supabase-js";

function generateRegistrationNo(count: number): string {
  return `STU-${String(count + 1).padStart(4, "0")}`;
}

function buildStudent(data: Record<string, unknown>): Student {
  return data as unknown as Student;
}

// ── Read all ────────────────────────────────────────────────────────────────────

export interface StatusCounts {
  active: number;
  inactive: number;
  total: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  counts?: StatusCounts;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  searchFields?: string[];
  classId?: string;
  active?: boolean | "all";
  isFree?: boolean;
}

export async function getStudents(
  schoolId: string,
  params: PaginationParams = {}
): Promise<PaginatedResult<StudentWithClass>> {
  const supabase: SupabaseClient = createSupabaseService();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 25);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("students")
    .select(
      `*,
      classes!left ( id, name, fee )`,
      { count: "exact" }
    )
    .eq("school_id", schoolId);

  if (params.active !== "all") {
    query = query.eq("is_active", params.active ?? true);
  }

  if (params.classId) {
    query = query.eq("class_id", params.classId);
  }

  if (params.isFree !== undefined) {
    query = query.eq("is_free", params.isFree);
  }

  if (params.search?.trim()) {
    const q = params.search.trim();
    const fields = params.searchFields ?? ["name", "registration_no", "father_name", "mobile"];
    query = query.or(
      fields.map((f) => `${f}.ilike.%${q}%`).join(",")
    );
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch students: ${error.message}`);

  const rows = (data ?? []) as Record<string, unknown>[];
  const students = rows.map((row) => {
    const cls = row.classes as Record<string, unknown> | null;
    const { classes: _c, ...studentFields } = row;
    return {
      ...buildStudent(studentFields),
      class_name: (cls?.name as string) ?? null,
      class_fee: cls?.fee != null ? Number(cls.fee) : null,
    };
  });

  const { count: activeCount } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("is_active", true);

  const { count: inactiveCount } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("is_active", false);

  return {
    data: students,
    total: count ?? 0,
    counts: { active: activeCount ?? 0, inactive: inactiveCount ?? 0, total: (activeCount ?? 0) + (inactiveCount ?? 0) },
  };
}

// ── Read one ────────────────────────────────────────────────────────────────────

export async function getStudentById(
  studentId: string,
  schoolId: string
): Promise<StudentWithClass> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error } = await supabase
    .from("students")
    .select(
      `*,
      classes!left ( id, name, fee )`
    )
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch student: ${error.message}`);
  if (!data) throw new NotFoundError("Student not found");

  const row = data as Record<string, unknown>;
  const cls = row.classes as Record<string, unknown> | null;
  const { classes: _c, ...studentFields } = row;
  return {
    ...buildStudent(studentFields),
    class_name: (cls?.name as string) ?? null,
    class_fee: cls?.fee != null ? Number(cls.fee) : null,
  };
}

// ── Create ─────────────────────────────────────────────────────────────────────

export async function createStudent(
  schoolId: string,
  input: NewStudent
): Promise<Student> {
  const supabase: SupabaseClient = createSupabaseService();

  // Registration number: use provided value (prefix STU- if needed) or auto-generate
  let registration_no: string;
  if (input.registration_no && input.registration_no.trim()) {
    const raw = input.registration_no.trim().toUpperCase();
    registration_no = raw.startsWith("STU-") ? raw : `STU-${raw}`;
  } else {
    const { count } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId);
    registration_no = generateRegistrationNo(count ?? 0);
  }

  const insertData: Record<string, unknown> = {
    school_id: schoolId,
    registration_no,
    name: input.name,
    class_id: input.class_id ?? null,
    photo_url: input.photo_url ?? null,
    date_of_admission: input.date_of_admission,
    discount: input.discount ?? 0,
    mobile: input.mobile ?? null,
    date_of_birth: input.date_of_birth ?? null,
    gender: input.gender ?? null,
    identification_mark: input.identification_mark ?? null,
    blood_group: input.blood_group ?? null,
    disease: input.disease ?? null,
    birth_form_id: input.birth_form_id ?? null,
    additional_note: input.additional_note ?? null,
    is_orphan: input.is_orphan ?? false,
    is_osc: input.is_osc ?? false,
    is_free: input.is_free ?? false,
    previous_balance: input.previous_balance ?? 0,
    religion: input.religion ?? null,
    family: input.family ?? null,
    total_siblings: input.total_siblings ?? 0,
    address: input.address ?? null,
    father_name: input.father_name ?? null,
    father_nic: input.father_nic ?? null,
    father_profession: input.father_profession ?? null,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("students")
    .insert(insertData as never)
    .select()
    .single();

  if (error) throw new Error(`Failed to create student: ${error.message}`);
  return buildStudent(data as Record<string, unknown>);
}

// ── Update ─────────────────────────────────────────────────────────────────────

export async function updateStudent(
  studentId: string,
  schoolId: string,
  payload: UpdateStudent
): Promise<Student> {
  const supabase: SupabaseClient = createSupabaseService();

  const updates: Record<string, unknown> = { ...payload } as Record<string, unknown>;

  const { data, error } = await supabase
    .from("students")
    .update(updates as never)
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update student: ${error.message}`);
  if (!data) throw new NotFoundError("Student not found");
  return buildStudent(data as Record<string, unknown>);
}

// ── Delete (soft) ───────────────────────────────────────────────────────────────

export async function deleteStudent(
  studentId: string,
  schoolId: string
): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();

  const { error } = await supabase
    .from("students")
    .update({ is_active: false } as never)
    .eq("id", studentId)
    .eq("school_id", schoolId);

  if (error) throw new Error(`Failed to delete student: ${error.message}`);
}

// ── Toggle active ──────────────────────────────────────────────────────────────

export async function toggleStudentActive(
  studentId: string,
  schoolId: string,
  isActive: boolean
): Promise<Student> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data, error } = await supabase
    .from("students")
    .update({ is_active: isActive } as never)
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update student: ${error.message}`);
  if (!data) throw new NotFoundError("Student not found");
  return buildStudent(data as Record<string, unknown>);
}

// ── Photo upload ───────────────────────────────────────────────────────────────

export async function uploadStudentPhoto(
  schoolId: string,
  studentId: string,
  file: File
): Promise<string> {
  const supabase: SupabaseClient = createSupabaseService();

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${schoolId}/${studentId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("student-photos")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

  const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
  return data.publicUrl;
}

// ── Attachments ────────────────────────────────────────────────────────────────

export async function getStudentAttachments(
  studentId: string
): Promise<StudentAttachment[]> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error } = await supabase
    .from("student_attachments")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch attachments: ${error.message}`);
  return (data as StudentAttachment[]) ?? [];
}

export async function createStudentAttachment(
  studentId: string,
  payload: NewStudentAttachment
): Promise<StudentAttachment> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error } = await supabase
    .from("student_attachments")
    .insert({ ...payload, student_id: studentId })
    .select()
    .single();

  if (error) throw new Error(`Failed to create attachment: ${error.message}`);
  return data as StudentAttachment;
}

export async function deleteStudentAttachment(
  studentId: string,
  attachmentId: string
): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error: fetchError } = await supabase
    .from("student_attachments")
    .select("storage_key")
    .eq("id", attachmentId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (fetchError || !data) throw new Error("Attachment not found");

  await supabase.storage.from("student-attachments").remove([data.storage_key]);

  const { error } = await supabase
    .from("student_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("student_id", studentId);

  if (error) throw new Error(`Failed to delete attachment: ${error.message}`);
}

export async function uploadStudentAttachment(
  schoolId: string,
  studentId: string,
  file: File,
  label: string
): Promise<StudentAttachment> {
  const supabase: SupabaseClient = createSupabaseService();

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${schoolId}/${studentId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("student-attachments")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

  return createStudentAttachment(studentId, {
    name: file.name,
    storage_key: path,
    mime_type: file.type,
    size_bytes: file.size,
    label,
  });
}

export function getStudentAttachmentUrl(
  supabase: SupabaseClient,
  storageKey: string
): string {
  const { data } = supabase.storage
    .from("student-attachments")
    .getPublicUrl(storageKey);
  return data.publicUrl;
}
