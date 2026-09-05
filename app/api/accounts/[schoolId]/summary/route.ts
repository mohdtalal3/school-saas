import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getQuickSummary } from "@/services/accounts.service";
import { success, error } from "@/lib/api-response";

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

    const summary = await getQuickSummary(schoolId);
    return NextResponse.json(success(summary));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to compute summary"),
      { status: 500 }
    );
  }
}
