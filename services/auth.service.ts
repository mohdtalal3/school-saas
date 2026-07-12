import bcrypt from "bcryptjs";
import { createSupabaseService } from "@/lib/supabase";
import { env } from "@/lib/env";
import { UnauthorizedError, NotFoundError } from "@/lib/api-response";
import type { SchoolAdmin } from "@/types/school.types";

const SALT_ROUNDS = 10;

export async function verifyMasterCredentials(
  email: string,
  password: string
): Promise<boolean> {
  if (email !== env.MASTER_EMAIL) return false;
  // Direct comparison for env-based master login (Phase 1)
  return password === env.MASTER_PASSWORD;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function createSchoolAdmin(input: {
  schoolId: string;
  email: string;
  password: string;
  name?: string;
}): Promise<SchoolAdmin> {
  const supabase = createSupabaseService();
  const password_hash = await hashPassword(input.password);

  const { data, error } = await supabase
    .from("school_admins")
    .insert({
      school_id: input.schoolId,
      email: input.email,
      password_hash,
      name: input.name ?? "School Admin",
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create admin: ${error.message}`);
  }
  return data as SchoolAdmin;
}

export async function findAdminByEmail(
  email: string
): Promise<(SchoolAdmin & { password_hash: string }) | null> {
  const supabase = createSupabaseService();
  const { data, error } = await supabase
    .from("school_admins")
    .select("*")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`Failed to look up admin: ${error.message}`);
  if (!data) return null;
  return data as SchoolAdmin & { password_hash: string };
}

export async function verifyAdminPassword(
  email: string,
  password: string
): Promise<SchoolAdmin> {
  const admin = await findAdminByEmail(email);
  if (!admin) throw new UnauthorizedError("Invalid credentials");

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) throw new UnauthorizedError("Invalid credentials");

  const { password_hash: _omit, ...safe } = admin;
  return safe as SchoolAdmin;
}

export async function requireAdminById(
  adminId: string,
  schoolId: string
): Promise<SchoolAdmin> {
  const supabase = createSupabaseService();
  const { data, error } = await supabase
    .from("school_admins")
    .select("*")
    .eq("id", adminId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new NotFoundError("Admin not found");
  const { password_hash: _omit, ...safe } = data;
  return safe as SchoolAdmin;
}