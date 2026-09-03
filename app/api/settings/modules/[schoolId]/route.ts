import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getModuleSettings, updateModuleSettings } from "@/services/settings.service";
import { isModuleKey } from "@/lib/modules";
import { success, error } from "@/lib/api-response";

const UpdateSchema = z.object({
  disabled_modules: z
    .array(z.string().min(1))
    .max(200)
    .refine((keys) => keys.every(isModuleKey), {
      message: "Unknown module key",
    }),
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
    const disabledModules = await getModuleSettings(schoolId);
    return NextResponse.json(success({ disabled_modules: disabledModules }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch module settings"),
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

    const disabledModules = await updateModuleSettings(
      schoolId,
      parsed.data.disabled_modules
    );
    return NextResponse.json(success({ disabled_modules: disabledModules }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Update failed"),
      { status: 500 }
    );
  }
}
