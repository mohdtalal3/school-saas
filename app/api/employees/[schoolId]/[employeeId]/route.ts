import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import {
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "@/services/employee.service";
import { success, error } from "@/lib/api-response";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.string().min(1).optional(),
  father_husband_name: z.string().nullable().optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  religion: z.string().nullable().optional(),
  cnic: z.string().min(5).nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  date_of_joining: z.string().min(1).optional(),
  salary: z.number().nullable().optional(),
  experience: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  address: z.string().nullable().optional(),
  education: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  is_login_active: z.boolean().optional(),
  is_active: z.boolean().optional(),
  login_username: z.string().min(1).optional(),
  password: z.string().min(4).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; employeeId: string }> }
) {
  const { schoolId, employeeId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    const data = await getEmployeeById(employeeId, schoolId);
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch employee"),
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ schoolId: string; employeeId: string }> }
) {
  const { schoolId, employeeId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const json = await req.json();
    if ("email" in json && json.email === "") json.email = null;
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error(parsed.error.issues[0]?.message ?? "Invalid input"),
        { status: 400 }
      );
    }

    // Pull the plain-text password out before forwarding to the service
    const { password, ...rest } = parsed.data as Record<string, unknown> & {
      password?: string;
    };

    const data = await updateEmployee(
      employeeId,
      schoolId,
      rest as Parameters<typeof updateEmployee>[2],
      { password }
    );
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to update employee"),
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; employeeId: string }> }
) {
  const { schoolId, employeeId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    await deleteEmployee(employeeId, schoolId);
    return NextResponse.json(success({ deleted: true }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to delete employee"),
      { status: 500 }
    );
  }
}
