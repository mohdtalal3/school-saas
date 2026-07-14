import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { deleteInvoice } from "@/services/fee-invoice.service";
import { success, error } from "@/lib/api-response";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; invoiceId: string }> }
) {
  const { schoolId, invoiceId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    await deleteInvoice(invoiceId, schoolId);
    return NextResponse.json(success({ deleted: true }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to delete invoice"),
      { status: 500 }
    );
  }
}
