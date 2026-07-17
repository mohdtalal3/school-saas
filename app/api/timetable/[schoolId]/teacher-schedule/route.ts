import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AppError, error, success } from "@/lib/api-response";
import { getTeacherTimetable } from "@/services/timetable.service";

function failure(value: unknown) {
  const err = value instanceof Error ? value : new Error("Failed to fetch teacher timetable");
  return NextResponse.json(error(err.message), { status: err instanceof AppError ? err.statusCode : 500 });
}

export async function GET(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    const teacherId = new URL(req.url).searchParams.get("teacherId");
    if (!teacherId) return NextResponse.json(error("Teacher is required"), { status: 400 });
    return NextResponse.json(success(await getTeacherTimetable(schoolId, teacherId)));
  } catch (e) {
    return failure(e);
  }
}
