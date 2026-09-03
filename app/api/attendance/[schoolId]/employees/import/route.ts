import { NextResponse } from "next/server";
import { z } from "zod";
import { error, success } from "@/lib/api-response";
import { commitEmployeeAttendanceImport, getEmployeeAttendanceImports, previewEmployeeAttendanceImport, undoEmployeeAttendanceImport } from "@/services/employee-attendance-import.service";
import { employeeAttendanceFailure, employeeAttendanceSession } from "../_utils";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const strategySchema = z.enum(["skip", "replace", "merge_missing"]);

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
    return NextResponse.json(success(await getEmployeeAttendanceImports(schoolId, new URL(request.url).searchParams.get("jobId") || undefined)));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to load import history"); }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    const session = await employeeAttendanceSession(schoolId);
    if (!session) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json(error("Choose a CSV or Excel file"), { status: 400 });
    const date = dateSchema.safeParse(form.get("date"));
    const strategy = strategySchema.safeParse(form.get("strategy") || "merge_missing");
    const mode = z.enum(["preview", "import"]).safeParse(form.get("mode") || "preview");
    if (!date.success || !strategy.success || !mode.success) return NextResponse.json(error("Invalid import options"), { status: 400 });
    const result = mode.data === "preview"
      ? await previewEmployeeAttendanceImport(schoolId, file, date.data, strategy.data)
      : await commitEmployeeAttendanceImport(schoolId, session.adminId, file, date.data, strategy.data);
    return NextResponse.json(success(result));
  } catch (value) { return employeeAttendanceFailure(value, "Employee attendance import failed"); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    const session = await employeeAttendanceSession(schoolId);
    if (!session) return NextResponse.json(error("Unauthorized"), { status: 401 });
    const parsed = z.object({ job_id: z.string().uuid() }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json(error("Choose an import"), { status: 400 });
    return NextResponse.json(success(await undoEmployeeAttendanceImport(schoolId, session.adminId, parsed.data.job_id)));
  } catch (value) { return employeeAttendanceFailure(value, "Failed to undo attendance import"); }
}
