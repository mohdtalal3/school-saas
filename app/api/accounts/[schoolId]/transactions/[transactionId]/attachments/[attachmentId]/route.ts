import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { deleteTransactionAttachment } from "@/services/accounts.service";
import { success, error, AppError } from "@/lib/api-response";

export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ schoolId: string; transactionId: string; attachmentId: string }>;
  }
) {
  const { schoolId, transactionId, attachmentId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    await deleteTransactionAttachment(
      schoolId,
      session.adminId,
      session.email,
      transactionId,
      attachmentId
    );
    return NextResponse.json(success({ ok: true }));
  } catch (e) {
    const status = e instanceof AppError ? e.statusCode : 500;
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to delete attachment"),
      { status }
    );
  }
}
