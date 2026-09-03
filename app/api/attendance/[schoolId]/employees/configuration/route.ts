import { NextResponse } from "next/server";
import { z } from "zod";
import { error, success } from "@/lib/api-response";
import { getEmployeeAttendanceConfiguration, updateEmployeeAttendanceSettings } from "@/services/employee-attendance.service";
import { employeeAttendanceFailure, employeeAttendanceSession } from "../_utils";

const time = z.string().regex(/^\d{2}:\d{2}$/);
const settingsSchema = z.object({
  check_in_start: time,
  check_in_end: time,
  duty_start: time,
  check_out_start: time,
  check_out_end: time,
  duty_end: time,
  short_leave_threshold_minutes: z.number().int().min(0).max(1440),
  half_day_threshold_minutes: z.number().int().min(0).max(1440),
  late_grace_minutes: z.number().int().min(0).max(240),
  early_checkout_grace_minutes: z.number().int().min(0).max(240),
});

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    return NextResponse.json(success(await getEmployeeAttendanceConfiguration(schoolId)));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to load attendance configuration"); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json(error(parsed.error.issues[0]?.message ?? "Invalid settings"), { status: 400 });
    return NextResponse.json(success(await updateEmployeeAttendanceSettings(schoolId, parsed.data)));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to update attendance settings"); }
}
