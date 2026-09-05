import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import {
  updateAccountCategory,
  deleteAccountCategory,
} from "@/services/accounts.service";
import { success, error, AppError } from "@/lib/api-response";

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ schoolId: string; categoryId: string }> }
) {
  const { schoolId, categoryId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(error("Invalid category payload"), { status: 400 });
    }

    const category = await updateAccountCategory(schoolId, categoryId, parsed.data);
    return NextResponse.json(success(category));
  } catch (e) {
    const status = e instanceof AppError ? e.statusCode : 500;
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to update category"),
      { status }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string; categoryId: string }> }
) {
  const { schoolId, categoryId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const result = await deleteAccountCategory(schoolId, categoryId);
    return NextResponse.json(success(result));
  } catch (e) {
    const status = e instanceof AppError ? e.statusCode : 500;
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to delete category"),
      { status }
    );
  }
}
