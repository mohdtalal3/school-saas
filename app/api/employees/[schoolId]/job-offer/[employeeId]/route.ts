import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getEmployeeById } from "@/services/employee.service";
import { getSchoolById } from "@/services/school.service";
import { success, error } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; employeeId: string }> }
) {
  const { schoolId, employeeId } = await params;
  try {
    const session = await getSchoolSession();
    if (session?.schoolId !== schoolId) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const [employee, school] = await Promise.all([
      getEmployeeById(employeeId, schoolId),
      getSchoolById(schoolId),
    ]);

    return NextResponse.json(
      success({ employee, school })
    );
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch data"),
      { status: 500 }
    );
  }
}
