import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { uploadTransactionAttachment } from "@/services/accounts.service";
import { success, error, AppError } from "@/lib/api-response";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(
  req: Request,
  { params }: { params: Promise<{ schoolId: string; transactionId: string }> }
) {
  const { schoolId, transactionId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(error("No file provided"), { status: 400 });
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

    const attachment = await uploadTransactionAttachment(
      schoolId,
      session.adminId,
      session.email,
      transactionId,
      file
    );
    return NextResponse.json(success(attachment), { status: 201 });
  } catch (e) {
    const status = e instanceof AppError ? e.statusCode : 500;
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Upload failed"),
      { status }
    );
  }
}
