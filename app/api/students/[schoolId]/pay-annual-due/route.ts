import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { success, error } from "@/lib/api-response";
import { payAnnualDue } from "@/services/fee-payment.service";

const PayAnnualDueSchema = z.object({
  student_id: z.string().min(1, "Student ID is required"),
  amount: z.number().positive("Amount must be greater than 0"),
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
    const parsed = PayAnnualDueSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error(parsed.error.issues[0]?.message ?? "Invalid input"),
        { status: 400 }
      );
    }

    const result = await payAnnualDue(
      schoolId,
      parsed.data.student_id,
      parsed.data.amount
    );

    return NextResponse.json(success(result));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to pay annual due"),
      { status: 500 }
    );
  }
}
