import { NextResponse } from "next/server";
import { z } from "zod";
import { error, success } from "@/lib/api-response";
import { getEmployeeAttendanceAudit } from "@/services/employee-attendance.service";
import { employeeAttendanceFailure, employeeAttendanceSession } from "../_utils";

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const query = new URL(request.url).searchParams;
    const parsed = z.object({ employeeId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse({ employeeId: query.get("employeeId"), date: query.get("date") });
    if (!parsed.success) return NextResponse.json(error("Choose an employee and date"), { status: 400 });
    return NextResponse.json(success(await getEmployeeAttendanceAudit(schoolId, parsed.data.employeeId, parsed.data.date)));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to load audit history"); }
}
