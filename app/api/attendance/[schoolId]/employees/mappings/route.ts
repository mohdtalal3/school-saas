import { NextResponse } from "next/server";
import { z } from "zod";
import { error, success } from "@/lib/api-response";
import { getBiometricEmployeeMappings, saveBiometricEmployeeMapping } from "@/services/employee-attendance-import.service";
import { employeeAttendanceFailure, employeeAttendanceSession } from "../_utils";

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    return NextResponse.json(success(await getBiometricEmployeeMappings(schoolId)));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to load biometric mappings"); }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = z.object({ biometric_id: z.string().trim().min(1).max(100), employee_id: z.string().uuid(), machine_name: z.string().max(100).nullable().optional() }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json(error(parsed.error.issues[0]?.message ?? "Invalid mapping"), { status: 400 });
    return NextResponse.json(success(await saveBiometricEmployeeMapping(schoolId, parsed.data.biometric_id, parsed.data.employee_id, parsed.data.machine_name)));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to save biometric mapping"); }
}
