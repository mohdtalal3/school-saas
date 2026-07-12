import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import {
  getStudentAttachments,
  deleteStudentAttachment,
} from "@/services/student.service";
import { createSupabaseService } from "@/lib/supabase";
import { success, error } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; studentId: string; attachmentId: string }> }
) {
  const { schoolId, studentId, attachmentId } = await params;
  try {
    const session = await getSchoolSession();
    if (session?.schoolId !== schoolId) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const attachments = await getStudentAttachments(studentId);
    const att = attachments.find((a) => a.id === attachmentId);
    if (!att) {
      return NextResponse.json(error("Attachment not found"), { status: 404 });
    }

    const supabase = createSupabaseService();
    const { data } = supabase.storage
      .from("student-attachments")
      .getPublicUrl(att.storage_key);

    return NextResponse.redirect(data.publicUrl);
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Download failed"),
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; studentId: string; attachmentId: string }> }
) {
  const { schoolId, studentId, attachmentId } = await params;
  try {
    const session = await getSchoolSession();
    if (session?.schoolId !== schoolId) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    await deleteStudentAttachment(studentId, attachmentId);
    return NextResponse.json(success({ deleted: true }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Delete failed"),
      { status: 500 }
    );
  }
}
