import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import {
  updateInstituteProfile,
  uploadSchoolLogo,
} from "@/services/settings.service";
import { success, error } from "@/lib/api-response";

const MAX_SIZE = 500 * 1024; // 500KB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(error("No file uploaded"), { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        error("Only JPG and PNG files are accepted"),
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        error("File size exceeds 500KB"),
        { status: 400 }
      );
    }

    const url = await uploadSchoolLogo(schoolId, file);
    const updated = await updateInstituteProfile(schoolId, { logo_url: url });

    return NextResponse.json(success({ logo_url: url, school: updated }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Upload failed"),
      { status: 500 }
    );
  }
}