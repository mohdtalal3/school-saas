import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getFeeDefaulters } from "@/services/fee-defaulters.service";
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
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const limit = parseInt(url.searchParams.get("limit") ?? "25", 10);
    const search = url.searchParams.get("search") ?? undefined;
    const classId = url.searchParams.get("classId") ?? undefined;
    const feeMonth = url.searchParams.get("feeMonth") ?? undefined;
    const statusFilter = url.searchParams.get("statusFilter") as "unpaid" | "partial" | null;
    const validStatusFilter = statusFilter === "unpaid" || statusFilter === "partial" ? statusFilter : undefined;

    const result = await getFeeDefaulters(schoolId, { page, limit, search, classId, feeMonth, statusFilter: validStatusFilter });
    return NextResponse.json(success(result));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch fee defaulters"),
      { status: 500 }
    );
  }
}
