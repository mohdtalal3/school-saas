import { createSupabaseService } from "@/lib/supabase";
import { createSchoolAdmin } from "@/services/auth.service";
import { NotFoundError } from "@/lib/api-response";
import type { School, NewSchool, UpdateSchool } from "@/types/school.types";
import type { CreateSchoolRequest } from "@/types/api.types";

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getAllSchools(): Promise<School[]> {
  const supabase = createSupabaseService();
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch schools: ${error.message}`);
  return (data as School[]) ?? [];
}

export async function getSchoolById(schoolId: string): Promise<School> {
  const supabase = createSupabaseService();
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("id", schoolId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch school: ${error.message}`);
  if (!data) throw new NotFoundError(`School not found: ${schoolId}`);
  return data as School;
}

// ── Write ──────────────────────────────────────────────────────────────────────

export async function createSchool(input: CreateSchoolRequest): Promise<School> {
  const supabase = createSupabaseService();

  // 1. Insert the school
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .insert({
      name: input.name,
      currency_symbol: "$",
      currency_name: "USD",
      timezone: "UTC",
    })
    .select()
    .single();

  if (schoolError || !school) {
    throw new Error(`Failed to create school: ${schoolError?.message}`);
  }

  // 2. Create the first admin account
  await createSchoolAdmin({
    schoolId: school.id,
    email: input.adminEmail,
    password: input.adminPassword,
    name: input.adminName,
  });

  return school as School;
}

export async function updateSchool(
  schoolId: string,
  payload: UpdateSchool
): Promise<School> {
  const supabase = createSupabaseService();
  const { data, error } = await supabase
    .from("schools")
    .update(payload)
    .eq("id", schoolId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update school: ${error.message}`);
  if (!data) throw new NotFoundError(`School not found: ${schoolId}`);
  return data as School;
}

export async function deleteSchool(schoolId: string): Promise<void> {
  const supabase = createSupabaseService();
  const { error } = await supabase
    .from("schools")
    .delete()
    .eq("id", schoolId);

  if (error) throw new Error(`Failed to delete school: ${error.message}`);
}