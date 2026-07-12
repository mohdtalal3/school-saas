import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import {
  getEmployees,
  createEmployee,
} from "@/services/employee.service";
import { success, error } from "@/lib/api-response";

const NewEmployeeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  role: z.string().min(1, "Role is required"),
  father_husband_name: z.string().nullable().optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  religion: z.string().nullable().optional(),
  cnic: z.string().min(5, "CNIC is required"),
  date_of_birth: z.string().nullable().optional(),
  date_of_joining: z.string().min(1, "Date of joining is required"),
  salary: z.number().nullable().optional(),
  experience: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  address: z.string().nullable().optional(),
  education: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
});

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
    const data = await getEmployees(schoolId);
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch employees"),
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
    if ("email" in json && json.email === "") json.email = null;
    const parsed = NewEmployeeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error(parsed.error.issues[0]?.message ?? "Invalid input"),
        { status: 400 }
      );
    }

    const result = await createEmployee(schoolId, {
      name: parsed.data.name,
      role: parsed.data.role,
      father_husband_name: parsed.data.father_husband_name ?? null,
      gender: parsed.data.gender ?? null,
      religion: parsed.data.religion ?? null,
      cnic: parsed.data.cnic,
      date_of_birth: parsed.data.date_of_birth ?? null,
      date_of_joining: parsed.data.date_of_joining,
      salary: parsed.data.salary ?? null,
      experience: parsed.data.experience ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      education: parsed.data.education ?? null,
    });
    return NextResponse.json(success(result));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to create employee"),
      { status: 500 }
    );
  }
}