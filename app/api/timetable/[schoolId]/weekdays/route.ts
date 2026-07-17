import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AppError, error, success } from "@/lib/api-response";
import { createWeekday, deleteWeekday, getWeekdays, updateWeekday } from "@/services/timetable.service";

const CreateSchema = z.object({ name: z.string().trim().min(1).max(30), sort_order: z.number().int().min(0).optional(), is_weekend: z.boolean().optional() });
const UpdateSchema = CreateSchema.partial().extend({ id: z.string().uuid() });
const DeleteSchema = z.object({ id: z.string().uuid() });
async function allowed(id: string) { const s = await getSchoolSession(); return s?.role === "admin" && s.schoolId === id; }
function failure(value: unknown) { const e = value instanceof Error ? value : new Error("Weekday operation failed"); return NextResponse.json(error(e.message), { status: e instanceof AppError ? e.statusCode : 500 }); }

export async function GET(_req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params; try { if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 }); return NextResponse.json(success(await getWeekdays(schoolId))); } catch (e) { return failure(e); }
}
export async function POST(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params; try { if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 }); const p = CreateSchema.safeParse(await req.json()); if (!p.success) return NextResponse.json(error(p.error.issues[0]?.message ?? "Invalid input"), { status: 400 }); return NextResponse.json(success(await createWeekday(schoolId, p.data))); } catch (e) { return failure(e); }
}
export async function PATCH(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params; try { if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 }); const p = UpdateSchema.safeParse(await req.json()); if (!p.success) return NextResponse.json(error("Invalid weekday"), { status: 400 }); const { id, ...input } = p.data; return NextResponse.json(success(await updateWeekday(schoolId, id, input))); } catch (e) { return failure(e); }
}
export async function DELETE(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params; try { if (!(await allowed(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 }); const p = DeleteSchema.safeParse(await req.json()); if (!p.success) return NextResponse.json(error("Invalid weekday"), { status: 400 }); await deleteWeekday(schoolId, p.data.id); return NextResponse.json(success({ deleted: true })); } catch (e) { return failure(e); }
}
