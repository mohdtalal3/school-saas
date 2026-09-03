import { NextResponse } from "next/server";
import { z } from "zod";
import { error, success } from "@/lib/api-response";
import { getEmployeeMonthlyReport } from "@/services/employee-attendance.service";
import { employeeAttendanceFailure, employeeAttendanceSession } from "../../_utils";

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const query = new URL(request.url).searchParams;
    const month = z.string().regex(/^\d{4}-\d{2}$/).safeParse(query.get("month"));
    if (!month.success) return NextResponse.json(error("Use a valid month"), { status: 400 });
    return NextResponse.json(success(await getEmployeeMonthlyReport(schoolId, month.data, {
      designation: query.get("designation") || undefined,
      employeeId: query.get("employeeId") || undefined,
      status: query.get("status") || undefined,
      active: (query.get("active") as "true" | "false" | "all" | null) ?? "true",
    })));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to load monthly employee report"); }
}
