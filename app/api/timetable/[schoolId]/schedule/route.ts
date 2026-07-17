import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AppError, error, success } from "@/lib/api-response";
import { deleteTimetableEntry, getTimetable, saveTimetableEntry } from "@/services/timetable.service";

const SaveSchema = z.object({ class_id: z.string().uuid(), class_period_id: z.string().uuid(), class_subject_id: z.string().uuid().nullable().optional(), teacher_id: z.string().uuid().nullable().optional(), is_break: z.boolean(), apply_weekday_ids: z.array(z.string().uuid()).optional() });
const DeleteSchema = z.object({ id: z.string().uuid() });
async function allowed(id: string) { const s = await getSchoolSession(); return s?.role === "admin" && s.schoolId === id; }
function failure(value: unknown) { const e = value instanceof Error ? value : new Error("Timetable operation failed"); return NextResponse.json(error(e.message), { status: e instanceof AppError ? e.statusCode : 500 }); }

export async function GET(req: Request, { params }: { params: Promise<{ schoolId: string }> }) { const { schoolId } = await params; try { if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 }); const classId = new URL(req.url).searchParams.get("classId"); if (!classId) return NextResponse.json(error("Class is required"), { status: 400 }); return NextResponse.json(success(await getTimetable(schoolId, classId))); } catch (e) { return failure(e); } }
export async function PUT(req: Request, { params }: { params: Promise<{ schoolId: string }> }) { const { schoolId } = await params; try { if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 }); const p = SaveSchema.safeParse(await req.json()); if (!p.success) return NextResponse.json(error(p.error.issues[0]?.message ?? "Invalid timetable entry"), { status: 400 }); if (!p.data.is_break && !p.data.class_subject_id) return NextResponse.json(error("Choose a subject or mark the period as break"), { status: 400 }); return NextResponse.json(success(await saveTimetableEntry(schoolId, p.data))); } catch (e) { return failure(e); } }
export async function DELETE(req: Request, { params }: { params: Promise<{ schoolId: string }> }) { const { schoolId } = await params; try { if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 }); const p = DeleteSchema.safeParse(await req.json()); if (!p.success) return NextResponse.json(error("Invalid timetable entry"), { status: 400 }); await deleteTimetableEntry(schoolId, p.data.id); return NextResponse.json(success({ deleted: true })); } catch (e) { return failure(e); } }
