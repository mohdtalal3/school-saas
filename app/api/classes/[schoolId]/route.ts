import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getClasses, createClass } from "@/services/class.service";
import { success, error } from "@/lib/api-response";

const NewClassSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  fee: z.number().min(0, "Fee must be 0 or greater"),
  class_teacher: z.string().nullable().optional(),
  capacity: z.number().int().min(1).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const limit = parseInt(url.searchParams.get("limit") ?? "25", 10);
    const search = url.searchParams.get("search") ?? undefined;

    const result = await getClasses(schoolId, { page, limit, search });
    return NextResponse.json(success(result));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch classes"),
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const json = await req.json();
    const parsed = NewClassSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error(parsed.error.issues[0]?.message ?? "Invalid input"),
        { status: 400 }
      );
    }

    const data = await createClass(schoolId, {
      name: parsed.data.name,
      fee: parsed.data.fee,
      class_teacher: parsed.data.class_teacher ?? null,
      capacity: parsed.data.capacity ?? 50,
    });
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to create class"),
      { status: 500 }
    );
  }
}
