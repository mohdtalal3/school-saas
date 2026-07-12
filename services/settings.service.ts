import { createSupabaseService } from "@/lib/supabase";
import { getSchoolById, updateSchool } from "@/services/school.service";
import type { School } from "@/types/school.types";
import type {
  UpdateInstituteProfileRequest,
  UpdateAccountSettingsRequest,
} from "@/types/api.types";

// ── Institute Profile ───────────────────────────────────────────────────────

export async function getInstituteProfile(
  schoolId: string
): Promise<School> {
  return getSchoolById(schoolId);
}

export async function updateInstituteProfile(
  schoolId: string,
  payload: UpdateInstituteProfileRequest
): Promise<School> {
  return updateSchool(schoolId, payload);
}

export async function uploadSchoolLogo(
  schoolId: string,
  file: File
): Promise<string> {
  const supabase = createSupabaseService();

  const ext = file.name.split(".").pop() ?? "png";
  const path = `${schoolId}/logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("school-logos")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(`Logo upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("school-logos").getPublicUrl(path);
  return data.publicUrl;
}

// ── Account Settings ──────────────────────────────────────────────────────────

export async function getAccountSettings(schoolId: string): Promise<School> {
  return getSchoolById(schoolId);
}

export async function updateAccountSettings(
  schoolId: string,
  payload: UpdateAccountSettingsRequest
): Promise<School> {
  return updateSchool(schoolId, payload);
}