import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { generateInvoices, getInvoices } from "@/services/fee-invoice.service";
import { success, error } from "@/lib/api-response";

const GenerateSchema = z.object({
  mode: z.enum(["class", "student", "all-classes"]),
  class_id: z.string().optional(),
  student_ids: z.array(z.string()).optional(),
  fee_month: z.string().min(1, "Fee month is required"),
  due_date: z.string().min(1, "Due date is required"),
  fine_after_due: z.number().min(0).optional().default(0),
  custom_particulars: z.array(z.object({
    label: z.string(),
    amount: z.number(),
    is_fixed: z.boolean(),
    source_type: z.string().nullable().optional(),
    add_to_balance: z.boolean().optional(),
  })).optional(),
});

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
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const limit = parseInt(url.searchParams.get("limit") ?? "25", 10);
    const search = url.searchParams.get("search") ?? undefined;
    const classId = url.searchParams.get("classId") ?? undefined;
    const feeMonth = url.searchParams.get("feeMonth") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;

    const result = await getInvoices(schoolId, { page, limit, search, classId, feeMonth, status });
    return NextResponse.json(success(result));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch invoices"),
      { status: 500 }
    );
  }
}

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
    const parsed = GenerateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error(parsed.error.issues[0]?.message ?? "Invalid input"),
        { status: 400 }
      );
    }

    const data = await generateInvoices(schoolId, {
      mode: parsed.data.mode,
      class_id: parsed.data.class_id,
      student_ids: parsed.data.student_ids,
      fee_month: parsed.data.fee_month,
      due_date: parsed.data.due_date,
      fine_after_due: parsed.data.fine_after_due ?? 0,
      custom_particulars: parsed.data.custom_particulars as { label: string; amount: number; is_fixed: boolean; source_type: string | null; add_to_balance?: boolean }[] | undefined,
    });
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to generate invoices"),
      { status: 500 }
    );
  }
}
