import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import {
  getStudentById,
  updateStudent,
  deleteStudent,
} from "@/services/student.service";
import { success, error } from "@/lib/api-response";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  class_id: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  date_of_admission: z.string().min(1).optional(),
  discount: z.number().min(0).optional(),
  mobile: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  identification_mark: z.string().nullable().optional(),
  blood_group: z.string().nullable().optional(),
  disease: z.string().nullable().optional(),
  birth_form_id: z.string().nullable().optional(),
  additional_note: z.string().nullable().optional(),
  is_orphan: z.boolean().optional(),
  is_osc: z.boolean().optional(),
  religion: z.string().nullable().optional(),
  family: z.string().nullable().optional(),
  total_siblings: z.number().int().min(0).optional(),
  address: z.string().nullable().optional(),
  father_name: z.string().nullable().optional(),
  father_nic: z.string().nullable().optional(),
  father_profession: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; studentId: string }> }
) {
  const { schoolId, studentId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    const data = await getStudentById(studentId, schoolId);
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch student"),
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ schoolId: string; studentId: string }> }
) {
  const { schoolId, studentId } = await params;
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

    const data = await updateStudent(studentId, schoolId, parsed.data);
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to update student"),
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; studentId: string }> }
) {
  const { schoolId, studentId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    await deleteStudent(studentId, schoolId);
    return NextResponse.json(success({ deleted: true }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to delete student"),
      { status: 500 }
    );
  }
}
