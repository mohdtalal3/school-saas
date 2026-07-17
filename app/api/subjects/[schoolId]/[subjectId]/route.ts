import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AppError, error, success } from "@/lib/api-response";
import { deleteSubject, updateSubject } from "@/services/subject.service";

const UpdateSchema = z.object({ name: z.string().trim().min(1).max(100) });
function failure(value: unknown) {
  const err = value instanceof Error ? value : new Error("Subject operation failed");
  return NextResponse.json(error(err.message), { status: err instanceof AppError ? err.statusCode : 500 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ schoolId: string; subjectId: string }> }) {
  const { schoolId, subjectId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json(error(parsed.error.issues[0]?.message ?? "Invalid input"), { status: 400 });
    return NextResponse.json(success(await updateSubject(schoolId, subjectId, parsed.data.name)));
  } catch (e) { return failure(e); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ schoolId: string; subjectId: string }> }) {
  const { schoolId, subjectId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) return NextResponse.json(error("Unauthorized"), { status: 401 });
    await deleteSubject(schoolId, subjectId);
    return NextResponse.json(success({ deleted: true }));
  } catch (e) { return failure(e); }
}
