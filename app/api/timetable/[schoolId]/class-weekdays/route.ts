import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AppError, error, success } from "@/lib/api-response";
import { duplicateClassWeekdays, getClassWeekdays, setClassWeekdays } from "@/services/timetable.service";

const SetSchema = z.object({ class_id: z.string().uuid(), days: z.array(z.object({ weekday_id: z.string().uuid(), is_weekend: z.boolean() })) });
const DuplicateSchema = z.object({ source_class_id: z.string().uuid(), target_class_ids: z.array(z.string().uuid()).min(1) });
async function allowed(id: string) { const s = await getSchoolSession(); return s?.role === "admin" && s.schoolId === id; }
function failure(value: unknown) { const e = value instanceof Error ? value : new Error("Class weekday operation failed"); return NextResponse.json(error(e.message), { status: e instanceof AppError ? e.statusCode : 500 }); }

export async function GET(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params; try { if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 }); return NextResponse.json(success(await getClassWeekdays(schoolId, new URL(req.url).searchParams.get("classId") ?? undefined))); } catch (e) { return failure(e); }
}
export async function PUT(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params; try { if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 }); const p = SetSchema.safeParse(await req.json()); if (!p.success) return NextResponse.json(error("Choose a class and configure its weekdays"), { status: 400 }); return NextResponse.json(success(await setClassWeekdays(schoolId, p.data.class_id, p.data.days))); } catch (e) { return failure(e); }
}
export async function POST(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params; try { if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 }); const p = DuplicateSchema.safeParse(await req.json()); if (!p.success) return NextResponse.json(error("Choose source and target classes"), { status: 400 }); return NextResponse.json(success(await duplicateClassWeekdays(schoolId, p.data.source_class_id, p.data.target_class_ids))); } catch (e) { return failure(e); }
}
