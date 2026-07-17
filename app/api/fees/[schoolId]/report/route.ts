import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getFeeReport } from "@/services/fee-report.service";
import { success, error } from "@/lib/api-response";

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
    const feeMonth = url.searchParams.get("feeMonth");
    if (!feeMonth) {
      return NextResponse.json(error("feeMonth is required"), { status: 400 });
    }

    const data = await getFeeReport(schoolId, feeMonth);
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch fee report"),
      { status: 500 }
    );
  }
}
