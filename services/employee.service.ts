import bcrypt from "bcryptjs";
import { createSupabaseService } from "@/lib/supabase";
import type { Employee, NewEmployee, UpdateEmployee } from "@/types/school.types";
import { NotFoundError } from "@/lib/api-response";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaginatedResult, PaginationParams } from "@/services/student.service";

const SALT_ROUNDS = 10;

function generateEmployeeCode(count: number): string {
  return `EMP-${String(count + 1).padStart(4, "0")}`;
}

function cnicToUsername(cnic: string): string {
  // Strip all non-digit characters: dashes, spaces, etc.
  return cnic.replace(/\D/g, "");
}

function buildEmployee(data: Record<string, unknown>): Employee {
  return data as unknown as Employee;
}

// ── Read all ────────────────────────────────────────────────────────────────────

export async function getEmployees(
  schoolId: string,
  params: PaginationParams = {}
): Promise<PaginatedResult<Employee>> {
  const supabase: SupabaseClient = createSupabaseService();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 25);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("employees")
    .select("*", { count: "exact" })
    .eq("school_id", schoolId);

  if (params.active !== "all") {
    query = query.eq("is_active", params.active ?? true);
  }

  if (params.search?.trim()) {
    const q = params.search.trim();
    query = query.or(
      `name.ilike.%${q}%,role.ilike.%${q}%,employee_code.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,cnic.ilike.%${q}%`
    );
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch employees: ${error.message}`);

  const { count: activeCount } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("is_active", true);

  const { count: inactiveCount } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("is_active", false);

  return {
    data: (data ?? []) as unknown as Employee[],
    total: count ?? 0,
    counts: { active: activeCount ?? 0, inactive: inactiveCount ?? 0, total: (activeCount ?? 0) + (inactiveCount ?? 0) },
  };
}

export async function getEmployeeById(
  employeeId: string,
  schoolId: string
): Promise<Employee> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch employee: ${error.message}`);
  if (!data) throw new NotFoundError("Employee not found");
  return buildEmployee(data);
}

// ── Create ─────────────────────────────────────────────────────────────────────

export async function createEmployee(
  schoolId: string,
  input: NewEmployee & { cnic: string }
): Promise<{ employee: Employee; username: string; password: string }> {
  const supabase: SupabaseClient = createSupabaseService();

  // Generate next employee code
  const { count } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  const employee_code = generateEmployeeCode(count ?? 0);

  // Username = CNIC without dashes
  const rawCnic = input.cnic.replace(/\D/g, "");
  const login_username = cnicToUsername(input.cnic);

  // Auto-generate password = same raw CNIC
  const password = rawCnic;
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const insertData: Record<string, unknown> = {
    school_id: schoolId,
    employee_code,
    name: input.name,
    role: input.role,
    father_husband_name: input.father_husband_name ?? null,
    gender: input.gender ?? null,
    religion: input.religion ?? null,
    cnic: input.cnic ?? null,
    date_of_birth: input.date_of_birth ?? null,
    date_of_joining: input.date_of_joining,
    salary: input.salary ?? null,
    experience: input.experience ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    education: input.education ?? null,
    photo_url: input.photo_url ?? null,
    login_username,
    password_hash,
    is_login_active: true,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("employees")
    .insert(insertData as never)
    .select()
    .single();

  if (error) throw new Error(`Failed to create employee: ${error.message}`);
  const employee = buildEmployee(data as Record<string, unknown>);

  return { employee, username: login_username, password };
}

// ── Update ─────────────────────────────────────────────────────────────────────

export interface UpdateEmployeeOptions {
  /** Plain-text password to be hashed before storage. */
  password?: string;
}

export async function updateEmployee(
  employeeId: string,
  schoolId: string,
  payload: UpdateEmployee,
  options: UpdateEmployeeOptions = {}
): Promise<Employee> {
  const supabase: SupabaseClient = createSupabaseService();

  // If CNIC is being updated, regenerate username
  const updates: Record<string, unknown> = { ...payload } as Record<string, unknown>;
  if (payload.cnic !== undefined && payload.cnic !== null) {
    updates.login_username = cnicToUsername(payload.cnic);
  }

  // If login_username was explicitly passed, honor it (after password change)
  if (
    (payload as Record<string, unknown>).login_username !== undefined &&
    (payload as Record<string, unknown>).login_username !== null
  ) {
    updates.login_username = (payload as Record<string, unknown>).login_username;
  }

  // If password provided, hash it
  if (options.password && options.password.trim().length > 0) {
    updates.password_hash = await bcrypt.hash(options.password, SALT_ROUNDS);
  }

  const { data, error } = await supabase
    .from("employees")
    .update(updates as never)
    .eq("id", employeeId)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update employee: ${error.message}`);
  if (!data) throw new NotFoundError("Employee not found");
  return buildEmployee(data as Record<string, unknown>);
}

// ── Delete (soft) ───────────────────────────────────────────────────────────────

export async function deleteEmployee(
  employeeId: string,
  schoolId: string
): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();

  const { error } = await supabase
    .from("employees")
    .update({ is_active: false } as never)
    .eq("id", employeeId)
    .eq("school_id", schoolId);

  if (error) throw new Error(`Failed to delete employee: ${error.message}`);
}

// ── Toggle active ──────────────────────────────────────────────────────────────

export async function toggleEmployeeActive(
  employeeId: string,
  schoolId: string,
  isActive: boolean
): Promise<Employee> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data, error } = await supabase
    .from("employees")
    .update({ is_active: isActive } as never)
    .eq("id", employeeId)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update employee: ${error.message}`);
  if (!data) throw new NotFoundError("Employee not found");
  return buildEmployee(data as Record<string, unknown>);
}

