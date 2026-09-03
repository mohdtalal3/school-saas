import { NextResponse } from "next/server";
import { z } from "zod";
import { error, success } from "@/lib/api-response";
import { getEmployeeAttendanceCalendar } from "@/services/employee-attendance.service";
import { employeeAttendanceFailure, employeeAttendanceSession } from "../_utils";

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = z.string().regex(/^\d{4}-\d{2}$/).safeParse(new URL(request.url).searchParams.get("month"));
    if (!parsed.success) return NextResponse.json(error("Use a valid month"), { status: 400 });
    return NextResponse.json(success(await getEmployeeAttendanceCalendar(schoolId, parsed.data)));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to load employee attendance calendar"); }
}
