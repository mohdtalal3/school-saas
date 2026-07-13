import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getStudents, createStudent } from "@/services/student.service";
import { success, error } from "@/lib/api-response";

const NewStudentSchema = z.object({
  name: z.string().min(1, "Student name is required"),
  registration_no: z.string().nullable().optional(),
  class_id: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  date_of_admission: z.string().min(1, "Date of admission is required"),
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
  is_free: z.boolean().optional(),
  previous_balance: z.number().min(0).optional(),
  religion: z.string().nullable().optional(),
  family: z.string().nullable().optional(),
  total_siblings: z.number().int().min(0).optional(),
  address: z.string().nullable().optional(),
  father_name: z.string().nullable().optional(),
  father_nic: z.string().nullable().optional(),
  father_profession: z.string().nullable().optional(),
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
    const classId = url.searchParams.get("classId") ?? undefined;
    const activeParam = url.searchParams.get("active") ?? "true";
    const active = activeParam === "all" ? "all" : activeParam === "true";
    const isFreeParam = url.searchParams.get("isFree");
    const isFree = isFreeParam === "true" ? true : undefined;

    const result = await getStudents(schoolId, { page, limit, search, classId, active, isFree });
    return NextResponse.json(success(result));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch students"),
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
    const parsed = NewStudentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error(parsed.error.issues[0]?.message ?? "Invalid input"),
        { status: 400 }
      );
    }

    const data = await createStudent(schoolId, parsed.data as never);
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to create student"),
      { status: 500 }
    );
  }
}
