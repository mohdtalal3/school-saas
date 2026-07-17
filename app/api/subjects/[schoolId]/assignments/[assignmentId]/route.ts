import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AppError, error, success } from "@/lib/api-response";
import { deleteClassSubject, updateClassSubject } from "@/services/subject.service";

const Schema = z.object({ total_marks: z.number().int().positive().max(10000) });
function failure(value: unknown) {
  const err = value instanceof Error ? value : new Error("Subject assignment failed");
  return NextResponse.json(error(err.message), { status: err instanceof AppError ? err.statusCode : 500 });
}
async function allowed(schoolId: string) { const s = await getSchoolSession(); return s?.role === "admin" && s.schoolId === schoolId; }

export async function PATCH(req: Request, { params }: { params: Promise<{ schoolId: string; assignmentId: string }> }) {
  const { schoolId, assignmentId } = await params;
  try {
    if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json(error("Total marks must be a positive whole number"), { status: 400 });
    return NextResponse.json(success(await updateClassSubject(schoolId, assignmentId, parsed.data.total_marks)));
  } catch (e) { return failure(e); }
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ schoolId: string; assignmentId: string }> }) {
  const { schoolId, assignmentId } = await params;
  try {
    if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    await deleteClassSubject(schoolId, assignmentId);
    return NextResponse.json(success({ deleted: true }));
  } catch (e) { return failure(e); }
}
