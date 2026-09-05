import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import {
  getTransactionDetail,
  updateTransaction,
  voidTransaction,
} from "@/services/accounts.service";
import { success, error, AppError } from "@/lib/api-response";

const PatchSchema = z.object({
  category_id: z.string().uuid().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().positive().optional(),
  payment_method: z.string().min(1).max(50).optional(),
  reference_number: z.string().max(200).nullable().optional(),
  party_name: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; transactionId: string }> }
) {
  const { schoolId, transactionId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const detail = await getTransactionDetail(schoolId, transactionId);
    return NextResponse.json(success(detail));
  } catch (e) {
    const status = e instanceof AppError ? e.statusCode : 500;
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch transaction"),
      { status }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ schoolId: string; transactionId: string }> }
) {
  const { schoolId, transactionId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(error("Invalid transaction payload"), { status: 400 });
    }

    const transaction = await updateTransaction(
      schoolId,
      session.adminId,
      session.email,
      transactionId,
      parsed.data
    );
    return NextResponse.json(success(transaction));
  } catch (e) {
    const status = e instanceof AppError ? e.statusCode : 500;
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to update transaction"),
      { status }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; transactionId: string }> }
) {
  const { schoolId, transactionId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const transaction = await voidTransaction(
      schoolId,
      session.adminId,
      session.email,
      transactionId
    );
    return NextResponse.json(success(transaction));
  } catch (e) {
    const status = e instanceof AppError ? e.statusCode : 500;
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to void transaction"),
      { status }
    );
  }
}
