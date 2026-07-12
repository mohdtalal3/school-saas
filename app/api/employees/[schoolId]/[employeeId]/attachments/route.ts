import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import {
  getAttachments,
  uploadAttachment,
  getEmployeeById,
} from "@/services/employee.service";
import { success, error } from "@/lib/api-response";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; employeeId: string }> }
) {
  const { schoolId, employeeId } = await params;
  try {
    const session = await getSchoolSession();
    if (session?.schoolId !== schoolId) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    const attachments = await getAttachments(employeeId);
    return NextResponse.json(success(attachments));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to list attachments"),
      { status: 500 }
    );
  }
}

const LabelSchema = z.string().min(1).max(60);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ schoolId: string; employeeId: string }> }
) {
  const { schoolId, employeeId } = await params;
  try {
    const session = await getSchoolSession();
    if (session?.schoolId !== schoolId) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const label = formData.get("label");

    if (!(file instanceof File)) {
      return NextResponse.json(error("No file provided"), { status: 400 });
    }
    if (typeof label !== "string" || !LabelSchema.safeParse(label).success) {
      return NextResponse.json(
        error("Label is required (1–60 chars)"),
        { status: 400 }
      );
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        error(`File type not allowed: ${file.type || "unknown"}`),
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        error(`File too large (max ${MAX_BYTES / 1024 / 1024} MB)`),
        { status: 400 }
      );
    }

    // Verify employee belongs to school
    await getEmployeeById(employeeId, schoolId);

    const attachment = await uploadAttachment(schoolId, employeeId, file, label);
    return NextResponse.json(success(attachment));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Upload failed"),
      { status: 500 }
    );
  }
}
