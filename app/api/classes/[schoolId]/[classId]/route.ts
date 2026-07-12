import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import {
  getClassById,
  updateClass,
  deleteClass,
} from "@/services/class.service";
import { success, error } from "@/lib/api-response";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  fee: z.number().min(0).optional(),
  class_teacher: z.string().nullable().optional(),
  capacity: z.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; classId: string }> }
) {
  const { schoolId, classId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    const data = await getClassById(classId, schoolId);
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch class"),
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ schoolId: string; classId: string }> }
) {
  const { schoolId, classId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const json = await req.json();
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error(parsed.error.issues[0]?.message ?? "Invalid input"),
        { status: 400 }
      );
    }

    const data = await updateClass(classId, schoolId, parsed.data);
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to update class"),
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; classId: string }> }
) {
  const { schoolId, classId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    await deleteClass(classId, schoolId);
    return NextResponse.json(success({ deleted: true }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to delete class"),
      { status: 500 }
    );
  }
}
