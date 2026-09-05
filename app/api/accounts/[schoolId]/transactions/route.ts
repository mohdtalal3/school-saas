import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import {
  getStatement,
  createTransaction,
  getAdminName,
} from "@/services/accounts.service";
import { success, error, AppError } from "@/lib/api-response";
import { PAYMENT_METHODS, TRANSACTION_SORT_FIELDS } from "@/lib/accounts";

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
    const num = (value: string | null): number | undefined => {
      if (value === null || value === "") return undefined;
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    };
    const typeParam = url.searchParams.get("type");
    const type = typeParam === "income" || typeParam === "expense" ? typeParam : undefined;
    const sortDirParam = url.searchParams.get("sortDir");

    const result = await getStatement(schoolId, {
      page: num(url.searchParams.get("page")),
      limit: num(url.searchParams.get("limit")),
      search: url.searchParams.get("search") ?? undefined,
      type,
      categoryId: url.searchParams.get("categoryId") ?? undefined,
      paymentMethod: url.searchParams.get("paymentMethod") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      amountMin: url.searchParams.get("amountMin") ? Number(url.searchParams.get("amountMin")) : undefined,
      amountMax: url.searchParams.get("amountMax") ? Number(url.searchParams.get("amountMax")) : undefined,
      createdBy: url.searchParams.get("createdBy") ?? undefined,
      sortBy: url.searchParams.get("sortBy") ?? undefined,
      sortDir: sortDirParam === "asc" ? "asc" : "desc",
    });
    return NextResponse.json(success(result));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch statement"),
      { status: 500 }
    );
  }
}

const CreateSchema = z.object({
  type: z.enum(["income", "expense"]),
  category_id: z.string().uuid(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive(),
  payment_method: z.string().min(1).max(50),
  reference_number: z.string().max(200).nullable().optional(),
  party_name: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
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

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(error("Invalid transaction payload"), { status: 400 });
    }

    const transaction = await createTransaction(
      schoolId,
      session.adminId,
      session.email,
      parsed.data
    );
    return NextResponse.json(success(transaction), { status: 201 });
  } catch (e) {
    const status = e instanceof AppError ? e.statusCode : 500;
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to create transaction"),
      { status }
    );
  }
}
