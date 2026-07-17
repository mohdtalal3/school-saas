import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AppError, error, success } from "@/lib/api-response";
import { assignSubject, duplicateClassSubjects, getClassSubjects } from "@/services/subject.service";

const AssignSchema = z.object({
  action: z.literal("assign").optional(),
  class_id: z.string().uuid(), subject_id: z.string().uuid(), total_marks: z.number().int().positive().max(10000),
});
const DuplicateSchema = z.object({ action: z.literal("duplicate"), source_class_id: z.string().uuid(), target_class_ids: z.array(z.string().uuid()).min(1) });
function failure(value: unknown) {
  const err = value instanceof Error ? value : new Error("Subject assignment failed");
  return NextResponse.json(error(err.message), { status: err instanceof AppError ? err.statusCode : 500 });
}

export async function GET(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) return NextResponse.json(error("Unauthorized"), { status: 401 });
    return NextResponse.json(success(await getClassSubjects(schoolId, new URL(req.url).searchParams.get("classId") ?? undefined)));
  } catch (e) { return failure(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const json = await req.json();
    if (json.action === "duplicate") {
      const parsed = DuplicateSchema.safeParse(json);
      if (!parsed.success) return NextResponse.json(error("Invalid duplication request"), { status: 400 });
      return NextResponse.json(success(await duplicateClassSubjects(schoolId, parsed.data.source_class_id, parsed.data.target_class_ids)));
    }
    const parsed = AssignSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json(error(parsed.error.issues[0]?.message ?? "Invalid input"), { status: 400 });
    return NextResponse.json(success(await assignSubject(schoolId, parsed.data)));
  } catch (e) { return failure(e); }
}
