import { NextResponse } from "next/server";
import { z } from "zod";
import { error, success } from "@/lib/api-response";
import { getDailyEmployeeAttendance, saveDailyEmployeeAttendance } from "@/services/employee-attendance.service";
import { employeeAttendanceFailure, employeeAttendanceSession } from "../_utils";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const status = z.enum(["present", "late", "absent", "leave", "short_leave", "half_day", "not_marked"]);
const time = z.string().regex(/^\d{2}:\d{2}$/).nullable().optional();
const saveSchema = z.object({
  date,
  finalize_missing: z.boolean().optional(),
  records: z.array(z.object({
    employee_id: z.string().uuid(),
    actual_check_in: time,
    actual_check_out: time,
    status,
    is_manual_override: z.boolean().optional(),
    notes: z.string().max(1000).optional(),
  })),
});

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const query = new URL(request.url).searchParams;
    const parsed = date.safeParse(query.get("date"));
    if (!parsed.success) return NextResponse.json(error("Use a valid date"), { status: 400 });
    return NextResponse.json(success(await getDailyEmployeeAttendance(schoolId, parsed.data, {
      designation: query.get("designation") || undefined,
      search: query.get("search") || undefined,
      status: query.get("status") || undefined,
    })));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to load employee attendance"); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    const session = await employeeAttendanceSession(schoolId);
    if (!session) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = saveSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json(error(parsed.error.issues[0]?.message ?? "Invalid attendance"), { status: 400 });
    return NextResponse.json(success(await saveDailyEmployeeAttendance(schoolId, session.adminId, parsed.data.date, parsed.data.records, parsed.data.finalize_missing)));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to save employee attendance"); }
}
