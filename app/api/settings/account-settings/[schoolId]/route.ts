import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import {
  getAccountSettings,
  updateAccountSettings,
} from "@/services/settings.service";
import { success, error } from "@/lib/api-response";

const UpdateSchema = z.object({
  currency_symbol: z.string().min(1).max(5).optional(),
  currency_name: z.string().min(1).max(50).optional(),
  timezone: z.string().min(1).optional(),
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
    const data = await getAccountSettings(schoolId);
    return NextResponse.json(
      success({
        currency_symbol: data.currency_symbol,
        currency_name: data.currency_name,
        timezone: data.timezone,
      })
    );
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch settings"),
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error(parsed.error.issues[0]?.message ?? "Invalid input"),
        { status: 400 }
      );
    }

    const data = await updateAccountSettings(schoolId, parsed.data);
    return NextResponse.json(
      success({
        currency_symbol: data.currency_symbol,
        currency_name: data.currency_name,
        timezone: data.timezone,
      })
    );
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Update failed"),
      { status: 500 }
    );
  }
}