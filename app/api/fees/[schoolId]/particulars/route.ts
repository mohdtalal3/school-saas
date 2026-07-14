import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getFeeParticulars, createFeeParticular } from "@/services/fee.service";
import { success, error } from "@/lib/api-response";

const NewParticularSchema = z.object({
  label: z.string().min(1, "Label is required"),
  amount: z.number().min(0).optional(),
  is_fixed: z.boolean().optional(),
  source_type: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const data = await getFeeParticulars(schoolId);
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch fee particulars"),
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
    const parsed = NewParticularSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error(parsed.error.issues[0]?.message ?? "Invalid input"),
        { status: 400 }
      );
    }

    const data = await createFeeParticular(schoolId, {
      label: parsed.data.label,
      amount: parsed.data.amount ?? 0,
      is_fixed: parsed.data.is_fixed ?? false,
      source_type: parsed.data.source_type ?? null,
      sort_order: parsed.data.sort_order,
    });
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to create fee particular"),
      { status: 500 }
    );
  }
}
