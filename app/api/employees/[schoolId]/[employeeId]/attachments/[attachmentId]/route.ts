import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { deleteAttachment } from "@/services/employee.service";
import { success, error } from "@/lib/api-response";

export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      schoolId: string;
      employeeId: string;
      attachmentId: string;
    }>;
  }
) {
  const { schoolId, employeeId, attachmentId } = await params;
  try {
    const session = await getSchoolSession();
    if (session?.schoolId !== schoolId) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    await deleteAttachment(employeeId, attachmentId);
    return NextResponse.json(success({ id: attachmentId }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Delete failed"),
      { status: 500 }
    );
  }
}