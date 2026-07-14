import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { updateFeeParticular, deleteFeeParticular } from "@/services/fee.service";
import { success, error } from "@/lib/api-response";

const UpdateParticularSchema = z.object({
  label: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  is_fixed: z.boolean().optional(),
  source_type: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ schoolId: string; particularId: string }> }
) {
  const { schoolId, particularId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const json = await req.json();
    const parsed = UpdateParticularSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error(parsed.error.issues[0]?.message ?? "Invalid input"),
        { status: 400 }
      );
    }

    const data = await updateFeeParticular(particularId, schoolId, parsed.data);
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to update fee particular"),
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; particularId: string }> }
) {
  const { schoolId, particularId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    await deleteFeeParticular(particularId, schoolId);
    return NextResponse.json(success({ deleted: true }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to delete fee particular"),
      { status: 500 }
    );
  }
}
