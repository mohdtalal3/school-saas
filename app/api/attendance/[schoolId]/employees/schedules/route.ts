import { NextResponse } from "next/server";
import { z } from "zod";
import { error, success } from "@/lib/api-response";
import { deleteEmployeeSchedule, getEmployeeAttendanceConfiguration, saveEmployeeSchedule } from "@/services/employee-attendance.service";
import { employeeAttendanceFailure, employeeAttendanceSession } from "../_utils";

const optionalTime = z.string().regex(/^\d{2}:\d{2}$/).nullable();
const scheduleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  schedule_type: z.enum(["weekday", "seasonal", "date_range", "date_override"]),
  weekday: z.number().int().min(1).max(7).nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  is_working_day: z.boolean(),
  attendance_closed: z.boolean(),
  closure_type: z.enum(["weekly_off", "public_holiday", "school_holiday", "summer_holiday", "winter_holiday", "special_closure", "event"]).nullable(),
  check_in_start: optionalTime,
  check_in_end: optionalTime,
  duty_start: optionalTime,
  check_out_start: optionalTime,
  check_out_end: optionalTime,
  duty_end: optionalTime,
  short_leave_threshold_minutes: z.number().int().min(0).max(1440).nullable(),
  half_day_threshold_minutes: z.number().int().min(0).max(1440).nullable(),
  late_grace_minutes: z.number().int().min(0).max(240).nullable(),
  early_checkout_grace_minutes: z.number().int().min(0).max(240).nullable(),
  priority: z.number().int().min(0).max(1000),
  note: z.string().max(1000).nullable(),
  is_active: z.boolean(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    return NextResponse.json(success((await getEmployeeAttendanceConfiguration(schoolId)).schedules));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to load schedules"); }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = scheduleSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json(error(parsed.error.issues[0]?.message ?? "Invalid schedule"), { status: 400 });
    return NextResponse.json(success(await saveEmployeeSchedule(schoolId, parsed.data)));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to save schedule"); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json(error("Choose a schedule"), { status: 400 });
    return NextResponse.json(success(await deleteEmployeeSchedule(schoolId, parsed.data.id)));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to delete schedule"); }
}
