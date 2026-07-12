import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getSchoolById, updateSchool } from "@/services/school.service";
import { success, error } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    const school = await getSchoolById(schoolId);
    return NextResponse.json(
      success({
        employee_rules: school.employee_rules,
        student_rules: school.student_rules,
      })
    );
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch rules"),
      { status: 500 }
    );
  }
}

const UpdateSchema = z.object({
  employee_rules: z.string().nullable().optional(),
  student_rules: z.string().nullable().optional(),
});

export async function PATCH(
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
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error(parsed.error.issues[0]?.message ?? "Invalid input"),
        { status: 400 }
      );
    }

    const updated = await updateSchool(schoolId, parsed.data as Parameters<typeof updateSchool>[1]);
    return NextResponse.json(
      success({
        employee_rules: updated.employee_rules,
        student_rules: updated.student_rules,
      })
    );
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Update failed"),
      { status: 500 }
    );
  }
}
