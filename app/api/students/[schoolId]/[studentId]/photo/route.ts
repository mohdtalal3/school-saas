import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import {
  uploadStudentPhoto,
  updateStudent,
} from "@/services/student.service";
import { success, error } from "@/lib/api-response";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ schoolId: string; studentId: string }> }
) {
  const { schoolId, studentId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(error("No file provided"), { status: 400 });
    }

    if (file.size > 500 * 1024) {
      return NextResponse.json(error("File too large (max 500KB)"), { status: 400 });
    }
    if (!/image\/(png|jpe?g)/.test(file.type)) {
      return NextResponse.json(error("Only JPG/PNG allowed"), { status: 400 });
    }

    const photo_url = await uploadStudentPhoto(schoolId, studentId, file);
    const student = await updateStudent(studentId, schoolId, { photo_url });
    return NextResponse.json(success({ student, photo_url }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Upload failed"),
      { status: 500 }
    );
  }
}
