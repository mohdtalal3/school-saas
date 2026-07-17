import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { collectFee, getPaymentHistory, deletePayment } from "@/services/fee-payment.service";
import { success, error } from "@/lib/api-response";

const CollectSchema = z.object({
  invoice_id: z.string().min(1, "Invoice ID is required"),
  allocations: z.array(z.object({
    label: z.string().min(1),
    amount: z.number().nonnegative(),
  })).min(1, "At least one allocation is required"),
  payment_note: z.string().optional(),
  add_fine: z.boolean().optional(),
});

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
    const parsed = CollectSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error(parsed.error.issues[0]?.message ?? "Invalid input"),
        { status: 400 }
      );
    }

    const result = await collectFee(schoolId, {
      invoice_id: parsed.data.invoice_id,
      allocations: parsed.data.allocations,
      payment_note: parsed.data.payment_note,
      add_fine: parsed.data.add_fine,
    });

    return NextResponse.json(success(result));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to collect fee"),
      { status: 500 }
    );
  }
}

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
    const invoiceId = url.searchParams.get("invoiceId");
    if (!invoiceId) {
      return NextResponse.json(error("invoiceId is required"), { status: 400 });
    }

    const payments = await getPaymentHistory(schoolId, invoiceId);
    return NextResponse.json(success(payments));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch payments"),
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const paymentId = url.searchParams.get("paymentId");
    if (!paymentId) {
      return NextResponse.json(error("paymentId is required"), { status: 400 });
    }

    await deletePayment(schoolId, paymentId);
    return NextResponse.json(success({ deleted: true }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to delete payment"),
      { status: 500 }
    );
  }
}
