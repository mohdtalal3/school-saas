import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AppError, error, success } from "@/lib/api-response";
import { getDailyAttendance, saveDailyAttendance } from "@/services/attendance.service";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");
const saveSchema = z.object({
  class_id: z.string().uuid(),
  date: dateSchema,
  confirm_partial: z.boolean().optional(),
  records: z.array(z.object({
    student_id: z.string().uuid(),
    status: z.enum(["present", "absent", "late", "leave"]),
    note: z.string().max(500).optional(),
  })),
});

async function allowed(schoolId: string) {
  const session = await getSchoolSession();
  return session?.role === "admin" && session.schoolId === schoolId;
}

function failure(value: unknown, fallback: string) {
  const exception = value instanceof Error ? value : new Error(fallback);
  return NextResponse.json(error(exception.message, exception instanceof AppError ? exception.code : undefined), { status: exception instanceof AppError ? exception.statusCode : 500 });
}

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const query = new URL(request.url).searchParams;
    const parsed = z.object({ classId: z.string().uuid(), date: dateSchema }).safeParse({ classId: query.get("classId"), date: query.get("date") });
    if (!parsed.success) return NextResponse.json(error(parsed.error.issues[0]?.message ?? "Class and date are required"), { status: 400 });
    return NextResponse.json(success(await getDailyAttendance(schoolId, parsed.data.classId, parsed.data.date)));
  } catch (value) { return failure(value, "Failed to load attendance"); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = saveSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json(error(parsed.error.issues[0]?.message ?? "Invalid attendance"), { status: 400 });
    return NextResponse.json(success(await saveDailyAttendance(schoolId, parsed.data.class_id, parsed.data.date, parsed.data.records, parsed.data.confirm_partial)));
  } catch (value) { return failure(value, "Failed to save attendance"); }
}
