import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AppError, error, success } from "@/lib/api-response";
import { createSubject, getSubjects } from "@/services/subject.service";

const CreateSchema = z.object({ name: z.string().trim().min(1).max(100) });

async function authorized(schoolId: string) {
  const session = await getSchoolSession();
  return session?.role === "admin" && session.schoolId === schoolId;
}

function failure(value: unknown, fallback: string) {
  const err = value instanceof Error ? value : new Error(fallback);
  return NextResponse.json(error(err.message), { status: err instanceof AppError ? err.statusCode : 500 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await authorized(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    return NextResponse.json(success(await getSubjects(schoolId)));
  } catch (e) { return failure(e, "Failed to fetch subjects"); }
}

export async function POST(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await authorized(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json(error(parsed.error.issues[0]?.message ?? "Invalid input"), { status: 400 });
    return NextResponse.json(success(await createSubject(schoolId, parsed.data.name)));
  } catch (e) { return failure(e, "Failed to create subject"); }
}