// ── Attachments ────────────────────────────────────────────────────────────────

import type { EmployeeAttachment, NewEmployeeAttachment } from "@/types/school.types";

export async function getAttachments(
  employeeId: string
): Promise<EmployeeAttachment[]> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data, error } = await supabase
    .from("employee_attachments")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch attachments: ${error.message}`);
  return (data as EmployeeAttachment[]) ?? [];
}

export async function createAttachment(
  employeeId: string,
  payload: NewEmployeeAttachment
): Promise<EmployeeAttachment> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data, error } = await supabase
    .from("employee_attachments")
    .insert({ ...payload, employee_id: employeeId })
    .select()
    .single();

  if (error) throw new Error(`Failed to create attachment: ${error.message}`);
  return data as EmployeeAttachment;
}

export async function deleteAttachment(
  employeeId: string,
  attachmentId: string
): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();

  // Get the storage key first
  const { data, error: fetchError } = await supabase
    .from("employee_attachments")
    .select("storage_key")
    .eq("id", attachmentId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (fetchError || !data) {
    throw new Error("Attachment not found");
  }

  // Delete from storage
  await supabase.storage.from("employee-attachments").remove([data.storage_key]);

  // Delete from DB
  const { error } = await supabase
    .from("employee_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("employee_id", employeeId);

  if (error) throw new Error(`Failed to delete attachment: ${error.message}`);
}

export async function uploadAttachment(
  schoolId: string,
  employeeId: string,
  file: File,
  label: string
): Promise<EmployeeAttachment> {
  const supabase: SupabaseClient = createSupabaseService();

  const ext = file.name.split(".").pop() ?? "bin";
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${schoolId}/${employeeId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("employee-attachments")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

  return createAttachment(employeeId, {
    name: file.name,
    storage_key: path,
    mime_type: file.type,
    size_bytes: file.size,
    label,
  });
}

export function getAttachmentUrl(supabase: SupabaseClient, storageKey: string): string {
  const { data } = supabase.storage.from("employee-attachments").getPublicUrl(storageKey);
  return data.publicUrl;
}

// ── Photo upload ───────────────────────────────────────────────────────────────

export async function uploadEmployeePhoto(
  schoolId: string,
  employeeId: string,
  file: File
): Promise<string> {
  const supabase: SupabaseClient = createSupabaseService();

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${schoolId}/${employeeId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("employee-photos")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

  const { data } = supabase.storage.from("employee-photos").getPublicUrl(path);
  return data.publicUrl;
}
