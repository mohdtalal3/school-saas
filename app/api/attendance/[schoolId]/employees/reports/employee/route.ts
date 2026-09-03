import { NextResponse } from "next/server";
import { z } from "zod";
import { error, success } from "@/lib/api-response";
import { getEmployeeDetailedReport } from "@/services/employee-attendance.service";
import { employeeAttendanceFailure, employeeAttendanceSession } from "../../_utils";

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const query = new URL(request.url).searchParams;
    const parsed = z.object({ employeeId: z.string().uuid(), month: z.string().regex(/^\d{4}-\d{2}$/) }).safeParse({ employeeId: query.get("employeeId"), month: query.get("month") });
    if (!parsed.success) return NextResponse.json(error("Choose an employee and month"), { status: 400 });
    return NextResponse.json(success(await getEmployeeDetailedReport(schoolId, parsed.data.employeeId, parsed.data.month)));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to load employee detail report"); }
}
