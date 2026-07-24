import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AppError, error, success } from "@/lib/api-response";
import { getStudentAttendanceReport } from "@/services/attendance.service";

const querySchema = z.object({
  studentId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((value) => value.startDate <= value.endDate, { message: "Start date must be before end date" });

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const query = new URL(request.url).searchParams;
    const parsed = querySchema.safeParse(Object.fromEntries(query));
    if (!parsed.success) return NextResponse.json(error(parsed.error.issues[0]?.message ?? "Invalid report filters"), { status: 400 });
    return NextResponse.json(success(await getStudentAttendanceReport(schoolId, parsed.data.studentId, parsed.data.startDate, parsed.data.endDate)));
  } catch (value) {
    const exception = value instanceof Error ? value : new Error("Failed to load student attendance report");
    return NextResponse.json(error(exception.message), { status: exception instanceof AppError ? exception.statusCode : 500 });
  }
}
