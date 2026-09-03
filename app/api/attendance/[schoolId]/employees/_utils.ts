import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AppError, error } from "@/lib/api-response";

export async function employeeAttendanceSession(schoolId: string) {
  const session = await getSchoolSession();
  return session?.role === "admin" && session.schoolId === schoolId ? session : null;
}

export function employeeAttendanceFailure(value: unknown, fallback: string) {
  const exception = value instanceof Error ? value : new Error(fallback);
  return NextResponse.json(
    error(exception.message, exception instanceof AppError ? exception.code : undefined),
    { status: exception instanceof AppError ? exception.statusCode : 500 }
  );
}
