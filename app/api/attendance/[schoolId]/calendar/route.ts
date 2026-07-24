import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AppError, error, success } from "@/lib/api-response";
import { createAttendanceHoliday, deleteAttendanceHoliday, getAttendanceHolidays, updateAttendanceHoliday } from "@/services/attendance.service";
import { getWeekdays } from "@/services/timetable.service";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const holidayType = z.enum(["government", "public", "school", "emergency", "other"]);
const holidayScope = z.enum(["school", "classes", "students"]);
const createSchema = z.object({ holiday_date: dateSchema, end_date: dateSchema, title: z.string().trim().min(1).max(150), holiday_type: holidayType, scope: holidayScope, class_ids: z.array(z.string().uuid()).optional(), student_ids: z.array(z.string().uuid()).optional(), note: z.string().max(500).optional() }).refine((value) => value.end_date >= value.holiday_date, { message: "End date must be on or after the start date" });
const updateSchema = createSchema.and(z.object({ id: z.string().uuid() }));
const deleteSchema = z.object({ id: z.string().uuid() });

async function allowed(schoolId: string) { const session = await getSchoolSession(); return session?.role === "admin" && session.schoolId === schoolId; }
function failure(value: unknown) { const exception = value instanceof Error ? value : new Error("Calendar operation failed"); return NextResponse.json(error(exception.message, exception instanceof AppError ? exception.code : undefined), { status: exception instanceof AppError ? exception.statusCode : 500 }); }

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const query = new URL(request.url).searchParams;
    const parsed = z.object({ startDate: dateSchema, endDate: dateSchema }).refine((value) => value.startDate <= value.endDate, { message: "Invalid date range" }).safeParse(Object.fromEntries(query));
    if (!parsed.success) return NextResponse.json(error(parsed.error.issues[0]?.message ?? "Invalid date range"), { status: 400 });
    const [holidays, weekdays] = await Promise.all([getAttendanceHolidays(schoolId, parsed.data.startDate, parsed.data.endDate), getWeekdays(schoolId)]);
    return NextResponse.json(success({ holidays, weekdays }));
  } catch (value) { return failure(value); }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json(error(parsed.error.issues[0]?.message ?? "Invalid holiday"), { status: 400 });
    return NextResponse.json(success(await createAttendanceHoliday(schoolId, parsed.data)));
  } catch (value) { return failure(value); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json(error(parsed.error.issues[0]?.message ?? "Invalid holiday"), { status: 400 });
    const { id, ...input } = parsed.data;
    return NextResponse.json(success(await updateAttendanceHoliday(schoolId, id, input)));
  } catch (value) { return failure(value); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json(error("Invalid holiday"), { status: 400 });
    await deleteAttendanceHoliday(schoolId, parsed.data.id);
    return NextResponse.json(success({ deleted: true }));
  } catch (value) { return failure(value); }
}
